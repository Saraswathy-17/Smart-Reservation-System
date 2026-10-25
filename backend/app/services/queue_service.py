from datetime import datetime, timezone
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from app.models.queue import QueueEntry
from app.models.slot import Slot
from app.models.reservation import Reservation, generate_reservation_code
from app.models.audit import AuditLog
from app.models.base import get_utc_now
from app.ml.predictor import predictor
from app.services.notification_service import notification_service


class QueueService:
    @staticmethod
    async def get_slot_queue_count(db: AsyncSession, slot_id: str) -> int:
        result = await db.execute(
            select(func.count(QueueEntry.id))
            .where(QueueEntry.slot_id == slot_id, QueueEntry.status == "WAITING")
        )
        return result.scalar() or 0

    @staticmethod
    async def join_queue(
        db: AsyncSession,
        user_id: str,
        slot_id: str,
        party_size: int = 1,
    ) -> QueueEntry:
        # Check if slot exists
        slot_result = await db.execute(select(Slot).where(Slot.id == slot_id))
        slot = slot_result.scalar_one_or_none()
        if not slot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Time slot not found")

        # Check if user already holds a confirmed reservation for this slot
        existing_res = await db.execute(
            select(Reservation).where(
                Reservation.slot_id == slot_id,
                Reservation.user_id == user_id,
                Reservation.status == "CONFIRMED",
            )
        )
        if existing_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You already have a confirmed reservation for this time slot.",
            )

        # Check if user is already waiting in queue for this slot
        existing_q = await db.execute(
            select(QueueEntry).where(
                QueueEntry.slot_id == slot_id,
                QueueEntry.user_id == user_id,
                QueueEntry.status == "WAITING",
            )
        )
        if existing_q.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You are already in the waiting queue for this time slot.",
            )

        # Determine next FIFO position
        pos_result = await db.execute(
            select(func.coalesce(func.max(QueueEntry.position), 0))
            .where(QueueEntry.slot_id == slot_id, QueueEntry.status == "WAITING")
        )
        current_max_pos = pos_result.scalar() or 0
        new_position = current_max_pos + 1

        # Calculate slot duration in minutes
        duration_mins = 60
        try:
            start_m = slot.start_time.hour * 60 + slot.start_time.minute
            end_m = slot.end_time.hour * 60 + slot.end_time.minute
            if end_m > start_m:
                duration_mins = end_m - start_m
        except Exception:
            duration_mins = 60

        # Predict wait time using ML model
        now_dt = get_utc_now()
        prediction = predictor.predict(
            queue_position=new_position,
            total_queue_length=new_position,
            resource_capacity=slot.max_capacity,
            slot_duration_minutes=duration_mins,
            hour_of_day=slot.start_time.hour if hasattr(slot, "start_time") else now_dt.hour,
            day_of_week=slot.slot_date.weekday() if hasattr(slot, "slot_date") else now_dt.weekday(),
            cancellation_rate=0.12,
        )

        entry = QueueEntry(
            user_id=user_id,
            slot_id=slot_id,
            position=new_position,
            status="WAITING",
            party_size=party_size,
            predicted_wait_time_minutes=prediction["predicted_wait_time_minutes"],
            joined_at=now_dt,
        )
        db.add(entry)
        await db.flush()
        
        # Audit log
        db.add(AuditLog(
            entity_name="QUEUE",
            entity_id=entry.id,
            action="JOIN_QUEUE",
            metadata_json=f'{{"user_id": "{user_id}", "slot_id": "{slot_id}", "position": {new_position}}}'
        ))

        # Add Notification for user
        await notification_service.create_notification(
            db=db,
            user_id=user_id,
            title="Joined Waiting Queue",
            message=f"You are #{new_position} in line for {slot.slot_date} {slot.start_time.strftime('%H:%M')}. Predicted wait: ~{round(prediction['predicted_wait_time_minutes'])} mins.",
            event_type="QUEUE_JOINED",
            link_url="/my-queue",
        )

        await db.commit()
        await db.refresh(entry)
        return entry

    @staticmethod
    async def promote_next_in_queue(
        db: AsyncSession,
        slot_id: str,
    ) -> Optional[Reservation]:
        """
        Promotes the next user in FIFO queue for this slot and re-indexes remaining positions.
        """
        # Lock slot
        slot_res = await db.execute(select(Slot).where(Slot.id == slot_id).with_for_update())
        slot = slot_res.scalar_one_or_none()
        if not slot:
            return None

        # Check if slot has capacity available
        if slot.current_reservations >= slot.max_capacity:
            return None

        # Fetch first waiting user in line
        q_res = await db.execute(
            select(QueueEntry)
            .where(QueueEntry.slot_id == slot_id, QueueEntry.status == "WAITING")
            .order_by(QueueEntry.position.asc(), QueueEntry.joined_at.asc())
            .with_for_update()
        )
        next_entry = q_res.scalars().first()
        if not next_entry:
            return None

        # Direct Auto-Confirmation Promotion
        now_utc = get_utc_now()
        next_entry.status = "PROMOTED"
        next_entry.promoted_at = now_utc

        # Create confirmed reservation
        new_res = Reservation(
            user_id=next_entry.user_id,
            slot_id=slot.id,
            reservation_code=generate_reservation_code(),
            party_size=next_entry.party_size,
            status="CONFIRMED",
            special_notes="Automatically promoted from waiting queue.",
            confirmed_at=now_utc,
        )
        db.add(new_res)

        # Increment slot reservations & update status
        slot.current_reservations += 1
        slot.recalculate_status()

        await db.flush()

        # Audit log
        db.add(AuditLog(
            entity_name="QUEUE",
            entity_id=next_entry.id,
            action="AUTO_PROMOTE",
            metadata_json=f'{{"user_id": "{next_entry.user_id}", "reservation_id": "{new_res.id}"}}'
        ))

        # Add Notification for promoted user
        await notification_service.create_notification(
            db=db,
            user_id=next_entry.user_id,
            title="Queue Promotion Confirmed!",
            message=f"A reservation slot opened up! You were automatically promoted from the queue to a CONFIRMED reservation ({new_res.reservation_code}).",
            event_type="QUEUE_PROMOTED",
            link_url="/my-reservations",
        )

        # Re-index remaining waiting users
        remaining_entries_res = await db.execute(
            select(QueueEntry)
            .where(
                QueueEntry.slot_id == slot_id,
                QueueEntry.status == "WAITING",
                QueueEntry.id != next_entry.id
            )
            .order_by(QueueEntry.position.asc())
            .with_for_update()
        )
        remaining = remaining_entries_res.scalars().all()
        
        duration_mins = 60
        try:
            start_m = slot.start_time.hour * 60 + slot.start_time.minute
            end_m = slot.end_time.hour * 60 + slot.end_time.minute
            if end_m > start_m:
                duration_mins = end_m - start_m
        except Exception:
            duration_mins = 60

        total_remaining = len(remaining)
        for idx, entry in enumerate(remaining, start=1):
            old_pos = entry.position
            entry.position = idx
            # Recalculate wait time based on new position
            pred = predictor.predict(
                queue_position=idx,
                total_queue_length=total_remaining,
                resource_capacity=slot.max_capacity,
                slot_duration_minutes=duration_mins,
                hour_of_day=slot.start_time.hour if hasattr(slot, "start_time") else now_utc.hour,
                day_of_week=slot.slot_date.weekday() if hasattr(slot, "slot_date") else now_utc.weekday(),
            )
            entry.predicted_wait_time_minutes = pred["predicted_wait_time_minutes"]

            if old_pos != idx:
                await notification_service.create_notification(
                    db=db,
                    user_id=entry.user_id,
                    title="Queue Position Advanced",
                    message=f"You have advanced to Position #{idx} in the queue! Estimated wait: ~{round(entry.predicted_wait_time_minutes)} mins.",
                    event_type="QUEUE_POSITION_CHANGED",
                    link_url="/my-queue",
                )

        await db.commit()
        await db.refresh(new_res)
        return new_res

    @staticmethod
    async def leave_queue(
        db: AsyncSession,
        user_id: str,
        queue_id: str,
    ) -> QueueEntry:
        q_res = await db.execute(
            select(QueueEntry).where(QueueEntry.id == queue_id, QueueEntry.user_id == user_id).with_for_update()
        )
        entry = q_res.scalar_one_or_none()
        if not entry:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue ticket not found")

        if entry.status != "WAITING":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot leave queue with status {entry.status}")

        slot_id = entry.slot_id
        entry.status = "CANCELLED"
        await db.flush()

        db.add(AuditLog(
            entity_name="QUEUE",
            entity_id=entry.id,
            action="LEAVE_QUEUE",
            metadata_json=f'{{"user_id": "{user_id}", "slot_id": "{slot_id}"}}'
        ))

        # Add Notification for user
        await notification_service.create_notification(
            db=db,
            user_id=user_id,
            title="Left Waiting Queue",
            message="You have exited the waiting queue.",
            event_type="QUEUE_LEFT",
            link_url="/my-queue",
        )

        # Re-index remaining waiting entries
        remaining_entries_res = await db.execute(
            select(QueueEntry)
            .where(
                QueueEntry.slot_id == slot_id,
                QueueEntry.status == "WAITING",
                QueueEntry.id != entry.id
            )
            .order_by(QueueEntry.position.asc())
            .with_for_update()
        )
        remaining = remaining_entries_res.scalars().all()
        for idx, item in enumerate(remaining, start=1):
            item.position = idx

        await db.commit()
        await db.refresh(entry)
        return entry


queue_service = QueueService()

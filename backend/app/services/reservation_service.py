from typing import Optional, List, Tuple
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.reservation import Reservation, generate_reservation_code
from app.models.slot import Slot
from app.models.resource import Resource
from app.models.audit import AuditLog
from app.models.base import get_utc_now
from app.services.queue_service import queue_service
from app.services.notification_service import notification_service


class ReservationService:
    @staticmethod
    async def create_reservation(
        db: AsyncSession,
        user_id: str,
        slot_id: str,
        party_size: int = 1,
        special_notes: Optional[str] = None,
    ) -> Reservation:
        # Atomic lock on the slot row
        slot_result = await db.execute(
            select(Slot).where(Slot.id == slot_id).with_for_update()
        )
        slot = slot_result.scalar_one_or_none()
        if not slot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Time slot not found")

        # Check existing active reservation for this user & slot to prevent double-booking
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
                detail="You already have an active confirmed reservation for this time slot.",
            )

        # Check capacity
        if slot.current_reservations + party_size > slot.max_capacity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This time slot is fully booked or cannot accommodate your party size. Please join the waiting queue.",
            )

        # Increment count and update status
        slot.current_reservations += party_size
        slot.recalculate_status()

        # Create reservation record
        reservation = Reservation(
            user_id=user_id,
            slot_id=slot_id,
            reservation_code=generate_reservation_code(),
            party_size=party_size,
            status="CONFIRMED",
            special_notes=special_notes,
            confirmed_at=get_utc_now(),
        )
        db.add(reservation)
        await db.flush()

        # Add Audit log
        db.add(AuditLog(
            entity_name="RESERVATION",
            entity_id=reservation.id,
            action="BOOK",
            metadata_json=f'{{"user_id": "{user_id}", "slot_id": "{slot_id}", "party_size": {party_size}}}'
        ))

        # Add Notification for user
        await notification_service.create_notification(
            db=db,
            user_id=user_id,
            title="Reservation Confirmed",
            message=f"Your reservation {reservation.reservation_code} for {slot.slot_date} at {slot.start_time.strftime('%H:%M')} has been confirmed.",
            event_type="RESERVATION_CONFIRMED",
            link_url="/my-reservations",
        )

        await db.commit()
        await db.refresh(reservation)
        return reservation

    @staticmethod
    async def cancel_reservation(
        db: AsyncSession,
        reservation_id: str,
        user_id: Optional[str] = None,
        cancellation_reason: Optional[str] = None,
        is_admin: bool = False,
    ) -> Tuple[Reservation, Optional[Reservation]]:
        """
        Cancels reservation, decrements slot count, and automatically promotes the next queued user.
        """
        # Fetch reservation with lock
        query = select(Reservation).where(Reservation.id == reservation_id).with_for_update()
        if not is_admin and user_id:
            query = query.where(Reservation.user_id == user_id)

        res_result = await db.execute(query)
        reservation = res_result.scalar_one_or_none()
        if not reservation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")

        if reservation.status != "CONFIRMED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Reservation is already {reservation.status.lower()}.",
            )

        # Lock slot
        slot_result = await db.execute(
            select(Slot).where(Slot.id == reservation.slot_id).with_for_update()
        )
        slot = slot_result.scalar_one_or_none()

        now_utc = get_utc_now()
        reservation.status = "CANCELLED"
        reservation.cancelled_at = now_utc
        reservation.cancellation_reason = cancellation_reason or "Cancelled by user"

        if slot:
            slot.current_reservations = max(0, slot.current_reservations - reservation.party_size)
            slot.recalculate_status()

        db.add(AuditLog(
            entity_name="RESERVATION",
            entity_id=reservation.id,
            action="CANCEL",
            metadata_json=f'{{"reservation_id": "{reservation.id}", "reason": "{reservation.cancellation_reason}"}}'
        ))

        # Add Notification for user
        await notification_service.create_notification(
            db=db,
            user_id=reservation.user_id,
            title="Reservation Cancelled",
            message=f"Your reservation {reservation.reservation_code} has been cancelled.",
            event_type="RESERVATION_CANCELLED",
            link_url="/my-reservations",
        )

        await db.commit()
        await db.refresh(reservation)

        # Trigger automatic queue promotion if slot has vacancy
        promoted_reservation = None
        if slot:
            promoted_reservation = await queue_service.promote_next_in_queue(db, slot.id)

        return reservation, promoted_reservation


reservation_service = ReservationService()

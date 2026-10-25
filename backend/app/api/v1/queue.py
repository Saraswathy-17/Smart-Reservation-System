from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.models.queue import QueueEntry
from app.models.slot import Slot
from app.models.resource import Resource
from app.models.user import User
from app.schemas.queue import QueueJoinRequest, QueueResponse, QueuePredictionInfo
from app.services.queue_service import queue_service
from app.ml.predictor import predictor
from app.api.deps import get_current_user

router = APIRouter(prefix="/queue", tags=["Queue & Prediction"])


@router.post("/join", response_model=QueueResponse, status_code=status.HTTP_201_CREATED)
async def join_queue(
    req: QueueJoinRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = await queue_service.join_queue(
        db=db,
        user_id=current_user.id,
        slot_id=req.slot_id,
        party_size=req.party_size,
    )

    slot_res = await db.execute(
        select(Slot, Resource.name.label("resource_name"))
        .join(Resource, Slot.resource_id == Resource.id)
        .where(Slot.id == entry.slot_id)
    )
    slot, res_name = slot_res.first()

    return QueueResponse(
        id=entry.id,
        user_id=entry.user_id,
        slot_id=entry.slot_id,
        position=entry.position,
        status=entry.status,
        party_size=entry.party_size,
        predicted_wait_time_minutes=entry.predicted_wait_time_minutes,
        joined_at=entry.joined_at,
        promoted_at=entry.promoted_at,
        expires_at=entry.expires_at,
        resource_id=slot.resource_id,
        resource_name=res_name,
        slot_date=slot.slot_date,
        start_time=slot.start_time,
        end_time=slot.end_time,
        user_name=current_user.full_name,
        user_email=current_user.email,
    )


@router.get("/my", response_model=List[QueueResponse])
async def list_my_queue_entries(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(QueueEntry, Slot, Resource.name.label("resource_name"))
        .join(Slot, QueueEntry.slot_id == Slot.id)
        .join(Resource, Slot.resource_id == Resource.id)
        .where(QueueEntry.user_id == current_user.id)
        .order_by(QueueEntry.joined_at.desc())
    )
    result = await db.execute(query)
    rows = result.all()

    responses = []
    for entry, slot, res_name in rows:
        responses.append(QueueResponse(
            id=entry.id,
            user_id=entry.user_id,
            slot_id=entry.slot_id,
            position=entry.position,
            status=entry.status,
            party_size=entry.party_size,
            predicted_wait_time_minutes=entry.predicted_wait_time_minutes,
            joined_at=entry.joined_at,
            promoted_at=entry.promoted_at,
            expires_at=entry.expires_at,
            resource_id=slot.resource_id,
            resource_name=res_name,
            slot_date=slot.slot_date,
            start_time=slot.start_time,
            end_time=slot.end_time,
            user_name=current_user.full_name,
            user_email=current_user.email,
        ))
    return responses


@router.get("/{queue_id}/status", response_model=QueueResponse)
async def get_queue_status(
    queue_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(QueueEntry, Slot, Resource.name.label("resource_name"))
        .join(Slot, QueueEntry.slot_id == Slot.id)
        .join(Resource, Slot.resource_id == Resource.id)
        .where(QueueEntry.id == queue_id)
    )
    if current_user.role != "ADMIN":
        query = query.where(QueueEntry.user_id == current_user.id)

    result = await db.execute(query)
    row = result.first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue ticket not found")

    entry, slot, res_name = row

    # If still waiting, refresh ML prediction with latest queue length and current state
    if entry.status == "WAITING":
        total_waiting_res = await db.execute(
            select(func.count(QueueEntry.id))
            .where(QueueEntry.slot_id == slot.id, QueueEntry.status == "WAITING")
        )
        total_in_q = total_waiting_res.scalar() or entry.position

        duration_mins = 60
        try:
            start_m = slot.start_time.hour * 60 + slot.start_time.minute
            end_m = slot.end_time.hour * 60 + slot.end_time.minute
            if end_m > start_m:
                duration_mins = end_m - start_m
        except Exception:
            duration_mins = 60

        pred = predictor.predict(
            queue_position=entry.position,
            total_queue_length=total_in_q,
            resource_capacity=slot.max_capacity,
            slot_duration_minutes=duration_mins,
            hour_of_day=slot.start_time.hour if hasattr(slot, "start_time") else 12,
            day_of_week=slot.slot_date.weekday() if hasattr(slot, "slot_date") else 0,
        )
        entry.predicted_wait_time_minutes = pred["predicted_wait_time_minutes"]

    return QueueResponse(
        id=entry.id,
        user_id=entry.user_id,
        slot_id=entry.slot_id,
        position=entry.position,
        status=entry.status,
        party_size=entry.party_size,
        predicted_wait_time_minutes=entry.predicted_wait_time_minutes,
        joined_at=entry.joined_at,
        promoted_at=entry.promoted_at,
        expires_at=entry.expires_at,
        resource_id=slot.resource_id,
        resource_name=res_name,
        slot_date=slot.slot_date,
        start_time=slot.start_time,
        end_time=slot.end_time,
        user_name=current_user.full_name,
        user_email=current_user.email,
    )


@router.post("/{queue_id}/leave", response_model=QueueResponse)
async def leave_queue(
    queue_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = await queue_service.leave_queue(
        db=db,
        user_id=current_user.id,
        queue_id=queue_id,
    )

    slot_res = await db.execute(
        select(Slot, Resource.name.label("resource_name"))
        .join(Resource, Slot.resource_id == Resource.id)
        .where(Slot.id == entry.slot_id)
    )
    slot, res_name = slot_res.first()

    return QueueResponse(
        id=entry.id,
        user_id=entry.user_id,
        slot_id=entry.slot_id,
        position=entry.position,
        status=entry.status,
        party_size=entry.party_size,
        predicted_wait_time_minutes=entry.predicted_wait_time_minutes,
        joined_at=entry.joined_at,
        promoted_at=entry.promoted_at,
        expires_at=entry.expires_at,
        resource_id=slot.resource_id,
        resource_name=res_name,
        slot_date=slot.slot_date,
        start_time=slot.start_time,
        end_time=slot.end_time,
        user_name=current_user.full_name,
        user_email=current_user.email,
    )

from datetime import date, time, timedelta, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.core.database import get_db
from app.models.slot import Slot
from app.models.resource import Resource
from app.models.queue import QueueEntry
from app.models.user import User
from app.schemas.slot import SlotResponse, SlotBatchGenerate, SlotCreate
from app.api.deps import get_current_admin

router = APIRouter(prefix="/slots", tags=["Slots & Availability"])


@router.get("/", response_model=List[SlotResponse])
async def list_slots(
    resource_id: Optional[str] = None,
    slot_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Slot, Resource.name.label("resource_name")).join(Resource, Slot.resource_id == Resource.id)

    filters = []
    if resource_id:
        filters.append(Slot.resource_id == resource_id)
    if slot_date:
        filters.append(Slot.slot_date == slot_date)

    if filters:
        query = query.where(and_(*filters))

    query = query.order_by(Slot.slot_date.asc(), Slot.start_time.asc())
    results = await db.execute(query)
    rows = results.all()

    slot_responses: List[SlotResponse] = []
    for slot, res_name in rows:
        # Get active queue count
        q_cnt_res = await db.execute(
            select(func.count(QueueEntry.id))
            .where(QueueEntry.slot_id == slot.id, QueueEntry.status == "WAITING")
        )
        active_q = q_cnt_res.scalar() or 0

        slot_responses.append(SlotResponse(
            id=slot.id,
            resource_id=slot.resource_id,
            resource_name=res_name,
            slot_date=slot.slot_date,
            start_time=slot.start_time,
            end_time=slot.end_time,
            max_capacity=slot.max_capacity,
            current_reservations=slot.current_reservations,
            available_capacity=max(0, slot.max_capacity - slot.current_reservations),
            status=slot.status,
            active_queue_count=active_q,
            created_at=slot.created_at,
        ))

    return slot_responses


@router.get("/{slot_id}", response_model=SlotResponse)
async def get_slot(
    slot_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Slot, Resource.name.label("resource_name"))
        .join(Resource, Slot.resource_id == Resource.id)
        .where(Slot.id == slot_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slot not found")

    slot, res_name = row
    q_cnt_res = await db.execute(
        select(func.count(QueueEntry.id))
        .where(QueueEntry.slot_id == slot.id, QueueEntry.status == "WAITING")
    )
    active_q = q_cnt_res.scalar() or 0

    return SlotResponse(
        id=slot.id,
        resource_id=slot.resource_id,
        resource_name=res_name,
        slot_date=slot.slot_date,
        start_time=slot.start_time,
        end_time=slot.end_time,
        max_capacity=slot.max_capacity,
        current_reservations=slot.current_reservations,
        available_capacity=max(0, slot.max_capacity - slot.current_reservations),
        status=slot.status,
        active_queue_count=active_q,
        created_at=slot.created_at,
    )


@router.post("/generate", response_model=List[SlotResponse], status_code=status.HTTP_201_CREATED)
async def batch_generate_slots(
    batch_in: SlotBatchGenerate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    # Verify resource
    res_result = await db.execute(select(Resource).where(Resource.id == batch_in.resource_id))
    resource = res_result.scalar_one_or_none()
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    if batch_in.start_date > batch_in.end_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="start_date must be before end_date")

    created_slots = []
    current_d = batch_in.start_date
    delta_days = (batch_in.end_date - batch_in.start_date).days + 1

    for _ in range(delta_days):
        current_hour = batch_in.start_hour
        current_minute = 0

        while current_hour < batch_in.end_hour:
            st = time(hour=current_hour, minute=current_minute)
            
            # calculate end time
            total_minutes = current_hour * 60 + current_minute + batch_in.slot_duration_minutes
            end_h = total_minutes // 60
            end_m = total_minutes % 60
            if end_h > 23:
                end_h = 23
                end_m = 59
            et = time(hour=end_h, minute=end_m)

            # Check if identical slot already exists
            existing = await db.execute(
                select(Slot).where(
                    Slot.resource_id == resource.id,
                    Slot.slot_date == current_d,
                    Slot.start_time == st,
                )
            )
            if not existing.scalar_one_or_none():
                slot = Slot(
                    resource_id=resource.id,
                    slot_date=current_d,
                    start_time=st,
                    end_time=et,
                    max_capacity=batch_in.max_capacity or resource.base_capacity,
                    current_reservations=0,
                    status="AVAILABLE",
                )
                db.add(slot)
                created_slots.append(slot)

            current_hour = end_h
            current_minute = end_m
            if end_h >= batch_in.end_hour:
                break

        current_d += timedelta(days=1)

    await db.commit()

    # Re-fetch generated slots for proper response serialization
    response_list = []
    for s in created_slots:
        await db.refresh(s)
        response_list.append(SlotResponse(
            id=s.id,
            resource_id=s.resource_id,
            resource_name=resource.name,
            slot_date=s.slot_date,
            start_time=s.start_time,
            end_time=s.end_time,
            max_capacity=s.max_capacity,
            current_reservations=s.current_reservations,
            available_capacity=s.max_capacity,
            status=s.status,
            active_queue_count=0,
            created_at=s.created_at,
        ))

    return response_list


@router.put("/{slot_id}", response_model=SlotResponse)
async def update_slot(
    slot_id: str,
    max_capacity: int = Body(..., embed=True, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(Slot, Resource.name.label("resource_name"))
        .join(Resource, Slot.resource_id == Resource.id)
        .where(Slot.id == slot_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slot not found")

    slot, res_name = row
    slot.max_capacity = max_capacity
    slot.recalculate_status()

    await db.commit()
    await db.refresh(slot)

    q_cnt_res = await db.execute(
        select(func.count(QueueEntry.id))
        .where(QueueEntry.slot_id == slot.id, QueueEntry.status == "WAITING")
    )
    active_q = q_cnt_res.scalar() or 0

    return SlotResponse(
        id=slot.id,
        resource_id=slot.resource_id,
        resource_name=res_name,
        slot_date=slot.slot_date,
        start_time=slot.start_time,
        end_time=slot.end_time,
        max_capacity=slot.max_capacity,
        current_reservations=slot.current_reservations,
        available_capacity=max(0, slot.max_capacity - slot.current_reservations),
        status=slot.status,
        active_queue_count=active_q,
        created_at=slot.created_at,
    )

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.reservation import Reservation
from app.models.slot import Slot
from app.models.resource import Resource
from app.models.user import User
from app.schemas.reservation import ReservationCreate, ReservationCancel, ReservationResponse
from app.services.reservation_service import reservation_service
from app.api.deps import get_current_user

router = APIRouter(prefix="/reservations", tags=["Reservations"])


@router.post("/", response_model=ReservationResponse, status_code=status.HTTP_201_CREATED)
async def create_reservation(
    res_in: ReservationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reservation = await reservation_service.create_reservation(
        db=db,
        user_id=current_user.id,
        slot_id=res_in.slot_id,
        party_size=res_in.party_size,
        special_notes=res_in.special_notes,
    )

    # Fetch slot and resource for enriched response
    slot_res = await db.execute(
        select(Slot, Resource.name.label("resource_name"))
        .join(Resource, Slot.resource_id == Resource.id)
        .where(Slot.id == reservation.slot_id)
    )
    slot_row = slot_res.first()
    slot, res_name = slot_row if slot_row else (None, None)

    return ReservationResponse(
        id=reservation.id,
        user_id=reservation.user_id,
        slot_id=reservation.slot_id,
        reservation_code=reservation.reservation_code,
        party_size=reservation.party_size,
        status=reservation.status,
        special_notes=reservation.special_notes,
        confirmed_at=reservation.confirmed_at,
        cancelled_at=reservation.cancelled_at,
        cancellation_reason=reservation.cancellation_reason,
        created_at=reservation.created_at,
        resource_id=slot.resource_id if slot else None,
        resource_name=res_name,
        slot_date=slot.slot_date if slot else None,
        start_time=slot.start_time if slot else None,
        end_time=slot.end_time if slot else None,
        user_name=current_user.full_name,
        user_email=current_user.email,
    )


@router.get("/my", response_model=List[ReservationResponse])
async def list_my_reservations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(Reservation, Slot, Resource.name.label("resource_name"))
        .join(Slot, Reservation.slot_id == Slot.id)
        .join(Resource, Slot.resource_id == Resource.id)
        .where(Reservation.user_id == current_user.id)
        .order_by(Reservation.created_at.desc())
    )
    result = await db.execute(query)
    rows = result.all()

    responses = []
    for res, slot, res_name in rows:
        responses.append(ReservationResponse(
            id=res.id,
            user_id=res.user_id,
            slot_id=res.slot_id,
            reservation_code=res.reservation_code,
            party_size=res.party_size,
            status=res.status,
            special_notes=res.special_notes,
            confirmed_at=res.confirmed_at,
            cancelled_at=res.cancelled_at,
            cancellation_reason=res.cancellation_reason,
            created_at=res.created_at,
            resource_id=slot.resource_id,
            resource_name=res_name,
            slot_date=slot.slot_date,
            start_time=slot.start_time,
            end_time=slot.end_time,
            user_name=current_user.full_name,
            user_email=current_user.email,
        ))
    return responses


@router.get("/{reservation_id}", response_model=ReservationResponse)
async def get_reservation(
    reservation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(Reservation, Slot, Resource.name.label("resource_name"))
        .join(Slot, Reservation.slot_id == Slot.id)
        .join(Resource, Slot.resource_id == Resource.id)
        .where(Reservation.id == reservation_id)
    )
    if current_user.role != "ADMIN":
        query = query.where(Reservation.user_id == current_user.id)

    result = await db.execute(query)
    row = result.first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")

    res, slot, res_name = row
    return ReservationResponse(
        id=res.id,
        user_id=res.user_id,
        slot_id=res.slot_id,
        reservation_code=res.reservation_code,
        party_size=res.party_size,
        status=res.status,
        special_notes=res.special_notes,
        confirmed_at=res.confirmed_at,
        cancelled_at=res.cancelled_at,
        cancellation_reason=res.cancellation_reason,
        created_at=res.created_at,
        resource_id=slot.resource_id,
        resource_name=res_name,
        slot_date=slot.slot_date,
        start_time=slot.start_time,
        end_time=slot.end_time,
        user_name=current_user.full_name,
        user_email=current_user.email,
    )


@router.post("/{reservation_id}/cancel", response_model=ReservationResponse)
async def cancel_reservation(
    reservation_id: str,
    cancel_in: Optional[ReservationCancel] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reason = cancel_in.cancellation_reason if cancel_in else "Cancelled by user"
    is_admin = current_user.role == "ADMIN"

    reservation, promoted_res = await reservation_service.cancel_reservation(
        db=db,
        reservation_id=reservation_id,
        user_id=current_user.id,
        cancellation_reason=reason,
        is_admin=is_admin,
    )

    # Fetch slot details
    slot_res = await db.execute(
        select(Slot, Resource.name.label("resource_name"))
        .join(Resource, Slot.resource_id == Resource.id)
        .where(Slot.id == reservation.slot_id)
    )
    slot, res_name = slot_res.first()

    return ReservationResponse(
        id=reservation.id,
        user_id=reservation.user_id,
        slot_id=reservation.slot_id,
        reservation_code=reservation.reservation_code,
        party_size=reservation.party_size,
        status=reservation.status,
        special_notes=reservation.special_notes,
        confirmed_at=reservation.confirmed_at,
        cancelled_at=reservation.cancelled_at,
        cancellation_reason=reservation.cancellation_reason,
        created_at=reservation.created_at,
        resource_id=slot.resource_id,
        resource_name=res_name,
        slot_date=slot.slot_date,
        start_time=slot.start_time,
        end_time=slot.end_time,
        user_name=current_user.full_name,
        user_email=current_user.email,
    )

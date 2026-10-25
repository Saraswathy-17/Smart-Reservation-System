from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from app.core.config import settings
from app.core.database import get_db
from app.models.reservation import Reservation
from app.models.queue import QueueEntry
from app.models.slot import Slot
from app.models.resource import Resource
from app.models.user import User
from app.models.notification import Notification
from app.schemas.reservation import ReservationResponse
from app.schemas.queue import QueueResponse
from app.schemas.user import UserResponse, UserAdminResponse, UserStatusUpdate
from app.schemas.admin import AnalyticsResponse
from app.services.analytics_service import analytics_service
from app.services.queue_service import queue_service
from app.ml.trainer import train_wait_time_model
from app.ml.predictor import predictor
from app.api.deps import get_current_admin

router = APIRouter(prefix="/admin", tags=["Admin Portal"])


@router.get("/dashboard", response_model=AnalyticsResponse)
async def get_admin_dashboard(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    return await analytics_service.get_dashboard_analytics(db)


@router.get("/reservations", response_model=List[ReservationResponse])
async def list_all_reservations(
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = (
        select(Reservation, Slot, Resource.name.label("resource_name"), User.full_name.label("user_name"), User.email.label("user_email"))
        .join(Slot, Reservation.slot_id == Slot.id)
        .join(Resource, Slot.resource_id == Resource.id)
        .join(User, Reservation.user_id == User.id)
    )
    if status_filter:
        query = query.where(Reservation.status == status_filter)

    query = query.order_by(Reservation.created_at.desc())
    result = await db.execute(query)
    rows = result.all()

    responses = []
    for res, slot, res_name, u_name, u_email in rows:
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
            user_name=u_name,
            user_email=u_email,
        ))
    return responses


@router.get("/queue", response_model=List[QueueResponse])
async def list_active_queues(
    slot_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = (
        select(QueueEntry, Slot, Resource.name.label("resource_name"), User.full_name.label("user_name"), User.email.label("user_email"))
        .join(Slot, QueueEntry.slot_id == Slot.id)
        .join(Resource, Slot.resource_id == Resource.id)
        .join(User, QueueEntry.user_id == User.id)
        .where(QueueEntry.status == "WAITING")
    )
    if slot_id:
        query = query.where(QueueEntry.slot_id == slot_id)

    query = query.order_by(QueueEntry.slot_id, QueueEntry.position.asc())
    result = await db.execute(query)
    rows = result.all()

    responses = []
    for entry, slot, res_name, u_name, u_email in rows:
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
            user_name=u_name,
            user_email=u_email,
        ))
    return responses


@router.post("/queue/{queue_id}/force-promote", response_model=ReservationResponse)
async def force_promote_queued_user(
    queue_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    entry_res = await db.execute(
        select(QueueEntry).where(QueueEntry.id == queue_id).with_for_update()
    )
    entry = entry_res.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue ticket not found")

    if entry.status != "WAITING":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot promote entry with status {entry.status}")

    # Temporarily increment slot capacity if needed to accommodate manual admin override
    slot_res = await db.execute(select(Slot).where(Slot.id == entry.slot_id).with_for_update())
    slot = slot_res.scalar_one_or_none()
    if slot and slot.current_reservations >= slot.max_capacity:
        slot.max_capacity += 1  # Expand capacity for admin override

    promoted_res = await queue_service.promote_next_in_queue(db, entry.slot_id)
    if not promoted_res:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not promote user")

    # Fetch details
    slot_res = await db.execute(
        select(Slot, Resource.name.label("resource_name"), User.full_name.label("user_name"), User.email.label("user_email"))
        .join(Resource, Slot.resource_id == Resource.id)
        .join(User, User.id == promoted_res.user_id)
        .where(Slot.id == promoted_res.slot_id)
    )
    slot, res_name, u_name, u_email = slot_res.first()

    return ReservationResponse(
        id=promoted_res.id,
        user_id=promoted_res.user_id,
        slot_id=promoted_res.slot_id,
        reservation_code=promoted_res.reservation_code,
        party_size=promoted_res.party_size,
        status=promoted_res.status,
        special_notes=promoted_res.special_notes,
        confirmed_at=promoted_res.confirmed_at,
        cancelled_at=promoted_res.cancelled_at,
        cancellation_reason=promoted_res.cancellation_reason,
        resource_id=slot.resource_id,
        resource_name=res_name,
        slot_date=slot.slot_date,
        start_time=slot.start_time,
        end_time=slot.end_time,
        user_name=u_name,
        user_email=u_email,
    )


@router.post("/ml/retrain")
async def retrain_ml_model(
    samples: int = Query(3000, ge=500, le=20000),
    admin: User = Depends(get_current_admin),
):
    metrics = train_wait_time_model(n_samples=samples)
    predictor._load_or_train()  # Reload in memory
    return metrics


@router.get("/users", response_model=List[UserAdminResponse])
async def list_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = select(User)
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (User.full_name.ilike(search_filter)) | (User.email.ilike(search_filter))
        )
    if role:
        query = query.where(User.role == role)
    query = query.order_by(User.created_at.desc())
    result = await db.execute(query)
    users = result.scalars().all()

    admin_users: List[UserAdminResponse] = []
    for u in users:
        # Count actual reservations
        res_cnt_q = await db.execute(select(func.count(Reservation.id)).where(Reservation.user_id == u.id))
        res_cnt = res_cnt_q.scalar() or 0

        # Count active queue entries
        q_cnt_q = await db.execute(
            select(func.count(QueueEntry.id)).where(QueueEntry.user_id == u.id, QueueEntry.status == "WAITING")
        )
        q_cnt = q_cnt_q.scalar() or 0

        admin_users.append(UserAdminResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            phone=u.phone,
            role=u.role,
            is_active=u.is_active,
            created_at=u.created_at,
            reservation_count=res_cnt,
            active_queue_count=q_cnt,
        ))

    return admin_users


@router.get("/users/{user_id}/details")
async def get_user_details(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """
    Returns full user information, reservation history, and active queue entries for admin inspection.
    Never exposes passwords.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Fetch user's reservations
    res_query = (
        select(Reservation, Slot, Resource.name.label("resource_name"))
        .join(Slot, Reservation.slot_id == Slot.id)
        .join(Resource, Slot.resource_id == Resource.id)
        .where(Reservation.user_id == user.id)
        .order_by(Reservation.created_at.desc())
    )
    res_rows = (await db.execute(res_query)).all()
    user_reservations = []
    for r, s, r_name in res_rows:
        user_reservations.append({
            "id": r.id,
            "reservation_code": r.reservation_code,
            "resource_name": r_name,
            "slot_date": str(s.slot_date),
            "start_time": str(s.start_time)[:5],
            "end_time": str(s.end_time)[:5],
            "status": r.status,
            "party_size": r.party_size,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    # Fetch user's active queue entries
    q_query = (
        select(QueueEntry, Slot, Resource.name.label("resource_name"))
        .join(Slot, QueueEntry.slot_id == Slot.id)
        .join(Resource, Slot.resource_id == Resource.id)
        .where(QueueEntry.user_id == user.id, QueueEntry.status == "WAITING")
        .order_by(QueueEntry.joined_at.asc())
    )
    q_rows = (await db.execute(q_query)).all()
    user_queues = []
    for q, s, r_name in q_rows:
        user_queues.append({
            "id": q.id,
            "position": q.position,
            "resource_name": r_name,
            "slot_date": str(s.slot_date),
            "start_time": str(s.start_time)[:5],
            "end_time": str(s.end_time)[:5],
            "status": q.status,
            "predicted_wait_time_minutes": q.predicted_wait_time_minutes,
            "joined_at": q.joined_at.isoformat() if q.joined_at else None,
        })

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "reservation_count": len(user_reservations),
        "active_queue_count": len(user_queues),
        "reservations": user_reservations,
        "queue_entries": user_queues,
        "queue_tickets": user_queues,
    }


@router.put("/users/{user_id}/status", response_model=UserResponse)
async def update_user_status(
    user_id: str,
    status_in: UserStatusUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if status_in.role is not None and status_in.role in ["USER", "ADMIN"]:
        # Safeguard: prevent demoting the only active administrator
        if target_user.id == admin.id and status_in.role != "ADMIN":
            admin_cnt_res = await db.execute(
                select(func.count(User.id)).where(User.role == "ADMIN", User.is_active == True)
            )
            admin_cnt = admin_cnt_res.scalar() or 0
            if admin_cnt <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot demote the last remaining active Administrator.",
                )
        target_user.role = status_in.role

    if status_in.is_active is not None:
        if target_user.id == admin.id and not status_in.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot deactivate your own administrative account.",
            )
        target_user.is_active = status_in.is_active

    await db.commit()
    await db.refresh(target_user)
    return target_user


@router.get("/database-status")
async def get_database_status(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """
    Returns safe, high-level PostgreSQL connection and table health statistics.
    Never exposes passwords, credentials, or connection strings.
    """
    db_type = "PostgreSQL" if "postgresql" in settings.DATABASE_URL else "SQLite"
    server_version = f"{db_type} 18.0"
    try:
        ver_res = await db.execute(text("SELECT version()"))
        raw_ver = ver_res.scalar() or ""
        if raw_ver:
            server_version = raw_ver.split(",")[0].strip()
    except Exception:
        pass

    users_cnt = (await db.execute(select(func.count(User.id)))).scalar() or 0
    res_cnt = (await db.execute(select(func.count(Reservation.id)))).scalar() or 0
    q_cnt = (await db.execute(select(func.count(QueueEntry.id)))).scalar() or 0
    resrc_cnt = (await db.execute(select(func.count(Resource.id)))).scalar() or 0
    slot_cnt = (await db.execute(select(func.count(Slot.id)))).scalar() or 0
    notif_cnt = (await db.execute(select(func.count(Notification.id)))).scalar() or 0

    return {
        "connected": True,
        "database_type": db_type,
        "database_name": "smart_reservation",
        "server_version": server_version,
        "environment": "Production" if "postgresql" in settings.DATABASE_URL else "Development",
        "table_counts": {
            "users": users_cnt,
            "reservations": res_cnt,
            "queue_entries": q_cnt,
            "resources": resrc_cnt,
            "time_slots": slot_cnt,
            "notifications": notif_cnt,
        },
    }


@router.get("/database-records")
async def get_database_records(
    table: str = Query("users", pattern="^(users|reservations|queue_entries|resources|time_slots)$"),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """
    Safe, read-only administrative inspection of PostgreSQL table records.
    Never exposes passwords, connection strings, or raw SQL console.
    """
    if table == "users":
        q = select(User).order_by(User.created_at.desc()).limit(limit)
        rows = (await db.execute(q)).scalars().all()
        return [
            {
                "id": u.id,
                "full_name": u.full_name,
                "email": u.email,
                "role": u.role,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "status": "Active" if u.is_active else "Inactive",
            }
            for u in rows
        ]

    elif table == "reservations":
        q = (
            select(Reservation, Slot, Resource.name.label("resource_name"), User.full_name.label("user_name"))
            .join(Slot, Reservation.slot_id == Slot.id)
            .join(Resource, Slot.resource_id == Resource.id)
            .join(User, Reservation.user_id == User.id)
            .order_by(Reservation.created_at.desc())
            .limit(limit)
        )
        rows = (await db.execute(q)).all()
        return [
            {
                "id": r.id,
                "reservation_code": r.reservation_code,
                "user_id": r.user_id,
                "user_name": u_name,
                "resource_id": s.resource_id,
                "resource_name": res_name,
                "date": str(s.slot_date),
                "time": f"{str(s.start_time)[:5]} - {str(s.end_time)[:5]}",
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r, s, res_name, u_name in rows
        ]

    elif table == "queue_entries":
        q = (
            select(QueueEntry, Slot, Resource.name.label("resource_name"), User.full_name.label("user_name"))
            .join(Slot, QueueEntry.slot_id == Slot.id)
            .join(Resource, Slot.resource_id == Resource.id)
            .join(User, QueueEntry.user_id == User.id)
            .order_by(QueueEntry.joined_at.desc())
            .limit(limit)
        )
        rows = (await db.execute(q)).all()
        return [
            {
                "id": qe.id,
                "user_name": u_name,
                "resource_name": res_name,
                "slot": f"{str(s.slot_date)} ({str(s.start_time)[:5]}-{str(s.end_time)[:5]})",
                "position": qe.position,
                "estimated_wait": f"~{round(qe.predicted_wait_time_minutes)} mins",
                "status": qe.status,
                "joined_at": qe.joined_at.isoformat() if qe.joined_at else None,
            }
            for qe, s, res_name, u_name in rows
        ]

    elif table == "resources":
        q = select(Resource).order_by(Resource.name.asc()).limit(limit)
        rows = (await db.execute(q)).scalars().all()
        return [
            {
                "id": r.id,
                "name": r.name,
                "category": r.category,
                "capacity": r.base_capacity,
                "status": "Active" if r.is_active else "Inactive",
            }
            for r in rows
        ]

    elif table == "time_slots":
        q = (
            select(Slot, Resource.name.label("resource_name"))
            .join(Resource, Slot.resource_id == Resource.id)
            .order_by(Slot.slot_date.desc(), Slot.start_time.asc())
            .limit(limit)
        )
        rows = (await db.execute(q)).all()
        return [
            {
                "id": s.id,
                "resource_name": res_name,
                "date": str(s.slot_date),
                "start_time": str(s.start_time)[:5],
                "end_time": str(s.end_time)[:5],
                "capacity": s.max_capacity,
                "current_reservations": s.current_reservations,
                "status": s.status,
            }
            for s, res_name in rows
        ]



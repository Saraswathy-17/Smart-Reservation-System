from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationResponse, NotificationCreate
from app.services.notification_service import notification_service
from app.api.deps import get_current_user, get_current_admin

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/my", response_model=List[NotificationResponse])
async def get_my_notifications(
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns the authenticated user's in-app notifications.
    """
    return await notification_service.list_user_notifications(db, current_user.id, limit=limit)


@router.put("/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Marks a single notification as read.
    """
    success = await notification_service.mark_as_read(db, notification_id, current_user.id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return {"message": "Notification marked as read"}


@router.put("/read-all")
async def mark_all_notifications_as_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Marks all unread notifications of the current user as read.
    """
    count = await notification_service.mark_all_as_read(db, current_user.id)
    return {"message": f"{count} notifications marked as read", "count": count}


@router.get("/admin", response_model=List[NotificationResponse])
async def list_admin_notifications(
    limit: int = Query(100, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """
    Admin endpoint to view all system notifications across users.
    """
    query = select(Notification).order_by(Notification.created_at.desc()).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("/broadcast", response_model=dict)
async def broadcast_notification(
    notif_in: NotificationCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """
    Admin endpoint to send an announcement or broadcast notification.
    """
    if notif_in.user_id:
        await notification_service.create_notification(
            db=db,
            user_id=notif_in.user_id,
            title=notif_in.title,
            message=notif_in.message,
            event_type=notif_in.event_type,
            link_url=notif_in.link_url,
        )
        await db.commit()
        return {"message": "Notification dispatched to user."}
    else:
        created = await notification_service.broadcast_notification(
            db=db,
            title=notif_in.title,
            message=notif_in.message,
            event_type=notif_in.event_type,
            link_url=notif_in.link_url,
        )
        await db.commit()
        return {"message": f"Broadcast dispatched to {len(created)} active users."}

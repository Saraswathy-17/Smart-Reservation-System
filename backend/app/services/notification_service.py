from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.notification import Notification
from app.models.user import User


class NotificationService:
    @staticmethod
    async def create_notification(
        db: AsyncSession,
        user_id: str,
        title: str,
        message: str,
        event_type: str = "INFO",
        link_url: Optional[str] = None,
    ) -> Notification:
        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            event_type=event_type,
            link_url=link_url,
            is_read=False,
        )
        db.add(notif)
        await db.flush()
        return notif

    @staticmethod
    async def broadcast_notification(
        db: AsyncSession,
        title: str,
        message: str,
        event_type: str = "SYSTEM_NOTICE",
        link_url: Optional[str] = None,
    ) -> List[Notification]:
        users_res = await db.execute(select(User.id).where(User.is_active == True))
        user_ids = users_res.scalars().all()
        created = []
        for uid in user_ids:
            notif = Notification(
                user_id=uid,
                title=title,
                message=message,
                event_type=event_type,
                link_url=link_url,
                is_read=False,
            )
            db.add(notif)
            created.append(notif)
        await db.flush()
        return created

    @staticmethod
    async def list_user_notifications(
        db: AsyncSession,
        user_id: str,
        limit: int = 50,
    ) -> List[Notification]:
        query = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def mark_as_read(
        db: AsyncSession,
        notification_id: str,
        user_id: str,
    ) -> bool:
        stmt = (
            update(Notification)
            .where(Notification.id == notification_id, Notification.user_id == user_id)
            .values(is_read=True)
        )
        result = await db.execute(stmt)
        await db.commit()
        return result.rowcount > 0

    @staticmethod
    async def mark_all_as_read(
        db: AsyncSession,
        user_id: str,
    ) -> int:
        stmt = (
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read == False)
            .values(is_read=True)
        )
        result = await db.execute(stmt)
        await db.commit()
        return result.rowcount


notification_service = NotificationService()

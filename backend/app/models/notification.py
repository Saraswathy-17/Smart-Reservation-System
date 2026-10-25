from sqlalchemy import Column, String, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    event_type = Column(String(50), default="INFO", nullable=False)  # RESERVATION_CONFIRMED, RESERVATION_CANCELLED, QUEUE_JOINED, QUEUE_PROMOTED, QUEUE_POSITION_CHANGED, STATUS_CHANGED, SYSTEM_NOTICE
    is_read = Column(Boolean, default=False, nullable=False)
    link_url = Column(String(255), nullable=True)

    user = relationship("User", back_populates="notifications")

from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid, get_utc_now


class QueueEntry(Base, TimestampMixin):
    __tablename__ = "queue_entries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    slot_id = Column(String(36), ForeignKey("slots.id", ondelete="CASCADE"), nullable=False, index=True)
    position = Column(Integer, nullable=False, index=True)  # 1, 2, 3...
    status = Column(String(20), default="WAITING", nullable=False)  # WAITING, PROMOTED, EXPIRED, CANCELLED
    party_size = Column(Integer, default=1, nullable=False)
    predicted_wait_time_minutes = Column(Float, default=0.0, nullable=False)

    joined_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    promoted_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="queue_entries")
    slot = relationship("Slot", back_populates="queue_entries")

    __table_args__ = (
        Index("ix_queue_slot_status_pos", "slot_id", "status", "position"),
    )

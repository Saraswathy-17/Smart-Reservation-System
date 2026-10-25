import random
import string
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid, get_utc_now


def generate_reservation_code() -> str:
    chars = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"RES-{chars}"


class Reservation(Base, TimestampMixin):
    __tablename__ = "reservations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    slot_id = Column(String(36), ForeignKey("slots.id", ondelete="CASCADE"), nullable=False, index=True)
    reservation_code = Column(String(20), unique=True, nullable=False, default=generate_reservation_code)
    party_size = Column(Integer, default=1, nullable=False)
    status = Column(String(20), default="CONFIRMED", nullable=False)  # CONFIRMED, CANCELLED, COMPLETED, NO_SHOW
    special_notes = Column(String(500), nullable=True)

    confirmed_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    cancellation_reason = Column(String(255), nullable=True)

    # Relationships
    user = relationship("User", back_populates="reservations")
    slot = relationship("Slot", back_populates="reservations")

    __table_args__ = (
        Index("ix_res_user_slot", "user_id", "slot_id"),
    )

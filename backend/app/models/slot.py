from sqlalchemy import Column, String, Integer, Date, Time, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class Slot(Base, TimestampMixin):
    __tablename__ = "slots"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    resource_id = Column(String(36), ForeignKey("resources.id", ondelete="CASCADE"), nullable=False)
    slot_date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    max_capacity = Column(Integer, default=1, nullable=False)
    current_reservations = Column(Integer, default=0, nullable=False)
    status = Column(String(20), default="AVAILABLE", nullable=False)  # AVAILABLE, PARTIAL, FULL

    # Relationships
    resource = relationship("Resource", back_populates="slots")
    reservations = relationship("Reservation", back_populates="slot", cascade="all, delete-orphan")
    queue_entries = relationship("QueueEntry", back_populates="slot", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_slot_resource_date", "resource_id", "slot_date"),
    )

    def recalculate_status(self):
        if self.current_reservations <= 0:
            self.current_reservations = 0
            self.status = "AVAILABLE"
        elif self.current_reservations < self.max_capacity:
            self.status = "PARTIAL"
        else:
            self.status = "FULL"

from sqlalchemy import Column, String, Integer, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid, get_utc_now


class Resource(Base, TimestampMixin):
    __tablename__ = "resources"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    description = Column(String(1000), nullable=True)
    category = Column(String(100), default="General", nullable=False)
    base_capacity = Column(Integer, default=1, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    slots = relationship("Slot", back_populates="resource", cascade="all, delete-orphan")

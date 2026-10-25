from sqlalchemy import Column, String, Text, DateTime
from app.core.database import Base
from app.models.base import generate_uuid, get_utc_now


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    entity_name = Column(String(50), nullable=False, index=True)
    entity_id = Column(String(36), nullable=True, index=True)
    action = Column(String(50), nullable=False, index=True)  # BOOK, CANCEL, PROMOTE, EXPIRE, LEAVE_QUEUE
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False, index=True)

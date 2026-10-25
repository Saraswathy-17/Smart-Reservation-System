from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    title: str
    message: str
    event_type: str
    is_read: bool
    link_url: Optional[str] = None
    created_at: datetime


class NotificationCreate(BaseModel):
    title: str
    message: str
    event_type: str = "SYSTEM_NOTICE"
    link_url: Optional[str] = None
    user_id: Optional[str] = None  # If None, broadcast to all users

from typing import Optional
from datetime import datetime, date, time
from pydantic import BaseModel, Field, ConfigDict


class QueueJoinRequest(BaseModel):
    slot_id: str
    party_size: int = Field(1, ge=1, le=50)


class QueuePredictionInfo(BaseModel):
    queue_position: int
    total_in_queue: int
    predicted_wait_time_minutes: float
    confidence_level: Optional[str] = "High"
    model_used: Optional[str] = "Hybrid M/M/c & Gradient Boosted Regressor"
    explanation: Optional[str] = None


class QueueResponse(BaseModel):
    id: str
    user_id: str
    slot_id: str
    position: int
    status: str  # WAITING, PROMOTED, EXPIRED, CANCELLED
    party_size: int
    predicted_wait_time_minutes: float
    joined_at: datetime
    promoted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    # Contextual fields for frontend cards
    resource_id: Optional[str] = None
    resource_name: Optional[str] = None
    slot_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

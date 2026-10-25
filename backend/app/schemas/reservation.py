from typing import Optional
from datetime import datetime, date, time
from pydantic import BaseModel, Field, ConfigDict


class ReservationCreate(BaseModel):
    slot_id: str
    party_size: int = Field(1, ge=1, le=50)
    special_notes: Optional[str] = Field(None, max_length=500)


class ReservationCancel(BaseModel):
    cancellation_reason: Optional[str] = Field("User requested cancellation", max_length=255)


class ReservationResponse(BaseModel):
    id: str
    user_id: str
    slot_id: str
    reservation_code: str
    party_size: int
    status: str  # CONFIRMED, CANCELLED, COMPLETED, NO_SHOW
    special_notes: Optional[str] = None
    confirmed_at: datetime
    cancelled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None
    created_at: Optional[datetime] = None

    # Enriched context fields for seamless UI display
    resource_id: Optional[str] = None
    resource_name: Optional[str] = None
    slot_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

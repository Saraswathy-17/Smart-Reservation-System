from typing import Optional, List
from datetime import date, time, datetime
from pydantic import BaseModel, Field, ConfigDict


class SlotBase(BaseModel):
    resource_id: str
    slot_date: date
    start_time: time
    end_time: time
    max_capacity: int = Field(1, ge=1)


class SlotCreate(SlotBase):
    pass


class SlotBatchGenerate(BaseModel):
    resource_id: str
    start_date: date
    end_date: date
    start_hour: int = Field(9, ge=0, le=23)
    end_hour: int = Field(17, ge=1, le=24)
    slot_duration_minutes: int = Field(60, ge=15, le=240)
    max_capacity: int = Field(1, ge=1)


class SlotResponse(BaseModel):
    id: str
    resource_id: str
    resource_name: Optional[str] = None
    slot_date: date
    start_time: time
    end_time: time
    max_capacity: int
    current_reservations: int
    available_capacity: int
    status: str  # AVAILABLE, PARTIAL, FULL
    active_queue_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

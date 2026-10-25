from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class ResourceBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    category: str = Field("General", max_length=100)
    base_capacity: int = Field(1, ge=1, le=100)
    is_active: bool = True


class ResourceCreate(ResourceBase):
    pass


class ResourceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    base_capacity: Optional[int] = Field(None, ge=1)
    is_active: Optional[bool] = None


class ResourceResponse(ResourceBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

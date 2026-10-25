from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class MetricCardData(BaseModel):
    title: str
    value: Any
    subtitle: Optional[str] = None
    trend_percent: Optional[float] = None


class HourlyDemand(BaseModel):
    hour: int
    label: str
    reservations: int
    queue_joins: int


class ResourceUtilization(BaseModel):
    resource_id: str
    resource_name: str
    category: str
    total_slots: int
    booked_slots: int
    occupancy_rate: float


class WaitTimeTrend(BaseModel):
    date: str
    avg_predicted_wait: float
    avg_actual_wait: float


class DailyReservation(BaseModel):
    date: str
    total: int
    confirmed: int
    cancelled: int


class AdminDashboardMetrics(BaseModel):
    total_resources: int
    total_slots_today: int
    total_active_reservations: int
    total_waiting_queue: int
    occupancy_rate_percent: float
    cancellation_rate_percent: float

    # Explicit Database-backed KPI fields requested by Part 14
    total_users: int = 0
    total_reservations: int = 0
    total_reservations_today: int = 0
    confirmed_reservations: int = 0
    cancelled_reservations: int = 0
    completed_reservations: int = 0
    current_queue_size: int = 0
    available_slots: int = 0
    partial_slots: int = 0
    full_slots: int = 0
    active_resources: int = 0
    users_currently_waiting: int = 0
    avg_wait_time_minutes: float = 0.0


class AnalyticsResponse(BaseModel):
    metrics: AdminDashboardMetrics
    hourly_demand: List[HourlyDemand]
    resource_utilization: List[ResourceUtilization]
    wait_time_trends: List[WaitTimeTrend]
    daily_reservations: List[DailyReservation] = []
    peak_hours: List[str] = []

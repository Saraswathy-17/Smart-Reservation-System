from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.resources import router as resources_router
from app.api.v1.slots import router as slots_router
from app.api.v1.reservations import router as reservations_router
from app.api.v1.queue import router as queue_router
from app.api.v1.admin import router as admin_router
from app.api.v1.notifications import router as notifications_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(resources_router)
api_router.include_router(slots_router)
api_router.include_router(reservations_router)
api_router.include_router(queue_router)
api_router.include_router(admin_router)
api_router.include_router(notifications_router)

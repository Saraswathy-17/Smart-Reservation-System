from typing import List, Union, Optional
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Reservation System"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "super-secret-production-key-change-in-env-9834275098"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Database URL
    DATABASE_URL: str = "sqlite+aiosqlite:///./smart_reservation.db"
    
    # Queue Promotion Strategy: DIRECT (immediate confirmed) or GRACE_PERIOD
    PROMOTION_STRATEGY: str = "DIRECT"
    PROMOTION_GRACE_PERIOD_MINUTES: int = 15

    # Google OAuth Settings
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: Optional[str] = "http://localhost:5173/auth/google/callback"

    # CORS origins
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow",
    )


from pathlib import Path
from dotenv import load_dotenv

# Ensure .env in backend directory overrides any stale system environment variables
_env_file = Path(__file__).resolve().parent.parent.parent / ".env"
if _env_file.exists():
    load_dotenv(dotenv_path=_env_file, override=True)

settings = Settings()

"""Application settings and environment configuration."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    """Centralized application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=(str(ROOT_DIR / ".env"), ".env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = Field(default="SATRIA SENTINEL")
    ENVIRONMENT: Literal["development", "staging", "production", "testing"] = Field(
        default="development"
    )
    APP_VERSION: str = Field(default="0.1.0")
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = Field(
        default="INFO"
    )

    API_V1_PREFIX: str = Field(default="/api/v1")
    BACKEND_HOST: str = Field(default="0.0.0.0")
    BACKEND_PORT: int = Field(default=8000, ge=1, le=65535)

    DATABASE_URL: str = Field(
        default="postgresql+psycopg://satria_dev:satria_local_dev_pw_2026@localhost:5432/satria_sentinel_db"
    )

    CORS_ORIGINS: str = Field(default="http://localhost:3000,http://127.0.0.1:3000")

    @field_validator("API_V1_PREFIX")
    @classmethod
    def validate_api_prefix(cls, value: str) -> str:
        """Ensure API prefix starts with a leading slash and has no trailing slash."""
        cleaned = value.strip()
        if not cleaned.startswith("/"):
            cleaned = f"/{cleaned}"
        return cleaned.rstrip("/")

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated CORS_ORIGINS into a clean list of allowed origins."""
        return [
            origin.strip()
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings instance."""
    return Settings()

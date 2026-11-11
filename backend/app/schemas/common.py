"""Shared Pydantic schemas for validation and error envelopes."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class PaginationParams(BaseModel):
    """Validated pagination query parameters."""

    model_config = ConfigDict(extra="forbid")

    page: int = Field(default=1, ge=1, le=10000, description="Page number (1-indexed)")
    page_size: int = Field(
        default=20, ge=1, le=100, description="Items per page (max 100)"
    )


class ErrorDetail(BaseModel):
    """Structured error body returned by centralized exception handlers."""

    code: str
    message: str
    request_id: str
    timestamp: datetime
    details: list[dict[str, Any]] | None = None


class ErrorEnvelope(BaseModel):
    """Top-level error response envelope."""

    error: ErrorDetail

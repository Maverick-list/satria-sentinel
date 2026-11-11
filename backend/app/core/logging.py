"""Structured logging configuration for SATRIA SENTINEL backend."""

from datetime import datetime, timezone
import json
import logging
import sys
from typing import Any


class StructuredJsonFormatter(logging.Formatter):
    """Format log records as single-line structured JSON objects."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if hasattr(record, "request_id"):
            payload["request_id"] = getattr(record, "request_id")
        if hasattr(record, "path"):
            payload["path"] = getattr(record, "path")
        if hasattr(record, "status_code"):
            payload["status_code"] = getattr(record, "status_code")
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=True)


def setup_logging(log_level: str = "INFO") -> None:
    """Configure root and application loggers with structured JSON output."""
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(StructuredJsonFormatter())

    root_logger.handlers.clear()
    root_logger.addHandler(handler)

    # Keep noisy third-party loggers at WARNING unless debugging
    logging.getLogger("uvicorn.access").handlers = [handler]
    logging.getLogger("uvicorn.error").handlers = [handler]
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

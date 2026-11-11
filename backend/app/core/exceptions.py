"""Centralized exception types and FastAPI error handlers.

Ensures stack traces and sensitive internal details are never exposed to API clients.
"""

from datetime import datetime, timezone
import logging
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("satria.exceptions")


class AppError(Exception):
    """Base application exception for controlled domain/service errors."""

    def __init__(
        self,
        message: str,
        code: str = "APPLICATION_ERROR",
        status_code: int = status.HTTP_400_BAD_REQUEST,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


def _build_error_payload(
    *,
    code: str,
    message: str,
    request: Request,
    details: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    request_id = getattr(request.state, "request_id", "unknown")
    payload: dict[str, Any] = {
        "error": {
            "code": code,
            "message": message,
            "request_id": request_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    }
    if details is not None:
        payload["error"]["details"] = details
    return payload


def register_exception_handlers(app: FastAPI) -> None:
    """Register centralized exception handlers on the FastAPI app instance."""

    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
        logger.warning(
            "Controlled application error: %s (%s)",
            exc.message,
            exc.code,
            extra={"path": request.url.path, "status_code": exc.status_code},
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=_build_error_payload(
                code=exc.code,
                message=exc.message,
                request=request,
            ),
        )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_exception(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        detail_msg = (
            exc.detail if isinstance(exc.detail, str) else "HTTP request error."
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=_build_error_payload(
                code=f"HTTP_{exc.status_code}",
                message=detail_msg,
                request=request,
            ),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        sanitized_details = [
            {
                "loc": [str(part) for part in err.get("loc", [])],
                "msg": err.get("msg", "Invalid value"),
                "type": err.get("type", "validation_error"),
            }
            for err in exc.errors()
        ]
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content=_build_error_payload(
                code="VALIDATION_ERROR",
                message="Request payload or parameters failed validation.",
                request=request,
                details=sanitized_details,
            ),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(
        request: Request, exc: Exception
    ) -> JSONResponse:
        logger.error(
            "Unhandled server exception on %s",
            request.url.path,
            exc_info=exc,
            extra={"path": request.url.path, "status_code": 500},
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_build_error_payload(
                code="INTERNAL_SERVER_ERROR",
                message="An unexpected internal error occurred. Please reference request_id when contacting support.",
                request=request,
            ),
        )

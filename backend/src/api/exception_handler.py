from fastapi import Request, Response
from starlette.responses import JSONResponse

from backend.src.service.exceptions import DuplicateError, NotFoundError, ForbiddenError


def duplicate_error_handler(request: Request, exc: DuplicateError) -> Response:
    """Обрабатывает DuplicateError: отвечает HTTP 409 с кодом и сообщением."""
    return JSONResponse(
        status_code=409,
        content={
            "success": False,
            "error": exc.message,
            "error_code": exc.error_code,
        },
    )

def not_found_error_handler(request: Request, exc: NotFoundError) -> Response:
    return JSONResponse(
        status_code=404,
        content={
            "success": False,
            "error": exc.message,
            "error_code": exc.error_code,
        }
    )

def forbidden_error_handler(request: Request, exc: ForbiddenError) -> Response:
    return JSONResponse(
        status_code=403,
        content={
            "success": False,
            "error": exc.message,
            "error_code": exc.error_code,
        }
    )
from fastapi import Request, Response
from starlette.responses import JSONResponse

from backend.src.service.exceptions import DuplicateError


def duplicate_error_handler(request: Request, exc: DuplicateError) -> Response:
    return JSONResponse(
        status_code=409,
        content={
            "success": False,
            "error": exc.message,
            "error_code": exc.error_code,
        },
    )
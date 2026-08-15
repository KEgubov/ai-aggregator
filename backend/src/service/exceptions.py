from typing import Optional

from sqlalchemy.exc import IntegrityError


class DuplicateError(IntegrityError):
    """Ошибка уникальности (дубликат сущности) с человекочитаемым сообщением."""

    def __init__(
        self,
        message,
        error_code: str = "DUPLICATE_ERROR",
        orig: Exception | None = None,
        params: tuple | None = None,
        statement: str | None = None,
    ):
        """Сохраняет message/error_code и прокидывает параметры в IntegrityError."""
        self.message = message
        self.error_code = error_code
        super().__init__(statement, params, orig)

    def __str__(self) -> str:
        """Строковое представление: ``ERROR_CODE: message``."""
        return f"{self.error_code}: {self.message}"


class NotFoundError(Exception):
    def __init__(self, message: str, error_code: str = "NOT_FOUND"):
        self.message = message
        self.error_code = error_code

    def __str__(self) -> str:
        return f"{self.error_code}: {self.message}"


class ForbiddenError(Exception):
    def __init__(self, message: str, error_code: str = "FORBIDDEN"):
        self.message = message
        self.error_code = error_code

    def __str__(self) -> str:
        return f"{self.error_code}: {self.message}"

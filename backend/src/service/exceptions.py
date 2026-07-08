from sqlalchemy.exc import IntegrityError


class DuplicateError(IntegrityError):
    def __init__(
        self,
        message,
        error_code: str = "DUPLICATE_ERROR",
        orig: Exception | None = None,
        params: tuple | None = None,
        statement: str | None = None,
    ):
        self.message = message
        self.error_code = error_code
        super().__init__(statement, params, orig)

    def __str__(self) -> str:
        return f"{self.error_code}: {self.message}"
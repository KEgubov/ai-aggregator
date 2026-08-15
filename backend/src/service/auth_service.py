from sqlalchemy.ext.asyncio import AsyncSession
from backend.src.schemas.custom import LoginData, UserIDDTO


class AuthService:
    """Бизнес-логика аутентификации."""

    def __init__(self, auth_repository):
        self.auth_repository = auth_repository

    async def resp_authenticate_user(
        self, session: AsyncSession, creds: LoginData
    ) -> UserIDDTO | None:
        """Проверяет email/пароль и возвращает UserIDDTO при успехе."""
        resp = await self.auth_repository.authenticate_user(session, creds)
        if resp:
            result_dto = UserIDDTO.model_validate(resp, from_attributes=True)
            return result_dto
        return None

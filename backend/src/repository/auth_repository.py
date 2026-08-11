from typing import Any

from sqlalchemy import select, update, func, Row
from sqlalchemy.sql.elements import and_

from backend.src.core.database import async_session
from backend.src.models.orm_models import User
from backend.src.schemas.custom import LoginData
from backend.src.utils.security import verify_password


class AuthRepository:
    """Доступ к БД для аутентификации пользователей."""

    @staticmethod
    async def authenticate_user(creds: LoginData) -> Row[tuple[str, int]] | None:
        """Проверяет email/пароль; при успехе обновляет last_seen_at и возвращает user_id."""
        async with async_session() as session:
            query = select(User.user_id, User.password).where(User.email == creds.email)
            result = await session.execute(query)
            user = result.first()
            if not user:
                return None
            verif_pass = verify_password(user.password, creds.password)
            if not verif_pass:
                return None
            stmt = (
                update(User)
                .where(User.user_id == user.user_id)
                .values(last_seen_at=func.now())
            )
            await session.execute(stmt)
            await session.commit()
            return user

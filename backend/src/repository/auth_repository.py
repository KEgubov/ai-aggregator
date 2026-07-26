from typing import Any

from sqlalchemy import select, update, func
from sqlalchemy.sql.elements import and_

from backend.src.core.database import async_session
from backend.src.models.orm_models import User
from backend.src.schemas.custom import LoginData


class AuthRepository:

    @staticmethod
    async def authenticate_user(creds: LoginData) -> Any | None:
        async with async_session() as session:
            query = select(User.user_id).where(
                User.email == creds.email, and_(User.password == creds.password)
            )
            result = await session.execute(query)
            user = result.first()
            if user:
                stmt = (
                    update(User)
                    .where(User.user_id == user.user_id)
                    .values(last_seen_at=func.now())
                )
                await session.execute(stmt)
                await session.commit()
                return user
            return None


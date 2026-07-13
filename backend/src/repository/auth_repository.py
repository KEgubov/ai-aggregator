from sqlalchemy import select
from sqlalchemy.sql.elements import and_

from backend.src.core.database import async_session
from backend.src.models.orm_models import User
from backend.src.schemas.custom import LoginData


class AuthRepository:

    @staticmethod
    async def authenticate_user(creds: LoginData) -> dict:
        async with async_session() as session:
            query = select(User.user_id).where(
                User.email == creds.email, and_(User.password == creds.password)
            )
            result = await session.execute(query)
            return result.first() if result else None

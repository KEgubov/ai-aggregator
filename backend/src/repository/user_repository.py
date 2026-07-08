from sqlalchemy.exc import IntegrityError

from backend.src.core.database import async_session
from backend.src.models.orm_models import User
from backend.src.service.exceptions import DuplicateError


class UserRepository:

    @staticmethod
    async def create_user_in_db(user: User):
        async with async_session() as session:
            try:
                session.add(user)
                await session.commit()
                await session.refresh(user)
                return user
            except IntegrityError as e:
                if "already exists" in str(e.orig):
                    raise DuplicateError(
                        message="User already exists",
                        error_code="USER_DUPLICATE",
                    )
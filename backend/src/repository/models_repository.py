from sqlalchemy import select, update, func, Row

from backend.src.core.database import async_session
from backend.src.models.orm_models import AIModel, Chat, AIProviders, \
    AIProviderModel


class ModelRepository:

    @staticmethod
    async def meta_for_list_models() -> list[AIModel]:
        async with async_session() as session:
            query = (
                select(AIModel.model_id, AIModel.display_name, AIModel.description)
            )
            result = await session.execute(query)
            return result.all() if result else None

    @staticmethod
    async def meta_for_api(model_id: int) -> Row[tuple[str, str]]:
        async with async_session() as session:
            stmt = (
                select(AIModel.model_name, AIProviders.provider_name)
                .join(AIProviderModel,
                      AIModel.model_id == AIProviderModel.model_id)
                .join(AIProviders,
                      AIProviderModel.provider_id == AIProviders.provider_id)
                .where(AIModel.model_id == model_id)
            )
            result = await session.execute(stmt)
            return result.first() if result else None

    @staticmethod
    async def save_model_for_the_chat(
        chat_id: int, model_id: int, owner_id: int
    ) -> bool:
        async with async_session() as session:
            query = (
                select(AIModel.display_name)
                .where(AIModel.model_id == model_id)
            )
            result = await session.execute(query)
            display_name = result.scalar_one_or_none()

            if not display_name:
                raise ValueError(f"Модель с ID {model_id} не найдена")

            chat_query = (
                select(Chat)
                .where(Chat.chat_id == chat_id, Chat.owner_id == owner_id)
            )
            chat_result = await session.execute(chat_query)
            chat = chat_result.scalar_one_or_none()
            if not chat:
                return False

            current_models = list(chat.ai_models or [])
            if display_name in current_models:
                return True

            stmt = (
                update(Chat)
                .where(Chat.chat_id == chat_id)
                .values(ai_models=current_models + [display_name])
            )
            await session.execute(stmt)
            await session.commit()
            return True

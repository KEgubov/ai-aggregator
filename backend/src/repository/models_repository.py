from sqlalchemy import select, update, func
from sqlalchemy.dialects.mysql import insert

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
    async def meta_for_api(model_id: int) -> list[tuple[str]]:
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
            return result.all() if result else None

    @staticmethod
    async def save_model_for_the_chat(model_id: int):
        async with async_session() as session:
            query = (
                select(AIModel.display_name)
                .where(AIModel.model_id == model_id)
            )
            result= await session.execute(query)
            display_name = result.scalar_one_or_none()

            if not display_name:
                raise ValueError(f"Модель с ID {model_id} не найдена")

            stmt = (
                insert(Chat).values(
                    ai_models=[display_name]
                )
            )
            await session.execute(stmt)
            await session.commit()


    @staticmethod
    async def delete_model_from_the_chat(model_id: int):
        async with async_session() as session:
            query = select(AIModel.display_name).where(
                AIModel.model_id == model_id)
            result = await session.execute(query)
            display_name = result.scalar_one_or_none()

            if display_name is None:
                raise ValueError(f"Модель с ID {model_id} не найдена")

            stmt = (
                update(Chat)
                .values(
                    ai_models=func.array_remove(Chat.ai_models, display_name))
                .where(Chat.ai_models.any(display_name))
            )

            await session.execute(stmt)
            await session.commit()

model_repository = ModelRepository()

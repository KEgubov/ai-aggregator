import logging

from sqlalchemy.ext.asyncio import AsyncSession

from backend.src.schemas.custom import AIModelMetaDTO, ModelProviderResponse

logger = logging.getLogger("app")


class ModelService:
    """Бизнес-логика каталога AI-моделей и привязки модели к чату."""

    def __init__(self, model_repository):
        self.model_repository = model_repository

    async def list_model_validate(
        self, session: AsyncSession
    ) -> list[AIModelMetaDTO] | None:
        """Возвращает список моделей с метаданными для UI или None."""
        all_models = await self.model_repository.meta_for_list_models(session)
        if all_models:
            result_dto = [
                AIModelMetaDTO.model_validate(models, from_attributes=True)
                for models in all_models
            ]
            return result_dto
        return None

    async def get_meta_for_api(
        self, session: AsyncSession, model_id: int
    ) -> list[ModelProviderResponse] | None:
        """Возвращает имя модели и провайдера для вызова внешнего API."""
        model_name = await self.model_repository.meta_for_api(session, model_id)
        if model_name:
            result_dto = [
                ModelProviderResponse.model_validate(model_name, from_attributes=True)
            ]
            return result_dto
        return None

    async def link_model(
        self, session: AsyncSession, chat_id: int, model_id: int, owner_id: int
    ) -> bool:
        """Привязывает display_name модели к чату владельца."""
        linked_model = await self.model_repository.save_model_for_the_chat(
            session, chat_id, model_id, owner_id
        )
        if not linked_model:
            logger.warning(f"Model with id {model_id} not linked")
            return False
        return True

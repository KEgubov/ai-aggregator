import asyncio

from backend.src.repository.models_repository import ModelRepository
from backend.src.schemas.custom import AIModelMetaDTO, ModelProviderResponse


class ModelService:
    def __init__(self, model_repository):
        self.model_repository = model_repository

    async def list_model_validate(self) -> list[AIModelMetaDTO] | None:
        all_models = await self.model_repository.meta_for_list_models()
        if all_models:
            result_dto = [
                AIModelMetaDTO.model_validate(models, from_attributes=True)
                for models in all_models
            ]
            return result_dto
        return None

    async def get_meta_for_api(self, model_id: int) -> ModelProviderResponse | None:
        model_name = await self.model_repository.meta_for_api(model_id)
        if model_name:
            result_dto = [
                ModelProviderResponse.model_validate(model_name, from_attributes=True)
            ]
            return result_dto
        return None

    async def link_model(self, model_id: int):
        response = await self.model_repository.save_model_for_the_chat(model_id)
        if not response:
            return None
        return True

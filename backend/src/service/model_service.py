import asyncio

from backend.src.repository.models_repository import model_repository
from backend.src.schemas.custom import AIModelMetaDTO


class ModelService:

    @staticmethod
    async def list_model_validate() -> list[AIModelMetaDTO] | None:
        all_models = await model_repository.meta_for_list_models()
        if all_models:
            result_dto = [
                AIModelMetaDTO.model_validate(models, from_attributes=True)
                for models in all_models
            ]
            return result_dto
        return None

    @staticmethod
    async def get_model_name_for_api(model_id: int) -> list[str] | None:
        model_name = await model_repository.model_name_for_api(model_id)
        return model_name if model_name else None

    @staticmethod
    async def link_model(model_id: int):
        response = await model_repository.save_model_for_the_chat(model_id)
        if not response:
            return None
        return True


model_service = ModelService()
# print(asyncio.run(model_service.model_name_for_api()))
# print(asyncio.run(model_service.get_model_name_for_api(1)))
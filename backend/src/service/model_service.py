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

    async def get_meta_for_api(self, model_id: int) -> list[
                                                           ModelProviderResponse] | None:
        model_name = await self.model_repository.meta_for_api(model_id)
        if model_name:
            result_dto = [
                ModelProviderResponse.model_validate(model_name, from_attributes=True)
            ]
            return result_dto
        return None

    async def link_model(
        self, chat_id: int, model_id: int, owner_id: int
    ) -> bool:
        return await self.model_repository.save_model_for_the_chat(
            chat_id, model_id, owner_id
        )

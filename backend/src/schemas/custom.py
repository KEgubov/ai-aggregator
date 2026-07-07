from pydantic import BaseModel, Field


class AIModelNameDTO(BaseModel):
    model_name: str = Field(max_length=100, description='Model name for API')

class AIModelMetaDTO(BaseModel):
    model_id: int
    display_name: str = Field(max_length=100, description='Display name for frontend')
    description: str = Field(max_length=20, description='Description model for frontend')

class ModelProviderResponse(BaseModel):
    model_name: str
    provider_name: str

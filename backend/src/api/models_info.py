from typing import Any

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.src.api.dependency import get_model_service, get_current_user, get_session
from backend.src.schemas.custom import CurrentUserDTO
from backend.src.service.model_service import ModelService

router = APIRouter(prefix="/model", tags=["Model"])


@router.get("/list")
async def get_model_list(
    model_service: ModelService = Depends(get_model_service),
    current_user: CurrentUserDTO = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, str | Any]:
    """Возвращает список доступных AI-моделей с метаданными для UI."""
    models = await model_service.list_model_validate(session)
    if not models:
        raise HTTPException(status_code=404, detail="No models found")
    return {"status": "ok", "models": models}

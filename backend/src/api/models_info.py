from typing import Any

from fastapi import APIRouter, HTTPException

from backend.src.service.model_service import model_service

router = APIRouter(prefix="/models", tags=["models"])

@router.get("/list")
async def get_model_list() -> dict[str, str | Any]:
    models = await model_service.list_model_validate()
    if not models:
        raise HTTPException(status_code=404, detail="No models found")
    return {"status": "ok", "models": models}

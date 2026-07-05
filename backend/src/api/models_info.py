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

@router.post("/list/choice")
async def choice_model_for_field(model_id: int) -> dict[str, str]:
    response = await model_service.link_model(model_id)
    if not response:
        raise HTTPException(status_code=404, detail="No model found")
    return {"status": "ok", "model": response}

@router.delete("/list/delete")
async def delete_model_from_field(model_id: int) -> dict[str, str | Any]:
    pass
    



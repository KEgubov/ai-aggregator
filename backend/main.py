import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.src.api import main_router
from backend.src.core.logger import setup_logging

setup_logging("AI Agregator")

logger = logging.getLogger("app")

app = FastAPI(title="AI Agregator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(main_router)



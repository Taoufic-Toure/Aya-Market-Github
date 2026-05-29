"""Point d'entrée FastAPI du backend AyaMarket."""
from __future__ import annotations
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.middleware.request_logging import log_request_middleware
from app.routes.ai import router as ai_router
from app.routes.payments import router as payments_router
from app.routes.health import router as health_router
from app.utils.logging_config import configure_logging

settings = get_settings()
configure_logging()

app = FastAPI(
    title="AyaMarket Backend",
    version="1.0.0",
    description="API AyaMarket — IA (Aya) et Paiements FedaPay.",
)

app.middleware("http")(log_request_middleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", tags=["Root"])
async def root() -> dict[str, str]:
    return {"message": "Bienvenue sur AyaMarket Backend"}

app.include_router(health_router)
app.include_router(ai_router)
app.include_router(payments_router)
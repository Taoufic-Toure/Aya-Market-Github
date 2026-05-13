"""Point d'entrée FastAPI du backend BoutiqueAI."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.middleware.request_logging import log_request_middleware
from app.middleware.auth import AuthMiddleware
from app.routes.ai import router as ai_router
from app.routes.auth import router as auth_router
from app.routes.health import router as health_router
from app.routes.products import router as products_router
from app.routes.products_db import router as products_db_router
from app.routes.cart import router as cart_router
from app.routes.orders import router as orders_router
from app.routes.payments import router as payments_router
from app.utils.logging_config import configure_logging

settings = get_settings()
configure_logging()

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="API FastAPI d'AyaMarket avec IA unifiée (Groq, Gemini, Mistral).",
)

# Middleware d'authentification
app.add_middleware(AuthMiddleware)

# Middleware de logging
app.middleware("http")(log_request_middleware)

# CORS pour autoriser le frontend local
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_logger(request, call_next):  # type: ignore[no-untyped-def]
    """Branche le middleware de logs HTTP."""
    return await log_request_middleware(request, call_next)


@app.get(
    "/",
    tags=["Root"],
    summary="Accueil API",
    responses={
        200: {
            "description": "Message d'accueil",
            "content": {
                "application/json": {
                    "example": {"message": "Bienvenue sur AyaMarket Backend"}
                }
            },
        }
    },
)
async def root() -> dict[str, str]:
    """Retourne un message d'accueil simple."""
    return {"message": "Bienvenue sur AyaMarket Backend"}


app.include_router(auth_router)
app.include_router(health_router)
app.include_router(products_router)
app.include_router(products_db_router)
app.include_router(cart_router)
app.include_router(orders_router)
app.include_router(payments_router)
app.include_router(ai_router)

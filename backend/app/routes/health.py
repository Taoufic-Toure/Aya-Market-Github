"""Routes de santé de l'API."""
from __future__ import annotations
from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("", summary="Vérifie l'état de l'API")
async def health_check() -> dict[str, str]:
    """Teste la disponibilité de l'API."""
    return {"status": "ok", "service": "AyaMarket Backend"}
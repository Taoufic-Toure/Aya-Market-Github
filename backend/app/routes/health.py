"""Routes de santé de l'API."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db_session

router = APIRouter(prefix="/health", tags=["Health"])


@router.get(
    "",
    summary="Vérifie l'état de l'API et de la base",
    responses={
        200: {
            "description": "API et base disponibles",
            "content": {
                "application/json": {
                    "example": {"status": "ok", "database": "connected"}
                }
            },
        }
    },
)
async def health_check(db: AsyncSession = Depends(get_db_session)) -> dict[str, str]:
    """Teste la disponibilité de l'API et la connexion Supabase."""
    await db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}

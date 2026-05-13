"""Connexion asynchrone PostgreSQL (Supabase)."""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings

settings = get_settings()

# Moteur asynchrone SQLAlchemy branché sur PostgreSQL Supabase
engine = create_async_engine(
    settings.SUPABASE_DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
)

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Fournit une session DB à utiliser dans les routes/services."""
    async with SessionLocal() as session:
        yield session

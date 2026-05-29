"""Configuration centralisée de l'application."""

from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Paramètres chargés depuis les variables d'environnement."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "BoutiqueAI Backend"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    SUPABASE_DATABASE_URL: str

    # Clés Supabase pour le storage
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5176",
        "http://127.0.0.1:5176",
    ]

    CLAUDE_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-3-5-sonnet-latest"

    FEDAPAY_API_KEY: str = ""
    FEDAPAY_ENV: str = "sandbox"
    FEDAPAY_WEBHOOK_TOKEN: str = ""
    FRONTEND_URL: str = "http://localhost:5173"

    # Clés API pour les services IA
    GROQ_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    MISTRAL_API_KEY: str = ""
    
    # Clé secrète pour JWT
    SECRET_KEY: str = "aya_secret_key_2024"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | List[str]) -> List[str]:
        """Transforme une chaîne CSV en liste Python."""
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Retourne une instance unique des paramètres."""
    return Settings()

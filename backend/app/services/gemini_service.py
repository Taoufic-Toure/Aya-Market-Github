"""Service Gemini pour le conseiller vendeur.

Gemini 2.0 Flash est utilisé pour:
- Conseils business : Analyse rapide et conseils pertinents pour les vendeurs
- Stratégies commerciales : Recommandations adaptées au marché béninois
"""

from __future__ import annotations

import logging
from typing import Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class GeminiService:
    """Service pour interagir avec l'API Google Gemini."""
    
    def __init__(self) -> None:
        """Initialise le client Gemini avec la clé API."""
        self.api_key = settings.GEMINI_API_KEY
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
        self.model = "gemini-2.5-flash"

    async def _generate_from_prompt(self, prompt: str) -> str:
        """Appel unique generateContent (Gemini)."""
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 900,
                "topK": 40,
                "topP": 0.95,
            },
        }
        headers = {"Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/models/{self.model}:generateContent?key={self.api_key}",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            if "candidates" in data and len(data["candidates"]) > 0:
                return data["candidates"][0]["content"]["parts"][0]["text"]
            raise Exception("Aucune réponse générée par Gemini")

    async def get_business_advice(self, business_type: Optional[str], question: str) -> str:
        """Mode legacy : un seul bloc question (analyse JSON ou anciens clients)."""
        try:
            context = f"""Tu es un expert en business et e-commerce spécialisé dans le marché béninois.
            Tu donnes des conseils pratiques et adaptés aux vendeurs locaux sur AyaMarket.
            Tu es Aya, l'assistante business d'AyaMarket.

            Type de business: {business_type or 'non spécifié'}

            Réponds de manière professionnelle, concise et actionnable.
            Considère les réalités économiques du Bénin, les habitudes de consommation locales,
            et les opportunités du e-commerce en Afrique de l'Ouest."""

            prompt = f"{context}\n\nQuestion: {question}"
            return await self._generate_from_prompt(prompt)

        except httpx.HTTPStatusError as e:
            logger.error(f"Erreur HTTP Gemini: {e.response.status_code} - {e.response.text}")
            raise Exception(f"Erreur service conseil: {e.response.status_code}")
        except Exception as e:
            logger.error(f"Erreur inattendue Gemini: {str(e)}")
            raise Exception("Service de conseil indisponible")

    async def get_business_advice_structured(
        self,
        *,
        business_type: Optional[str],
        memory_hint: str,
        vendor_context: str,
        history_text: str,
        user_message: str,
    ) -> str:
        """Mode chat vendeur : system + mémoire + contexte + historique trim + message."""
        from app.utils.advisor_memory import build_context

        try:
            system, user_block = build_context(
                business_type=business_type,
                memory_hint=memory_hint,
                vendor_context=vendor_context,
                history_text=history_text,
                message=user_message,
            )
            prompt = f"{system}\n\n---\n{user_block}"
            return await self._generate_from_prompt(prompt)
        except httpx.HTTPStatusError as e:
            logger.error(f"Erreur HTTP Gemini: {e.response.status_code} - {e.response.text}")
            raise Exception(f"Erreur service conseil: {e.response.status_code}")
        except Exception as e:
            logger.error(f"Erreur inattendue Gemini: {str(e)}")
            raise Exception("Service de conseil indisponible")


# Instance singleton du service
gemini_service = GeminiService()

"""Service d'intégration Claude API."""

from __future__ import annotations

from anthropic import Anthropic

from app.config import get_settings


class ClaudeService:
    """Encapsule les appels à l'API Claude."""

    def __init__(self) -> None:
        settings = get_settings()
        self._client = Anthropic(api_key=settings.CLAUDE_API_KEY)
        self._model = settings.CLAUDE_MODEL

    async def generate_product_pitch(self, product_name: str) -> str:
        """Génère un pitch marketing court en français."""
        response = self._client.messages.create(
            model=self._model,
            max_tokens=200,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Rédige une description produit courte, persuasive et claire "
                        f"pour un produit e-commerce béninois nommé: {product_name}."
                    ),
                }
            ],
        )
        if response.content:
            first_block = response.content[0]
            return getattr(first_block, "text", "Description générée.")
        return "Description générée."

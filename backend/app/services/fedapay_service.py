"""Service d'integration FedaPay pour AyaMarket."""

from __future__ import annotations

from typing import Any

import httpx

from app.config import get_settings


class FedaPayService:
    """Encapsule les appels serveur vers l'API FedaPay."""

    def __init__(self) -> None:
        settings = get_settings()
        self.api_key = settings.FEDAPAY_API_KEY
        self.environment = settings.FEDAPAY_ENV
        self.base_url = (
            "https://api.fedapay.com/v1"
            if self.environment == "live"
            else "https://sandbox-api.fedapay.com/v1"
        )

    def _headers(self) -> dict[str, str]:
        if not self.api_key:
            raise ValueError("FEDAPAY_API_KEY manquante cote backend")
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def create_transaction(
        self,
        *,
        amount: int,
        description: str,
        callback_url: str,
        customer: dict[str, Any],
        metadata: dict[str, Any],
    ) -> dict[str, Any]:
        """Cree une transaction FedaPay en XOF."""
        payload = {
            "description": description,
            "amount": amount,
            "currency": {"iso": "XOF"},
            "callback_url": callback_url,
            "customer": customer,
            "metadata": metadata,
        }

        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                f"{self.base_url}/transactions",
                headers=self._headers(),
                json=payload,
            )
            response.raise_for_status()
            return response.json()

    async def generate_payment_token(self, transaction_id: str | int) -> dict[str, Any]:
        """Genere le token et le lien de paiement securise."""
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                f"{self.base_url}/transactions/{transaction_id}/token",
                headers=self._headers(),
            )
            response.raise_for_status()
            return response.json()

    async def get_transaction(self, transaction_id: str | int) -> dict[str, Any]:
        """Recupere le statut reel d'une transaction chez FedaPay."""
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(
                f"{self.base_url}/transactions/{transaction_id}",
                headers=self._headers(),
            )
            response.raise_for_status()
            return response.json()


fedapay_service = FedaPayService()

"""Routes de paiement FedaPay pour AyaMarket."""

from __future__ import annotations

from typing import Any, Literal

import httpx
from fastapi import APIRouter, Header, HTTPException, Request, status
from pydantic import BaseModel, Field
from supabase import create_client

from app.config import get_settings
from app.services.fedapay_service import fedapay_service

settings = get_settings()
router = APIRouter(prefix="/payments/fedapay", tags=["Paiements FedaPay"])

_supabase_client = None

PaymentMethod = Literal["mtn", "moov", "celtiis"]


def get_supabase_client():
    """Cree le client Supabase seulement quand un endpoint paiement est appele."""
    global _supabase_client
    if _supabase_client is None:
        if not settings.SUPABASE_URL or not (settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_ANON_KEY):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Configuration Supabase backend manquante",
            )
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_ANON_KEY)
    return _supabase_client


class CreatePaymentRequest(BaseModel):
    """Payload minimal pour initier le paiement d'une commande existante."""

    commande_id: str = Field(..., min_length=10)
    payment_method: PaymentMethod
    customer_phone: str | None = Field(None, max_length=32)


class PaymentStatusResponse(BaseModel):
    """Statut retourne au frontend apres verification serveur."""

    commande_id: str
    transaction_id: str | None
    payment_status: str
    order_status: str
    verified: bool


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token manquant")
    try:
        scheme, token = authorization.split(" ", 1)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Format Authorization invalide")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token requis")
    return token


def _get_supabase_user(authorization: str | None) -> dict[str, Any]:
    """Valide le JWT Supabase sans exposer de cle au frontend."""
    token = _extract_bearer_token(authorization)
    try:
        response = get_supabase_client().auth.get_user(token)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token Supabase invalide") from exc
    user = response.user
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilisateur non authentifie")
    return {"id": user.id, "email": user.email or ""}


def _single_response(result: Any) -> dict[str, Any] | None:
    return result.data if getattr(result, "data", None) else None


def _fedapay_object(payload: dict[str, Any], key: str) -> dict[str, Any]:
    value = payload.get(key)
    if isinstance(value, dict):
        return value
    return payload


def _payment_gateway_error(error: Exception) -> HTTPException:
    if isinstance(error, httpx.HTTPStatusError):
        detail = error.response.text or "Erreur FedaPay"
        return HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)
    return HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(error))


async def _get_owned_commande(commande_id: str, user_id: str) -> dict[str, Any]:
    result = (
        get_supabase_client().table("commandes")
        .select("*")
        .eq("id", commande_id)
        .eq("acheteur_id", user_id)
        .maybe_single()
        .execute()
    )
    commande = _single_response(result)
    if not commande:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commande introuvable")
    return commande


def _update_commande(commande_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    result = (
        get_supabase_client().table("commandes")
        .update(payload)
        .eq("id", commande_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Mise a jour commande impossible")
    return result.data[0]


async def _sync_commande_with_fedapay(commande: dict[str, Any]) -> PaymentStatusResponse:
    transaction_id = commande.get("fedapay_transaction_id")
    if not transaction_id:
        return PaymentStatusResponse(
            commande_id=commande["id"],
            transaction_id=None,
            payment_status=commande.get("payment_status") or "not_started",
            order_status=commande.get("statut") or "en_attente",
            verified=False,
        )

    transaction_payload = await fedapay_service.get_transaction(transaction_id)
    transaction = _fedapay_object(transaction_payload, "transaction")
    fedapay_status = transaction.get("status") or "pending"

    update_payload: dict[str, Any] = {"payment_status": fedapay_status}
    if fedapay_status == "approved":
        update_payload["statut"] = "confirmee"
    elif fedapay_status in {"declined", "canceled"}:
        update_payload["statut"] = "annulee"

    updated = _update_commande(commande["id"], update_payload)
    return PaymentStatusResponse(
        commande_id=updated["id"],
        transaction_id=str(transaction_id),
        payment_status=updated.get("payment_status") or fedapay_status,
        order_status=updated.get("statut") or "en_attente",
        verified=True,
    )


@router.post("/transactions", status_code=status.HTTP_201_CREATED)
async def create_fedapay_transaction(
    payload: CreatePaymentRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    """Cree une transaction FedaPay pour une commande appartenant a l'acheteur."""
    user = _get_supabase_user(authorization)
    commande = await _get_owned_commande(payload.commande_id, user["id"])

    if commande.get("payment_status") == "approved":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Commande deja payee")

    amount = int(commande["montant_total"])
    if amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Montant commande invalide")

    callback_url = f"{settings.FRONTEND_URL.rstrip('/')}/?payment_order_id={commande['id']}"
    customer: dict[str, Any] = {"email": user["email"]}
    if payload.customer_phone:
        customer["phone_number"] = {"number": payload.customer_phone, "country": "bj"}

    try:
        transaction_payload = await fedapay_service.create_transaction(
            amount=amount,
            description=f"AyaMarket - Commande #{commande['id'][:8]}",
            callback_url=callback_url,
            customer=customer,
            metadata={
                "commande_id": commande["id"],
                "acheteur_id": user["id"],
                "payment_method": payload.payment_method,
            },
        )
        transaction = _fedapay_object(transaction_payload, "transaction")
        transaction_id = str(transaction.get("id"))
        token_payload = await fedapay_service.generate_payment_token(transaction_id)
        token = _fedapay_object(token_payload, "token")
        if not token.get("url"):
            raise ValueError("Lien de paiement FedaPay manquant")
    except (httpx.HTTPError, ValueError) as exc:
        raise _payment_gateway_error(exc) from exc

    _update_commande(
        commande["id"],
        {
            "mode_paiement": payload.payment_method,
            "payment_status": transaction.get("status") or "pending",
            "fedapay_transaction_id": transaction_id,
            "fedapay_payment_url": token.get("url"),
        },
    )

    return {
        "commande_id": commande["id"],
        "transaction_id": transaction_id,
        "payment_status": transaction.get("status") or "pending",
        "payment_url": token.get("url"),
        "environment": settings.FEDAPAY_ENV,
    }


@router.get("/transactions/{commande_id}/status", response_model=PaymentStatusResponse)
async def verify_fedapay_status(
    commande_id: str,
    authorization: str | None = Header(default=None),
) -> PaymentStatusResponse:
    """Verifie le statut reel chez FedaPay avant confirmation commande."""
    user = _get_supabase_user(authorization)
    commande = await _get_owned_commande(commande_id, user["id"])
    try:
        return await _sync_commande_with_fedapay(commande)
    except httpx.HTTPError as exc:
        raise _payment_gateway_error(exc) from exc


@router.post("/webhook")
async def fedapay_webhook(request: Request, x_ayamarket_webhook_token: str | None = Header(default=None)) -> dict[str, str]:
    """Webhook FedaPay: verifie toujours la transaction via l'API avant mise a jour."""
    if settings.FEDAPAY_WEBHOOK_TOKEN and x_ayamarket_webhook_token != settings.FEDAPAY_WEBHOOK_TOKEN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Webhook token invalide")

    event = await request.json()
    entity = event.get("entity") or event.get("data", {}).get("entity") or {}
    transaction_id = entity.get("id") or event.get("transaction_id")
    metadata = entity.get("metadata") or {}
    commande_id = metadata.get("commande_id")

    if not transaction_id and not commande_id:
        return {"status": "ignored"}

    query = get_supabase_client().table("commandes").select("*")
    if commande_id:
        query = query.eq("id", commande_id)
    else:
        query = query.eq("fedapay_transaction_id", str(transaction_id))
    result = query.maybe_single().execute()
    commande = _single_response(result)
    if not commande:
        return {"status": "ignored"}

    await _sync_commande_with_fedapay(commande)
    return {"status": "ok"}

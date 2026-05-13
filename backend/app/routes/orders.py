"""Routes de gestion des commandes pour AyaMarket."""

from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db_session
from app.schemas.order import (
    OrderCreate, OrderStatusUpdate, OrderResponse, OrderListResponse, OrderQueryParams
)
from app.routes.auth import get_current_user
from app.services.order_service import order_service

router = APIRouter(prefix="/commandes", tags=["Commandes"])


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    order_data: OrderCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
) -> dict[str, Any]:
    """
    Transforme le panier en commande.
    
    - Authentification requise
    - Crée la commande et les items
    - Décrémente le stock des produits
    - Vide le panier après création
    """
    user_id = UUID(current_user["id"])
    
    # Créer la commande à partir du panier
    order, error = await order_service.create_order_from_cart(user_id, order_data, db)
    
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    # Récupérer les détails complets de la commande
    complete_order = await order_service.get_order_with_items(order.id, user_id, db)
    
    if not complete_order:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la récupération de la commande"
        )
    
    # Formater la réponse
    return _format_order_response(complete_order)


@router.get("/", response_model=OrderListResponse, status_code=status.HTTP_200_OK)
async def get_user_orders(
    page: int = Query(1, ge=1, description="Numéro de page"),
    limit: int = Query(20, ge=1, le=100, description="Éléments par page"),
    statut: Optional[str] = Query(None, description="Filtre par statut"),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
) -> dict[str, Any]:
    """
    Récupère l'historique des commandes de l'utilisateur.
    
    - Authentification requise
    - Pagination disponible
    - Filtre par statut optionnel
    """
    user_id = UUID(current_user["id"])
    
    # Récupérer les commandes
    orders, total = await order_service.get_user_orders(user_id, page, limit, statut, db)
    
    # Formater les commandes
    formatted_orders = []
    for order in orders:
        formatted_orders.append(_format_order_response(order))
    
    # Calculer le nombre de pages
    pages = (total + limit - 1) // limit
    
    return {
        "commandes": formatted_orders,
        "total": total,
        "page": page,
        "pages": pages,
        "limit": limit
    }


@router.get("/{order_id}", response_model=OrderResponse, status_code=status.HTTP_200_OK)
async def get_order(
    order_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
) -> dict[str, Any]:
    """
    Récupère les détails d'une commande spécifique.
    
    - Authentification requise
    - Vérifie que l'utilisateur est propriétaire de la commande
    """
    user_id = UUID(current_user["id"])
    
    # Récupérer la commande
    order = await order_service.get_order_with_items(order_id, user_id, db)
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Commande non trouvée"
        )
    
    return _format_order_response(order)


@router.put("/{order_id}/statut", response_model=OrderResponse, status_code=status.HTTP_200_OK)
async def update_order_status(
    order_id: UUID,
    status_update: OrderStatusUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
) -> dict[str, Any]:
    """
    Met à jour le statut d'une commande.
    
    - Authentification requise
    - Les vendeurs peuvent modifier les commandes contenant leurs produits
    - Les clients peuvent voir mais pas modifier
    """
    user_id = UUID(current_user["id"])
    is_vendor = current_user.get("role") == "vendeur"
    
    # Mettre à jour le statut
    order, error = await order_service.update_order_status(
        order_id, status_update, user_id, is_vendor, db
    )
    
    if error:
        if "non trouvée" in error:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error
            )
    
    return _format_order_response(order)


@router.get("/vendor/statistics", response_model=dict, status_code=status.HTTP_200_OK)
async def get_vendor_statistics(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
) -> dict[str, Any]:
    """
    Récupère les statistiques des commandes pour un vendeur.
    
    - Authentification requise
    - Réservé aux vendeurs uniquement
    """
    if current_user.get("role") != "vendeur":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les vendeurs peuvent accéder aux statistiques"
        )
    
    vendor_id = UUID(current_user["id"])
    
    # Récupérer les statistiques
    statistics = await order_service.get_order_statistics(vendor_id=vendor_id, db=db)
    
    return statistics


@router.get("/vendor/orders", response_model=OrderListResponse, status_code=status.HTTP_200_OK)
async def get_vendor_orders(
    page: int = Query(1, ge=1, description="Numéro de page"),
    limit: int = Query(20, ge=1, le=100, description="Éléments par page"),
    statut: Optional[str] = Query(None, description="Filtre par statut"),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
) -> dict[str, Any]:
    """
    Récupère les commandes contenant les produits du vendeur.
    
    - Authentification requise
    - Réservé aux vendeurs uniquement
    - Montre toutes les commandes avec leurs produits
    """
    if current_user.get("role") != "vendeur":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les vendeurs peuvent accéder à leurs commandes"
        )
    
    vendor_id = UUID(current_user["id"])
    
    # Récupérer les commandes du vendeur
    orders, total = await order_service.get_vendor_orders(vendor_id, page, limit, statut, db)
    
    # Formater les commandes
    formatted_orders = []
    for order in orders:
        formatted_orders.append(_format_order_response(order))
    
    # Calculer le nombre de pages
    pages = (total + limit - 1) // limit
    
    return {
        "commandes": formatted_orders,
        "total": total,
        "page": page,
        "pages": pages,
        "limit": limit
    }


def _format_order_response(order) -> dict[str, Any]:
    """
    Formate une commande pour la réponse API.
    
    Args:
        order: Objet commande avec ses items
        
    Returns:
        Dictionnaire formaté pour la réponse
    """
    # Formater les items
    items = []
    total_items = 0
    total_quantity = 0
    
    for item in order.items:
        subtotal = item.quantity * item.price
        items.append({
            "id": item.id,
            "product_id": item.product_id,
            "quantity": item.quantity,
            "price": item.price,
            "created_at": item.created_at,
            "product_nom": item.product.nom if hasattr(item, 'product') and item.product else "Produit supprimé",
            "product_image_url": item.product.image_url if hasattr(item, 'product') and item.product else None,
            "product_categorie": item.product.categorie if hasattr(item, 'product') and item.product else None,
            "subtotal": subtotal
        })
        total_items += 1
        total_quantity += item.quantity
    
    return {
        "id": order.id,
        "user_id": order.user_id,
        "total_price": float(order.total_price),
        "statut": order.statut.value,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
        "shipping_address": order.shipping_address,
        "notes": order.notes,
        "items": items,
        "total_items": total_items,
        "total_quantity": total_quantity
    }

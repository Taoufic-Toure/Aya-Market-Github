"""Routes de gestion du panier pour AyaMarket."""

from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db_session
from app.schemas.cart import (
    CartItemCreate, CartItemUpdate, CartResponse, CartSummary
)
from app.routes.auth import get_current_user
from app.services.cart_service import cart_service

router = APIRouter(prefix="/panier", tags=["Panier"])


@router.post("/ajouter", response_model=dict, status_code=status.HTTP_201_CREATED)
async def add_to_cart(
    item_data: CartItemCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
) -> dict[str, Any]:
    """
    Ajoute un produit au panier de l'utilisateur.
    
    - Authentification requise
    - Vérifie la disponibilité du produit
    - Vérifie le stock si applicable
    - Met à jour la quantité si déjà présent
    """
    user_id = UUID(current_user["id"])
    
    # Ajouter au panier
    cart_item, error = await cart_service.add_to_cart(user_id, item_data, db)
    
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    # Calculer le nouveau total du panier
    total_price, total_items, total_quantity = await cart_service.calculate_cart_total(user_id, db)
    
    return {
        "message": "Produit ajouté au panier avec succès",
        "cart_item": cart_item.to_dict(),
        "cart_summary": {
            "total_items": total_items,
            "total_quantity": total_quantity,
            "total_price": total_price
        }
    }


@router.get("/", response_model=CartResponse, status_code=status.HTTP_200_OK)
async def get_cart(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
) -> dict[str, Any]:
    """
    Récupère le panier complet de l'utilisateur.
    
    - Authentification requise
    - Inclut les informations des produits
    - Calcule les sous-totaux et totaux
    """
    user_id = UUID(current_user["id"])
    
    # Récupérer le panier avec les produits
    cart_items = await cart_service.get_cart_with_products(user_id, db)
    
    # Calculer les totaux
    total_price, total_items, total_quantity = await cart_service.calculate_cart_total(user_id, db)
    
    # Formater les items
    formatted_items = []
    for item in cart_items:
        formatted_items.append({
            "id": item["cart"].id,
            "product_id": item["cart"].product_id,
            "quantity": item["cart"].quantity,
            "created_at": item["cart"].created_at,
            "updated_at": item["cart"].updated_at,
            "product_nom": item["product_nom"],
            "product_prix": item["product_prix"],
            "product_image_url": item["product_image_url"],
            "product_categorie": item["product_categorie"],
            "subtotal": item["subtotal"]
        })
    
    return {
        "items": formatted_items,
        "total_items": total_items,
        "total_quantity": total_quantity,
        "total_price": total_price
    }


@router.put("/{item_id}", response_model=dict, status_code=status.HTTP_200_OK)
async def update_cart_item(
    item_id: UUID,
    update_data: CartItemUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
) -> dict[str, Any]:
    """
    Met à jour la quantité d'un item dans le panier.
    
    - Authentification requise
    - Vérifie que l'utilisateur est propriétaire de l'item
    - Vérifie le stock si applicable
    """
    user_id = UUID(current_user["id"])
    
    # Mettre à jour l'item
    cart_item, error = await cart_service.update_cart_item(user_id, item_id, update_data, db)
    
    if error:
        if "non trouvé" in error:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error
            )
    
    # Calculer le nouveau total du panier
    total_price, total_items, total_quantity = await cart_service.calculate_cart_total(user_id, db)
    
    return {
        "message": "Quantité mise à jour avec succès",
        "cart_item": cart_item.to_dict(),
        "cart_summary": {
            "total_items": total_items,
            "total_quantity": total_quantity,
            "total_price": total_price
        }
    }


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_cart(
    item_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
) -> None:
    """
    Supprime un produit du panier.
    
    - Authentification requise
    - Vérifie que l'utilisateur est propriétaire de l'item
    """
    user_id = UUID(current_user["id"])
    
    # Supprimer l'item
    success, error = await cart_service.remove_from_cart(user_id, item_id, db)
    
    if not success:
        if "non trouvé" in error:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error
            )


@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
async def clear_cart(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
) -> None:
    """
    Vide complètement le panier de l'utilisateur.
    
    - Authentification requise
    - Supprime tous les items du panier
    """
    user_id = UUID(current_user["id"])
    
    # Vider le panier
    success, error = await cart_service.clear_cart(user_id, db)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error
        )


@router.get("/summary", response_model=CartSummary, status_code=status.HTTP_200_OK)
async def get_cart_summary(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
) -> dict[str, Any]:
    """
    Récupère un résumé du panier (sans les détails des produits).
    
    - Authentification requise
    - Utile pour les notifications et badges
    """
    user_id = UUID(current_user["id"])
    
    # Calculer les totaux
    total_price, total_items, total_quantity = await cart_service.calculate_cart_total(user_id, db)
    
    return {
        "total_items": total_items,
        "total_quantity": total_quantity,
        "total_price": total_price
    }

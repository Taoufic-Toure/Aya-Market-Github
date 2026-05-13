"""Schémas Pydantic pour les commandes AyaMarket."""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from .cart import CartItemResponse


class OrderCreate(BaseModel):
    """Schéma pour la création d'une commande."""
    
    shipping_address: Optional[str] = Field(None, max_length=500, description="Adresse de livraison")
    notes: Optional[str] = Field(None, max_length=1000, description="Notes de commande")
    
    class Config:
        json_schema_extra = {
            "example": {
                "shipping_address": "123 Rue du Commerce, Cotonou, Bénin",
                "notes": "Livraison après 18h"
            }
        }


class OrderStatusUpdate(BaseModel):
    """Schéma pour la mise à jour du statut d'une commande."""
    
    statut: str = Field(..., description="Nouveau statut de la commande")
    
    @field_validator('statut')
    @classmethod
    def validate_status(cls, v):
        """Valide que le statut est valide."""
        valid_statuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"]
        if v not in valid_statuses:
            raise ValueError(f'Statut invalide. Valeurs acceptées: {", ".join(valid_statuses)}')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "statut": "confirmed"
            }
        }


class OrderItemResponse(BaseModel):
    """Schéma pour la réponse d'un item de commande."""
    
    id: UUID = Field(..., description="ID de l'item de commande")
    product_id: UUID = Field(..., description="ID du produit")
    quantity: int = Field(..., description="Quantité")
    price: float = Field(..., description="Prix unitaire au moment de la commande")
    created_at: datetime = Field(..., description="Date de création")
    
    # Informations produit incluses
    product_nom: str = Field(..., description="Nom du produit")
    product_image_url: Optional[str] = Field(None, description="URL de l'image du produit")
    product_categorie: Optional[str] = Field(None, description="Catégorie du produit")
    
    # Calculs
    subtotal: float = Field(..., description="Sous-total (quantité × prix)")
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "product_id": "456e7890-e89b-12d3-a456-426614174001",
                "quantity": 2,
                "price": 15.99,
                "created_at": "2024-01-15T10:30:00Z",
                "product_nom": "T-shirt Bénin",
                "product_image_url": "https://example.com/image.jpg",
                "product_categorie": "Vêtements",
                "subtotal": 31.98
            }
        }


class OrderResponse(BaseModel):
    """Schéma pour la réponse d'une commande."""
    
    id: UUID = Field(..., description="ID de la commande")
    user_id: UUID = Field(..., description="ID de l'utilisateur")
    total_price: float = Field(..., description="Prix total de la commande")
    statut: str = Field(..., description="Statut de la commande")
    created_at: datetime = Field(..., description="Date de création")
    updated_at: Optional[datetime] = Field(None, description="Date de mise à jour")
    shipping_address: Optional[str] = Field(None, description="Adresse de livraison")
    notes: Optional[str] = Field(None, description="Notes de commande")
    
    # Items de commande inclus
    items: List[OrderItemResponse] = Field(..., description="Items de la commande")
    
    # Calculs
    total_items: int = Field(..., description="Nombre total d'items")
    total_quantity: int = Field(..., description="Quantité totale de produits")
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "user_id": "456e7890-e89b-12d3-a456-426614174001",
                "total_price": 56.98,
                "statut": "pending",
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-15T11:00:00Z",
                "shipping_address": "123 Rue du Commerce, Cotonou, Bénin",
                "notes": "Livraison après 18h",
                "items": [
                    {
                        "id": "789e0123-e89b-12d3-a456-426614174002",
                        "product_nom": "T-shirt Bénin",
                        "quantity": 2,
                        "price": 15.99,
                        "subtotal": 31.98
                    }
                ],
                "total_items": 1,
                "total_quantity": 2
            }
        }


class OrderListResponse(BaseModel):
    """Schéma pour la liste des commandes avec pagination."""
    
    commandes: List[OrderResponse] = Field(..., description="Liste des commandes")
    total: int = Field(..., description="Nombre total de commandes")
    page: int = Field(..., description="Page actuelle")
    pages: int = Field(..., description="Nombre total de pages")
    limit: int = Field(..., description="Nombre d'éléments par page")
    
    class Config:
        json_schema_extra = {
            "example": {
                "commandes": [
                    {
                        "id": "123e4567-e89b-12d3-a456-426614174000",
                        "total_price": 56.98,
                        "statut": "pending",
                        "created_at": "2024-01-15T10:30:00Z",
                        "total_items": 1,
                        "total_quantity": 2
                    }
                ],
                "total": 25,
                "page": 1,
                "pages": 3,
                "limit": 10
            }
        }


class OrderQueryParams(BaseModel):
    """Schéma pour les paramètres de requête commandes."""
    
    page: int = Field(1, ge=1, description="Numéro de page")
    limit: int = Field(20, ge=1, le=100, description="Éléments par page")
    statut: Optional[str] = Field(None, description="Filtre par statut")
    
    @field_validator('statut')
    @classmethod
    def validate_status(cls, v):
        """Valide que le statut est valide."""
        if v is not None:
            valid_statuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"]
            if v not in valid_statuses:
                raise ValueError(f'Statut invalide. Valeurs acceptées: {", ".join(valid_statuses)}')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "page": 1,
                "limit": 20,
                "statut": "pending"
            }
        }

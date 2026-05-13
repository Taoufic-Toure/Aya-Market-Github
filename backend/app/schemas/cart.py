"""Schémas Pydantic pour le panier AyaMarket."""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, field_validator


class CartItemCreate(BaseModel):
    """Schéma pour ajouter un produit au panier."""
    
    product_id: UUID = Field(..., description="ID du produit")
    quantity: int = Field(..., gt=0, le=100, description="Quantité (1-100)")
    
    @field_validator('quantity')
    @classmethod
    def validate_quantity(cls, v):
        """Valide que la quantité est raisonnable."""
        if v < 1:
            raise ValueError('La quantité doit être au moins 1')
        if v > 100:
            raise ValueError('La quantité ne peut dépasser 100')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "product_id": "123e4567-e89b-12d3-a456-426614174000",
                "quantity": 2
            }
        }


class CartItemUpdate(BaseModel):
    """Schéma pour mettre à jour la quantité d'un produit dans le panier."""
    
    quantity: int = Field(..., gt=0, le=100, description="Nouvelle quantité (1-100)")
    
    @field_validator('quantity')
    @classmethod
    def validate_quantity(cls, v):
        """Valide que la quantité est raisonnable."""
        if v < 1:
            raise ValueError('La quantité doit être au moins 1')
        if v > 100:
            raise ValueError('La quantité ne peut dépasser 100')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "quantity": 3
            }
        }


class CartItemResponse(BaseModel):
    """Schéma pour la réponse d'un item du panier."""
    
    id: UUID = Field(..., description="ID de l'item du panier")
    product_id: UUID = Field(..., description="ID du produit")
    quantity: int = Field(..., description="Quantité")
    created_at: datetime = Field(..., description="Date d'ajout")
    updated_at: Optional[datetime] = Field(None, description="Date de mise à jour")
    
    # Informations produit incluses
    product_nom: str = Field(..., description="Nom du produit")
    product_prix: float = Field(..., description="Prix unitaire du produit")
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
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-15T11:00:00Z",
                "product_nom": "T-shirt Bénin",
                "product_prix": 15.99,
                "product_image_url": "https://example.com/image.jpg",
                "product_categorie": "Vêtements",
                "subtotal": 31.98
            }
        }


class CartResponse(BaseModel):
    """Schéma pour la réponse du panier complet."""
    
    items: List[CartItemResponse] = Field(..., description="Liste des items du panier")
    total_items: int = Field(..., description="Nombre total d'items")
    total_quantity: int = Field(..., description="Quantité totale de produits")
    total_price: float = Field(..., description="Prix total du panier")
    
    class Config:
        json_schema_extra = {
            "example": {
                "items": [
                    {
                        "id": "123e4567-e89b-12d3-a456-426614174000",
                        "product_nom": "T-shirt Bénin",
                        "product_prix": 15.99,
                        "quantity": 2,
                        "subtotal": 31.98
                    },
                    {
                        "id": "789e0123-e89b-12d3-a456-426614174002",
                        "product_nom": "Sandales artisanales",
                        "product_prix": 25.00,
                        "quantity": 1,
                        "subtotal": 25.00
                    }
                ],
                "total_items": 2,
                "total_quantity": 3,
                "total_price": 56.98
            }
        }


class CartSummary(BaseModel):
    """Schéma pour le résumé du panier (utilisé pour les notifications)."""
    
    total_items: int = Field(..., description="Nombre total d'items")
    total_quantity: int = Field(..., description="Quantité totale de produits")
    total_price: float = Field(..., description="Prix total du panier")
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_items": 2,
                "total_quantity": 3,
                "total_price": 56.98
            }
        }

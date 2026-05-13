"""Schémas Pydantic pour les produits AyaMarket avec SQLAlchemy."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator as validator


class ProductCreate(BaseModel):
    """Schéma pour la création d'un produit."""
    
    nom: str = Field(..., min_length=2, max_length=255, description="Nom du produit")
    description: str = Field(..., min_length=10, max_length=2000, description="Description détaillée")
    prix: float = Field(..., gt=0, description="Prix du produit")
    stock: Optional[int] = Field(None, ge=0, description="Quantité en stock")
    categorie: Optional[str] = Field(None, max_length=100, description="Catégorie du produit")
    
    @validator('prix')
    def validate_prix(cls, v):
        """Valide que le prix a au plus 2 décimales."""
        if round(v, 2) != v:
            raise ValueError('Le prix ne peut avoir plus de 2 décimales')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "nom": "T-shirt Bénin",
                "description": "T-shirt 100% coton avec motif traditionnel béninois",
                "prix": 15.99,
                "stock": 50,
                "categorie": "Vêtements"
            }
        }


class ProductUpdate(BaseModel):
    """Schéma pour la mise à jour d'un produit."""
    
    nom: Optional[str] = Field(None, min_length=2, max_length=255, description="Nom du produit")
    description: Optional[str] = Field(None, min_length=10, max_length=2000, description="Description détaillée")
    prix: Optional[float] = Field(None, gt=0, description="Prix du produit")
    stock: Optional[int] = Field(None, ge=0, description="Quantité en stock")
    categorie: Optional[str] = Field(None, max_length=100, description="Catégorie du produit")
    actif: Optional[bool] = Field(None, description="Statut du produit")
    
    @validator('prix')
    def validate_prix(cls, v):
        """Valide que le prix a au plus 2 décimales."""
        if v is not None and round(v, 2) != v:
            raise ValueError('Le prix ne peut avoir plus de 2 décimales')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "nom": "T-shirt Bénin (Mis à jour)",
                "prix": 19.99,
                "stock": 30
            }
        }


class ProductResponse(BaseModel):
    """Schéma pour la réponse produit."""
    
    id: UUID = Field(..., description="ID du produit")
    nom: str = Field(..., description="Nom du produit")
    description: str = Field(..., description="Description du produit")
    prix: float = Field(..., description="Prix du produit")
    image_url: Optional[str] = Field(None, description="URL de l'image")
    vendeur_id: UUID = Field(..., description="ID du vendeur")
    actif: bool = Field(..., description="Statut du produit")
    created_at: datetime = Field(..., description="Date de création")
    updated_at: Optional[datetime] = Field(None, description="Date de mise à jour")
    stock: Optional[int] = Field(None, description="Quantité en stock")
    categorie: Optional[str] = Field(None, description="Catégorie du produit")
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "nom": "T-shirt Bénin",
                "description": "T-shirt 100% coton avec motif traditionnel béninois",
                "prix": 15.99,
                "image_url": "https://example.com/image.jpg",
                "vendeur_id": "456e7890-e89b-12d3-a456-426614174001",
                "actif": True,
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-16T14:20:00Z",
                "stock": 50,
                "categorie": "Vêtements"
            }
        }


class ProductListResponse(BaseModel):
    """Schéma pour la liste des produits avec pagination."""
    
    produits: list[ProductResponse] = Field(..., description="Liste des produits")
    total: int = Field(..., description="Nombre total de produits")
    page: int = Field(..., description="Page actuelle")
    pages: int = Field(..., description="Nombre total de pages")
    limit: int = Field(..., description="Nombre d'éléments par page")
    
    class Config:
        json_schema_extra = {
            "example": {
                "produits": [
                    {
                        "id": "123e4567-e89b-12d3-a456-426614174000",
                        "nom": "T-shirt Bénin",
                        "prix": 15.99
                    }
                ],
                "total": 150,
                "page": 1,
                "pages": 15,
                "limit": 10
            }
        }


class ProductQueryParams(BaseModel):
    """Schéma pour les paramètres de requête produits."""
    
    page: int = Field(1, ge=1, description="Numéro de page")
    limit: int = Field(20, ge=1, le=100, description="Éléments par page")
    search: Optional[str] = Field(None, description="Recherche par nom")
    categorie: Optional[str] = Field(None, description="Filtre par catégorie")
    prix_min: Optional[float] = Field(None, ge=0, description="Prix minimum")
    prix_max: Optional[float] = Field(None, ge=0, description="Prix maximum")
    actif: Optional[bool] = Field(True, description="Filtre par statut")
    
    class Config:
        json_schema_extra = {
            "example": {
                "page": 1,
                "limit": 20,
                "search": "t-shirt",
                "categorie": "Vêtements",
                "prix_min": 10.0,
                "prix_max": 50.0,
                "actif": True
            }
        }

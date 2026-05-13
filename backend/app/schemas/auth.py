"""Schémas Pydantic pour l'authentification AyaMarket."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    """Schéma pour la requête d'inscription."""
    
    email: EmailStr = Field(..., description="Adresse email de l'utilisateur")
    password: str = Field(..., min_length=8, max_length=100, description="Mot de passe (min 8 caractères)")
    nom: str = Field(..., min_length=2, max_length=100, description="Nom complet")
    ville: str = Field(..., min_length=2, max_length=50, description="Ville")
    # Validation du rôle utilisateur : uniquement 'acheteur' ou 'vendeur' acceptés
    role: str = Field(..., pattern="^(acheteur|vendeur)$", description="Rôle : acheteur ou vendeur")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "jean@ayamarket.bj",
                "password": "MotDePasse123",
                "nom": "Jean Dupont",
                "ville": "Cotonou",
                "role": "acheteur"
            }
        }


class LoginRequest(BaseModel):
    """Schéma pour la requête de connexion."""
    
    email: EmailStr = Field(..., description="Adresse email")
    password: str = Field(..., min_length=1, description="Mot de passe")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "jean@ayamarket.bj",
                "password": "MotDePasse123"
            }
        }


class UserResponse(BaseModel):
    """Schéma pour la réponse utilisateur."""
    
    id: str = Field(..., description="ID de l'utilisateur")
    email: EmailStr = Field(..., description="Adresse email")
    nom: str = Field(..., description="Nom complet")
    ville: str = Field(..., description="Ville")
    role: str = Field(..., description="Rôle (acheteur/vendeur)")
    actif: bool = Field(..., description="Statut du compte")
    created_at: datetime = Field(..., description="Date de création")
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "email": "jean@ayamarket.bj",
                "nom": "Jean Dupont",
                "ville": "Cotonou",
                "role": "acheteur",
                "actif": True,
                "created_at": "2024-01-15T10:30:00Z"
            }
        }


class LoginResponse(BaseModel):
    """Schéma pour la réponse de connexion."""
    
    access_token: str = Field(..., description="Token JWT d'accès")
    token_type: str = Field(default="bearer", description="Type de token")
    user: UserResponse = Field(..., description="Informations de l'utilisateur")
    
    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "user": {
                    "id": "123e4567-e89b-12d3-a456-426614174000",
                    "email": "jean@ayamarket.bj",
                    "nom": "Jean Dupont",
                    "ville": "Cotonou",
                    "role": "acheteur",
                    "actif": True,
                    "created_at": "2024-01-15T10:30:00Z"
                }
            }
        }

"""Schémas Pydantic pour les endpoints Aya de BeninMarket."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class ChatRequest(BaseModel):
    """Schéma pour la requête de chat avec Aya."""
    
    message: str = Field(..., min_length=1, max_length=4000, description="Message du client")
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": "Bonjour, je cherche des produits traditionnels béninois"
            }
        }


class ChatTurn(BaseModel):
    """Un message dans l'historique conseiller vendeur."""

    role: Literal["user", "assistant"] = Field(..., description="Auteur du message")
    content: str = Field(..., min_length=1, max_length=2000, description="Texte du message")


class AdvisorRequest(BaseModel):
    """Schéma pour la requête de conseil vendeur (legacy `question` ou structuré `message`)."""

    business_type: Optional[str] = Field(None, max_length=300, description="Type de business du vendeur")
    question: Optional[str] = Field(None, max_length=8000, description="Prompt complet (legacy / analyse JSON)")
    message: Optional[str] = Field(None, max_length=2000, description="Message courant du vendeur (mode chat)")
    history: list[ChatTurn] = Field(default_factory=list, description="Historique brut (sera trim côté serveur)")
    vendor_context: Optional[str] = Field(None, max_length=4500, description="Résumé boutique / catalogue compact")
    memory_hint: Optional[str] = Field(None, max_length=600, description="Préférences, budget, signaux stables")

    @model_validator(mode="after")
    def require_question_or_message(self) -> "AdvisorRequest":
        q = (self.question or "").strip()
        m = (self.message or "").strip()
        if not q and not m:
            raise ValueError("Au moins un des champs 'question' ou 'message' est requis.")
        return self

    @field_validator("history", mode="after")
    @classmethod
    def cap_incoming_history(cls, v: list[ChatTurn]) -> list[ChatTurn]:
        if len(v) > 24:
            return v[-24:]
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "business_type": "Boutique tissus",
                "message": "Comment annoncer une promo sans perdre en marge ?",
                "history": [{"role": "user", "content": "Bonjour"}],
                "vendor_context": "Ville: Cotonou | 30j: 12 cmd",
                "memory_hint": "Budget pub: 25k FCFA",
            }
        }




class SearchRequest(BaseModel):
    """Schéma pour la requête de recherche intelligente."""
    
    query: str = Field(..., min_length=1, max_length=1000, description="Requête de recherche")
    category: Optional[str] = Field(None, description="Catégorie de produits")
    location: Optional[str] = Field(None, description="Localisation (ex: Cotonou, Porto-Novo)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "query": "tissus wax béninois",
                "category": "textiles",
                "location": "Cotonou"
            }
        }


class AIResponse(BaseModel):
    """Schéma standardisé pour les réponses Aya."""
    
    success: bool = Field(True, description="Indique si l'opération a réussi")
    response: str = Field(..., description="Réponse de Aya")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "response": "Voici les produits correspondants à votre recherche..."
            }
        }


class ErrorResponse(BaseModel):
    """Schéma standardisé pour les réponses d'erreur."""
    
    success: bool = Field(False, description="Indique que l'opération a échoué")
    error: str = Field(..., description="Message d'erreur détaillé")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": False,
                "error": "Clé API invalide"
            }
        }

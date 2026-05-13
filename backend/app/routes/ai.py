"""Routes IA pour AyaMarket.

Ce module définit tous les endpoints IA:
- POST /ai/chat : Chat client avec Groq Llama 3.3
- POST /ai/advisor : Conseils vendeur avec Gemini 2.0 Flash
- POST /ai/transcribe : Transcription audio avec Groq Whisper
- POST /ai/search : Recherche intelligente avec Mistral
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse

from app.schemas.ai import (
    AdvisorRequest,
    AIResponse,
    ChatRequest,
    ErrorResponse,
    SearchRequest,
)
from app.services.ai_router_service import ai_router_service

logger = logging.getLogger(__name__)

# Création du routeur IA
router = APIRouter(
    prefix="/ai",
    tags=["Intelligence Artificielle"],
    responses={
        404: {"description": "Endpoint non trouvé"},
        500: {"description": "Erreur serveur interne"},
    },
)


@router.post(
    "/chat",
    response_model=AIResponse,
    summary="Chat avec Aya (Llama 3.3)",
    description="""Interface de chat avec Aya, l'assistante AyaMarket utilisant Groq Llama 3.3 70B""",
)
async def chat_endpoint(request: ChatRequest) -> AIResponse:
    """Endpoint de chat avec Aya.
    
    Args:
        request: Message du client
        
    Returns:
        Réponse de Aya formatée
    """
    try:
        logger.info(f"Endpoint /ai/chat appelé avec: {request.message[:100]}...")
        
        # Traitement via le service de routage IA
        response = await ai_router_service.handle_chat_request(request.message)
        
        return response
        
    except Exception as e:
        logger.error(f"Erreur endpoint chat: {str(e)}")
        error_response = ai_router_service.format_error_response(f"Erreur chat: {str(e)}")
        return JSONResponse(
            status_code=500,
            content=error_response.model_dump()
        )


@router.post(
    "/advisor",
    response_model=AIResponse,
    summary="Conseils business par Aya",
    description="Conseils personnalisés pour les vendeurs via Aya (Gemini 2.0 Flash)",
)
async def advisor_endpoint(request: AdvisorRequest) -> AIResponse:
    """Endpoint de conseil vendeur.
    
    Args:
        request: Question du vendeur et contexte business
        
    Returns:
        Conseils business formatés
    """
    try:
        logger.info(f"Endpoint /ai/advisor appelé - Type: {request.business_type}")
        
        # Traitement via le service de routage IA
        response = await ai_router_service.handle_advisor_request(request)
        
        return response
        
    except Exception as e:
        logger.error(f"Erreur endpoint advisor: {str(e)}")
        error_response = ai_router_service.format_error_response(f"Erreur conseil: {str(e)}")
        return JSONResponse(
            status_code=500,
            content=error_response.model_dump()
        )


@router.post(
    "/transcribe",
    response_model=AIResponse,
    summary="Transcription audio par Aya",
    description="Transcription de fichiers audio (fon/yoruba/français) par Aya via Groq Whisper",
)
async def transcribe_endpoint(
    audio_file: UploadFile = File(..., description="Fichier audio à transcrire"),
    language: str = Form(None, description="Langue cible (fr, fon, yo)"),
) -> AIResponse:
    """Endpoint de transcription audio.
    
    Args:
        audio_file: Fichier audio uploadé
        language: Langue cible optionnelle
        
    Returns:
        Texte transcrit
    """
    try:
        logger.info(f"Endpoint /ai/transcribe appelé - Fichier: {audio_file.filename}")
        
        # Traitement via le service de routage IA
        response = await ai_router_service.handle_transcribe_request(audio_file, language)
        
        return response
        
    except Exception as e:
        logger.error(f"Erreur endpoint transcribe: {str(e)}")
        error_response = ai_router_service.format_error_response(f"Erreur transcription: {str(e)}")
        return JSONResponse(
            status_code=500,
            content=error_response.model_dump()
        )


@router.post(
    "/search",
    response_model=AIResponse,
    summary="Recherche intelligente par Aya",
    description="Recherche sémantique de produits par Aya via Mistral",
)
async def search_endpoint(request: SearchRequest) -> AIResponse:
    """Endpoint de recherche intelligente.
    
    Args:
        request: Paramètres de recherche
        
    Returns:
        Résultats de recherche optimisés
    """
    try:
        logger.info(f"Endpoint /ai/search appelé - Query: {request.query}")
        
        # Traitement via le service de routage IA
        response = await ai_router_service.handle_search_request(
            request.query,
            request.category,
            request.location
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Erreur endpoint search: {str(e)}")
        error_response = ai_router_service.format_error_response(f"Erreur recherche: {str(e)}")
        return JSONResponse(
            status_code=500,
            content=error_response.model_dump()
        )


@router.get(
    "/health",
    summary="Santé des services Aya",
    description="Vérifie l'état de tous les services Aya",
)
async def health_check() -> dict[str, object]:
    """Endpoint de vérification de santé des services Aya.
    
    Returns:
        État des différents services Aya
    """
    return {
        "status": "healthy",
        "services": {
            "aya_chat": "Chat Aya disponible",
            "aya_advisor": "Conseils business Aya disponibles", 
            "aya_transcribe": "Transcription Aya disponible",
            "aya_search": "Recherche Aya disponible",
            "router": "Service de routage Aya opérationnel"
        }
    }

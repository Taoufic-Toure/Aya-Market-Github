"""Service de routage IA pour AyaMarket.

Ce service orchestre les différentes IA et gère:
- La distribution des requêtes vers le bon service IA
- La gestion des erreurs centralisée
- Le formatage uniforme des réponses
- La logique métier spécifique à AyaMarket
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import UploadFile

from app.schemas.ai import AIResponse, AdvisorRequest, ErrorResponse
from app.utils.advisor_memory import format_history_for_prompt, trim_history
from app.services.gemini_service import gemini_service
from app.services.groq_service import groq_service
from app.services.mistral_service import mistral_service

logger = logging.getLogger(__name__)


class AIRouterService:
    """Service central de routage pour les fonctionnalités Aya d'AyaMarket."""
    
    @staticmethod
    async def handle_chat_request(message: str) -> AIResponse:
        """Traite une requête de chat avec Aya via Groq Llama.
        
        Args:
            message: Message du client
            
        Returns:
            Réponse formatée avec le message de Aya
        """
        try:
            logger.info(f"Requête chat reçue: {message[:100]}...")
            
            # Appel au service Groq pour le chat
            ai_response = await groq_service.chat(message)
            
            logger.info("Réponse chat générée avec succès")
            return AIResponse(
                success=True,
                response=ai_response
            )
            
        except Exception as e:
            logger.error(f"Erreur traitement chat: {str(e)}")
            return AIResponse(
                success=False,
                response=f"Service de chat indisponible: {str(e)}"
            )
    
    @staticmethod
    async def handle_advisor_request(request: AdvisorRequest) -> AIResponse:
        """Traite une requête de conseil vendeur via Aya (Gemini).

        Mode structuré: ``message`` + ``history`` + ``vendor_context`` (mémoire légère).
        Mode legacy: uniquement ``question`` (ex. analyse JSON ou ancien client).
        """
        msg = (request.message or "").strip()
        quest = (request.question or "").strip()

        try:
            if msg:
                logger.info(
                    "Requête conseil structurée - Type: %s, message: %s...",
                    request.business_type,
                    msg[:80],
                )
                raw_hist = [{"role": t.role, "content": t.content} for t in request.history]
                trimmed = trim_history(raw_hist)
                hist_txt = format_history_for_prompt(trimmed)
                mem = (request.memory_hint or "").strip() or "—"
                vctx = (request.vendor_context or "").strip() or "—"
                advice = await gemini_service.get_business_advice_structured(
                    business_type=request.business_type,
                    memory_hint=mem,
                    vendor_context=vctx,
                    history_text=hist_txt,
                    user_message=msg,
                )
            else:
                logger.info(
                    "Requête conseil legacy - Type: %s, question: %s...",
                    request.business_type,
                    quest[:100],
                )
                advice = await gemini_service.get_business_advice(request.business_type, quest)

            logger.info("Conseils business générés avec succès")
            return AIResponse(success=True, response=advice)

        except Exception as e:
            logger.error(f"Erreur traitement conseil: {str(e)}")
            return AIResponse(
                success=False,
                response=f"Service de conseil indisponible: {str(e)}"
            )
    
    @staticmethod
    async def handle_transcribe_request(audio_file: UploadFile, language: Optional[str] = None) -> AIResponse:
        """Traite une requête de transcription audio via Aya (Groq Whisper).
        
        Args:
            audio_file: Fichier audio à transcrire
            language: Langue cible (fr, fon, yo)
            
        Returns:
            Réponse formatée avec le texte transcrit
        """
        try:
            logger.info(f"Requête transcription reçue - Fichier: {audio_file.filename}, Langue: {language}")
            
            # Validation du fichier audio
            if not audio_file.content_type or not audio_file.content_type.startswith('audio/'):
                return AIResponse(
                    success=False,
                    response="Le fichier doit être un format audio valide (mp3, wav, m4a, etc.)"
                )
            
            # Appel au service Groq pour la transcription
            transcribed_text = await groq_service.transcribe_audio(audio_file, language)
            
            if not transcribed_text.strip():
                return AIResponse(
                    success=False,
                    response="Aucun texte n'a pu être transcrit depuis l'audio"
                )
            
            logger.info(f"Transcription réussie: {len(transcribed_text)} caractères")
            return AIResponse(
                success=True,
                response=transcribed_text
            )
            
        except Exception as e:
            logger.error(f"Erreur traitement transcription: {str(e)}")
            return AIResponse(
                success=False,
                response=f"Service de transcription indisponible: {str(e)}"
            )
    
    @staticmethod
    async def handle_search_request(query: str, category: Optional[str] = None, location: Optional[str] = None) -> AIResponse:
        """Traite une requête de recherche intelligente via Aya (Mistral).
        
        Args:
            query: Requête de recherche
            category: Catégorie optionnelle
            location: Localisation optionnelle
            
        Returns:
            Réponse formatée avec les résultats de recherche optimisés
        """
        try:
            logger.info(f"Requête recherche reçue - Query: {query}, Catégorie: {category}, Localisation: {location}")
            
            # Appel au service Mistral pour la recherche intelligente
            search_results = await mistral_service.intelligent_search(query, category, location)
            
            logger.info("Recherche intelligente traitée avec succès")
            return AIResponse(
                success=True,
                response=search_results
            )
            
        except Exception as e:
            logger.error(f"Erreur traitement recherche: {str(e)}")
            return AIResponse(
                success=False,
                response=f"Service de recherche indisponible: {str(e)}"
            )
    
    @staticmethod
    def format_error_response(error_message: str) -> ErrorResponse:
        """Formate une réponse d'erreur standardisée.
        
        Args:
            error_message: Message d'erreur
            
        Returns:
            Réponse d'erreur formatée
        """
        logger.error(f"Erreur formatée: {error_message}")
        return ErrorResponse(
            success=False,
            error=error_message
        )


# Instance singleton du service de routage
ai_router_service = AIRouterService()

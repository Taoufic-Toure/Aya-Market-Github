"""Service Groq pour le chat client et transcription audio.

Groq est utilisé pour:
- Chat client : Llama 3.3 70B pour des conversations rapides et intelligentes
- Transcription : Whisper Large V3 pour la transcription audio précise
"""

from __future__ import annotations

import logging
from typing import Optional

import httpx
from fastapi import UploadFile

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class GroqService:
    """Service pour interagir avec l'API Groq."""
    
    def __init__(self) -> None:
        """Initialise le client Groq avec la clé API."""
        self.api_key = settings.GROQ_API_KEY
        self.base_url = "https://api.groq.com/openai/v1"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    async def chat(self, message: str) -> str:
        """Envoie un message à Aya (Llama 3.3 70B) pour une réponse intelligente.
        
        Args:
            message: Message du client
            
        Returns:
            Réponse générée par Aya
            
        Raises:
            Exception: En cas d'erreur API
        """
        try:
            payload = {
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {
                        "role": "system",
                        "content": """Tu es Aya, l'assistante virtuelle pour AyaMarket, la plateforme de e-commerce béninoise.
                        Tu aides les clients à trouver des produits, réponds à leurs questions sur les articles,
                        et donnes des conseils d'achat. Sois amicale, professionnelle et parle français.
                        Présente-toi comme Aya et utilise un ton chaleureux."""
                    },
                    {
                        "role": "user", 
                        "content": message
                    }
                ],
                "max_tokens": 1000,
                "temperature": 0.7
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=self.headers,
                    json=payload
                )
                response.raise_for_status()
                
                data = response.json()
                return data["choices"][0]["message"]["content"]
                
        except httpx.HTTPStatusError as e:
            logger.error(f"Erreur HTTP Groq chat: {e.response.status_code} - {e.response.text}")
            raise Exception(f"Erreur service chat: {e.response.status_code}")
        except Exception as e:
            logger.error(f"Erreur inattendue Groq chat: {str(e)}")
            raise Exception("Service de chat indisponible")
    
    async def transcribe_audio(self, audio_file: UploadFile, language: Optional[str] = None) -> str:
        """Transcrit un fichier audio avec Whisper Large V3.
        
        Args:
            audio_file: Fichier audio à transcrire
            language: Langue cible (fr, fon, yo)
            
        Returns:
            Texte transcrit
            
        Raises:
            Exception: En cas d'erreur API
        """
        try:
            # Lecture du contenu du fichier
            audio_content = await audio_file.read()
            
            # Préparation des headers pour l'upload
            headers = {
                "Authorization": f"Bearer {self.api_key}"
            }
            
            # Préparation des données du formulaire
            files = {
                "file": (audio_file.filename, audio_content, audio_file.content_type)
            }
            
            data = {
                "model": "whisper-large-v3",
                "response_format": "json"
            }
            
            # Ajout de la langue si spécifiée
            if language:
                data["language"] = language
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.base_url}/audio/transcriptions",
                    headers=headers,
                    files=files,
                    data=data
                )
                response.raise_for_status()
                
                result = response.json()
                return result.get("text", "")
                
        except httpx.HTTPStatusError as e:
            logger.error(f"Erreur HTTP Groq transcribe: {e.response.status_code} - {e.response.text}")
            raise Exception(f"Erreur service transcription: {e.response.status_code}")
        except Exception as e:
            logger.error(f"Erreur inattendue Groq transcribe: {str(e)}")
            raise Exception("Service de transcription indisponible")


# Instance singleton du service
groq_service = GroqService()

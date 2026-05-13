"""Service Mistral pour la recherche intelligente.

Mistral est utilisé pour:
- Recherche sémantique : Compréhension fine des requêtes utilisateurs
- Analyse de produits : Matching intelligent entre besoins et produits
- Recommandations : Suggestions pertinentes basées sur le contexte
"""

from __future__ import annotations

import logging
from typing import Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class MistralService:
    """Service pour interagir avec l'API Mistral."""
    
    def __init__(self) -> None:
        """Initialise le client Mistral avec la clé API."""
        self.api_key = settings.MISTRAL_API_KEY
        self.base_url = "https://api.mistral.ai/v1"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    async def intelligent_search(self, query: str, category: Optional[str] = None, location: Optional[str] = None) -> str:
        """Effectue une recherche intelligente avec analyse sémantique.
        
        Args:
            query: Requête de recherche de l'utilisateur
            category: Catégorie de produits optionnelle
            location: Localisation optionnelle
            
        Returns:
            Résultats de recherche formatés et pertinents
            
        Raises:
            Exception: En cas d'erreur API
        """
        try:
            # Construction du prompt de recherche contextuel
            context = f"""Tu es Aya, l'assistante de recherche pour AyaMarket, la marketplace béninoise.
            
            Ta mission est d'analyser la requête utilisateur et de générer une recherche optimisée
            qui trouvera les produits les plus pertinents sur la plateforme.
            
            Requête originale: {query}
            Catégorie: {category or 'toutes catégories'}
            Localisation: {location or 'tout le Bénin'}
            
            Génère une réponse qui inclut:
            1. Des mots-clés pertinents pour la recherche
            2. Des suggestions de produits connexes
            3. Des conseils pour affiner la recherche
            4. Des catégories apparentées intéressantes
            
            Sois concis mais utile. Adapte ta réponse au contexte béninois."""
            
            payload = {
                "model": "mistral-large-latest",
                "messages": [
                    {
                        "role": "user",
                        "content": context
                    }
                ],
                "max_tokens": 800,
                "temperature": 0.3
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
            logger.error(f"Erreur HTTP Mistral: {e.response.status_code} - {e.response.text}")
            raise Exception(f"Erreur service recherche: {e.response.status_code}")
        except Exception as e:
            logger.error(f"Erreur inattendue Mistral: {str(e)}")
            raise Exception("Service de recherche indisponible")
    
    async def analyze_product_match(self, product_description: str, user_query: str) -> str:
        """Analyse la pertinence d'un produit par rapport à une requête.
        
        Args:
            product_description: Description du produit
            user_query: Requête utilisateur
            
        Returns:
            Score de pertinence et analyse
        """
        try:
            prompt = f"""Analyse la pertinence de ce produit pour la requête utilisateur.
            
            Produit: {product_description}
            Requête: {user_query}
            
            Donne une note de pertinence de 1 à 10 et explique pourquoi ce produit
            correspond (ou non) à la recherche. Sois objectif et précis."""
            
            payload = {
                "model": "mistral-small-latest",
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "max_tokens": 300,
                "temperature": 0.2
            }
            
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=self.headers,
                    json=payload
                )
                response.raise_for_status()
                
                data = response.json()
                return data["choices"][0]["message"]["content"]
                
        except Exception as e:
            logger.error(f"Erreur analyse produit Mistral: {str(e)}")
            return "Analyse indisponible"


# Instance singleton du service
mistral_service = MistralService()

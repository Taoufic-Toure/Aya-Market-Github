"""Middleware d'authentification pour AyaMarket."""

from typing import Callable

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings

# Configuration
settings = get_settings()
SECRET_KEY = settings.SECRET_KEY if hasattr(settings, 'SECRET_KEY') else "aya_secret_key_2024"
ALGORITHM = "HS256"


class AuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware pour vérifier l'authentification JWT.
    
    Vérifie le token JWT dans l'en-tête Authorization pour les requêtes protégées.
    """
    
    def __init__(self, app, protected_paths: list[str] = None):
        """Initialise le middleware avec les chemins protégés."""
        super().__init__(app)
        self.protected_paths = protected_paths or [
            "/api/v1/",
            "/auth/me",
            "/products/create",
            "/orders/",
            "/profile/"
        ]
    
    async def dispatch(self, request: Request, call_next: Callable) -> JSONResponse:
        """
        Traite la requête et vérifie l'authentification si nécessaire.
        
        Args:
            request: La requête HTTP entrante
            call_next: La fonction suivante dans la chaîne de middleware
            
        Returns:
            La réponse HTTP
        """
        # Vérifier si le chemin nécessite une authentification
        if self._is_protected_path(request.url.path):
            try:
                # Extraire et vérifier le token
                user_info = await self._verify_token(request)
                
                # Ajouter les informations utilisateur à la requête
                request.state.user = user_info
                
            except HTTPException as e:
                return JSONResponse(
                    status_code=e.status_code,
                    content={"detail": e.detail}
                )
            except Exception:
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"detail": "Token invalide"}
                )
        
        # Continuer avec la requête
        response = await call_next(request)
        return response
    
    def _is_protected_path(self, path: str) -> bool:
        """
        Vérifie si le chemin nécessite une authentification.
        
        Args:
            path: Le chemin de la requête
            
        Returns:
            True si le chemin est protégé, False sinon
        """
        # Exclure les endpoints publics
        public_paths = [
            "/",
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/auth/login",
            "/auth/register",
            "/products/",
            "/ai/",
            "/favicon.ico",
            "/static/"
        ]
        
        # Vérifier si c'est un chemin public
        for public_path in public_paths:
            if path.startswith(public_path):
                return False
        
        # Vérifier si c'est un chemin protégé
        for protected_path in self.protected_paths:
            if path.startswith(protected_path):
                return True
        
        return False
    
    async def _verify_token(self, request: Request) -> dict:
        """
        Vérifie le token JWT et extrait les informations utilisateur.
        
        Args:
            request: La requête HTTP
            
        Returns:
            Les informations utilisateur extraites du token
            
        Raises:
            HTTPException: Si le token est invalide ou manquant
        """
        # Extraire le token de l'en-tête Authorization
        authorization = request.headers.get("Authorization")
        
        if not authorization:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token manquant"
            )
        
        # Vérifier le format "Bearer <token>"
        try:
            scheme, token = authorization.split()
            if scheme.lower() != "bearer":
                raise ValueError("Schéma invalide")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Format du token invalide. Utilisez: Bearer <token>"
            )
        
        # Décoder et vérifier le token JWT
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            email = payload.get("email")
            role = payload.get("role")
            
            if not all([user_id, email, role]):
                raise ValueError("Payload incomplet")
            
            return {
                "id": user_id,
                "email": email,
                "role": role
            }
            
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token invalide ou expiré"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Erreur de validation du token: {str(e)}"
            )


def get_current_user_from_request(request: Request) -> dict:
    """
    Extrait l'utilisateur courant depuis la requête.
    
    Args:
        request: La requête HTTP
        
    Returns:
        Les informations utilisateur
        
    Raises:
        HTTPException: Si l'utilisateur n'est pas authentifié
    """
    if not hasattr(request.state, "user"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur non authentifié"
        )
    
    return request.state.user

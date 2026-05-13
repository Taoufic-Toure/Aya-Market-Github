"""Garde-fous de rôle pour la protection des routes AyaMarket."""

from functools import wraps
from typing import Callable

from fastapi import HTTPException, Request, status
from fastapi.routing import APIRoute

from app.middleware.auth import get_current_user_from_request


class RoleGuard:
    """Classe pour la protection des routes par rôle."""
    
    @staticmethod
    def require_role(required_role: str) -> Callable:
        """
        Décorateur pour exiger un rôle spécifique.
        
        Args:
            required_role: Le rôle requis ("acheteur" ou "vendeur")
            
        Returns:
            Le décorateur de fonction
        """
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Extraire la requête des arguments
                request = None
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break
                
                if not request:
                    # Vérifier dans kwargs
                    for key, value in kwargs.items():
                        if isinstance(value, Request):
                            request = value
                            break
                
                if not request:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Requête non trouvée"
                    )
                
                # Récupérer l'utilisateur courant
                user = get_current_user_from_request(request)
                
                # Vérifier le rôle
                if user.get("role") != required_role:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Accès refusé. Rôle '{required_role}' requis."
                    )
                
                # Exécuter la fonction originale
                return await func(*args, **kwargs)
            
            return wrapper
        return decorator


# Fonctions utilitaires pour les rôles courants
def require_vendeur() -> Callable:
    """
    Décorateur pour exiger le rôle vendeur.
    
    Returns:
        Le décorateur de fonction
    """
    return RoleGuard.require_role("vendeur")


def require_acheteur() -> Callable:
    """
    Décorateur pour exiger le rôle acheteur.
    
    Returns:
        Le décorateur de fonction
    """
    return RoleGuard.require_role("acheteur")


def require_any_role(roles: list[str]) -> Callable:
    """
    Décorateur pour exiger un des rôles spécifiés.
    
    Args:
        roles: Liste des rôles acceptés
        
    Returns:
        Le décorateur de fonction
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extraire la requête
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if not request:
                for key, value in kwargs.items():
                    if isinstance(value, Request):
                        request = value
                        break
            
            if not request:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Requête non trouvée"
                )
            
            # Récupérer l'utilisateur courant
            user = get_current_user_from_request(request)
            
            # Vérifier si l'utilisateur a l'un des rôles requis
            user_role = user.get("role")
            if user_role not in roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Accès refusé. Rôles acceptés: {', '.join(roles)}"
                )
            
            # Exécuter la fonction originale
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


class ProtectedRoute(APIRoute):
    """
    Route protégée personnalisée avec vérification de rôle.
    """
    
    def __init__(self, *args, required_role: str = None, **kwargs):
        """
        Initialise une route protégée.
        
        Args:
            required_role: Le rôle requis pour accéder à cette route
            *args: Arguments positionnels
            **kwargs: Arguments nommés
        """
        self.required_role = required_role
        super().__init__(*args, **kwargs)
    
    def get_route_handler(self) -> Callable:
        """
        Retourne le gestionnaire de route avec vérification de rôle.
        
        Returns:
            Le gestionnaire de route
        """
        original_route_handler = super().get_route_handler()
        
        async def custom_route_handler(request):
            # Vérifier le rôle si requis
            if self.required_role:
                user = get_current_user_from_request(request)
                
                if user.get("role") != self.required_role:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Accès refusé. Rôle '{self.required_role}' requis."
                    )
            
            # Exécuter le gestionnaire original
            return await original_route_handler(request)
        
        return custom_route_handler


# Décorateur simple pour les fonctions asynchrones
def protect_role(required_role: str):
    """
    Décorateur simple pour protéger une fonction par rôle.
    
    Args:
        required_role: Le rôle requis
        
    Returns:
        Le décorateur de fonction
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            user = get_current_user_from_request(request)
            
            if user.get("role") != required_role:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Accès refusé. Rôle '{required_role}' requis."
                )
            
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator

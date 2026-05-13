"""Service pour l'upload d'images vers Supabase Storage."""

import os
import uuid
from typing import Optional, Tuple

from supabase import create_client, Client

from app.config import get_settings

settings = get_settings()


class SupabaseStorageService:
    """Service pour gérer les uploads vers Supabase Storage."""
    
    def __init__(self):
        """Initialise le client Supabase."""
        self.supabase: Client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_ANON_KEY
        )
        self.bucket_name = "products-images"
    
    async def upload_image(
        self, 
        file_data: bytes, 
        filename: str, 
        content_type: str = "image/jpeg"
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Upload une image vers Supabase Storage.
        
        Args:
            file_data: Données binaires de l'image
            filename: Nom du fichier original
            content_type: Type MIME du fichier
            
        Returns:
            Tuple (success, url_public, error_message)
        """
        try:
            # Générer un nom unique pour éviter les conflits
            file_extension = os.path.splitext(filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            storage_path = f"products/{unique_filename}"
            
            # Upload vers Supabase Storage
            upload_result = self.supabase.storage.from_(self.bucket_name).upload(
                path=storage_path,
                file=file_data,
                file_options={
                    "content-type": content_type,
                    "upsert": False
                }
            )
            
            if upload_result.data is None:
                return False, None, f"Erreur upload: {upload_result}"
            
            # Récupérer l'URL publique
            public_url = self.supabase.storage.from_(self.bucket_name).get_public_url(storage_path)
            
            return True, public_url, None
            
        except Exception as e:
            return False, None, f"Erreur lors de l'upload: {str(e)}"
    
    async def delete_image(self, storage_path: str) -> Tuple[bool, Optional[str]]:
        """
        Supprime une image de Supabase Storage.
        
        Args:
            storage_path: Chemin du fichier dans le bucket
            
        Returns:
            Tuple (success, error_message)
        """
        try:
            delete_result = self.supabase.storage.from_(self.bucket_name).remove([storage_path])
            
            if delete_result.data is None:
                return False, f"Erreur suppression: {delete_result}"
            
            return True, None
            
        except Exception as e:
            return False, f"Erreur lors de la suppression: {str(e)}"
    
    def get_storage_path_from_url(self, public_url: str) -> Optional[str]:
        """
        Extrait le chemin storage depuis l'URL publique.
        
        Args:
            public_url: URL publique Supabase
            
        Returns:
            Chemin storage ou None
        """
        try:
            # Format URL: https://[project].supabase.co/storage/v1/bucket/[bucket]/[path]
            if self.bucket_name not in public_url:
                return None
            
            parts = public_url.split('/')
            bucket_index = parts.index(self.bucket_name)
            
            if bucket_index == -1 or bucket_index == len(parts) - 1:
                return None
            
            storage_path = '/'.join(parts[bucket_index + 1:])
            return storage_path
            
        except Exception:
            return None
    
    def validate_image(self, file_data: bytes, content_type: str) -> Tuple[bool, Optional[str]]:
        """
        Valide le format et la taille de l'image.
        
        Args:
            file_data: Données binaires de l'image
            content_type: Type MIME du fichier
            
        Returns:
            Tuple (is_valid, error_message)
        """
        # Types MIME autorisés
        allowed_types = [
            "image/jpeg",
            "image/jpg", 
            "image/png",
            "image/webp"
        ]
        
        if content_type not in allowed_types:
            return False, f"Type de fichier non autorisé: {content_type}"
        
        # Taille maximale (5MB)
        max_size = 5 * 1024 * 1024  # 5MB
        if len(file_data) > max_size:
            return False, f"Fichier trop volumineux. Maximum: 5MB"
        
        return True, None


# Instance globale du service
supabase_storage = SupabaseStorageService()

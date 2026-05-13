"""Routes CRUD pour les produits AyaMarket avec SQLAlchemy."""

from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db_session
from app.models.product_db import Product
from app.schemas.product_db import (
    ProductCreate, ProductUpdate, ProductResponse, ProductListResponse, ProductQueryParams
)
from app.routes.auth import get_current_user
from app.utils.role_guard import require_vendeur
from app.services.supabase_storage import supabase_storage

router = APIRouter(prefix="/produits", tags=["Produits"])


@router.get("/", response_model=ProductListResponse, status_code=status.HTTP_200_OK)
async def list_products(
    page: int = Query(1, ge=1, description="Numéro de page"),
    limit: int = Query(20, ge=1, le=100, description="Éléments par page"),
    search: Optional[str] = Query(None, description="Recherche par nom"),
    categorie: Optional[str] = Query(None, description="Filtre par catégorie"),
    prix_min: Optional[float] = Query(None, ge=0, description="Prix minimum"),
    prix_max: Optional[float] = Query(None, ge=0, description="Prix maximum"),
    actif: Optional[bool] = Query(True, description="Filtre par statut"),
    db: AsyncSession = Depends(get_db_session)
) -> dict[str, Any]:
    """
    Liste tous les produits avec pagination et filtres.
    
    - Public : Aucune authentification requise
    - Pagination : page + limit
    - Filtres : recherche, catégorie, prix, statut
    """
    # Calcul offset pour pagination
    offset = (page - 1) * limit
    
    # Construction de la requête de base
    query = select(Product).where(Product.actif == actif)
    
    # Ajout des filtres
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Product.nom.ilike(search_term),
                Product.description.ilike(search_term)
            )
        )
    
    if categorie:
        query = query.where(Product.categorie.ilike(f"%{categorie}%"))
    
    if prix_min is not None:
        query = query.where(Product.prix >= prix_min)
    
    if prix_max is not None:
        query = query.where(Product.prix <= prix_max)
    
    # Tri par date de création (plus récents d'abord)
    query = query.order_by(Product.created_at.desc())
    
    # Exécution avec pagination
    result = await db.execute(query.offset(offset).limit(limit))
    products = result.scalars().all()
    
    # Comptage total pour pagination
    count_query = select(func.count(Product.id)).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Calcul nombre de pages
    pages = (total + limit - 1) // limit
    
    return {
        "produits": products,
        "total": total,
        "page": page,
        "pages": pages,
        "limit": limit
    }


@router.get("/{product_id}", response_model=ProductResponse, status_code=status.HTTP_200_OK)
async def get_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db_session)
) -> Product:
    """
    Récupère les détails d'un produit spécifique.
    
    - Public : Aucune authentification requise
    - Retourne 404 si produit non trouvé
    """
    # Recherche du produit
    stmt = select(Product).where(Product.id == product_id)
    result = await db.execute(stmt)
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produit non trouvé"
        )
    
    return product


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    current_user: dict = Depends(get_current_user),
    image: Optional[UploadFile] = File(None, description="Image du produit"),
    nom: str = Form(..., description="Nom du produit"),
    description: str = Form(..., description="Description du produit"),
    prix: float = Form(..., description="Prix du produit"),
    stock: Optional[int] = Form(None, description="Quantité en stock"),
    categorie: Optional[str] = Form(None, description="Catégorie du produit"),
    db: AsyncSession = Depends(get_db_session)
) -> Product:
    """
    Crée un nouveau produit.
    
    - Authentification requise
    - Réservé aux vendeurs uniquement
    - Upload image vers Supabase Storage
    """
    # Vérifier le rôle vendeur
    if current_user.get("role") != "vendeur":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les vendeurs peuvent créer des produits"
        )
    
    image_url = None
    
    # Upload de l'image si fournie
    if image:
        # Validation du fichier
        file_data = await image.read()
        is_valid, error_msg = supabase_storage.validate_image(
            file_data, image.content_type or "image/jpeg"
        )
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        
        # Upload vers Supabase Storage
        success, url, error = await supabase_storage.upload_image(
            file_data, image.filename or "image.jpg", image.content_type
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur upload image: {error}"
            )
        
        image_url = url
    
    # Création du produit
    product = Product(
        nom=nom,
        description=description,
        prix=prix,
        image_url=image_url,
        vendeur_id=UUID(current_user["id"]),
        stock=stock,
        categorie=categorie,
        actif=True
    )
    
    # Sauvegarde en base
    db.add(product)
    await db.commit()
    await db.refresh(product)
    
    return product


@router.put("/{product_id}", response_model=ProductResponse, status_code=status.HTTP_200_OK)
async def update_product(
    product_id: UUID,
    product_update: ProductUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
) -> Product:
    """
    Met à jour un produit existant.
    
    - Authentification requise
    - Réservé aux vendeurs uniquement
    - Vérification ownership (vendeur = propriétaire)
    """
    # Vérifier le rôle vendeur
    if current_user.get("role") != "vendeur":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les vendeurs peuvent modifier des produits"
        )
    
    # Récupérer le produit existant
    stmt = select(Product).where(Product.id == product_id)
    result = await db.execute(stmt)
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produit non trouvé"
        )
    
    # Vérifier que l'utilisateur est le propriétaire
    if str(product.vendeur_id) != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'êtes pas le propriétaire de ce produit"
        )
    
    # Mise à jour des champs fournis
    update_data = product_update.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(product, field, value)
    
    # Sauvegarde
    await db.commit()
    await db.refresh(product)
    
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
) -> None:
    """
    Supprime un produit.
    
    - Authentification requise
    - Réservé aux vendeurs uniquement
    - Vérification ownership (vendeur = propriétaire)
    - Suppression image Supabase Storage si présente
    """
    # Vérifier le rôle vendeur
    if current_user.get("role") != "vendeur":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les vendeurs peuvent supprimer des produits"
        )
    
    # Récupérer le produit existant
    stmt = select(Product).where(Product.id == product_id)
    result = await db.execute(stmt)
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produit non trouvé"
        )
    
    # Vérifier que l'utilisateur est le propriétaire
    if str(product.vendeur_id) != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'êtes pas le propriétaire de ce produit"
        )
    
    # Suppression de l'image si présente
    if product.image_url:
        storage_path = supabase_storage.get_storage_path_from_url(product.image_url)
        if storage_path:
            await supabase_storage.delete_image(storage_path)
    
    # Suppression du produit en base
    await db.delete(product)
    await db.commit()

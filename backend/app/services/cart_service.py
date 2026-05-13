"""Service de gestion du panier pour AyaMarket."""

from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cart import Cart
from app.models.product_db import Product
from app.schemas.cart import CartItemCreate, CartItemUpdate


class CartService:
    """Service pour la gestion du panier d'achat."""
    
    @staticmethod
    async def add_to_cart(
        user_id: UUID,
        item_data: CartItemCreate,
        db: AsyncSession
    ) -> Tuple[Cart, Optional[str]]:
        """
        Ajoute un produit au panier de l'utilisateur.
        
        Args:
            user_id: ID de l'utilisateur
            item_data: Données de l'item à ajouter
            db: Session de base de données
            
        Returns:
            Tuple (cart_item, error_message)
        """
        try:
            # Vérifier que le produit existe et est actif
            product_stmt = select(Product).where(
                and_(Product.id == item_data.product_id, Product.actif == True)
            )
            product_result = await db.execute(product_stmt)
            product = product_result.scalar_one_or_none()
            
            if not product:
                return None, "Produit non trouvé ou non disponible"
            
            # Vérifier le stock si applicable
            if product.stock is not None and product.stock < item_data.quantity:
                return None, f"Stock insuffisant. Disponible: {product.stock}"
            
            # Vérifier si le produit est déjà dans le panier
            existing_cart_stmt = select(Cart).where(
                and_(
                    Cart.user_id == user_id,
                    Cart.product_id == item_data.product_id
                )
            )
            existing_result = await db.execute(existing_cart_stmt)
            existing_item = existing_result.scalar_one_or_none()
            
            if existing_item:
                # Mettre à jour la quantité existante
                new_quantity = existing_item.quantity + item_data.quantity
                
                # Vérifier le stock après ajout
                if product.stock is not None and product.stock < new_quantity:
                    return None, f"Stock insuffisant. Disponible: {product.stock}"
                
                existing_item.quantity = new_quantity
                await db.commit()
                await db.refresh(existing_item)
                return existing_item, None
            else:
                # Créer un nouvel item dans le panier
                cart_item = Cart(
                    user_id=user_id,
                    product_id=item_data.product_id,
                    quantity=item_data.quantity
                )
                
                db.add(cart_item)
                await db.commit()
                await db.refresh(cart_item)
                return cart_item, None
                
        except Exception as e:
            await db.rollback()
            return None, f"Erreur lors de l'ajout au panier: {str(e)}"
    
    @staticmethod
    async def get_cart_items(
        user_id: UUID,
        db: AsyncSession
    ) -> List[Cart]:
        """
        Récupère tous les items du panier de l'utilisateur.
        
        Args:
            user_id: ID de l'utilisateur
            db: Session de base de données
            
        Returns:
            Liste des items du panier
        """
        try:
            stmt = select(Cart).where(Cart.user_id == user_id)
            result = await db.execute(stmt)
            return result.scalars().all()
        except Exception:
            return []
    
    @staticmethod
    async def get_cart_with_products(
        user_id: UUID,
        db: AsyncSession
    ) -> List[dict]:
        """
        Récupère le panier avec les informations des produits.
        
        Args:
            user_id: ID de l'utilisateur
            db: Session de base de données
            
        Returns:
            Liste des items du panier avec infos produits
        """
        try:
            stmt = (
                select(
                    Cart,
                    Product.nom.label("product_nom"),
                    Product.prix.label("product_prix"),
                    Product.image_url.label("product_image_url"),
                    Product.categorie.label("product_categorie")
                )
                .join(Product, Cart.product_id == Product.id)
                .where(
                    and_(
                        Cart.user_id == user_id,
                        Product.actif == True
                    )
                )
            )
            result = await db.execute(stmt)
            
            cart_items = []
            for cart, product_nom, product_prix, product_image_url, product_categorie in result:
                cart_items.append({
                    "cart": cart,
                    "product_nom": product_nom,
                    "product_prix": product_prix,
                    "product_image_url": product_image_url,
                    "product_categorie": product_categorie,
                    "subtotal": cart.quantity * product_prix
                })
            
            return cart_items
        except Exception:
            return []
    
    @staticmethod
    async def update_cart_item(
        user_id: UUID,
        cart_item_id: UUID,
        update_data: CartItemUpdate,
        db: AsyncSession
    ) -> Tuple[Optional[Cart], Optional[str]]:
        """
        Met à jour la quantité d'un item dans le panier.
        
        Args:
            user_id: ID de l'utilisateur
            cart_item_id: ID de l'item du panier
            update_data: Données de mise à jour
            db: Session de base de données
            
        Returns:
            Tuple (cart_item, error_message)
        """
        try:
            # Récupérer l'item du panier
            stmt = select(Cart).where(
                and_(
                    Cart.id == cart_item_id,
                    Cart.user_id == user_id
                )
            )
            result = await db.execute(stmt)
            cart_item = result.scalar_one_or_none()
            
            if not cart_item:
                return None, "Item du panier non trouvé"
            
            # Vérifier le stock du produit
            product_stmt = select(Product).where(Product.id == cart_item.product_id)
            product_result = await db.execute(product_stmt)
            product = product_result.scalar_one_or_none()
            
            if product and product.stock is not None and product.stock < update_data.quantity:
                return None, f"Stock insuffisant. Disponible: {product.stock}"
            
            # Mettre à jour la quantité
            cart_item.quantity = update_data.quantity
            await db.commit()
            await db.refresh(cart_item)
            
            return cart_item, None
            
        except Exception as e:
            await db.rollback()
            return None, f"Erreur lors de la mise à jour: {str(e)}"
    
    @staticmethod
    async def remove_from_cart(
        user_id: UUID,
        cart_item_id: UUID,
        db: AsyncSession
    ) -> Tuple[bool, Optional[str]]:
        """
        Supprime un item du panier.
        
        Args:
            user_id: ID de l'utilisateur
            cart_item_id: ID de l'item à supprimer
            db: Session de base de données
            
        Returns:
            Tuple (success, error_message)
        """
        try:
            # Récupérer l'item du panier
            stmt = select(Cart).where(
                and_(
                    Cart.id == cart_item_id,
                    Cart.user_id == user_id
                )
            )
            result = await db.execute(stmt)
            cart_item = result.scalar_one_or_none()
            
            if not cart_item:
                return False, "Item du panier non trouvé"
            
            # Supprimer l'item
            await db.delete(cart_item)
            await db.commit()
            
            return True, None
            
        except Exception as e:
            await db.rollback()
            return False, f"Erreur lors de la suppression: {str(e)}"
    
    @staticmethod
    async def clear_cart(
        user_id: UUID,
        db: AsyncSession
    ) -> Tuple[bool, Optional[str]]:
        """
        Vide complètement le panier de l'utilisateur.
        
        Args:
            user_id: ID de l'utilisateur
            db: Session de base de données
            
        Returns:
            Tuple (success, error_message)
        """
        try:
            # Supprimer tous les items du panier
            stmt = select(Cart).where(Cart.user_id == user_id)
            result = await db.execute(stmt)
            cart_items = result.scalars().all()
            
            for item in cart_items:
                await db.delete(item)
            
            await db.commit()
            return True, None
            
        except Exception as e:
            await db.rollback()
            return False, f"Erreur lors du vidage du panier: {str(e)}"
    
    @staticmethod
    async def calculate_cart_total(
        user_id: UUID,
        db: AsyncSession
    ) -> Tuple[float, int, int]:
        """
        Calcule le total du panier.
        
        Args:
            user_id: ID de l'utilisateur
            db: Session de base de données
            
        Returns:
            Tuple (total_price, total_items, total_quantity)
        """
        try:
            stmt = (
                select(
                    func.count(Cart.id).label("total_items"),
                    func.sum(Cart.quantity).label("total_quantity"),
                    func.sum(Cart.quantity * Product.prix).label("total_price")
                )
                .join(Product, Cart.product_id == Product.id)
                .where(
                    and_(
                        Cart.user_id == user_id,
                        Product.actif == True
                    )
                )
            )
            result = await db.execute(stmt)
            row = result.first()
            
            if row:
                return (
                    float(row.total_price or 0),
                    int(row.total_items or 0),
                    int(row.total_quantity or 0)
                )
            
            return 0.0, 0, 0
            
        except Exception:
            return 0.0, 0, 0


# Instance globale du service
cart_service = CartService()

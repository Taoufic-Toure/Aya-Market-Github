"""Service de gestion des commandes pour AyaMarket."""

from datetime import datetime
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import select, func, and_, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order, OrderItem, OrderStatus
from app.models.product_db import Product
from app.schemas.order import OrderCreate, OrderStatusUpdate
from app.services.cart_service import cart_service


class OrderService:
    """Service pour la gestion des commandes marketplace."""
    
    @staticmethod
    async def create_order_from_cart(
        user_id: UUID,
        order_data: OrderCreate,
        db: AsyncSession
    ) -> Tuple[Optional[Order], Optional[str]]:
        """
        Crée une commande à partir du panier de l'utilisateur.
        
        Args:
            user_id: ID de l'utilisateur
            order_data: Données de la commande
            db: Session de base de données
            
        Returns:
            Tuple (order, error_message)
        """
        try:
            # Récupérer le panier avec les produits
            cart_items = await cart_service.get_cart_with_products(user_id, db)
            
            if not cart_items:
                return None, "Le panier est vide"
            
            # Calculer le total
            total_price = sum(item["subtotal"] for item in cart_items)
            
            # Vérifier le stock pour tous les produits
            for item in cart_items:
                if item["cart"].product.stock is not None and item["cart"].product.stock < item["cart"].quantity:
                    return None, f"Stock insuffisant pour {item['product_nom']}. Disponible: {item['cart'].product.stock}"
            
            # Créer la commande
            order = Order(
                user_id=user_id,
                total_price=total_price,
                statut=OrderStatus.PENDING,
                shipping_address=order_data.shipping_address,
                notes=order_data.notes
            )
            
            db.add(order)
            await db.flush()  # Pour obtenir l'ID de la commande
            
            # Créer les items de commande
            order_items = []
            for item in cart_items:
                order_item = OrderItem(
                    order_id=order.id,
                    product_id=item["cart"].product_id,
                    quantity=item["cart"].quantity,
                    price=item["product_prix"]  # Prix au moment de la commande
                )
                order_items.append(order_item)
                db.add(order_item)
                
                # Décrémenter le stock du produit
                if item["cart"].product.stock is not None:
                    new_stock = item["cart"].product.stock - item["cart"].quantity
                    await db.execute(
                        update(Product)
                        .where(Product.id == item["cart"].product_id)
                        .values(stock=new_stock)
                    )
            
            # Sauvegarder la commande et les items
            await db.commit()
            await db.refresh(order)
            
            # Vider le panier
            await cart_service.clear_cart(user_id, db)
            
            return order, None
            
        except Exception as e:
            await db.rollback()
            return None, f"Erreur lors de la création de la commande: {str(e)}"
    
    @staticmethod
    async def get_user_orders(
        user_id: UUID,
        db: AsyncSession,
        page: int = 1,
        limit: int = 20,
        statut: Optional[str] = None
    ) -> Tuple[List[Order], int]:
        """
        Récupère les commandes de l'utilisateur avec pagination.
        
        Args:
            user_id: ID de l'utilisateur
            page: Numéro de page
            limit: Éléments par page
            statut: Filtre par statut
            db: Session de base de données
            
        Returns:
            Tuple (orders, total)
        """
        try:
            offset = (page - 1) * limit
            
            # Construction de la requête de base
            query = select(Order).where(Order.user_id == user_id)
            
            # Ajout du filtre par statut
            if statut:
                query = query.where(Order.statut == OrderStatus(statut))
            
            # Tri par date de création (plus récents d'abord)
            query = query.order_by(Order.created_at.desc())
            
            # Exécution avec pagination
            result = await db.execute(query.offset(offset).limit(limit))
            orders = result.scalars().all()
            
            # Comptage total pour pagination
            count_query = select(func.count(Order.id)).select_from(query.subquery())
            total_result = await db.execute(count_query)
            total = total_result.scalar()
            
            return orders, total
            
        except Exception:
            return [], 0
    
    @staticmethod
    async def get_order_with_items(
        order_id: UUID,
        db: AsyncSession,
        user_id: Optional[UUID] = None
    ) -> Optional[Order]:
        """
        Récupère une commande avec ses items.
        
        Args:
            order_id: ID de la commande
            user_id: ID de l'utilisateur (pour vérification ownership)
            db: Session de base de données
            
        Returns:
            Commande avec items ou None
        """
        try:
            query = select(Order).where(Order.id == order_id)
            
            # Ajout de la vérification utilisateur si fourni
            if user_id:
                query = query.where(Order.user_id == user_id)
            
            result = await db.execute(query)
            order = result.scalar_one_or_none()
            
            return order
            
        except Exception:
            return None
    
    @staticmethod
    async def update_order_status(
        order_id: UUID,
        status_update: OrderStatusUpdate,
        db: AsyncSession,
        user_id: Optional[UUID] = None,
        is_vendor: bool = False
    ) -> Tuple[Optional[Order], Optional[str]]:
        """
        Met à jour le statut d'une commande.
        
        Args:
            order_id: ID de la commande
            status_update: Données de mise à jour du statut
            user_id: ID de l'utilisateur (pour vérification)
            is_vendor: Si l'utilisateur est un vendeur
            db: Session de base de données
            
        Returns:
            Tuple (order, error_message)
        """
        try:
            # Récupérer la commande
            order = await OrderService.get_order_with_items(order_id, user_id, db)
            
            if not order:
                return None, "Commande non trouvée"
            
            # Si c'est un vendeur, vérifier qu'il a des produits dans cette commande
            if is_vendor:
                has_vendor_products = False
                for item in order.items:
                    if hasattr(item.product, 'vendeur_id') and str(item.product.vendeur_id) == str(user_id):
                        has_vendor_products = True
                        break
                
                if not has_vendor_products:
                    return None, "Vous n'êtes pas autorisé à modifier cette commande"
            
            # Valider la transition de statut
            new_status = OrderStatus(status_update.statut)
            
            # Logique de validation des transitions
            if order.statut == OrderStatus.CANCELLED and new_status != OrderStatus.CANCELLED:
                return None, "Impossible de modifier une commande annulée"
            
            if order.statut == OrderStatus.DELIVERED and new_status != OrderStatus.DELIVERED:
                return None, "Impossible de modifier une commande livrée"
            
            # Mettre à jour le statut
            order.statut = new_status
            order.updated_at = datetime.utcnow()
            
            await db.commit()
            await db.refresh(order)
            
            return order, None
            
        except Exception as e:
            await db.rollback()
            return None, f"Erreur lors de la mise à jour du statut: {str(e)}"
    
    @staticmethod
    async def get_vendor_orders(
        vendor_id: UUID,
        db: AsyncSession,
        page: int = 1,
        limit: int = 20,
        statut: Optional[str] = None
    ) -> Tuple[List[Order], int]:
        """
        Récupère les commandes contenant les produits d'un vendeur.
        
        Args:
            vendor_id: ID du vendeur
            page: Numéro de page
            limit: Éléments par page
            statut: Filtre par statut
            db: Session de base de données
            
        Returns:
            Tuple (orders, total)
        """
        try:
            offset = (page - 1) * limit
            
            # Requête pour trouver les commandes contenant les produits du vendeur
            query = (
                select(Order)
                .join(OrderItem, Order.id == OrderItem.order_id)
                .join(Product, OrderItem.product_id == Product.id)
                .where(Product.vendeur_id == vendor_id)
                .distinct()
            )
            
            # Ajout du filtre par statut
            if statut:
                query = query.where(Order.statut == OrderStatus(statut))
            
            # Tri par date de création
            query = query.order_by(Order.created_at.desc())
            
            # Exécution avec pagination
            result = await db.execute(query.offset(offset).limit(limit))
            orders = result.scalars().all()
            
            # Comptage total
            count_query = select(func.count(func.distinct(Order.id))).select_from(
                Order.join(OrderItem, Order.id == OrderItem.order_id)
                .join(Product, OrderItem.product_id == Product.id)
            ).where(Product.vendeur_id == vendor_id)
            
            if statut:
                count_query = count_query.where(Order.statut == OrderStatus(statut))
            
            total_result = await db.execute(count_query)
            total = total_result.scalar()
            
            return orders, total
            
        except Exception:
            return [], 0
    
    @staticmethod
    async def get_order_statistics(
        db: AsyncSession,
        user_id: Optional[UUID] = None,
        vendor_id: Optional[UUID] = None
    ) -> dict:
        """
        Récupère les statistiques des commandes.
        
        Args:
            user_id: ID de l'utilisateur (statistiques client)
            vendor_id: ID du vendeur (statistiques vendeur)
            db: Session de base de données
            
        Returns:
            Dictionnaire des statistiques
        """
        try:
            base_query = select(Order)
            
            if user_id:
                base_query = base_query.where(Order.user_id == user_id)
            elif vendor_id:
                base_query = (
                    base_query.join(OrderItem, Order.id == OrderItem.order_id)
                    .join(Product, OrderItem.product_id == Product.id)
                    .where(Product.vendeur_id == vendor_id)
                    .distinct()
                )
            
            # Statistiques par statut
            stats_query = (
                select(
                    Order.statut,
                    func.count(Order.id).label("count"),
                    func.sum(Order.total_price).label("total")
                )
                .select_from(base_query.subquery())
                .group_by(Order.statut)
            )
            
            result = await db.execute(stats_query)
            stats = result.all()
            
            # Formater les résultats
            statistics = {
                "total_orders": 0,
                "total_revenue": 0.0,
                "by_status": {}
            }
            
            for statut, count, total in stats:
                statistics["total_orders"] += int(count)
                statistics["total_revenue"] += float(total or 0)
                statistics["by_status"][statut.value] = {
                    "count": int(count),
                    "total": float(total or 0)
                }
            
            return statistics
            
        except Exception:
            return {
                "total_orders": 0,
                "total_revenue": 0.0,
                "by_status": {}
            }


# Instance globale du service
order_service = OrderService()

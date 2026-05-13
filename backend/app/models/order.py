"""Modèles de données Order (commandes) pour AyaMarket."""

from datetime import datetime
from typing import Optional
from enum import Enum

from sqlalchemy import String, DateTime, Float, Boolean, ForeignKey, Integer, Numeric
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class OrderStatus(str, Enum):
    """Statuts possibles pour une commande."""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class Order(Base):
    """Modèle commande pour la marketplace AyaMarket."""
    
    __tablename__ = "orders"
    
    # Clé primaire UUID
    id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default="gen_random_uuid()"
    )
    
    # Relations
    user_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Informations commande
    total_price: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False
    )
    
    statut: Mapped[OrderStatus] = mapped_column(
        ENUM(OrderStatus, name="order_status"),
        nullable=False,
        default=OrderStatus.PENDING
    )
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow
    )
    
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
        onupdate=datetime.utcnow
    )
    
    # Champs optionnels
    shipping_address: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True
    )
    
    notes: Mapped[Optional[str]] = mapped_column(
        String(1000),
        nullable=True
    )
    
    # Relations
    user: Mapped["User"] = relationship("User", back_populates="orders")
    items: Mapped[list["OrderItem"]] = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        """Représentation textuelle de la commande."""
        return f"<Order(id={self.id}, user_id={self.user_id}, total={self.total_price}, status={self.statut})>"
    
    def to_dict(self) -> dict:
        """Convertit la commande en dictionnaire."""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "total_price": float(self.total_price),
            "statut": self.statut.value,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "shipping_address": self.shipping_address,
            "notes": self.notes
        }


class OrderItem(Base):
    """Modèle item de commande pour AyaMarket."""
    
    __tablename__ = "order_items"
    
    # Clé primaire UUID
    id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default="gen_random_uuid()"
    )
    
    # Relations
    order_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    product_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Informations item
    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )
    
    price: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False
    )
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow
    )
    
    # Relations
    order: Mapped["Order"] = relationship("Order", back_populates="items")
    product: Mapped["Product"] = relationship("Product", back_populates="order_items")
    
    def __repr__(self) -> str:
        """Représentation textuelle de l'item de commande."""
        return f"<OrderItem(id={self.id}, order_id={self.order_id}, product_id={self.product_id}, quantity={self.quantity}, price={self.price})>"
    
    def to_dict(self) -> dict:
        """Convertit l'item de commande en dictionnaire."""
        return {
            "id": str(self.id),
            "order_id": str(self.order_id),
            "product_id": str(self.product_id),
            "quantity": self.quantity,
            "price": float(self.price),
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

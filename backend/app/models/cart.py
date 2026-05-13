"""Modèle de données Cart (panier) pour AyaMarket."""

from datetime import datetime
from typing import Optional

from sqlalchemy import String, DateTime, Integer, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class Cart(Base):
    """Modèle panier pour la marketplace AyaMarket."""
    
    __tablename__ = "cart"
    
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
    
    product_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Quantité
    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1
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
    
    # Relations
    user: Mapped["User"] = relationship("User", back_populates="cart_items")
    product: Mapped["Product"] = relationship("Product", back_populates="cart_items")
    
    def __repr__(self) -> str:
        """Représentation textuelle du panier."""
        return f"<Cart(id={self.id}, user_id={self.user_id}, product_id={self.product_id}, quantity={self.quantity})>"
    
    def to_dict(self) -> dict:
        """Convertit le panier en dictionnaire."""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "product_id": str(self.product_id),
            "quantity": self.quantity,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

"""Modèle de données Product avec SQLAlchemy pour AyaMarket."""

from datetime import datetime
from typing import Optional

from sqlalchemy import String, Text, Float, DateTime, Boolean, Integer, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class Product(Base):
    """Modèle produit pour la marketplace AyaMarket."""
    
    __tablename__ = "products"
    
    # Clé primaire UUID
    id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default="gen_random_uuid()"
    )
    
    # Informations de base
    nom: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True
    )
    
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    
    prix: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False
    )
    
    # Image
    image_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True
    )
    
    # Relations
    vendeur_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True
    )
    
    # Statut
    actif: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True
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
    stock: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True
    )
    
    categorie: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    
    # Relations pour le panier et les commandes
    cart_items: Mapped[list["Cart"]] = relationship("Cart", back_populates="product", cascade="all, delete-orphan")
    order_items: Mapped[list["OrderItem"]] = relationship("OrderItem", back_populates="product", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        """Représentation textuelle du produit."""
        return f"<Product(id={self.id}, nom={self.nom}, prix={self.prix})>"
    
    def to_dict(self) -> dict:
        """Convertit le produit en dictionnaire."""
        return {
            "id": str(self.id),
            "nom": self.nom,
            "description": self.description,
            "prix": float(self.prix),
            "image_url": self.image_url,
            "vendeur_id": str(self.vendeur_id),
            "actif": self.actif,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "stock": self.stock,
            "categorie": self.categorie
        }

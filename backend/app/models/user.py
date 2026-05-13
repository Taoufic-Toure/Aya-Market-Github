"""Modèle de données User pour AyaMarket."""

from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class User(Base):
    """Modèle utilisateur pour l'authentification AyaMarket."""
    
    __tablename__ = "users"
    
    # Clé primaire UUID
    id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default="gen_random_uuid()"
    )
    
    # Informations de base
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )
    
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    
    nom: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    
    ville: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    
    # Rôle et statut
    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="acheteur"  # acheteur ou vendeur
    )
    
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
    
    # Relations pour le panier et les commandes
    cart_items: Mapped[list["Cart"]] = relationship("Cart", back_populates="user", cascade="all, delete-orphan")
    orders: Mapped[list["Order"]] = relationship("Order", back_populates="user", cascade="all, delete-orphan")
    
    # Champs optionnels
    telephone: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True
    )
    
    bio: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    
    def __repr__(self) -> str:
        """Représentation textuelle de l'utilisateur."""
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"
    
    def to_dict(self) -> dict:
        """Convertit l'utilisateur en dictionnaire."""
        return {
            "id": str(self.id),
            "email": self.email,
            "nom": self.nom,
            "ville": self.ville,
            "role": self.role,
            "actif": self.actif,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "telephone": self.telephone,
            "bio": self.bio
        }

"""Objet métier produit (version simple)."""

from dataclasses import dataclass


@dataclass(slots=True)
class Product:
    """Représentation métier minimale d'un produit."""

    id: int
    name: str
    price: float
    currency: str
    in_stock: bool

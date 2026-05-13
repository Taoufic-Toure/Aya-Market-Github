"""Schémas Pydantic pour les produits."""

from pydantic import BaseModel, Field


class ProductOut(BaseModel):
    """Format de réponse d'un produit."""

    id: int = Field(example=1)
    name: str = Field(example="Chemise en pagne")
    price: float = Field(example=12000.0)
    currency: str = Field(example="XOF")
    in_stock: bool = Field(example=True)

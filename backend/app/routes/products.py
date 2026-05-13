"""Routes de démonstration pour les produits."""

from __future__ import annotations

from fastapi import APIRouter

from app.schemas.product import ProductOut

router = APIRouter(prefix="/products", tags=["Products"])


@router.get(
    "",
    summary="Liste de produits de test",
    response_model=list[ProductOut],
    responses={
        200: {
            "description": "Liste de produits",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": 1,
                            "name": "Chemise en pagne",
                            "price": 12000.0,
                            "currency": "XOF",
                            "in_stock": True,
                        },
                        {
                            "id": 2,
                            "name": "Sandales artisanales",
                            "price": 9000.0,
                            "currency": "XOF",
                            "in_stock": True,
                        },
                    ]
                }
            },
        }
    },
)
async def list_products() -> list[ProductOut]:
    """Retourne des données statiques pour valider le flux API."""
    return [
        ProductOut(
            id=1,
            name="Chemise en pagne",
            price=12000.0,
            currency="XOF",
            in_stock=True,
        ),
        ProductOut(
            id=2,
            name="Sandales artisanales",
            price=9000.0,
            currency="XOF",
            in_stock=True,
        ),
    ]

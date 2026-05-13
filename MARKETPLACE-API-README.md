# 🛒 Marketplace API - AyaMarket

## 📋 Vue d'ensemble

Système complet de marketplace avec panier d'achat et gestion des commandes pour AyaMarket. Architecture scalable type Jumia/Amazon light.

## 🏗️ Architecture

### Backend FastAPI

#### 📁 Modèles et Schémas
- **`app/models/cart.py`** : Modèle SQLAlchemy pour le panier
- **`app/models/order.py`** : Modèles SQLAlchemy pour commandes et items
- **`app/schemas/cart.py`** : Schémas Pydantic pour le panier
- **`app/schemas/order.py`** : Schémas Pydantic pour les commandes

#### 🛡️ Services Métier
- **`app/services/cart_service.py`** : Logique panier (ajouter/supprimer/calculer)
- **`app/services/order_service.py`** : Logique commandes (créer/statuts/statistiques)

#### 🛣️ Routes API
- **`app/routes/cart.py`** : Endpoints panier avec authentification
- **`app/routes/orders.py`** : Endpoints commandes avec permissions

## 🛒 Panier d'Achat

### Endpoints API

#### `POST /panier/ajouter`
Ajoute un produit au panier de l'utilisateur.

**Headers :**
```bash
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body :**
```json
{
  "product_id": "123e4567-e89b-12d3-a456-426614174000",
  "quantity": 2
}
```

**Response :**
```json
{
  "message": "Produit ajouté au panier avec succès",
  "cart_item": {
    "id": "456e7890-e89b-12d3-a456-426614174001",
    "user_id": "789e0123-e89b-12d3-a456-426614174002",
    "product_id": "123e4567-e89b-12d3-a456-426614174000",
    "quantity": 2,
    "created_at": "2024-01-15T10:30:00Z"
  },
  "cart_summary": {
    "total_items": 3,
    "total_quantity": 5,
    "total_price": 89.97
  }
}
```

#### `GET /panier/`
Récupère le panier complet avec produits et calculs.

**Response :**
```json
{
  "items": [
    {
      "id": "456e7890-e89b-12d3-a456-426614174001",
      "product_id": "123e4567-e89b-12d3-a456-426614174000",
      "quantity": 2,
      "product_nom": "T-shirt Bénin",
      "product_prix": 15.99,
      "product_image_url": "https://example.com/image.jpg",
      "product_categorie": "Vêtements",
      "subtotal": 31.98,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total_items": 1,
  "total_quantity": 2,
  "total_price": 31.98
}
```

#### `PUT /panier/{item_id}`
Met à jour la quantité d'un item du panier.

**Request Body :**
```json
{
  "quantity": 3
}
```

#### `DELETE /panier/{item_id}`
Supprime un item spécifique du panier.

#### `DELETE /panier/`
Vide complètement le panier de l'utilisateur.

#### `GET /panier/summary`
Résumé du panier (badges/notifications).

**Response :**
```json
{
  "total_items": 3,
  "total_quantity": 5,
  "total_price": 89.97
}
```

## 📦 Gestion des Commandes

### Endpoints API

#### `POST /commandes`
Transforme le panier en commande.

**Headers :**
```bash
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body :**
```json
{
  "shipping_address": "123 Rue du Commerce, Cotonou, Bénin",
  "notes": "Livraison après 18h"
}
```

**Response :**
```json
{
  "id": "789e0123-e89b-12d3-a456-426614174003",
  "user_id": "789e0123-e89b-12d3-a456-426614174002",
  "total_price": 89.97,
  "statut": "pending",
  "created_at": "2024-01-15T14:30:00Z",
  "shipping_address": "123 Rue du Commerce, Cotonou, Bénin",
  "notes": "Livraison après 18h",
  "items": [
    {
      "id": "890e1234-e89b-12d3-a456-426614174004",
      "product_id": "123e4567-e89b-12d3-a456-426614174000",
      "quantity": 2,
      "price": 15.99,
      "product_nom": "T-shirt Bénin",
      "subtotal": 31.98,
      "created_at": "2024-01-15T14:30:00Z"
    }
  ],
  "total_items": 1,
  "total_quantity": 2
}
```

#### `GET /commandes/`
Historique des commandes utilisateur avec pagination.

**Query Parameters :**
```bash
?page=1                    # Numéro de page (défaut: 1)
&limit=20                  # Éléments par page (1-100, défaut: 20)
&statut=pending            # Filtre par statut (optionnel)
```

**Response :**
```json
{
  "commandes": [
    {
      "id": "789e0123-e89b-12d3-a456-426614174003",
      "total_price": 89.97,
      "statut": "pending",
      "created_at": "2024-01-15T14:30:00Z",
      "total_items": 1,
      "total_quantity": 2
    }
  ],
  "total": 5,
  "page": 1,
  "pages": 1,
  "limit": 20
}
```

#### `GET /commandes/{order_id}`
Détails complets d'une commande spécifique.

#### `PUT /commandes/{order_id}/statut`
Met à jour le statut d'une commande (vendeur uniquement).

**Request Body :**
```json
{
  "statut": "confirmed"
}
```

**Statuts possibles :**
- `pending` : En attente
- `confirmed` : Confirmée
- `shipped` : Expédiée
- `delivered` : Livrée
- `cancelled` : Annulée

#### `GET /commandes/vendor/orders`
Commandes contenant les produits du vendeur.

#### `GET /commandes/vendor/statistics`
Statistiques des commandes pour un vendeur.

**Response :**
```json
{
  "total_orders": 25,
  "total_revenue": 1250.50,
  "by_status": {
    "pending": {
      "count": 5,
      "total": 250.00
    },
    "confirmed": {
      "count": 15,
      "total": 750.00
    },
    "delivered": {
      "count": 5,
      "total": 250.50
    }
  }
}
```

## 🗄️ Base de Données

### Table `cart`
```sql
CREATE TABLE cart (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_cart_user_id ON cart(user_id);
CREATE INDEX idx_cart_product_id ON cart(product_id);
CREATE UNIQUE INDEX idx_cart_user_product ON cart(user_id, product_id);
```

### Table `orders`
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_price FLOAT(10,2) NOT NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    shipping_address VARCHAR(500),
    notes VARCHAR(1000)
);

-- Indexes
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_statut ON orders(statut);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
```

### Table `order_items`
```sql
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    price FLOAT(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
```

## 🔐 Sécurité et Permissions

### Authentification JWT
- **Token requis** : Pour toutes les endpoints panier/commandes
- **Header format** : `Authorization: Bearer <token>`
- **Expiration** : 30 minutes

### Contrôle d'accès
- **Panier** : Uniquement l'utilisateur propriétaire
- **Commandes client** : Uniquement l'utilisateur propriétaire
- **Statuts commande** : Vendeurs peuvent modifier leurs commandes
- **Statistiques** : Réservé aux vendeurs

### Logique métier
- **Stock** : Vérifié avant ajout au panier et commande
- **Panier → Commande** : Transformation atomique avec rollback
- **Prix figé** : Prix sauvegardé au moment de la commande
- **Vidage panier** : Automatique après création commande

## 🧠 Logique Métier Avancée

### Gestion du Panier
```python
# Ajout au panier avec vérification stock
if product.stock < quantity:
    return None, "Stock insuffisant"

# Mise à jour quantité existante
existing_item.quantity += new_quantity

# Calcul automatique des totaux
total_price = sum(item.quantity * item.product.prix for item in cart_items)
```

### Création Commande
```python
# Processus atomique
1. Récupérer panier utilisateur
2. Calculer total commande
3. Vérifier stock tous les produits
4. Créer commande (statut: pending)
5. Créer order_items (prix figé)
6. Décrémenter stock produits
7. Vider panier utilisateur
8. Commit transaction
```

### Mise à jour Statuts
```python
# Validation des transitions
if order.statut == "cancelled" and new_status != "cancelled":
    return None, "Commande annulée non modifiable"

# Permissions vendeur
if is_vendor and not has_vendor_products(order):
    return None, "Non autorisé"
```

## 🚀 Déploiement

### Lancement
```bash
uvicorn app.main:app --reload
# Disponible sur : http://127.0.0.1:8000
# Documentation : http://127.0.0.1:8000/docs
```

### Tests API

#### Ajouter au panier
```bash
curl -X POST "http://127.0.0.1:8000/panier/ajouter" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"product_id": "uuid", "quantity": 2}'
```

#### Créer commande
```bash
curl -X POST "http://127.0.0.1:8000/commandes" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"shipping_address": "123 Rue du Commerce", "notes": "Urgent"}'
```

#### Mettre à jour statut
```bash
curl -X PUT "http://127.0.0.1:8000/commandes/uuid/statut" \
  -H "Authorization: Bearer <vendor_token>" \
  -H "Content-Type: application/json" \
  -d '{"statut": "confirmed"}'
```

## 📈 Performance et Scalabilité

### Optimisations
- **Indexes** : user_id, product_id, statut, created_at
- **Pagination** : Limitée à 100 éléments max par page
- **Transactions** : Atomiques avec rollback
- **Calculs** : Totaux côté serveur SQL

### Monitoring
- **Logging** : Middleware de requêtes
- **Errors** : HTTPException détaillées
- **Performance** : Requêtes SQL optimisées

## 🔧 Personnalisation

### Ajouter des statuts personnalisés
```python
# Dans app/models/order.py
class OrderStatus(str, Enum):
    PROCESSING = "processing"  # Ajout
    REFUNDED = "refunded"      # Ajout
```

### Frais de livraison
```python
# Dans app/services/order_service.py
shipping_cost = 5.00  # Frais fixes
if total_price > 100:
    shipping_cost = 0  # Livraison gratuite
total_price += shipping_cost
```

### Système de réduction
```python
# Dans app/services/cart_service.py
if total_quantity >= 5:
    discount = total_price * 0.1  # 10% de réduction
    total_price -= discount
```

## ✅ Fonctionnalités

- ✅ **Panier complet** : Ajouter/mettre à jour/supprimer/vider
- ✅ **Calculs automatiques** : Sous-totaux, totaux, quantités
- ✅ **Gestion stock** : Vérification avant ajout/commande
- ✅ **Commandes CRUD** : Créer/lister/détails/statuts
- ✅ **Permissions** : Client/vendeur avec ownership
- ✅ **Pagination** : Efficace avec filtres
- ✅ **Statistiques** : Dashboard vendeur
- ✅ **Transactions** : Atomiques avec rollback
- ✅ **Validation** : Pydantic + SQLAlchemy stricts
- ✅ **Documentation** : OpenAPI auto-générée

## 🎯 Prochaines étapes

1. **Paiement** : Intégration FedaPay/Stripe
2. **Notifications** : Email/SMS commandes
3. **Livraison** : Tracking et statuts avancés
4. **Évaluations** : Notes et avis produits/commandes
5. **Promotions** : Codes réduction et ventes flash
6. **Analytics** : Dashboard admin complet

---

**🎉 La marketplace AyaMarket est prête pour la production !**

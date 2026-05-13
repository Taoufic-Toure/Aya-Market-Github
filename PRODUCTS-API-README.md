# 🚀 API Produits - AyaMarket

## 📋 Vue d'ensemble

Module complet de gestion des produits pour la marketplace AyaMarket avec FastAPI, SQLAlchemy et Supabase Storage.

## 🏗️ Architecture

### Backend FastAPI

#### 📁 Modèles et Schémas
- **`app/models/product_db.py`** : Modèle SQLAlchemy avec UUID
- **`app/schemas/product_db.py`** : Schémas Pydantic validés

#### 🛡️ Sécurité
- **JWT obligatoire** : POST/PUT/DELETE authentifiés
- **Rôle vendeur** : Uniquement les vendeurs peuvent créer/modifier/supprimer
- **Ownership** : Vérification propriétaire du produit

#### 📤 Upload Images
- **Supabase Storage** : Service d'upload complet
- **Validation** : Types MIME, taille maximale 5MB
- **URL publiques** : Génération automatique

## 🛣️ Endpoints API

### 📦 Produits (Public)

#### `GET /produits/`
Liste tous les produits avec pagination et filtres.

**Query Parameters :**
```bash
?page=1                    # Numéro de page (défaut: 1)
&limit=20                  # Éléments par page (1-100, défaut: 20)
&search=t-shirt             # Recherche par nom/description
&categorie=Vêtements        # Filtre par catégorie
&prix_min=10.0            # Prix minimum
&prix_max=50.0             # Prix maximum
&actif=true                # Filtre par statut (défaut: true)
```

**Response :**
```json
{
  "produits": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "nom": "T-shirt Bénin",
      "description": "T-shirt 100% coton avec motif traditionnel",
      "prix": 15.99,
      "image_url": "https://example.com/image.jpg",
      "vendeur_id": "456e7890-e89b-12d3-a456-426614174001",
      "actif": true,
      "created_at": "2024-01-15T10:30:00Z",
      "stock": 50,
      "categorie": "Vêtements"
    }
  ],
  "total": 150,
  "page": 1,
  "pages": 15,
  "limit": 20
}
```

#### `GET /produits/{product_id}`
Récupère les détails d'un produit spécifique.

**Path Parameters :**
```bash
product_id    # UUID du produit
```

**Response :**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "nom": "T-shirt Bénin",
  "description": "T-shirt 100% coton avec motif traditionnel béninois",
  "prix": 15.99,
  "image_url": "https://example.com/image.jpg",
  "vendeur_id": "456e7890-e89b-12d3-a456-426614174001",
  "actif": true,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-16T14:20:00Z",
  "stock": 50,
  "categorie": "Vêtements"
}
```

### 🔐 Produits (Authentifié - Vendeur uniquement)

#### `POST /produits/`
Crée un nouveau produit (vendeur uniquement).

**Headers :**
```bash
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Form Data :**
```bash
nom="T-shirt Bénin"
description="T-shirt 100% coton avec motif traditionnel béninois"
prix=15.99
stock=50
categorie=Vêtements
image=@tshirt.jpg
```

**Response :**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "nom": "T-shirt Bénin",
  "description": "T-shirt 100% coton avec motif traditionnel béninois",
  "prix": 15.99,
  "image_url": "https://project.supabase.co/storage/v1/products-images/products/uuid.jpg",
  "vendeur_id": "456e7890-e89b-12d3-a456-426614174001",
  "actif": true,
  "created_at": "2024-01-15T10:30:00Z",
  "stock": 50,
  "categorie": "Vêtements"
}
```

#### `PUT /produits/{product_id}`
Met à jour un produit (vendeur propriétaire uniquement).

**Headers :**
```bash
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body :**
```json
{
  "nom": "T-shirt Bénin (Mis à jour)",
  "prix": 19.99,
  "stock": 30,
  "actif": true
}
```

#### `DELETE /produits/{product_id}`
Supprime un produit (vendeur propriétaire uniquement).

**Headers :**
```bash
Authorization: Bearer <jwt_token>
```

**Response :**
```bash
204 No Content
```

## 🔐 Sécurité

### Authentification JWT
- **Token requis** : Pour POST/PUT/DELETE
- **Header format** : `Authorization: Bearer <token>`
- **Expiration** : 30 minutes

### Contrôle d'accès
- **Rôle vendeur** : Uniquement les vendeurs peuvent créer/modifier/supprimer
- **Propriétaire** : Vendeur doit être propriétaire du produit
- **Ownership** : `product.vendeur_id === user.id`

### Validation des données
- **Prix** : Maximum 2 décimales, > 0
- **Nom** : 2-255 caractères
- **Description** : 10-2000 caractères
- **Stock** : Entier ≥ 0
- **Catégorie** : 100 caractères max

## 📤 Upload Images

### Supabase Storage Integration

**Service** : `app/services/supabase_storage.py`

**Validation :**
- **Types autorisés** : JPEG, JPG, PNG, WebP
- **Taille maximale** : 5MB
- **Nom unique** : UUID + extension originale

**Processus :**
1. **Validation** : Type MIME + taille
2. **Upload** : Vers bucket `products-images`
3. **URL publique** : Génération automatique
4. **Stockage** : `products/{uuid}.{ext}`

**Exemple URL :**
```
https://project.supabase.co/storage/v1/object/public/products-images/products/123e4567-uuid.jpg
```

## 🗄️ Base de Données

### Table `products`

```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    prix FLOAT(10,2) NOT NULL,
    image_url VARCHAR(500),
    vendeur_id UUID NOT NULL,
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    stock INTEGER,
    categorie VARCHAR(100)
);

-- Indexes
CREATE INDEX idx_products_nom ON products(nom);
CREATE INDEX idx_products_vendeur_id ON products(vendeur_id);
CREATE INDEX idx_products_created_at ON products(created_at DESC);
```

## 🚀 Déploiement

### Installation dépendances
```bash
pip install -r requirements.txt
# Ajouté : supabase==2.7.4
```

### Configuration Supabase
```bash
# Dans .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

### Lancement
```bash
uvicorn app.main:app --reload
# Disponible sur : http://127.0.0.1:8000
# Documentation : http://127.0.0.1:8000/docs
```

## 🧪 Tests API

### Créer un produit
```bash
curl -X POST "http://127.0.0.1:8000/produits/" \
  -H "Authorization: Bearer <token>" \
  -F "nom=T-shirt Bénin" \
  -F "description=T-shirt 100% coton" \
  -F "prix=15.99" \
  -F "categorie=Vêtements" \
  -F "stock=50" \
  -F "image=@tshirt.jpg"
```

### Lister les produits
```bash
curl "http://127.0.0.1:8000/produits/?page=1&limit=10&search=t-shirt"
```

### Mettre à jour un produit
```bash
curl -X PUT "http://127.0.0.1:8000/produits/123e4567-uuid" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"prix": 19.99, "stock": 30}'
```

## 📈 Performance

### Optimisations
- **Pagination** : Limité à 100 éléments max par page
- **Indexes** : nom, vendeur_id, created_at
- **Filtres** : SQL optimisé avec WHERE clauses
- **Upload** : Validation avant upload Supabase

### Monitoring
- **Logging** : Middleware de requêtes
- **Errors** : HTTPException détaillées
- **Validation** : Pydantic schemas stricts

## 🔧 Personnalisation

### Ajouter des champs
```python
# Dans app/models/product_db.py
poids: Mapped[Optional[float]] = mapped_column(Float)
dimensions: Mapped[Optional[str]] = mapped_column(String(100))

# Dans app/schemas/product_db.py
poids: Optional[float] = Field(None, ge=0)
dimensions: Optional[str] = Field(None, max_length=100)
```

### Configurer bucket Supabase
```python
# Dans app/services/supabase_storage.py
self.bucket_name = "custom-products-bucket"
```

### Modifier filtres
```python
# Dans app/routes/products_db.py
# Ajouter filtre par vendeur
if vendeur_id:
    query = query.where(Product.vendeur_id == UUID(vendeur_id))

# Ajouter tri par prix
if sort_by == "prix":
    query = query.order_by(Product.prix.asc())
```

## ✅ Fonctionnalités

- ✅ **CRUD complet** : Create, Read, Update, Delete
- ✅ **Authentification JWT** : Tokens sécurisés
- ✅ **Rôles et permissions** : Vendeur uniquement
- ✅ **Ownership verification** : Propriétaire obligatoire
- ✅ **Upload images** : Supabase Storage
- ✅ **Pagination** : Efficace avec limites
- ✅ **Recherche et filtres** : Nom, catégorie, prix
- ✅ **Validation stricte** : Pydantic + SQLAlchemy
- ✅ **Gestion erreurs** : HTTPException détaillées
- ✅ **Documentation OpenAPI** : Auto-générée

## 🎯 Prochaines étapes

1. **Wishlist** : Ajouter/retirer produits favoris
2. **Commandes** : Système de commandes complet
3. **Évaluations** : Notes et avis produits
4. **Panier** : Gestion panier d'achat
5. **Notifications** : Email/notifications vendeur
6. **Analytics** : Statistiques ventes produits

---

**🎉 L'API produits est prête pour la production !**

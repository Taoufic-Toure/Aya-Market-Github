# 🚀 Authentification JWT Complète - AyaMarket

## 📋 Vue d'ensemble

Système d'authentification complet avec JWT pour AyaMarket, séparé en backend FastAPI et frontend React.

## 🔧 Backend FastAPI

### 📁 Fichiers créés

#### `app/routes/auth.py`
- **POST /auth/register** : Inscription utilisateur
- **POST /auth/login** : Connexion avec JWT  
- **GET /auth/me** : Profil utilisateur

#### `app/schemas/auth.py`
- **RegisterRequest** : Schéma inscription
- **LoginRequest** : Schéma connexion
- **LoginResponse** : Réponse avec token
- **UserResponse** : Profil utilisateur

#### `app/models/user.py`
- **User** : Modèle SQLAlchemy avec UUID
- **Champs** : id, email, password_hash, nom, ville, role, actif
- **Validation** : Hashage bcrypt, timestamps

#### `app/middleware/auth.py`
- **AuthMiddleware** : Vérification JWT automatique
- **Chemins protégés** : `/api/v1/`, `/auth/me`, etc.
- **Injection** : user dans request.state

#### `app/utils/role_guard.py`
- **RoleGuard** : Protection par rôle
- **Decorateurs** : `require_vendeur()`, `require_acheteur()`
- **Routes protégées** : selon le rôle utilisateur

### 🔑 Configuration JWT

```python
SECRET_KEY = "aya_secret_key_2024"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
```

### 📦 Dépendances ajoutées

```txt
passlib[bcrypt]==1.7.4        # Hashage mots de passe
python-jose[cryptography]==3.3.0  # Tokens JWT
email-validator==2.1.0           # Validation emails
```

## ⚛️ Frontend React

### 📁 Fichiers créés

#### `src/contexts/AuthContextJWT.tsx`
- **AuthProviderJWT** : Contexte authentification
- **useAuthJWT()** : Hook d'accès
- **localStorage** : Stockage token/user
- **Auto-connexion** : Après inscription

#### `src/hooks/useAuthJWT.ts`
- **useAuth()** : Export du contexte
- **Centralisation** : Imports unifiés

#### `src/components/auth/LoginFormJWT.tsx`
- **Formulaire connexion** : Email + mot de passe
- **Validation** : Champs requis + format
- **Loading state** : Spinner + disabled
- **Show password** : Icône œil/œil barré

#### `src/components/auth/RegisterFormJWT.tsx`
- **Formulaire inscription** : Email + mot de passe + nom + ville + rôle
- **Double password** : Confirmation mot de passe
- **Rôle selection** : Acheteur/Vendeur
- **Validation** : 8 caractères min + correspondance

#### `src/pages/AuthPageJWT.tsx`
- **Mode tabs** : Connexion / Inscription
- **Rôle tabs** : Acheteur / Vendeur (mode register)
- **Error handling** : Messages + auto-clear
- **Navigation** : Retour + succès

#### `src/hooks/useAuthRedirectJWT.ts`
- **Redirection auto** : Selon rôle après connexion
- **useAuthRedirect()** : Hook de redirection
- **Vendeur → /vendor** : **Acheteur → /home**

#### `src/AppJWT.tsx`
- **Router principal** : Navigation authentifiée
- **Protection routes** : Vérification token
- **Redirection auto** : Selon rôle
- **Loading state** : Spinner global

## 🔗 Intégration API

### Endpoints Backend

```bash
# Inscription
POST http://127.0.0.1:8000/auth/register
Content-Type: application/json
{
  "email": "jean@ayamarket.bj",
  "password": "MotDePasse123",
  "nom": "Jean Dupont",
  "ville": "Cotonou",
  "role": "acheteur"
}

# Connexion
POST http://127.0.0.1:8000/auth/login
Content-Type: application/json
{
  "email": "jean@ayamarket.bj",
  "password": "MotDePasse123"
}

# Réponse connexion
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "jean@ayamarket.bj",
    "nom": "Jean Dupont",
    "ville": "Cotonou",
    "role": "acheteur",
    "actif": true,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

### Frontend Integration

```typescript
// Connexion
const { login } = useAuth();
const result = await login({ email, password });

if (result.success) {
  // Redirection automatique selon rôle
  // user.role === 'vendeur' → /vendor
  // user.role === 'acheteur' → /home
}

// Headers authentifiés
const { getAuthHeaders } = useAuthToken();
const response = await fetch('/api/protected', {
  headers: getAuthHeaders()
});
```

## 🛡️ Sécurité

### Backend
- **Hashage bcrypt** : Mot de passe sécurisés
- **Tokens JWT** : Expiration 30 minutes
- **Middleware** : Vérification automatique
- **CORS** : Origines autorisées
- **Validation** : Input stricte

### Frontend
- **localStorage** : Stockage token/user
- **Auto-clear** : Token expiré
- **HTTPS** : Communication sécurisée
- **Validation** : Client + serveur

## 🚀 Lancement

### Backend
```bash
cd backend
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm run dev
# Remplacer App.tsx par AppJWT.tsx dans main.tsx
```

## 📱 Flux Utilisateur

1. **Inscription** → Formulaire → Backend → Token JWT → localStorage
2. **Connexion** → Formulaire → Backend → Token JWT → localStorage  
3. **Auto-login** → Après inscription réussie
4. **Redirection** → Vendeur → /vendor, Acheteur → /home
5. **Protection** → Routes protégées si token invalide/expiré
6. **Déconnexion** → Clear localStorage → Redirection /auth

## ✅ Fonctionnalités

- ✅ Inscription utilisateur (acheteur/vendeur)
- ✅ Connexion avec JWT
- ✅ Récupération profil
- ✅ Stockage localStorage
- ✅ Redirection automatique
- ✅ Protection routes
- ✅ Validation formulaires
- ✅ Messages d'erreur
- ✅ Loading states
- ✅ Responsive design
- ✅ TypeScript complet

## 🔧 Personnalisation

### Modifier durée token
```python
# Dans app/routes/auth.py
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # 1 heure
```

### Ajouter champs utilisateur
```python
# Dans app/models/user.py
telephone: Mapped[Optional[str]] = mapped_column(String(20))
bio: Mapped[Optional[str]] = mapped_column(Text)
```

### Personnaliser redirection
```typescript
// Dans src/hooks/useAuthRedirectJWT.ts
if (user.role === 'admin') {
  return '/admin';
}
```

## 🎯 Prochaines étapes

1. **Rafraîchir token** : Auto-refresh avant expiration
2. **OAuth** : Google/Facebook connexion
3. **2FA** : Double authentification
4. **Rate limiting** : Limiter tentatives
5. **Email verification** : Vérification email
6. **Password reset** : Mot de passe oublié

---

**🎉 L'authentification JWT complète est prête pour AyaMarket !**

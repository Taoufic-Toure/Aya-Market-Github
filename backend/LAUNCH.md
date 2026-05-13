# 🚀 Lancement AyaMarket Backend

## 📋 Prérequis

- **Python 3.8+**
- **PostgreSQL** (via Supabase recommandé)
- **Git**

## 🔧 Installation

### 1. Cloner le projet
```bash
git clone <repository-url>
cd Projet1/backend
```

### 2. Créer environnement virtuel
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
```

### 3. Installer les dépendances
```bash
pip install -r requirements.txt
```

### 4. Configurer l'environnement
```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer .env avec vos clés
notepad .env
```

**Variables requises dans .env :**
```bash
SUPABASE_DATABASE_URL=postgresql+asyncpg://postgres:[MOT_DE_PASSE]@[HOST]:5432/postgres
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
SECRET_KEY=aya_secret_key_2024
CLAUDE_API_KEY=your-claude-api-key
FEDAPAY_API_KEY=your-fedapay-api-key
```

## 🗄️ Base de Données

### Option 1 : Supabase (Recommandé)
1. Créer un projet sur [supabase.com](https://supabase.com)
2. Récupérer l'URL de connexion PostgreSQL
3. Configurer `SUPABASE_DATABASE_URL` dans `.env`

### Option 2 : PostgreSQL Local
1. Installer PostgreSQL
2. Créer la base de données `ayamarket`
3. Configurer l'URL dans `.env`

## 🚀 Lancement

### Développement
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Production
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## 🌐 Accès

- **API** : http://localhost:8000
- **Documentation** : http://localhost:8000/docs
- **OpenAPI** : http://localhost:8000/openapi.json

## 🧪 Tests

### Health Check
```bash
curl http://localhost:8000/health
```

### Authentification
```bash
# Inscription
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@ayamarket.bj","password":"Test123456","nom":"Test User","ville":"Cotonou","role":"acheteur"}'

# Connexion
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@ayamarket.bj","password":"Test123456"}'
```

### Produits
```bash
# Lister produits
curl http://localhost:8000/produits

# Créer produit (vendeur requis)
curl -X POST "http://localhost:8000/produits" \
  -H "Authorization: Bearer <token>" \
  -F "nom=T-shirt Bénin" \
  -F "description=T-shirt 100% coton" \
  -F "prix=15.99"
```

## 🔧 Dépannage

### Erreurs communes

**1. ModuleNotFoundError**
```bash
# Réinstaller les dépendances
pip install -r requirements.txt
```

**2. Connection PostgreSQL refusée**
```bash
# Vérifier l'URL dans .env
# Tester avec psql
psql "postgresql+asyncpg://postgres:password@localhost:5432/postgres"
```

**3. Erreur de clé JWT**
```bash
# Vérifier SECRET_KEY dans .env
# Doit être identique au frontend
```

**4. CORS errors**
```bash
# Vérifier CORS_ORIGINS dans .env
# Doit inclure l'URL du frontend
```

### Logs

**Activer le debug**
```bash
# Dans .env
DEBUG=true
ENVIRONMENT=development
```

**Voir les logs**
```bash
# Les logs s'affichent dans la console
# Pour les sauvegarder :
uvicorn app.main:app --reload --log-level debug > logs.txt 2>&1
```

## 📊 Monitoring

### Health Endpoints
- `/health` : État général
- `/health/db` : Connexion base de données
- `/health/auth` : Service authentification

### Performance
```bash
# Installer des dépendances de monitoring
pip install uvicorn[standard]

# Lancer avec monitoring
uvicorn app.main:app --reload --access-log --log-level info
```

## 🚀 Déploiement

### Docker (Recommandé)
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - SUPABASE_DATABASE_URL=${SUPABASE_DATABASE_URL}
      - SECRET_KEY=${SECRET_KEY}
    env_file:
      - .env
```

## ✅ Vérification

### Checklist avant lancement
- [ ] Python 3.8+ installé
- [ ] Environnement virtuel activé
- [ ] Dépendances installées
- [ ] Fichier `.env` configuré
- [ ] Base de données accessible
- [ ] Clés API valides

### Test post-lancement
- [ ] API répond sur http://localhost:8000
- [ ] Documentation accessible sur /docs
- [ ] Health check fonctionne
- [ ] Authentification fonctionne
- [ ] Connexion base de données OK

## 🆘 Support

En cas d'erreur :

1. **Vérifier les logs** : Messages détaillés dans la console
2. **Valider .env** : Toutes les variables requises présentes
3. **Tester la DB** : Connexion PostgreSQL fonctionnelle
4. **Vérifier les ports** : 8000 non utilisé par autre service

---

**🎉 AyaMarket Backend est prêt !**

# AyaMarket Backend (FastAPI) - Architecture Aya Unifiée

Backend FastAPI structuré pour le marketplace béninois avec l'assistante Aya unifiée (Groq, Gemini, Mistral, Whisper).

## 1) Prérequis

- Windows 11
- Python déjà installé
- Terminal Cursor (CMD ou PowerShell)

## 2) Commandes exactes Windows

### CMD

```bat
cd /d C:\Users\%USERNAME%\Desktop\backend
python -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Tester `/health` dans un 2e terminal CMD:

```bat
curl http://127.0.0.1:8000/health
```

### PowerShell

```powershell
Set-Location "$HOME\Desktop\backend"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r .\requirements.txt
uvicorn app.main:app --reload
```

Tester `/health` dans un 2e terminal PowerShell:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/health"
```

## 3) Configuration environnement

Copier et compléter les variables:

```bat
copy .env.example .env
```

Tu dois renseigner:
- `SUPABASE_DATABASE_URL`
- `CLAUDE_API_KEY`
- `FEDAPAY_API_KEY`
- `GROQ_API_KEY` (pour Aya chat et transcription)
- `GEMINI_API_KEY` (pour Aya conseils vendeur)
- `MISTRAL_API_KEY` (pour Aya recherche intelligente)

## 4) URLs locales

- API: http://127.0.0.1:8000
- Health: http://127.0.0.1:8000/health
- Swagger: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc
- Santé IA: http://127.0.0.1:8000/ai/health

## 5) Endpoints Aya - AyaMarket

### Chat avec Aya (Groq Llama 3.3)
```bash
POST /ai/chat
Content-Type: application/json

{
  "message": "Bonjour, je cherche des produits traditionnels"
}
```

### Conseils Business par Aya (Gemini 2.0 Flash)
```bash
POST /ai/advisor
Content-Type: application/json

{
  "business_type": "vente de tissus",
  "question": "Comment augmenter mes ventes en ligne ?"
}
```

### Transcription Audio par Aya (Groq Whisper)
```bash
POST /ai/transcribe
Content-Type: multipart/form-data

audio_file: [fichier audio]
language: fr (optionnel: fr, fon, yo)
```

### Recherche Intelligente par Aya (Mistral)
```bash
POST /ai/search
Content-Type: application/json

{
  "query": "tissus wax béninois",
  "category": "textiles",
  "location": "Cotonou"
}
```

## 6) Tests avec Postman

1. Importer les endpoints depuis Swagger UI
2. Configurer les variables d'environnement dans Postman
3. Tester chaque endpoint avec les exemples ci-dessus

## 7) Intégration Frontend

Utilisez le fichier `frontend-ai-examples.js` pour l'intégration React/Vite.

## 8) Erreurs courantes (Windows)

### `python` non reconnu

Utiliser `py`:

```bat
py -m venv .venv
py -m pip install -r requirements.txt
```

### PowerShell bloque l'activation

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Puis:

```powershell
.\.venv\Scripts\Activate.ps1
```

### Port déjà occupé

```bat
uvicorn app.main:app --reload --port 8001
```

### `No module named app`

Toujours lancer Uvicorn depuis `Desktop\backend`.

## 9) Architecture Aya - AyaMarket

### Services Aya implémentés:
- **Aya Chat**: Conversation client (Groq Llama 3.3)
- **Aya Advisor**: Conseils business vendeurs (Gemini 2.0 Flash)  
- **Aya Transcribe**: Transcription audio (Groq Whisper)
- **Aya Search**: Recherche intelligente (Mistral)
- **Aya Router**: Service central de gestion et formatage

### Sécurité:
- Clés API stockées dans `.env` uniquement
- Aucune exposition dans le frontend
- Validation et gestion d'erreurs centralisées

### Performance:
- Async/await pour toutes les requêtes
- Timeouts configurés pour chaque service
- Gestion des retries légers

## 10) Roadmap backend validée

1. ✅ Architecture Aya unifiée
2. Supabase connexion
3. Auth
4. Upload images
5. Produits/commandes
6. Claude API
7. FedaPay

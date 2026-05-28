# AyaMarket — La Marketplace du Bénin 🇧🇯

<p align="center">
  <img src="public/logo.png" alt="AyaMarket Logo" width="300"/>
</p>

<p align="center">
  <strong>Achetez mieux, vivez mieux.</strong><br/>
  La première marketplace digitale pensée pour les commerçants et clients béninois.
</p>

---

## 📖 C'est quoi AyaMarket ?

AyaMarket est une application mobile-first qui connecte **boutiques et vendeurs béninois** avec leurs clients. Que tu vendes des vêtements, de l'électronique, de la nourriture ou n'importe quoi d'autre — AyaMarket est ta vitrine digitale à Cotonou et au-delà.

Chaque vendeur dispose de sa propre boutique en ligne, de la gestion de ses produits, et d'**Aya** — une intelligence artificielle dédiée à booster ses ventes.

---

## ✨ Fonctionnalités

### Pour les Vendeurs 🏪
- **Création de boutique** — inscription rapide, profil complet, vitrine personnalisée
- **Gestion des produits** — upload de photos, description, prix, stock
- **Dashboard vendeur** — suivi des commandes et des performances
- **Aya IA** — analyse approfondie de l'évolution du marché et conseils stratégiques pour maximiser les ventes

### Pour les Acheteurs 🛍️
- **Catalogue complet** — tous types de produits disponibles
- **Recherche intelligente** — trouver un produit en secondes grâce à Aya
- **Panier & commandes** — expérience d'achat fluide
- **Paiement sécurisé** — intégration FedaPay (Mobile Money local)

### Aya — L'IA d'AyaMarket 🤖
- Aide les **acheteurs** à trouver les bons produits
- Aide les **vendeurs** à analyser leur marché et prendre de meilleures décisions
- Disponible en **français** (Yoruba, Fon et Dendi à venir)
- Mémoire conversationnelle — elle se souvient du contexte

---

## 🛠️ Stack Technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS |
| Backend | FastAPI (Python) |
| Base de données | Supabase (PostgreSQL) |
| Authentification | Supabase Auth + JWT |
| Paiement | FedaPay |
| IA | Claude API (Anthropic) |
| PWA | Configurée pour Android/iOS |
| Déploiement | — |

---

## 🚀 Lancer le Projet en Local

### Prérequis
- Node.js 18+
- Python 3.10+
- Un compte Supabase
- Un compte FedaPay

### Frontend

```bash
# Cloner le repo
git clone https://github.com/Taoufic-Toure/Aya-Market-Github.git
cd Aya-Market-Github

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Remplir les valeurs dans .env

# Lancer en développement
npm run dev
```

### Backend

```bash
cd backend

# Créer un environnement virtuel
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux

# Installer les dépendances
pip install -r requirements.txt

# Lancer le serveur
uvicorn main:app --reload
```

---

## ⚙️ Variables d'Environnement

Crée un fichier `.env` à la racine en te basant sur `.env.example` :

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_FEDAPAY_PUBLIC_KEY=your_fedapay_key
VITE_API_URL=http://localhost:8000
```

> ⚠️ Ne jamais committer le fichier `.env` sur GitHub.

---

## 📁 Structure du Projet

```
Aya-Market-Github/
├── src/
│   ├── components/     # Composants React réutilisables
│   ├── pages/          # Pages de l'application
│   ├── hooks/          # Custom hooks
│   └── lib/            # Utilitaires et config
├── backend/
│   ├── main.py         # Point d'entrée FastAPI
│   ├── routes/         # Routes API
│   └── models/         # Modèles de données
├── supabase/
│   └── migrations/     # Migrations base de données
├── public/             # Assets statiques
└── .env.example        # Template des variables d'environnement
```

---

## 🗺️ Roadmap

- [x] Frontend complet avec design béninois
- [x] Authentification (inscription / connexion)
- [x] Catalogue produits
- [x] Dashboard vendeur
- [x] Aya IA avec mémoire
- [x] Upload photos produits
- [x] Panier et commandes
- [x] Paiement FedaPay
- [x] Backend FastAPI
- [x] Supabase connecté
- [x] PWA configurée
- [ ] Support Yoruba, Fon, Dendi pour Aya
- [ ] Notifications push
- [ ] Système d'avis et notations
- [ ] Version iOS

---

## 🤝 Contribuer

Les contributions sont les bienvenues ! Si tu veux aider AyaMarket à grandir :

1. Fork le projet
2. Crée une branche (`git checkout -b feature/ma-fonctionnalite`)
3. Commit tes changements (`git commit -m 'feat: ajouter ma fonctionnalite'`)
4. Push (`git push origin feature/ma-fonctionnalite`)
5. Ouvre une Pull Request

---

## 📬 Contact

Projet développé à **Cotonou, Bénin** 🇧🇯  
Pour toute question ou partenariat, ouvre une issue sur ce repo.

---

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

---

*AyaMarket — Fait avec ❤️ au Bénin, pour le Bénin.*

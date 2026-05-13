## Objectif

Donner à BoutiqueAI une identité visuelle béninoise sur la page d'accueil, sans toucher aux fonctionnalités existantes (auth, panier, vendeur, recherche, catégories, Supabase).

## Assets à intégrer

Destination : `src/assets/locations/`

Hero :
- `amazone.jpg` ← AMAZONE.jpeg (Statue de l'Amazone, Cotonou)

Carrousel (5 images, dans cet ordre) :
1. `bio-guera.jpg` ← SITE4 — *Statue de Bio Guéra, Cotonou*
2. `porte-non-retour.jpg` ← SITE1 — *Porte du Non-Retour, Ouidah*
3. `ganvie.jpg` ← SITE2 — *Village lacustre de Ganvié*
4. `sofitel-marina.jpg` ← SITE3 — *Sofitel Cotonou Marina & Spa*
5. `dantokpa.jpg` ← SITE5 — *Marché Dantokpa, Cotonou*

## Typographie

- Ajout des Google Fonts dans `index.html` (preconnect + Playfair Display 600/700, Inter 400/500/600/700).
- `tailwind.config.js` : `fontFamily.sans` → Inter en premier ; ajout `fontFamily.display` → Playfair Display.
- `src/index.css` : `html { font-family: Inter, … }` + classe utilitaire `.font-display` pour les titres marketing (sans casser les titres UI existants).

## Palette (consolidation)

Tokens Tailwind :
- `primary` `#1D9E75` (existe déjà)
- `accent` `#EF9F27` (existe déjà)
- Ajout `primary-dark` `#0f3d2e` (navbar + overlay hero)

Application :
- `BottomNav` → fond `#0f3d2e`, icône active `#EF9F27`, inactives blanc/70.
- Boutons d'action principaux : `#1D9E75` (inchangé).
- Accents (badges "Tendances", étoiles, prix promo) : `#EF9F27`.

## Nouveau composant `HeroAmazone`

Fichier : `src/components/HeroAmazone.tsx`
- `<section>` plein-largeur, hauteur ~70 vh sur mobile.
- `background-image: url(amazone.jpg)`, `cover`, position `center top` (pour bien cadrer le visage).
- Overlay `#0f3d2e` à 65 % d'opacité.
- Contenu centré : titre **BoutiqueAI** (Playfair Display, blanc, 4xl), sous-titre *Le marché intelligent du Bénin* (Inter blanc/80), barre de recherche déplacée du header + bouton CTA "Explorer" (#EF9F27).
- Header existant simplifié : logo + cloche + panier sur fond `#0f3d2e` translucide qui devient opaque au scroll.

## Nouveau composant `LocationsCarousel`

Fichier : `src/components/LocationsCarousel.tsx`
- 5 images listées ci-dessus, ratio ~16/9, `object-cover`.
- Auto-slide toutes les **3 000 ms** (cross-fade opacité 700 ms), pause au survol/touch, nettoyage à l'unmount.
- Indicateurs (dots) en bas-centre.
- Légende : nom du lieu en bas-gauche, padding 16 px, texte blanc Inter 600, dégradé sombre bas → transparent pour la lisibilité, fade-in à chaque changement.
- A11y : `aria-roledescription="carousel"`, `aria-live="polite"` sur la légende, désactivation auto si `prefers-reduced-motion`.
- React pur, **aucune dépendance npm ajoutée**.

## Intégration dans `HomePage.tsx`

Ordre vertical après refonte :
```
Header simplifié (sticky, #0f3d2e)
HeroAmazone               ← NOUVEAU
LocationsCarousel         ← NOUVEAU (3s auto-slide, 5 images)
Sélecteur de catégorie    ← inchangé
Section "Tendances"       ← inchangée
Liste produits            ← inchangée
Boutiques populaires      ← inchangée
BottomNav (#0f3d2e)
```
- La barre de recherche est déplacée du header vers le hero (un seul champ).
- Aucune logique métier touchée : `loadData`, `selectCategory`, `addItem`, `onNavigate` restent identiques.

## Hors périmètre

- Pages `Auth`, `Cart`, `Product`, `Boutique`, `Orders`, `Profile`, `Chat`, `Categories`, et tout le module `vendor/`.
- Schéma Supabase, contextes (`AuthContext`, `CartContext`, `ToastContext`).
- Logique PWA (`beforeinstallprompt`).

## Détails techniques

- Images importées en ES6 (`import amazone from '@/assets/locations/amazone.jpg'`) — bundling Vite avec hash.
- `prefers-reduced-motion` : auto-slide désactivé, dots cliquables conservés.
- Pas de changement de stack ni de nouvelles dépendances.

## Fichiers créés / modifiés

Créés :
- `src/assets/locations/amazone.jpg`
- `src/assets/locations/bio-guera.jpg`
- `src/assets/locations/porte-non-retour.jpg`
- `src/assets/locations/ganvie.jpg`
- `src/assets/locations/sofitel-marina.jpg`
- `src/assets/locations/dantokpa.jpg`
- `src/components/HeroAmazone.tsx`
- `src/components/LocationsCarousel.tsx`

Modifiés :
- `index.html` (Google Fonts)
- `tailwind.config.js` (fontFamily.display, primary-dark)
- `src/index.css` (font Inter par défaut, classe `.font-display`)
- `src/pages/HomePage.tsx` (insertion Hero + Carrousel, header simplifié)
- `src/components/BottomNav.tsx` (couleurs `#0f3d2e` / `#EF9F27`)

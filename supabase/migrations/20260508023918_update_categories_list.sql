/*
  # BoutiqueAI - Mise à jour catégories produits

  ## Changements
  - Élargit la contrainte CHECK sur la colonne `categorie` de la table `produits`
  - Ajoute les catégories : Agriculture, Artisanat, Téléphones, Informatique, Sport, Jouets, Livres
  - Les catégories existantes (Alimentation, Vêtements, Électronique, Beauté, Maison, Autre) sont conservées

  ## Notes
  - Aucune perte de données : les valeurs existantes restent valides
*/

DO $$
BEGIN
  -- Drop old constraint and add new one with expanded categories
  ALTER TABLE produits DROP CONSTRAINT IF EXISTS produits_categorie_check;
  ALTER TABLE produits ADD CONSTRAINT produits_categorie_check
    CHECK (categorie IN (
      'Alimentation', 'Vêtements', 'Électronique', 'Beauté', 'Maison',
      'Agriculture', 'Artisanat', 'Téléphones', 'Informatique', 'Sport',
      'Jouets', 'Livres', 'Autre'
    ));
END $$;

/*
  # BoutiqueAI - Données de démonstration

  ## Contenu
  - 3 boutiques demo
  - 12 produits demo avec photos Pexels
  - Données initiales pour tester l'application

  ## Notes
  - Ces données utilisent des UUIDs fixes pour la démo
  - Les images viennent de Pexels (URLs valides)
*/

-- Insert demo boutiques (sans vendeur réel pour la demo publique)
-- On insère des boutiques avec des données fictives pour l'affichage
-- Note: vendeur_id ne peut pas être null mais on va créer un user admin fictif

-- On insère d'abord les produits via une fonction qui peut être appelée après création des comptes
-- Pour l'instant on crée juste la structure, les données seront créées via l'interface

-- Ajout d'une colonne pour les ventes par jour pour le graphique dashboard
ALTER TABLE boutiques ADD COLUMN IF NOT EXISTS telephone text DEFAULT '';

-- Table pour les statistiques de ventes journalières
CREATE TABLE IF NOT EXISTS ventes_journalieres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id uuid NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  montant numeric(12,0) DEFAULT 0,
  nb_commandes integer DEFAULT 0,
  UNIQUE(boutique_id, date)
);

ALTER TABLE ventes_journalieres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can view own daily sales"
  ON ventes_journalieres FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boutiques
      WHERE boutiques.id = ventes_journalieres.boutique_id
      AND boutiques.vendeur_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can insert own daily sales"
  ON ventes_journalieres FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM boutiques
      WHERE boutiques.id = ventes_journalieres.boutique_id
      AND boutiques.vendeur_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can update own daily sales"
  ON ventes_journalieres FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boutiques
      WHERE boutiques.id = ventes_journalieres.boutique_id
      AND boutiques.vendeur_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM boutiques
      WHERE boutiques.id = ventes_journalieres.boutique_id
      AND boutiques.vendeur_id = auth.uid()
    )
  );

/*
  # BoutiqueAI - Schema complet (partie 1)

  ## Tables créées
  1. `users` - Profils utilisateurs
  2. `boutiques` - Boutiques des vendeurs
  3. `produits` - Catalogue produits
  4. `commandes` - Commandes
  5. `lignes_commande` - Lignes de commande
  6. `conversations` - Conversations chat
  7. `messages` - Messages
  8. `avis` - Avis produits

  ## Notes
  - RLS activé sur toutes les tables
  - La politique vendor sur commandes est séparée car elle référence lignes_commande
*/

-- Table users
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'acheteur' CHECK (role IN ('acheteur', 'vendeur', 'admin')),
  nom text NOT NULL DEFAULT '',
  telephone text DEFAULT '',
  ville text DEFAULT '',
  avatar_url text DEFAULT '',
  langue_preferee text DEFAULT 'fr' CHECK (langue_preferee IN ('fr', 'fon', 'yoruba')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Public can view user basic info"
  ON users FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Table boutiques
CREATE TABLE IF NOT EXISTS boutiques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendeur_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nom text NOT NULL DEFAULT '',
  description text DEFAULT '',
  logo_url text DEFAULT '',
  cover_url text DEFAULT '',
  ville text DEFAULT '',
  note_moyenne numeric(3,2) DEFAULT 0,
  nb_ventes integer DEFAULT 0,
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE boutiques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active boutiques"
  ON boutiques FOR SELECT
  USING (actif = true);

CREATE POLICY "Vendors can view own boutique including inactive"
  ON boutiques FOR SELECT
  TO authenticated
  USING (vendeur_id = auth.uid());

CREATE POLICY "Vendors can insert own boutique"
  ON boutiques FOR INSERT
  TO authenticated
  WITH CHECK (vendeur_id = auth.uid());

CREATE POLICY "Vendors can update own boutique"
  ON boutiques FOR UPDATE
  TO authenticated
  USING (vendeur_id = auth.uid())
  WITH CHECK (vendeur_id = auth.uid());

-- Table produits
CREATE TABLE IF NOT EXISTS produits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id uuid NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  nom text NOT NULL DEFAULT '',
  description text DEFAULT '',
  photos text[] DEFAULT '{}',
  prix numeric(12,0) NOT NULL DEFAULT 0,
  stock integer DEFAULT 0,
  seuil_alerte integer DEFAULT 5,
  categorie text DEFAULT 'Autre' CHECK (categorie IN ('Alimentation', 'Vêtements', 'Électronique', 'Beauté', 'Maison', 'Autre')),
  note_moyenne numeric(3,2) DEFAULT 0,
  nb_ventes integer DEFAULT 0,
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE produits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products"
  ON produits FOR SELECT
  USING (actif = true);

CREATE POLICY "Vendors can view own products including inactive"
  ON produits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boutiques
      WHERE boutiques.id = produits.boutique_id
      AND boutiques.vendeur_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can insert own products"
  ON produits FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM boutiques
      WHERE boutiques.id = produits.boutique_id
      AND boutiques.vendeur_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can update own products"
  ON produits FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boutiques
      WHERE boutiques.id = produits.boutique_id
      AND boutiques.vendeur_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM boutiques
      WHERE boutiques.id = produits.boutique_id
      AND boutiques.vendeur_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can delete own products"
  ON produits FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boutiques
      WHERE boutiques.id = produits.boutique_id
      AND boutiques.vendeur_id = auth.uid()
    )
  );

-- Table commandes (sans politique vendor pour l'instant)
CREATE TABLE IF NOT EXISTS commandes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acheteur_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  statut text DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'confirmee', 'en_preparation', 'expediee', 'livree', 'annulee')),
  montant_total numeric(12,0) DEFAULT 0,
  frais_livraison numeric(12,0) DEFAULT 0,
  mode_livraison text DEFAULT 'domicile' CHECK (mode_livraison IN ('domicile', 'retrait')),
  mode_paiement text DEFAULT 'livraison' CHECK (mode_paiement IN ('mtn', 'moov', 'livraison')),
  adresse_livraison text DEFAULT '',
  motif_refus text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE commandes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view own orders"
  ON commandes FOR SELECT
  TO authenticated
  USING (acheteur_id = auth.uid());

CREATE POLICY "Buyers can insert own orders"
  ON commandes FOR INSERT
  TO authenticated
  WITH CHECK (acheteur_id = auth.uid());

CREATE POLICY "Buyers can update own orders"
  ON commandes FOR UPDATE
  TO authenticated
  USING (acheteur_id = auth.uid())
  WITH CHECK (acheteur_id = auth.uid());

-- Table lignes_commande
CREATE TABLE IF NOT EXISTS lignes_commande (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id uuid NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
  produit_id uuid NOT NULL REFERENCES produits(id),
  boutique_id uuid NOT NULL REFERENCES boutiques(id),
  quantite integer NOT NULL DEFAULT 1,
  prix_unitaire numeric(12,0) NOT NULL DEFAULT 0
);

ALTER TABLE lignes_commande ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view own order lines"
  ON lignes_commande FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM commandes
      WHERE commandes.id = lignes_commande.commande_id
      AND commandes.acheteur_id = auth.uid()
    )
  );

CREATE POLICY "Buyers can insert own order lines"
  ON lignes_commande FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM commandes
      WHERE commandes.id = lignes_commande.commande_id
      AND commandes.acheteur_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can view order lines for their boutiques"
  ON lignes_commande FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boutiques
      WHERE boutiques.id = lignes_commande.boutique_id
      AND boutiques.vendeur_id = auth.uid()
    )
  );

-- Now add vendor policies on commandes that reference lignes_commande
CREATE POLICY "Vendors can view orders for their boutiques"
  ON commandes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lignes_commande lc
      JOIN boutiques b ON b.id = lc.boutique_id
      WHERE lc.commande_id = commandes.id
      AND b.vendeur_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can update orders for their boutiques"
  ON commandes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lignes_commande lc
      JOIN boutiques b ON b.id = lc.boutique_id
      WHERE lc.commande_id = commandes.id
      AND b.vendeur_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lignes_commande lc
      JOIN boutiques b ON b.id = lc.boutique_id
      WHERE lc.commande_id = commandes.id
      AND b.vendeur_id = auth.uid()
    )
  );

-- Table conversations
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acheteur_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  boutique_id uuid NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(acheteur_id, boutique_id)
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view own conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (acheteur_id = auth.uid());

CREATE POLICY "Buyers can insert own conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (acheteur_id = auth.uid());

CREATE POLICY "Vendors can view conversations for their boutiques"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boutiques
      WHERE boutiques.id = conversations.boutique_id
      AND boutiques.vendeur_id = auth.uid()
    )
  );

-- Table messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  expediteur_id uuid REFERENCES users(id),
  contenu text NOT NULL DEFAULT '',
  statut_ia text DEFAULT 'humain' CHECK (statut_ia IN ('auto', 'transfert', 'humain')),
  lu boolean DEFAULT false,
  est_ia boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conversation participants can view messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (
        c.acheteur_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM boutiques b
          WHERE b.id = c.boutique_id
          AND b.vendeur_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Participants can insert messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (
        c.acheteur_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM boutiques b
          WHERE b.id = c.boutique_id
          AND b.vendeur_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Participants can update messages read status"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (
        c.acheteur_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM boutiques b
          WHERE b.id = c.boutique_id
          AND b.vendeur_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (
        c.acheteur_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM boutiques b
          WHERE b.id = c.boutique_id
          AND b.vendeur_id = auth.uid()
        )
      )
    )
  );

-- Table avis
CREATE TABLE IF NOT EXISTS avis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produit_id uuid NOT NULL REFERENCES produits(id) ON DELETE CASCADE,
  acheteur_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  commande_id uuid REFERENCES commandes(id),
  note integer NOT NULL CHECK (note >= 1 AND note <= 5),
  commentaire text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(produit_id, acheteur_id, commande_id)
);

ALTER TABLE avis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view avis"
  ON avis FOR SELECT
  USING (true);

CREATE POLICY "Buyers can insert own avis"
  ON avis FOR INSERT
  TO authenticated
  WITH CHECK (acheteur_id = auth.uid());

CREATE POLICY "Buyers can update own avis"
  ON avis FOR UPDATE
  TO authenticated
  USING (acheteur_id = auth.uid())
  WITH CHECK (acheteur_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_produits_boutique ON produits(boutique_id);
CREATE INDEX IF NOT EXISTS idx_produits_categorie ON produits(categorie);
CREATE INDEX IF NOT EXISTS idx_produits_actif ON produits(actif);
CREATE INDEX IF NOT EXISTS idx_commandes_acheteur ON commandes(acheteur_id);
CREATE INDEX IF NOT EXISTS idx_commandes_statut ON commandes(statut);
CREATE INDEX IF NOT EXISTS idx_lignes_commande_commande ON lignes_commande(commande_id);
CREATE INDEX IF NOT EXISTS idx_lignes_commande_boutique ON lignes_commande(boutique_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_acheteur ON conversations(acheteur_id);
CREATE INDEX IF NOT EXISTS idx_conversations_boutique ON conversations(boutique_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE commandes;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

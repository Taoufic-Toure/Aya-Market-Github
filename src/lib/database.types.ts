export type Role = 'acheteur' | 'vendeur' | 'admin';
export type Statut = 'en_attente' | 'confirmee' | 'en_preparation' | 'expediee' | 'livree' | 'annulee';
export type Categorie = 'Alimentation' | 'Vêtements' | 'Électronique' | 'Beauté' | 'Maison' | 'Agriculture' | 'Artisanat' | 'Téléphones' | 'Informatique' | 'Sport' | 'Jouets' | 'Livres' | 'Autre';
export type ModeLivraison = 'domicile' | 'retrait';
export type ModePaiement = 'mtn' | 'moov' | 'celtiis' | 'livraison';
export type StatutIA = 'auto' | 'transfert' | 'humain';
export type Langue = 'fr' | 'fon' | 'yoruba';

export interface User {
  [key: string]: unknown;
  id: string;
  email: string;
  role: Role;
  nom: string;
  telephone: string | null;
  ville: string | null;
  avatar_url: string | null;
  langue_preferee: Langue;
  created_at: string;
}

export interface Boutique {
  [key: string]: unknown;
  id: string;
  vendeur_id: string;
  nom: string;
  description: string;
  logo_url: string;
  cover_url: string;
  ville: string;
  note_moyenne: number;
  nb_ventes: number;
  telephone: string;
  actif: boolean;
  created_at: string;
}

export interface Produit {
  [key: string]: unknown;
  id: string;
  boutique_id: string;
  nom: string;
  description: string;
  photos: string[];
  prix: number;
  stock: number;
  seuil_alerte: number;
  categorie: Categorie;
  note_moyenne: number;
  nb_ventes: number;
  actif: boolean;
  created_at: string;
  boutiques?: Boutique;
}

export interface Commande {
  [key: string]: unknown;
  id: string;
  acheteur_id: string;
  statut: Statut;
  montant_total: number;
  frais_livraison: number;
  mode_livraison: ModeLivraison;
  mode_paiement: ModePaiement;
  payment_status?: 'not_started' | 'pending' | 'approved' | 'declined' | 'canceled' | 'refunded' | 'transferred';
  fedapay_transaction_id?: string | null;
  fedapay_payment_url?: string | null;
  adresse_livraison: string;
  motif_refus: string;
  created_at: string;
  lignes_commande?: LigneCommande[];
}

export interface LigneCommande {
  [key: string]: unknown;
  id: string;
  commande_id: string;
  produit_id: string;
  boutique_id: string;
  quantite: number;
  prix_unitaire: number;
  produits?: Produit;
  boutiques?: Boutique;
}

export interface Conversation {
  [key: string]: unknown;
  id: string;
  acheteur_id: string;
  boutique_id: string;
  created_at: string;
  boutiques?: Boutique;
  users?: User;
}

export interface Message {
  [key: string]: unknown;
  id: string;
  conversation_id: string;
  expediteur_id: string | null;
  contenu: string;
  statut_ia: StatutIA;
  lu: boolean;
  est_ia: boolean;
  created_at: string;
}

export interface Avis {
  [key: string]: unknown;
  id: string;
  produit_id: string;
  acheteur_id: string;
  commande_id: string | null;
  note: number;
  commentaire: string;
  created_at: string;
  users?: User;
}

export interface CartItem {
  produit: Produit;
  boutique: Boutique;
  quantite: number;
}

export interface Database {
  public: {
    Tables: {
      users: { Row: User; Insert: Partial<User>; Update: Partial<User>; Relationships: [] };
      boutiques: { Row: Boutique; Insert: Partial<Boutique>; Update: Partial<Boutique>; Relationships: [] };
      produits: { Row: Produit; Insert: Partial<Produit>; Update: Partial<Produit>; Relationships: [] };
      commandes: { Row: Commande; Insert: Partial<Commande>; Update: Partial<Commande>; Relationships: [] };
      lignes_commande: { Row: LigneCommande; Insert: Partial<LigneCommande>; Update: Partial<LigneCommande>; Relationships: [] };
      conversations: { Row: Conversation; Insert: Partial<Conversation>; Update: Partial<Conversation>; Relationships: [] };
      messages: { Row: Message; Insert: Partial<Message>; Update: Partial<Message>; Relationships: [] };
      avis: { Row: Avis; Insert: Partial<Avis>; Update: Partial<Avis>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

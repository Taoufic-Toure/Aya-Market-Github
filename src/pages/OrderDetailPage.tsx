import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, MapPin, Package, Store, Truck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Commande, LigneCommande, Produit, Boutique } from '../lib/database.types';

interface OrderDetailPageProps {
  commandeId: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onBack: () => void;
}

type LigneAvecDetails = LigneCommande & {
  produits?: Pick<Produit, 'nom' | 'photos'>;
  boutiques?: Pick<Boutique, 'nom'>;
};

type CommandeAvecDetails = Commande & {
  lignes_commande: LigneAvecDetails[];
};

const STATUT_LABELS: Record<string, string> = {
  en_attente: 'En attente',
  confirmee: 'Confirmee',
  en_preparation: 'En preparation',
  expediee: 'Expediee',
  livree: 'Livree',
  annulee: 'Annulee',
};

export default function OrderDetailPage({ commandeId, onNavigate, onBack }: OrderDetailPageProps) {
  const [commande, setCommande] = useState<CommandeAvecDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrder = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('commandes')
        .select('*, lignes_commande(*, produits(nom, photos), boutiques(nom))')
        .eq('id', commandeId)
        .maybeSingle();

      if (error) {
        console.error('Erreur chargement detail commande:', error);
      }
      setCommande((data as CommandeAvecDetails | null) ?? null);
      setLoading(false);
    };

    loadOrder();
  }, [commandeId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white px-4 pt-12 pb-4 shadow-sm">
          <div className="h-6 bg-gray-200 rounded w-40 animate-pulse" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!commande) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 pb-20">
        <Package className="w-16 h-16 text-gray-300 mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Commande introuvable</h1>
        <button onClick={() => onNavigate('orders')} className="btn-primary mt-4">
          Voir mes commandes
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white sticky top-0 z-30 px-4 pt-12 pb-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Commande #{commande.id.slice(0, 8).toUpperCase()}</h1>
            <p className="text-xs text-gray-500">{STATUT_LABELS[commande.statut] ?? commande.statut}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4 text-[#1D9E75]" />
            {new Date(commande.created_at).toLocaleDateString('fr-FR')}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Truck className="w-4 h-4 text-[#1D9E75]" />
            {commande.mode_livraison === 'domicile' ? 'Livraison a domicile' : 'Retrait boutique'}
          </div>
          {commande.adresse_livraison && (
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 text-[#1D9E75] mt-0.5" />
              <span>{commande.adresse_livraison}</span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-900">Articles</h2>
          </div>
          {commande.lignes_commande.map((ligne) => (
            <div key={ligne.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
              <img
                src={ligne.produits?.photos?.[0] || 'https://images.pexels.com/photos/3965557/pexels-photo-3965557.jpeg?auto=compress&cs=tinysrgb&w=100'}
                alt={ligne.produits?.nom || 'Produit'}
                className="w-14 h-14 rounded-xl object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{ligne.produits?.nom || 'Produit'}</p>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                  <Store className="w-3 h-3" />
                  {ligne.boutiques?.nom || 'Boutique'}
                </div>
                <p className="text-xs text-gray-400 mt-1">Quantite: {ligne.quantite}</p>
              </div>
              <p className="text-sm font-bold text-[#1D9E75]">{(ligne.prix_unitaire * ligne.quantite).toLocaleString('fr-FR')} FCFA</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Frais de livraison</span>
            <span className="font-medium">{commande.frais_livraison.toLocaleString('fr-FR')} FCFA</span>
          </div>
          <div className="border-t border-gray-100 pt-2 flex justify-between">
            <span className="font-bold text-gray-900">Total</span>
            <span className="font-bold text-[#1D9E75] text-lg">{commande.montant_total.toLocaleString('fr-FR')} FCFA</span>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Package, ChevronRight, Clock, CheckCircle, Truck, XCircle, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Commande, LigneCommande } from '../lib/database.types';
import { useAuth } from '../hooks/useAuth';

const STATUTS: Record<string, { label: string; color: string; icon: React.FC<{ className?: string }> }> = {
  en_attente: { label: 'En attente', color: 'text-[#EF9F27] bg-[#EF9F27]/10', icon: Clock },
  confirmee: { label: 'Confirmée', color: 'text-blue-600 bg-blue-50', icon: CheckCircle },
  en_preparation: { label: 'En préparation', color: 'text-orange-600 bg-orange-50', icon: Package },
  expediee: { label: 'Expédiée', color: 'text-purple-600 bg-purple-50', icon: Truck },
  livree: { label: 'Livrée', color: 'text-[#1D9E75] bg-[#1D9E75]/10', icon: CheckCircle },
  annulee: { label: 'Annulée', color: 'text-red-600 bg-red-50', icon: XCircle },
};

interface OrdersPageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export default function OrdersPage({ onNavigate }: OrdersPageProps) {
  const [commandes, setCommandes] = useState<(Commande & { lignes_commande: LigneCommande[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) loadOrders();
    else setLoading(false);
  }, [user]);

  const loadOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('commandes')
      .select('*, lignes_commande(*, produits(nom, photos), boutiques(nom))')
      .eq('acheteur_id', user!.id)
      .order('created_at', { ascending: false });
    if (data) setCommandes(data as (Commande & { lignes_commande: LigneCommande[] })[]);
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center pb-20 px-4">
        <Package className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Vos commandes</h2>
        <p className="text-gray-500 text-sm text-center mb-6">Connectez-vous pour voir vos commandes</p>
        <button onClick={() => onNavigate('auth')} className="btn-primary px-8 py-3">
          Se connecter
        </button>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white px-4 pt-12 pb-4 shadow-sm sticky top-0 z-30">
        <h1 className="text-xl font-bold text-gray-900">Mes commandes</h1>
        <p className="text-xs text-gray-500 mt-0.5">{commandes.length} commande{commandes.length > 1 ? 's' : ''}</p>
      </div>

      <div className="p-4 space-y-3">
        {commandes.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Vous n'avez pas encore de commandes</p>
            <button onClick={() => onNavigate('home')} className="mt-4 btn-primary px-6 py-2.5 text-sm">
              Commencer à acheter
            </button>
          </div>
        ) : (
          commandes.map(commande => {
            const statut = STATUTS[commande.statut] || STATUTS.en_attente;
            const Icon = statut.icon;
            const firstLine = commande.lignes_commande?.[0];
            const photo = (firstLine?.produits as { photos?: string[] } | undefined)?.photos?.[0] || 'https://images.pexels.com/photos/3965557/pexels-photo-3965557.jpeg?auto=compress&cs=tinysrgb&w=100';
            return (
              <button
                key={commande.id}
                onClick={() => onNavigate('order-detail', { id: commande.id })}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 w-full text-left hover:border-[#1D9E75] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <img src={photo} alt="Produit" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-gray-400">#{commande.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">
                          {commande.lignes_commande?.length || 0} article{commande.lignes_commande?.length > 1 ? 's' : ''}
                        </p>
                      </div>
                      <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${statut.color}`}>
                        <Icon className="w-3 h-3" />
                        {statut.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold text-gray-900">{commande.montant_total.toLocaleString('fr-FR')} FCFA</span>
                      <span className="text-xs text-gray-400">{new Date(commande.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                </div>
                {commande.statut === 'livree' && (
                  <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2">
                    <Star className="w-4 h-4 text-[#EF9F27]" />
                    <span className="text-xs text-gray-500">Donnez votre avis sur cette commande</span>
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

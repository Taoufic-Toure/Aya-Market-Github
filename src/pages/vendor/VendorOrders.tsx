import { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, Package, User, MapPin, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Commande, LigneCommande, Statut } from '../../lib/database.types';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';

interface OrderWithDetails extends Commande {
  lignes_commande: (LigneCommande & { produits: { nom: string; photos: string[] } })[];
  users: { nom: string; telephone: string };
}

const STATUTS: Record<Statut, string> = {
  en_attente: 'En attente', confirmee: 'Confirmée', en_preparation: 'En préparation',
  expediee: 'Expédiée', livree: 'Livrée', annulee: 'Annulée',
};
const NEXT_STATUS: Partial<Record<Statut, Statut>> = {
  en_attente: 'confirmee', confirmee: 'en_preparation', en_preparation: 'expediee', expediee: 'livree',
};
const STATUT_COLORS: Record<string, string> = {
  en_attente: 'text-[#EF9F27] bg-[#EF9F27]/10', confirmee: 'text-blue-600 bg-blue-50',
  en_preparation: 'text-orange-600 bg-orange-50', expediee: 'text-purple-600 bg-purple-50',
  livree: 'text-[#1D9E75] bg-[#1D9E75]/10', annulee: 'text-red-600 bg-red-50',
};

interface VendorOrdersProps {
  onBack: () => void;
}

export default function VendorOrders({ onBack }: VendorOrdersProps) {
  const [commandes, setCommandes] = useState<OrderWithDetails[]>([]);
  const [filter, setFilter] = useState<Statut | 'all'>('all');
  const [boutique, setBoutique] = useState<{ id: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    setLoading(true);
    const { data: b } = await supabase.from('boutiques').select('id').eq('vendeur_id', user!.id).maybeSingle();
    if (!b) { setLoading(false); return; }
    setBoutique(b);
    const { data } = await supabase
      .from('commandes')
      .select('*, lignes_commande!inner(*, produits(nom, photos)), users(nom, telephone)')
      .eq('lignes_commande.boutique_id', b.id)
      .order('created_at', { ascending: false });
    if (data) setCommandes(data as OrderWithDetails[]);
    setLoading(false);
  };

  const updateStatus = async (id: string, statut: Statut) => {
    await supabase.from('commandes').update({ statut }).eq('id', id);
    showToast(`Statut mis à jour : ${STATUTS[statut]}`, 'success');
    await loadData();
  };

  const filtered = filter === 'all' ? commandes : commandes.filter(c => c.statut === filter);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white px-4 pt-12 pb-4 shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-lg font-bold text-gray-900">Commandes ({commandes.length})</h1>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {(['all', 'en_attente', 'confirmee', 'en_preparation', 'expediee', 'livree', 'annulee'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filter === s ? 'bg-[#1D9E75] text-white' : 'bg-gray-100 text-gray-600'}`}>
              {s === 'all' ? 'Toutes' : STATUTS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-white rounded-2xl h-28 animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucune commande</p>
          </div>
        ) : (
          filtered.map(cmd => {
            const nextStatut = NEXT_STATUS[cmd.statut];
            const isExpanded = expanded === cmd.id;
            return (
              <div key={cmd.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <button onClick={() => setExpanded(isExpanded ? null : cmd.id)} className="w-full p-4 text-left">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-mono text-gray-400">#{cmd.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-sm font-bold text-gray-900 mt-0.5">{cmd.montant_total.toLocaleString('fr-FR')} FCFA</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUT_COLORS[cmd.statut]}`}>
                        {STATUTS[cmd.statut]}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1 text-gray-500">
                      <User className="w-3 h-3" />
                      <span className="text-xs">{(cmd.users as { nom?: string } | undefined)?.nom || 'Client'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span className="text-xs">{new Date(cmd.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">
                    {/* Products */}
                    {cmd.lignes_commande?.map(ligne => (
                      <div key={ligne.id} className="flex items-center gap-3">
                        <img src={ligne.produits?.photos?.[0] || 'https://images.pexels.com/photos/3965557/pexels-photo-3965557.jpeg?auto=compress&cs=tinysrgb&w=80'} alt="" className="w-12 h-12 rounded-xl object-cover" />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{ligne.produits?.nom}</p>
                          <p className="text-xs text-gray-500">x{ligne.quantite} · {ligne.prix_unitaire.toLocaleString('fr-FR')} FCFA</p>
                        </div>
                      </div>
                    ))}
                    {cmd.adresse_livraison && (
                      <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-3">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-gray-600">{cmd.adresse_livraison}</p>
                      </div>
                    )}
                    {/* Action buttons */}
                    <div className="flex gap-2">
                      {nextStatut && (
                        <button onClick={() => updateStatus(cmd.id, nextStatut)} className="flex-1 btn-primary py-2.5 text-sm">
                          {STATUTS[nextStatut]}
                        </button>
                      )}
                      {cmd.statut === 'en_attente' && (
                        <button onClick={() => updateStatus(cmd.id, 'annulee')} className="px-4 py-2.5 text-sm border-2 border-red-300 text-red-500 rounded-2xl font-semibold hover:bg-red-50">
                          Refuser
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

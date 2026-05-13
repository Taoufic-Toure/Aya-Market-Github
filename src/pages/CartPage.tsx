import { useState } from 'react';
import { ArrowLeft, Trash2, Plus, Minus, ShoppingCart, MapPin, Truck, Store as StoreIcon, CreditCard, Smartphone } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { createFedaPayTransaction, type FedaPayMethod } from '../lib/paymentApi';
import type { CartItem, ModeLivraison, ModePaiement } from '../lib/database.types';

const FRAIS_LIVRAISON = 1000;

interface CartPageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onBack: () => void;
}

function groupByBoutique(items: CartItem[]) {
  const groups: Record<string, CartItem[]> = {};
  items.forEach(item => {
    const bid = item.boutique.id;
    if (!groups[bid]) groups[bid] = [];
    groups[bid].push(item);
  });
  return groups;
}

export default function CartPage({ onNavigate, onBack }: CartPageProps) {
  const { items, removeItem, updateQuantity, clearCart, totalPrice } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [modeLivraison, setModeLivraison] = useState<ModeLivraison>('domicile');
  const [modePaiement, setModePaiement] = useState<ModePaiement>('livraison');
  const [adresse, setAdresse] = useState('');
  const [loading, setLoading] = useState(false);

  const fraisLivraison = modeLivraison === 'domicile' ? FRAIS_LIVRAISON : 0;
  const total = totalPrice + fraisLivraison;
  const groups = groupByBoutique(items);

  const handleOrder = async () => {
    if (!user) { onNavigate('auth'); return; }
    if (modeLivraison === 'domicile' && !adresse.trim()) {
      showToast('Veuillez saisir votre adresse de livraison', 'error');
      return;
    }
    setLoading(true);
    const { data: commande, error } = await supabase
      .from('commandes')
      .insert({
        acheteur_id: user.id,
        montant_total: total,
        frais_livraison: fraisLivraison,
        mode_livraison: modeLivraison,
        mode_paiement: modePaiement,
        adresse_livraison: adresse,
        statut: 'en_attente',
      })
      .select()
      .single();

    if (error || !commande) {
      showToast('Erreur lors de la commande', 'error');
      setLoading(false);
      return;
    }

    const lignes = items.map(item => ({
      commande_id: commande.id,
      produit_id: item.produit.id,
      boutique_id: item.boutique.id,
      quantite: item.quantite,
      prix_unitaire: item.produit.prix,
    }));
    const { error: lignesError } = await supabase.from('lignes_commande').insert(lignes);
    if (lignesError) {
      await supabase.from('commandes').delete().eq('id', commande.id);
      showToast('Commande creee, mais les articles n ont pas ete enregistres', 'error');
      setLoading(false);
      return;
    }
    clearCart();

    if (modePaiement !== 'livraison') {
      try {
        const payment = await createFedaPayTransaction(commande.id, modePaiement as FedaPayMethod);
        showToast('Redirection vers le paiement securise FedaPay...', 'info');
        window.location.assign(payment.payment_url);
      } catch (paymentError) {
        const message = paymentError instanceof Error ? paymentError.message : 'Paiement indisponible';
        showToast(message, 'error');
        onNavigate('order-confirm', { id: commande.id });
      } finally {
        setLoading(false);
      }
      return;
    }

    showToast('Commande passée avec succès !', 'success');
    onNavigate('order-confirm', { id: commande.id });
    setLoading(false);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center pb-20 px-4">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <ShoppingCart className="w-12 h-12 text-gray-300" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Votre panier est vide</h2>
        <p className="text-gray-500 text-sm text-center mb-6">Parcourez nos produits et ajoutez-en à votre panier</p>
        <button onClick={() => onNavigate('home')} className="btn-primary px-8 py-3">
          Découvrir les produits
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="bg-white sticky top-0 z-30 px-4 pt-12 pb-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Mon panier ({items.length} article{items.length > 1 ? 's' : ''})</h1>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Items grouped by boutique */}
        {Object.entries(groups).map(([boutiqueId, groupItems]) => (
          <div key={boutiqueId} className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50">
              <StoreIcon className="w-4 h-4 text-[#1D9E75]" />
              <span className="text-sm font-semibold text-gray-800">{groupItems[0].boutique.nom}</span>
            </div>
            {groupItems.map(item => (
              <div key={item.produit.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                <img
                  src={item.produit.photos?.[0] || 'https://images.pexels.com/photos/3965557/pexels-photo-3965557.jpeg?auto=compress&cs=tinysrgb&w=100'}
                  alt={item.produit.nom}
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.produit.nom}</p>
                  <p className="text-sm font-bold text-[#1D9E75] mt-0.5">{item.produit.prix.toLocaleString('fr-FR')} FCFA</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => updateQuantity(item.produit.id, item.quantite - 1)} className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:border-[#1D9E75] hover:text-[#1D9E75]">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-bold w-5 text-center">{item.quantite}</span>
                    <button onClick={() => updateQuantity(item.produit.id, item.quantite + 1)} className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:border-[#1D9E75] hover:text-[#1D9E75]">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-sm font-bold text-gray-900">{(item.produit.prix * item.quantite).toLocaleString('fr-FR')}</span>
                  <button onClick={() => removeItem(item.produit.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Delivery options */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Mode de livraison</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'domicile' as ModeLivraison, label: 'Livraison', icon: Truck, sub: `+${FRAIS_LIVRAISON.toLocaleString()} FCFA` },
              { value: 'retrait' as ModeLivraison, label: 'Retrait boutique', icon: StoreIcon, sub: 'Gratuit' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setModeLivraison(opt.value)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${modeLivraison === opt.value ? 'border-[#1D9E75] bg-[#1D9E75]/5' : 'border-gray-200'}`}
              >
                <opt.icon className={`w-5 h-5 ${modeLivraison === opt.value ? 'text-[#1D9E75]' : 'text-gray-400'}`} />
                <span className={`text-xs font-semibold ${modeLivraison === opt.value ? 'text-[#1D9E75]' : 'text-gray-600'}`}>{opt.label}</span>
                <span className="text-xs text-gray-400">{opt.sub}</span>
              </button>
            ))}
          </div>
          {modeLivraison === 'domicile' && (
            <div className="mt-3">
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <textarea
                  placeholder="Votre adresse complète..."
                  value={adresse}
                  onChange={e => setAdresse(e.target.value)}
                  rows={2}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Payment method */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Mode de paiement</h3>
          <div className="space-y-2">
            {[
              { value: 'mtn' as ModePaiement, label: 'MTN Mobile Money', icon: Smartphone, color: 'bg-yellow-400' },
              { value: 'moov' as ModePaiement, label: 'Moov Africa Money', icon: Smartphone, color: 'bg-blue-500' },
              { value: 'celtiis' as ModePaiement, label: 'Celtiis Cash', icon: Smartphone, color: 'bg-emerald-500' },
              { value: 'livraison' as ModePaiement, label: 'Paiement à la livraison', icon: CreditCard, color: 'bg-gray-400' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setModePaiement(opt.value)}
                className={`flex items-center gap-3 w-full p-3 rounded-xl border-2 transition-all text-left ${modePaiement === opt.value ? 'border-[#1D9E75] bg-[#1D9E75]/5' : 'border-gray-200'}`}
              >
                <div className={`w-8 h-8 rounded-lg ${opt.color} flex items-center justify-center`}>
                  <opt.icon className="w-4 h-4 text-white" />
                </div>
                <span className={`text-sm font-medium ${modePaiement === opt.value ? 'text-[#1D9E75]' : 'text-gray-700'}`}>{opt.label}</span>
                <div className={`ml-auto w-4 h-4 rounded-full border-2 ${modePaiement === opt.value ? 'border-[#1D9E75] bg-[#1D9E75]' : 'border-gray-300'} flex items-center justify-center`}>
                  {modePaiement === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Résumé</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Sous-total</span>
              <span className="font-medium">{totalPrice.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Frais de livraison</span>
              <span className="font-medium">{fraisLivraison > 0 ? `${fraisLivraison.toLocaleString('fr-FR')} FCFA` : 'Gratuit'}</span>
            </div>
            <div className="border-t border-gray-100 pt-2 flex justify-between">
              <span className="font-bold text-gray-900">Total</span>
              <span className="font-bold text-[#1D9E75] text-lg">{total.toLocaleString('fr-FR')} FCFA</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 bg-white border-t border-gray-100 p-4">
        <button
          onClick={handleOrder}
          disabled={loading}
          className="w-full btn-primary py-4 text-base font-semibold disabled:opacity-60"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Traitement...
            </div>
          ) : `Commander · ${total.toLocaleString('fr-FR')} FCFA`}
        </button>
      </div>
    </div>
  );
}

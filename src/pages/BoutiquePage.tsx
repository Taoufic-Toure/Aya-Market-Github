import { useState, useEffect } from 'react';
import { ArrowLeft, Star, MapPin, ShoppingBag, MessageCircle, UserPlus, Store } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Boutique, Produit } from '../lib/database.types';
import ProductCard from '../components/ProductCard';
import SkeletonCard from '../components/SkeletonCard';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../hooks/useAuth';

interface BoutiquePageProps {
  boutiqueId: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onBack: () => void;
}

export default function BoutiquePage({ boutiqueId, onNavigate, onBack }: BoutiquePageProps) {
  const [boutique, setBoutique] = useState<Boutique | null>(null);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();
  const { showToast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadBoutique();
    window.scrollTo(0, 0);
  }, [boutiqueId]);

  const loadBoutique = async () => {
    setLoading(true);
    const [boutiqueRes, produitsRes] = await Promise.all([
      supabase.from('boutiques').select('*').eq('id', boutiqueId).maybeSingle(),
      supabase.from('produits').select('*, boutiques(*)').eq('boutique_id', boutiqueId).eq('actif', true).order('created_at', { ascending: false }),
    ]);
    if (boutiqueRes.data) setBoutique(boutiqueRes.data);
    if (produitsRes.data) setProduits(produitsRes.data as Produit[]);
    setLoading(false);
  };

  const handleContact = () => {
    if (!user) { onNavigate('auth'); return; }
    onNavigate('chat', { boutiqueId });
  };

  const handleFollow = () => {
    const key = 'ayamarket-followed-boutiques';
    const followed = JSON.parse(localStorage.getItem(key) || '[]') as string[];
    const next = followed.includes(boutiqueId)
      ? followed.filter(id => id !== boutiqueId)
      : [...followed, boutiqueId];
    localStorage.setItem(key, JSON.stringify(next));
    showToast(followed.includes(boutiqueId) ? 'Boutique retiree des suivis' : 'Boutique suivie', 'success');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="h-48 bg-gray-200 animate-pulse" />
        <div className="px-4 pt-4 space-y-3">
          <div className="h-6 bg-gray-200 rounded animate-pulse w-1/2" />
          <div className="grid grid-cols-2 gap-3 mt-6">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  if (!boutique) return null;

  const coverUrl = boutique.cover_url || 'https://images.pexels.com/photos/1005638/pexels-photo-1005638.jpeg?auto=compress&cs=tinysrgb&w=800';

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Cover */}
      <div className="relative h-52">
        <img src={coverUrl} alt={boutique.nom} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <button onClick={onBack} className="absolute top-12 left-4 bg-white/20 backdrop-blur-sm rounded-full p-2">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Boutique info card */}
      <div className="px-4 -mt-8 relative z-10">
        <div className="bg-white rounded-2xl p-4 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#1D9E75]/10 flex items-center justify-center -mt-8 border-4 border-white shadow overflow-hidden flex-shrink-0">
              {boutique.logo_url ? (
                <img src={boutique.logo_url} alt={boutique.nom} className="w-full h-full object-cover" />
              ) : (
                <Store className="w-8 h-8 text-[#1D9E75]" />
              )}
            </div>
            <div className="flex-1 min-w-0 pt-0">
              <h1 className="text-lg font-bold text-gray-900">{boutique.nom}</h1>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-[#EF9F27] text-[#EF9F27]" />
                  <span className="text-xs text-gray-600">{boutique.note_moyenne > 0 ? boutique.note_moyenne.toFixed(1) : 'Nouveau'}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span className="text-xs">{boutique.nb_ventes} ventes</span>
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="text-xs">{boutique.ville}</span>
                </div>
              </div>
              {boutique.description && (
                <p className="text-xs text-gray-500 mt-2 line-clamp-2">{boutique.description}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleContact}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#1D9E75] text-white rounded-xl font-semibold text-sm"
            >
              <MessageCircle className="w-4 h-4" /> Contacter
            </button>
            <button
              onClick={handleFollow}
              className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 rounded-xl font-semibold text-sm text-gray-600 hover:border-[#1D9E75] hover:text-[#1D9E75] transition-colors"
            >
              <UserPlus className="w-4 h-4" /> Suivre
            </button>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900">Produits ({produits.length})</h2>
        </div>
        {produits.length === 0 ? (
          <div className="text-center py-12">
            <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Cette boutique n'a pas encore de produits</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {produits.map(produit => (
              <ProductCard
                key={produit.id}
                produit={produit}
                onClick={() => onNavigate('product', { id: produit.id })}
                onAddToCart={() => {
                  addItem(produit, boutique);
                  showToast(`${produit.nom} ajouté au panier`, 'success');
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

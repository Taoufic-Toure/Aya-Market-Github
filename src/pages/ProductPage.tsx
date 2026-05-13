import { useState, useEffect } from 'react';
import { ArrowLeft, Star, Store, ShoppingCart, MessageCircle, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Produit, Avis } from '../lib/database.types';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../hooks/useAuth';
import SkeletonCard from '../components/SkeletonCard';
import ProductCard from '../components/ProductCard';
import WishlistButton from '../components/WishlistButton';
import { useWishlist } from '../hooks/useWishlist';

interface ProductPageProps {
  produitId: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onBack: () => void;
}

export default function ProductPage({ produitId, onNavigate, onBack }: ProductPageProps) {
  const [produit, setProduit] = useState<Produit | null>(null);
  const [avis, setAvis] = useState<Avis[]>([]);
  const [similaires, setSimilaires] = useState<Produit[]>([]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { isInWishlist, toggleWishlist } = useWishlist();

  useEffect(() => {
    loadProduct();
    window.scrollTo(0, 0);
  }, [produitId]);

  const loadProduct = async () => {
    setLoading(true);
    const { data: p } = await supabase
      .from('produits')
      .select('*, boutiques(*)')
      .eq('id', produitId)
      .maybeSingle();

    if (p) {
      const product = p as Produit;
      setProduit(product);
      const [avisRes, similairesRes] = await Promise.all([
        supabase.from('avis').select('*, users(nom, avatar_url)').eq('produit_id', produitId).order('created_at', { ascending: false }).limit(10),
        supabase.from('produits').select('*, boutiques(*)').eq('categorie', product.categorie).eq('actif', true).neq('id', produitId).limit(6),
      ]);
      if (avisRes.data) setAvis(avisRes.data as Avis[]);
      if (similairesRes.data) setSimilaires(similairesRes.data as Produit[]);
    }
    setLoading(false);
  };

  const handleAddToCart = () => {
    if (!produit || !produit.boutiques) return;
    for (let i = 0; i < quantity; i++) addItem(produit, produit.boutiques);
    showToast(`${produit.nom} ajouté au panier !`, 'success');
  };

  const handleContact = () => {
    if (!user) { onNavigate('auth'); return; }
    if (produit?.boutiques) onNavigate('chat', { boutiqueId: produit.boutique_id });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white pb-20">
        <div className="p-4 pt-12">
          <div className="aspect-square bg-gray-200 rounded-2xl animate-pulse mb-4" />
          <div className="space-y-3">
            <div className="h-6 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!produit) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 pb-20">
        <Package className="w-16 h-16 text-gray-300 mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Produit introuvable</h1>
        <button onClick={onBack} className="btn-primary mt-4">Retour</button>
      </div>
    );
  }

  const photos = produit.photos?.length
    ? produit.photos
    : ['https://images.pexels.com/photos/3965557/pexels-photo-3965557.jpeg?auto=compress&cs=tinysrgb&w=600'];

  return (
    <div className="min-h-screen bg-white pb-28">
      {/* Photo Gallery */}
      <div className="relative bg-gray-100 aspect-square">
        <img src={photos[photoIndex]} alt={produit.nom} className="w-full h-full object-cover" />
        <button onClick={onBack} className="absolute top-12 left-4 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-md">
          <ArrowLeft className="w-5 h-5 text-gray-800" />
        </button>
        <div className="absolute top-12 right-4">
          <WishlistButton
            productId={produit.id}
            isInWishlist={isInWishlist(produit.id)}
            onToggle={toggleWishlist}
            size="lg"
          />
        </div>
        {photos.length > 1 && (
          <>
            <button
              onClick={() => setPhotoIndex(i => (i - 1 + photos.length) % photos.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-1.5 shadow"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPhotoIndex(i => (i + 1) % photos.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-1.5 shadow"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {photos.map((_, i) => (
                <div key={i} className={`rounded-full transition-all ${i === photoIndex ? 'w-4 h-2 bg-[#1D9E75]' : 'w-2 h-2 bg-white/60'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Product Info */}
      <div className="px-4 py-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h1 className="text-xl font-bold text-gray-900 flex-1">{produit.nom}</h1>
          <span className="text-2xl font-bold text-[#1D9E75] flex-shrink-0">
            {produit.prix.toLocaleString('fr-FR')} <span className="text-base">FCFA</span>
          </span>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`w-4 h-4 ${i < Math.round(produit.note_moyenne) ? 'fill-[#EF9F27] text-[#EF9F27]' : 'text-gray-300'}`} />
            ))}
            <span className="text-sm text-gray-500 ml-1">({avis.length} avis)</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            <Package className="w-4 h-4" />
            <span className="text-sm">{produit.stock > 0 ? `${produit.stock} en stock` : 'Rupture de stock'}</span>
          </div>
        </div>

        {/* Boutique */}
        <button
          onClick={() => onNavigate('boutique', { id: produit.boutique_id })}
          className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3 w-full mb-4 hover:bg-gray-100 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-[#1D9E75]/10 flex items-center justify-center overflow-hidden">
            {produit.boutiques?.logo_url ? (
              <img src={produit.boutiques.logo_url} alt={produit.boutiques.nom} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <Store className="w-5 h-5 text-[#1D9E75]" />
            )}
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-gray-900">{produit.boutiques?.nom}</p>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-[#EF9F27] text-[#EF9F27]" />
              <span className="text-xs text-gray-500">{produit.boutiques?.note_moyenne?.toFixed(1) || 'Nouveau'} · {produit.boutiques?.ville}</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>

        {/* Description */}
        {produit.description && (
          <div className="mb-5">
            <h2 className="text-sm font-bold text-gray-900 mb-2">Description</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{produit.description}</p>
          </div>
        )}

        {/* Quantity selector */}
        {produit.stock > 0 && (
          <div className="flex items-center gap-4 mb-6">
            <span className="text-sm font-medium text-gray-700">Quantité :</span>
            <div className="flex items-center border border-gray-200 rounded-xl">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50">-</button>
              <span className="w-10 text-center font-semibold">{quantity}</span>
              <button onClick={() => setQuantity(q => Math.min(produit.stock, q + 1))} className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50">+</button>
            </div>
          </div>
        )}

        {/* Avis */}
        {avis.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Avis clients ({avis.length})</h2>
            <div className="space-y-3">
              {avis.slice(0, 3).map(a => (
                <div key={a.id} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-full bg-[#1D9E75]/20 flex items-center justify-center text-xs font-bold text-[#1D9E75]">
                      {(a.users as { nom?: string } | undefined)?.nom?.[0] || 'A'}
                    </div>
                    <span className="text-xs font-semibold text-gray-800">{(a.users as { nom?: string } | undefined)?.nom || 'Acheteur'}</span>
                    <div className="flex ml-auto">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < a.note ? 'fill-[#EF9F27] text-[#EF9F27]' : 'text-gray-300'}`} />
                      ))}
                    </div>
                  </div>
                  {a.commentaire && <p className="text-xs text-gray-600">{a.commentaire}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Similar products */}
        {similaires.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-gray-900 mb-3">Produits similaires</h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {similaires.map(p => (
                <div key={p.id} className="flex-shrink-0 w-40">
                  <ProductCard
                    produit={p}
                    onClick={() => onNavigate('product', { id: p.id })}
                    onAddToCart={() => {
                      if (p.boutiques) {
                        addItem(p, p.boutiques);
                        showToast(`${p.nom} ajoute au panier`, 'success');
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fixed bottom buttons */}
      <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 bg-white border-t border-gray-100 p-4 flex gap-3">
        <button
          onClick={handleContact}
          className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-[#1D9E75] text-[#1D9E75] rounded-2xl font-semibold text-sm hover:bg-[#1D9E75]/5 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Contacter
        </button>
        <button
          onClick={handleAddToCart}
          disabled={produit.stock === 0}
          className="flex-2 flex-1 flex items-center justify-center gap-2 py-3 bg-[#1D9E75] text-white rounded-2xl font-semibold text-sm hover:bg-[#178a64] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ShoppingCart className="w-4 h-4" />
          {produit.stock === 0 ? 'Rupture de stock' : 'Ajouter au panier'}
        </button>
      </div>
    </div>
  );
}

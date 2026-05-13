import { useState, useEffect } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Produit, Categorie } from '../lib/database.types';
import ProductCard from '../components/ProductCard';
import SkeletonCard from '../components/SkeletonCard';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';

const CATEGORY_EMOJIS: Record<string, string> = {
  Alimentation: '🍚', Vêtements: '👗', Téléphones: '📱', Informatique: '💻',
  Beauté: '💄', Maison: '🏠', Agriculture: '🌾', Artisanat: '🎨',
  Sport: '⚽', Jouets: '🧸', Livres: '📚', Autre: '🔧', Électronique: '📱',
};

interface CategoryProductsPageProps {
  categorie: Categorie;
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onBack: () => void;
}

export default function CategoryProductsPage({ categorie, onNavigate, onBack }: CategoryProductsPageProps) {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { addItem } = useCart();
  const { showToast } = useToast();

  useEffect(() => {
    loadProducts();
    window.scrollTo(0, 0);
  }, [categorie]);

  const loadProducts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('produits')
      .select('*, boutiques(*)')
      .eq('actif', true)
      .eq('categorie', categorie)
      .order('nb_ventes', { ascending: false })
      .limit(30);
    if (data) setProduits(data as Produit[]);
    setLoading(false);
  };

  const filtered = produits.filter(p =>
    p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.boutiques?.nom?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddToCart = (produit: Produit) => {
    if (produit.boutiques) {
      addItem(produit, produit.boutiques);
      showToast(`${produit.nom} ajouté au panier`, 'success');
    }
  };

  const emoji = CATEGORY_EMOJIS[categorie] || '📦';

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white sticky top-0 z-30 shadow-sm">
        <div className="px-4 pt-12 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl">{emoji}</span>
              <h1 className="text-lg font-bold text-gray-900">{categorie}</h1>
            </div>
            <span className="ml-auto text-xs text-gray-400">{produits.length} produit{produits.length > 1 ? 's' : ''}</span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={`Rechercher dans ${categorie.toLowerCase()}...`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl block mb-4">{emoji}</span>
            <p className="text-gray-500 font-medium">Aucun produit dans cette catégorie</p>
            <p className="text-sm text-gray-400 mt-1">Revenez bientôt !</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(produit => (
              <ProductCard
                key={produit.id}
                produit={produit}
                onClick={() => onNavigate('product', { id: produit.id })}
                onAddToCart={() => handleAddToCart(produit)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

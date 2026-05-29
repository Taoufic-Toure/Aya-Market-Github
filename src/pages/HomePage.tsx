import { useState, useEffect } from 'react';
import { Search, ShoppingCart, Bell, TrendingUp, Store, ChevronRight, ChevronDown, X, Utensils, Shirt, Cpu, Sparkles, Home as HomeIcon, Wheat, Palette, Smartphone, Monitor, Dumbbell, Gamepad2, BookOpen, MoreHorizontal } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Produit, Boutique, Categorie } from '../lib/database.types';
import ProductCard from '../components/ProductCard';
import SkeletonCard from '../components/SkeletonCard';
import HeroAmazone from '../components/HeroAmazone';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';

const CATEGORIES: { value: Categorie; label: string; icon: React.FC<{ className?: string }> }[] = [
  { value: 'Alimentation', label: 'Alimentation', icon: Utensils },
  { value: 'Vêtements', label: 'Vêtements', icon: Shirt },
  { value: 'Électronique', label: 'Électronique', icon: Cpu },
  { value: 'Beauté', label: 'Beauté', icon: Sparkles },
  { value: 'Maison', label: 'Maison', icon: HomeIcon },
  { value: 'Agriculture', label: 'Agriculture', icon: Wheat },
  { value: 'Artisanat', label: 'Artisanat', icon: Palette },
  { value: 'Téléphones', label: 'Téléphones', icon: Smartphone },
  { value: 'Informatique', label: 'Informatique', icon: Monitor },
  { value: 'Sport', label: 'Sport', icon: Dumbbell },
  { value: 'Jouets', label: 'Jouets', icon: Gamepad2 },
  { value: 'Livres', label: 'Livres', icon: BookOpen },
  { value: 'Autre', label: 'Autre', icon: MoreHorizontal },
];

interface HomePageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [tendances, setTendances] = useState<Produit[]>([]);
  const [boutiquesPopulaires, setBoutiquesPopulaires] = useState<Boutique[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<Categorie | 'Tout'>('Tout');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const { addItem } = useCart();
  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, [activeCategory]);

  const loadData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('produits')
        .select('*, boutiques(*)')
        .eq('actif', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (activeCategory !== 'Tout') {
        query = query.eq('categorie', activeCategory);
      }

      const [produitsRes, tendancesRes, boutiquesRes] = await Promise.all([
        query,
        supabase.from('produits').select('*, boutiques(*)').eq('actif', true).order('nb_ventes', { ascending: false }).limit(6),
        supabase.from('boutiques').select('*').eq('actif', true).order('nb_ventes', { ascending: false }).limit(4),
      ]);

      if (produitsRes.error) throw produitsRes.error;
      if (tendancesRes.error) console.error('Erreur chargement tendances:', tendancesRes.error);
      if (boutiquesRes.error) console.error('Erreur chargement boutiques:', boutiquesRes.error);

      setProduits((produitsRes.data as Produit[]) ?? []);
      setTendances((tendancesRes.data as Produit[]) ?? []);
      setBoutiquesPopulaires((boutiquesRes.data as Boutique[]) ?? []);
    } catch (error) {
      console.error('Erreur chargement accueil:', error);
      showToast('Impossible de charger les produits pour le moment.', 'error');
      setProduits([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProduits = produits.filter(p =>
    p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.boutiques?.nom?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddToCart = (produit: Produit) => {
    if (produit.boutiques) {
      addItem(produit, produit.boutiques);
      showToast(`${produit.nom} ajouté au panier`, 'success');
    }
  };

  const selectCategory = (cat: Categorie | 'Tout') => {
    setActiveCategory(cat);
    setShowCategoryModal(false);
  };

  const activeCatObj = CATEGORIES.find(c => c.value === activeCategory);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30">
        <div className="px-4 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="AyaMarket" className="w-9 h-9 rounded-xl object-contain" />
            <span className="font-display text-white text-lg font-bold drop-shadow">AyaMarket</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onNavigate('cart')}
              className="relative p-2 rounded-full bg-white/15 backdrop-blur hover:bg-white/25 transition-colors"
            >
              <ShoppingCart className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => showToast('Les notifications arrivent bientot.', 'info')}
              className="p-2 rounded-full bg-white/15 backdrop-blur hover:bg-white/25 transition-colors"
            >
              <Bell className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Hero with carousel background */}
      <HeroAmazone
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onExplore={() => document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' })}
      />

      {/* Category selector */}
      <div className="bg-white sticky top-0 z-20 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors w-full">
            <button
              onClick={() => setShowCategoryModal(true)}
              className="flex flex-1 items-center gap-2 text-left"
            >
            {activeCatObj ? (
              <>
                <activeCatObj.icon className="w-4 h-4 text-[#1D9E75]" />
                <span className="text-sm font-medium text-gray-800">{activeCatObj.label}</span>
              </>
            ) : (
              <>
                <Store className="w-4 h-4 text-[#1D9E75]" />
                <span className="text-sm font-medium text-gray-800">Toutes les catégories</span>
              </>
            )}
              <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />
            </button>
            {activeCategory !== 'Tout' && (
              <button
                onClick={e => { e.stopPropagation(); selectCategory('Tout'); }}
                className="ml-1 w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center hover:bg-gray-400"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowCategoryModal(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white rounded-t-3xl w-full max-w-md max-h-[80vh] overflow-hidden animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Catégories</h2>
              <button onClick={() => setShowCategoryModal(false)} className="p-2 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* "Tout" option */}
            <div className="px-5 pt-3">
              <button
                onClick={() => selectCategory('Tout')}
                className={`flex items-center gap-3 w-full p-3 rounded-2xl transition-all ${activeCategory === 'Tout' ? 'bg-[#1D9E75]/10 border-2 border-[#1D9E75]' : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeCategory === 'Tout' ? 'bg-[#1D9E75]' : 'bg-gray-200'}`}>
                  <Store className={`w-5 h-5 ${activeCategory === 'Tout' ? 'text-white' : 'text-gray-600'}`} />
                </div>
                <span className={`text-sm font-semibold ${activeCategory === 'Tout' ? 'text-[#1D9E75]' : 'text-gray-700'}`}>
                  Toutes les catégories
                </span>
              </button>
            </div>

            {/* Category grid */}
            <div className="px-5 py-4 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-3 gap-3">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  const isActive = activeCategory === cat.value;
                  return (
                    <button
                      key={cat.value}
                      onClick={() => selectCategory(cat.value)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95 ${isActive ? 'bg-[#1D9E75]/10 border-2 border-[#1D9E75]' : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'}`}
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isActive ? 'bg-[#1D9E75]' : 'bg-gray-200'}`}>
                        <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                      </div>
                      <span className={`text-xs font-semibold text-center leading-tight ${isActive ? 'text-[#1D9E75]' : 'text-gray-700'}`}>
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-4 space-y-6">
        {/* Trends section */}
        {!searchTerm && activeCategory === 'Tout' && tendances.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#EF9F27]" />
                <h2 className="text-lg font-display font-bold text-gray-900">Tendances cette semaine</h2>
              </div>
              <button
                onClick={() => document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-[#1D9E75] text-sm font-medium flex items-center gap-1"
              >
                Voir plus <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {tendances.slice(0, 6).map(produit => (
                <div key={produit.id} className="flex-shrink-0 w-36">
                  <ProductCard
                    produit={produit}
                    onClick={() => onNavigate('product', { id: produit.id })}
                    onAddToCart={() => handleAddToCart(produit)}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Popular shops */}
        {!searchTerm && activeCategory === 'Tout' && boutiquesPopulaires.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-[#1D9E75]" />
                <h2 className="text-lg font-display font-bold text-gray-900">Boutiques populaires</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {boutiquesPopulaires.map(boutique => (
                <button
                  key={boutique.id}
                  onClick={() => onNavigate('boutique', { id: boutique.id })}
                  className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex items-center gap-3 hover:border-[#1D9E75] transition-colors active:scale-95 text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#1D9E75]/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {boutique.logo_url ? (
                      <img src={boutique.logo_url} alt={boutique.nom} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Store className="w-5 h-5 text-[#1D9E75]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{boutique.nom}</p>
                    <p className="text-xs text-gray-500">{boutique.nb_ventes} ventes</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Products grid */}
        <section id="products-section">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">
              {searchTerm ? `Résultats pour "${searchTerm}"` : activeCategory === 'Tout' ? 'Tous les produits' : activeCatObj?.label || activeCategory}
            </h2>
            {!loading && (
              <span className="text-xs text-gray-400">{filteredProduits.length} produit{filteredProduits.length > 1 ? 's' : ''}</span>
            )}
          </div>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredProduits.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">Aucun produit trouvé</p>
              <p className="text-sm text-gray-400 mt-1">Essayez d'autres mots-clés ou changez de catégorie</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {filteredProduits.map(produit => (
                <ProductCard
                  key={produit.id}
                  produit={produit}
                  onClick={() => onNavigate('product', { id: produit.id })}
                  onAddToCart={() => handleAddToCart(produit)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

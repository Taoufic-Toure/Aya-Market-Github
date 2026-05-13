import { useEffect, useState } from 'react';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { useWishlist } from '../hooks/useWishlist';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import type { Produit } from '../lib/database.types';

interface WishlistPageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export default function WishlistPage({ onNavigate }: WishlistPageProps) {
  const { wishlist, wishlistCount, removeFromWishlist, clearWishlist, isLoading } = useWishlist();
  const [products, setProducts] = useState<Produit[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const { addItem } = useCart();
  const { showToast } = useToast();

  useEffect(() => {
    const loadProducts = async () => {
      setIsProductsLoading(true);
      try {
        const ids = wishlist.map(item => item.productId);
        if (ids.length === 0) {
          setProducts([]);
          return;
        }

        const { data, error } = await supabase
          .from('produits')
          .select('*, boutiques(*)')
          .in('id', ids);

        if (error) throw error;
        setProducts((data as Produit[]) ?? []);
      } catch (error) {
        console.error('Erreur chargement favoris:', error);
        showToast('Impossible de charger les favoris.', 'error');
      } finally {
        setIsProductsLoading(false);
      }
    };

    if (!isLoading) loadProducts();
  }, [wishlist, isLoading, showToast]);

  const handleRemoveFromWishlist = (productId: string) => {
    removeFromWishlist(productId);
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  const handleAddToCart = (product: Produit) => {
    if (!product.boutiques) {
      showToast('Boutique introuvable pour ce produit.', 'error');
      return;
    }
    addItem(product, product.boutiques);
    showToast(`${product.nom} ajoute au panier`, 'success');
  };

  if (isLoading || isProductsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Chargement de vos favoris...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 pt-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 rounded-full p-3">
                <Heart className="w-6 h-6 text-red-500 fill-current" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Mes favoris</h1>
                <p className="text-sm text-gray-500">
                  {wishlistCount} {wishlistCount === 1 ? 'article sauvegarde' : 'articles sauvegardes'}
                </p>
              </div>
            </div>

            {wishlistCount > 0 && (
              <button
                onClick={clearWishlist}
                className="text-red-500 hover:text-red-600 font-medium flex items-center gap-2 text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Vider
              </button>
            )}
          </div>
        </div>

        {wishlistCount === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
            <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-6">
              <Heart className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Aucun favori pour le moment</h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Touchez le coeur sur un produit pour le retrouver ici.
            </p>
            <button onClick={() => onNavigate('home')} className="btn-primary mx-auto">
              Parcourir les produits
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {products.map(product => (
              <div
                key={product.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200"
              >
                <div className="relative">
                  <img
                    src={product.photos?.[0] || 'https://images.pexels.com/photos/3965557/pexels-photo-3965557.jpeg?auto=compress&cs=tinysrgb&w=400'}
                    alt={product.nom}
                    className="w-full aspect-square object-cover"
                  />

                  <button
                    onClick={() => handleRemoveFromWishlist(product.id)}
                    className="absolute top-2 right-2 bg-white/90 rounded-full p-2 hover:bg-red-50 hover:text-red-500 transition-colors shadow-md"
                    aria-label="Retirer des favoris"
                  >
                    <Heart className="w-4 h-4 fill-current text-red-500" />
                  </button>
                </div>

                <div className="p-3">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-sm">{product.nom}</h3>
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <span className="text-base font-bold text-[#1D9E75]">
                      {product.prix.toLocaleString('fr-FR')} FCFA
                    </span>
                    <span className="text-xs text-gray-500">Stock: {product.stock}</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="flex-1 bg-[#1D9E75] text-white py-2 rounded-lg hover:bg-[#16a34a] transition-colors flex items-center justify-center gap-2"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      Panier
                    </button>

                    <button
                      onClick={() => onNavigate('product', { id: product.id })}
                      className="flex-1 border border-[#1D9E75] text-[#1D9E75] py-2 rounded-lg hover:bg-[#1D9E75] hover:text-white transition-colors"
                    >
                      Voir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

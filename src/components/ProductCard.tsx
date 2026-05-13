import { Star, Store, ShoppingCart } from 'lucide-react';
import type { Produit } from '../lib/database.types';
import WishlistButton from './WishlistButton';
import { useWishlist } from '../hooks/useWishlist';

interface ProductCardProps {
  produit: Produit;
  onClick: () => void;
  onAddToCart?: () => void;
}

export default function ProductCard({ produit, onClick, onAddToCart }: ProductCardProps) {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isNew = (Date.now() - new Date(produit.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000;
  const isOutOfStock = produit.stock === 0;
  const photo = produit.photos?.[0] || 'https://images.pexels.com/photos/3965557/pexels-photo-3965557.jpeg?auto=compress&cs=tinysrgb&w=400';

  return (
    <div
      className={`bg-white rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(15,61,46,0.06)] hover:shadow-[0_8px_24px_rgba(15,61,46,0.12)] border border-gray-100 flex flex-col cursor-pointer active:scale-[0.97] transition-all duration-200 ${isOutOfStock ? 'opacity-60' : ''}`}
      onClick={onClick}
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <img
          src={photo}
          alt={produit.nom}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          loading="lazy"
        />
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isNew && !isOutOfStock && (
            <span className="bg-[#1D9E75] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              Nouveau
            </span>
          )}
          {isOutOfStock && (
            <span className="bg-gray-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              Rupture
            </span>
          )}
        </div>
        
        <div className="absolute top-2 right-2">
          <WishlistButton
            productId={produit.id}
            isInWishlist={isInWishlist(produit.id)}
            onToggle={toggleWishlist}
            size="sm"
          />
        </div>
      </div>
      <div className="p-3 flex flex-col flex-1 gap-1">
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight">{produit.nom}</h3>
        <div className="flex items-center gap-1 text-gray-500">
          <Store className="w-3 h-3 flex-shrink-0" />
          <span className="text-xs truncate">{produit.boutiques?.nom || 'Boutique'}</span>
        </div>
        <div className="flex items-center gap-1">
          <Star className="w-3 h-3 fill-[#EF9F27] text-[#EF9F27]" />
          <span className="text-xs text-gray-600">{produit.note_moyenne > 0 ? produit.note_moyenne.toFixed(1) : 'Nouveau'}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-base font-bold text-[#1D9E75]">
            {produit.prix.toLocaleString('fr-FR')} FCFA
          </span>
          {!isOutOfStock && onAddToCart && (
            <button
              onClick={e => { e.stopPropagation(); onAddToCart(); }}
              aria-label="Ajouter au panier"
              className="bg-[#EF9F27] text-white rounded-xl p-2 hover:bg-[#d97706] transition-colors active:scale-95 shadow-sm"
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

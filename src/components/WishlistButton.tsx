import { Heart } from 'lucide-react';
import { useState } from 'react';

interface WishlistButtonProps {
  productId: string;
  isInWishlist: boolean;
  onToggle: (productId: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

export default function WishlistButton({ 
  productId, 
  isInWishlist, 
  onToggle, 
  size = 'md' 
}: WishlistButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const sizeClasses = {
    sm: 'w-4 h-4 p-1',
    md: 'w-5 h-5 p-1.5',
    lg: 'w-6 h-6 p-2'
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAnimating(true);
    onToggle(productId);
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <button
      onClick={handleClick}
      className={`
        ${sizeClasses[size]}
        rounded-full transition-all duration-300
        ${isInWishlist 
          ? 'bg-red-500 text-white hover:bg-red-600' 
          : 'bg-white/90 text-gray-600 hover:bg-red-50 hover:text-red-500'
        }
        ${isAnimating ? 'scale-125' : 'scale-100'}
        shadow-md hover:shadow-lg
        backdrop-blur-sm border border-white/20
      `}
      aria-label={isInWishlist ? "Retirer des favoris" : "Ajouter aux favoris"}
    >
      <Heart 
        className={`w-full h-full ${isInWishlist ? 'fill-current' : ''} transition-colors duration-300`}
      />
    </button>
  );
}

import { useState, useEffect } from 'react';

interface WishlistItem {
  productId: string;
  addedAt: Date;
}

export function useWishlist() {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Charger la wishlist depuis le localStorage au montage
  useEffect(() => {
    try {
      const savedWishlist = localStorage.getItem('ayamarket-wishlist');
      if (savedWishlist) {
        const parsed = JSON.parse(savedWishlist) as unknown;
        if (!Array.isArray(parsed)) return;
        setWishlist(
          parsed.map((item): WishlistItem | null => {
            if (
              item &&
              typeof item === 'object' &&
              'productId' in item &&
              typeof (item as { productId: unknown }).productId === 'string' &&
              'addedAt' in item
            ) {
              return {
                productId: (item as { productId: string }).productId,
                addedAt: new Date((item as { addedAt: string }).addedAt),
              };
            }
            return null;
          }).filter((x): x is WishlistItem => x !== null)
        );
      }
    } catch (error) {
      console.error('Erreur chargement wishlist:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sauvegarder la wishlist dans le localStorage à chaque modification
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('ayamarket-wishlist', JSON.stringify(wishlist));
    }
  }, [wishlist, isLoading]);

  const addToWishlist = (productId: string) => {
    setWishlist(prev => {
      const exists = prev.some(item => item.productId === productId);
      if (!exists) {
        return [...prev, { productId, addedAt: new Date() }];
      }
      return prev;
    });
  };

  const removeFromWishlist = (productId: string) => {
    setWishlist(prev => prev.filter(item => item.productId !== productId));
  };

  const toggleWishlist = (productId: string) => {
    setWishlist(prev => {
      const exists = prev.some(item => item.productId === productId);
      if (exists) {
        return prev.filter(item => item.productId !== productId);
      } else {
        return [...prev, { productId, addedAt: new Date() }];
      }
    });
  };

  const isInWishlist = (productId: string) => {
    return wishlist.some(item => item.productId === productId);
  };

  const clearWishlist = () => {
    setWishlist([]);
  };

  const wishlistCount = wishlist.length;

  return {
    wishlist,
    wishlistCount,
    isLoading,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    isInWishlist,
    clearWishlist
  };
}

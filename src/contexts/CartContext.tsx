import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { CartItem, Produit, Boutique } from '../lib/database.types';

const CART_STORAGE_KEY = 'ayamarket-cart';

interface CartContextType {
  items: CartItem[];
  addItem: (produit: Produit, boutique: Boutique) => void;
  removeItem: (produitId: string) => void;
  updateQuantity: (produitId: string, quantite: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  totalItems: 0,
  totalPrice: 0,
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      return savedCart ? JSON.parse(savedCart) as CartItem[] : [];
    } catch {
      localStorage.removeItem(CART_STORAGE_KEY);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Le panier reste utilisable en memoire si le stockage navigateur est indisponible.
    }
  }, [items]);

  const addItem = (produit: Produit, boutique: Boutique) => {
    setItems(prev => {
      const existing = prev.find(i => i.produit.id === produit.id);
      if (existing) {
        return prev.map(i =>
          i.produit.id === produit.id
            ? { ...i, quantite: Math.min(i.quantite + 1, produit.stock) }
            : i
        );
      }
      return [...prev, { produit, boutique, quantite: 1 }];
    });
  };

  const removeItem = (produitId: string) => {
    setItems(prev => prev.filter(i => i.produit.id !== produitId));
  };

  const updateQuantity = (produitId: string, quantite: number) => {
    if (quantite <= 0) {
      removeItem(produitId);
      return;
    }
    setItems(prev =>
      prev.map(i => i.produit.id === produitId ? { ...i, quantite: Math.min(quantite, i.produit.stock) } : i)
    );
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, i) => sum + i.quantite, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.produit.prix * i.quantite, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);

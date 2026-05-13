import { Home, Grid3x3 as Grid3X3, ShoppingBag, MessageCircle, User } from 'lucide-react';
import { useCart } from '../contexts/CartContext';

interface BottomNavProps {
  page: string;
  onNavigate: (page: string) => void;
}

export default function BottomNav({ page, onNavigate }: BottomNavProps) {
  const { totalItems } = useCart();

  const tabs = [
    { id: 'home', label: 'Accueil', icon: Home },
    { id: 'categories', label: 'Catégories', icon: Grid3X3 },
    { id: 'orders', label: 'Commandes', icon: ShoppingBag },
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'profile', label: 'Profil', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 bg-[#0f3d2e] border-t border-white/10 z-40 safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
      <div className="flex items-center justify-around h-16">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = page === tab.id;
          const showBadge = tab.id === 'orders' && totalItems > 0;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className="flex flex-col items-center justify-center flex-1 h-full gap-1 relative transition-all"
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-colors ${active ? 'text-[#EF9F27]' : 'text-white/60'}`}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 bg-[#EF9F27] text-[#0f3d2e] text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium transition-colors ${active ? 'text-[#EF9F27]' : 'text-white/60'}`}>
                {tab.label}
              </span>
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#EF9F27] rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

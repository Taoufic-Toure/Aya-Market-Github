import { User, LogOut, Settings, ShoppingBag, Store, ChevronRight, MapPin, Phone, Heart } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';

interface ProfilePageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export default function ProfilePage({ onNavigate }: ProfilePageProps) {
  const { user, signOut } = useAuth();
  const { showToast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    showToast('Deconnecte avec succes', 'info');
    onNavigate('home');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center pb-20 px-4">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <User className="w-10 h-10 text-gray-300" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Mon profil</h2>
        <p className="text-gray-500 text-sm text-center mb-6">Connectez-vous pour acceder a votre compte</p>
        <button onClick={() => onNavigate('auth')} className="btn-primary px-8 py-3 mb-3">
          Se connecter
        </button>
        <button onClick={() => onNavigate('auth', { mode: 'register-buyer' })} className="text-sm text-[#1D9E75] font-medium">
          Creer un compte
        </button>
      </div>
    );
  }

  const menus = [
    { icon: ShoppingBag, label: 'Mes commandes', action: () => onNavigate('orders') },
    { icon: Heart, label: 'Mes favoris', action: () => onNavigate('wishlist') },
    ...(user.role === 'vendeur' ? [{ icon: Store, label: 'Mon tableau de bord', action: () => onNavigate('vendeur-dashboard') }] : []),
    { icon: Settings, label: 'Parametres', action: () => showToast('Les parametres du compte arrivent bientot.', 'info') },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-br from-[#1D9E75] to-[#158a62] px-4 pt-12 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.nom} className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-white" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{user.nom}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user.role === 'vendeur' ? 'bg-[#EF9F27] text-white' : 'bg-white/20 text-white'}`}>
              {user.role === 'vendeur' ? 'Vendeur' : user.role === 'admin' ? 'Administrateur' : 'Acheteur'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4">
          {user.ville && (
            <div className="flex items-center gap-1 text-white/80 text-xs">
              <MapPin className="w-3 h-3" /> {user.ville}
            </div>
          )}
          {user.telephone && (
            <div className="flex items-center gap-1 text-white/80 text-xs">
              <Phone className="w-3 h-3" /> {user.telephone}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-5 space-y-3">
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          {menus.map((menu, i) => (
            <button
              key={i}
              onClick={menu.action}
              className="flex items-center gap-4 w-full px-4 py-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
            >
              <div className="w-9 h-9 rounded-xl bg-[#1D9E75]/10 flex items-center justify-center">
                <menu.icon className="w-4 h-4 text-[#1D9E75]" />
              </div>
              <span className="flex-1 text-sm font-medium text-gray-800 text-left">{menu.label}</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-4 w-full px-4 py-4 hover:bg-red-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <LogOut className="w-4 h-4 text-red-500" />
            </div>
            <span className="flex-1 text-sm font-medium text-red-500 text-left">Se deconnecter</span>
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">AyaMarket v1.0 - Le marche en ligne du Benin</p>
      </div>
    </div>
  );
}

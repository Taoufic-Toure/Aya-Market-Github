import type { ReactNode } from 'react';
import { ShieldAlert, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface GuardProps {
  children: ReactNode;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

/**
 * Protège une page qui nécessite une connexion.
 */
export function ProtectedPage({ children, onNavigate }: GuardProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Vérification de la session AyaMarket...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center mb-4">
          <User className="w-6 h-6 text-gray-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Connexion requise</h2>
        <p className="text-sm text-gray-600 text-center mb-5">
          Cette page est accessible seulement aux utilisateurs connectés.
        </p>
        <button className="btn-primary px-6 py-3" onClick={() => onNavigate('auth')}>
          Aller à la connexion
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Protège une page vendeur (bloque les acheteurs).
 */
export function SellerOnlyPage({ children, onNavigate }: GuardProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Chargement de votre espace vendeur...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center mb-4">
          <User className="w-6 h-6 text-gray-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Connexion requise</h2>
        <p className="text-sm text-gray-600 text-center mb-5">
          Connectez-vous avec un compte vendeur pour continuer.
        </p>
        <button className="btn-primary px-6 py-3" onClick={() => onNavigate('auth')}>
          Aller à la connexion
        </button>
      </div>
    );
  }

  if (user.role !== 'vendeur') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center mb-4">
          <ShieldAlert className="w-6 h-6 text-orange-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Accès réservé aux vendeurs</h2>
        <p className="text-sm text-gray-600 text-center mb-5">
          Votre compte acheteur ne peut pas ouvrir cet espace.
        </p>
        <button className="btn-primary px-6 py-3" onClick={() => onNavigate('home')}>
          Retour à l'accueil
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

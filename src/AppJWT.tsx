/** Application principale AyaMarket avec authentification JWT */

import { useState, useEffect } from 'react';
import { AuthProviderJWT } from './contexts/AuthContextJWT';
import { CartProvider } from './contexts/CartContext';
import { ToastProvider } from './contexts/ToastContext';
import { useAuth } from './hooks/useAuthJWT';
import Toast from './components/Toast';
import BottomNav from './components/BottomNav';
import HomePage from './pages/HomePage';
import AuthPageJWT from './pages/AuthPageJWT';
import VendorHomePage from './pages/vendor/VendorHomePage';
import WishlistPage from './pages/WishlistPage';
import ProfilePage from './pages/ProfilePage';

type Page = 'home' | 'vendor' | 'wishlist' | 'profile' | 'auth';

interface NavState {
  page: Page;
}

/** Routes émises par les pages (BottomNav, VendorHome, etc.) → pages JWT simplifiées */
const ROUTE_TO_PAGE: Record<string, Page> = {
  home: 'home',
  vendor: 'vendor',
  vendeur: 'vendor',
  wishlist: 'wishlist',
  profile: 'profile',
  auth: 'auth',
  categories: 'home',
  orders: 'home',
  chat: 'profile',
  'vendeur-produits': 'vendor',
  'vendeur-commandes': 'vendor',
  'vendeur-messages': 'vendor',
  'vendeur-conseils': 'vendor',
  'vendeur-dashboard': 'vendor',
};

function resolveNavPage(route: string): Page {
  return ROUTE_TO_PAGE[route] ?? 'home';
}

function AppJWTInner() {
  const [nav, setNav] = useState<NavState>({ page: 'home' });
  const { user, isAuthenticated, isLoading } = useAuth();

  const navigate = (page: Page) => {
    setNav({ page });
  };

  const navigateFromRoute = (page: string, _params?: Record<string, string>) => {
    setNav({ page: resolveNavPage(page) });
  };

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && user) {
      if (user.role === 'vendeur' && nav.page !== 'vendor') {
        setNav({ page: 'vendor' });
      } else if (user.role === 'acheteur' && nav.page === 'auth') {
        setNav({ page: 'home' });
      }
    } else if (!isAuthenticated && nav.page !== 'auth') {
      setNav({ page: 'auth' });
    }
  }, [isAuthenticated, user, nav.page, isLoading]);

  const renderPage = () => {
    if (nav.page === 'auth') {
      return (
        <AuthPageJWT
          onBack={() => navigate('home')}
          onSuccess={() => navigate('home')}
        />
      );
    }

    if (!isAuthenticated) {
      return (
        <AuthPageJWT
          onBack={() => navigate('home')}
          onSuccess={() => navigate('home')}
        />
      );
    }

    switch (nav.page) {
      case 'home':
        return <HomePage onNavigate={navigateFromRoute} />;
      case 'vendor':
        return <VendorHomePage onNavigate={navigateFromRoute} />;
      case 'wishlist':
        return <WishlistPage onNavigate={navigateFromRoute} />;
      case 'profile':
        return <ProfilePage onNavigate={navigateFromRoute} />;
      default:
        return <HomePage onNavigate={navigateFromRoute} />;
    }
  };

  const bottomNavPage =
    nav.page === 'profile' ? 'profile' : nav.page === 'wishlist' ? 'home' : 'home';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">AyaMarket - Votre marketplace béninoise</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {renderPage()}

      {isAuthenticated && (
        <BottomNav page={bottomNavPage} onNavigate={navigateFromRoute} />
      )}
    </div>
  );
}

export default function AppJWT() {
  return (
    <CartProvider>
      <ToastProvider>
        <AuthProviderJWT>
          <AppJWTInner />
          <Toast />
        </AuthProviderJWT>
      </ToastProvider>
    </CartProvider>
  );
}

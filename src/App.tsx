import { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { ToastProvider } from './contexts/ToastContext';
import { useAuth } from './hooks/useAuth';
import { useAuthRedirect } from './hooks/useAuthRedirect';
import { useToast } from './contexts/ToastContext';
import Toast from './components/Toast';
import BottomNav from './components/BottomNav';
import { ProtectedPage, SellerOnlyPage } from './components/auth/RouteGuards';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import ProductPage from './pages/ProductPage';
import BoutiquePage from './pages/BoutiquePage';
import CartPage from './pages/CartPage';
import OrdersPage from './pages/OrdersPage';
import OrderConfirmPage from './pages/OrderConfirmPage';
import OrderDetailPage from './pages/OrderDetailPage';
import ProfilePage from './pages/ProfilePage';
import ChatPage from './pages/ChatPage';
import CategoriesPage from './pages/CategoriesPage';
import CategoryProductsPage from './pages/CategoryProductsPage';
import VendorHomePage from './pages/vendor/VendorHomePage';
import VendorDashboard from './pages/vendor/VendorDashboard';
import VendorProducts from './pages/vendor/VendorProducts';
import VendorOrders from './pages/vendor/VendorOrders';
import VendorAdvice from './pages/vendor/VendorAdvice';
import VendorMessages from './pages/vendor/VendorMessages';
import WishlistPage from './pages/WishlistPage';
import { Download } from 'lucide-react';
import type { Categorie } from './lib/database.types';

type Page =
  | 'home' | 'categories' | 'category-products' | 'orders' | 'chat' | 'profile'
  | 'auth' | 'product' | 'boutique' | 'cart' | 'wishlist'
  | 'order-confirm' | 'order-detail'
  | 'vendeur' | 'vendeur-dashboard' | 'vendeur-produits' | 'vendeur-commandes'
  | 'vendeur-conseils' | 'vendeur-messages';

interface NavState {
  page: Page;
  params: Record<string, string>;
}

const VENDOR_PAGES: Page[] = ['vendeur', 'vendeur-dashboard', 'vendeur-produits', 'vendeur-commandes', 'vendeur-conseils', 'vendeur-messages'];

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function AppInner() {
  const [nav, setNav] = useState<NavState>({ page: 'home', params: {} });
  const [history, setHistory] = useState<NavState[]>([]);
  const [pendingRoute, setPendingRoute] = useState<NavState | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const { user, loading } = useAuth();
  const { showToast } = useToast();
  const { getLandingPage } = useAuthRedirect();

  const AUTH_REQUIRED_PAGES: Page[] = ['orders', 'chat', 'profile', ...VENDOR_PAGES];

  const setPage = (page: Page, params: Record<string, string> = {}, pushHistory = true) => {
    if (pushHistory) {
      setHistory((prev) => [...prev, nav]);
    }
    setNav({ page, params });
    window.scrollTo(0, 0);
  };

  const canAccess = (targetPage: Page) => {
    if (VENDOR_PAGES.includes(targetPage)) {
      if (!user) return { allowed: false, reason: 'auth' as const };
      if (user.role !== 'vendeur') return { allowed: false, reason: 'role' as const };
      return { allowed: true, reason: null };
    }

    if (AUTH_REQUIRED_PAGES.includes(targetPage) && !user) {
      return { allowed: false, reason: 'auth' as const };
    }

    return { allowed: true, reason: null };
  };

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams(window.location.search);
    const paymentOrderId = params.get('payment_order_id');
    if (!paymentOrderId) return;

    setPage('order-confirm', { id: paymentOrderId }, false);
    window.history.replaceState({}, '', window.location.pathname);
  }, [loading]);

  useEffect(() => {
    if (loading) return;

    // Quand l'utilisateur se connecte, on respecte d'abord la page demandée.
    if (user && pendingRoute) {
      const guard = canAccess(pendingRoute.page);
      if (guard.allowed) {
        setNav(pendingRoute);
      } else {
        setPage(getLandingPage(user.role), {}, false);
      }
      setPendingRoute(null);
      return;
    }

    // Redirection automatique depuis la page auth.
    if (user && nav.page === 'auth') {
      setPage(getLandingPage(user.role), {}, false);
      return;
    }

    // Si l'utilisateur se déconnecte, on bloque les pages protégées.
    if (!user && AUTH_REQUIRED_PAGES.includes(nav.page)) {
      setPage('auth', {}, false);
    }
  }, [user, loading, pendingRoute, nav.page]);

  const navigate = (page: string, params: Record<string, string> = {}) => {
    const targetPage = page as Page;
    const guard = canAccess(targetPage);

    if (!guard.allowed) {
      if (guard.reason === 'auth') {
        // On mémorise la page voulue pour y retourner après connexion.
        setPendingRoute({ page: targetPage, params });
        setPage('auth', {}, true);
        return;
      }
      if (guard.reason === 'role') {
        showToast("Cette page est réservée aux vendeurs.", 'error');
        setPage('home', {}, true);
        return;
      }
    }

    setPage(targetPage, params, true);
  };

  const goBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory(h => h.slice(0, -1));
      setNav(prev);
    } else {
      setNav({ page: 'home', params: {} });
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowInstall(false);
    setDeferredPrompt(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">AyaMarket - Votre marketplace béninoise</p>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (nav.page) {
      case 'home':
        return <HomePage onNavigate={navigate} />;
      case 'categories':
        return <CategoriesPage onNavigate={navigate} />;
      case 'category-products':
        return <CategoryProductsPage categorie={nav.params.categorie as Categorie} onNavigate={navigate} onBack={goBack} />;
      case 'auth':
        return <AuthPage onSuccess={() => undefined} onBack={goBack} defaultMode={nav.params.mode as 'login' | 'register-buyer' | 'register-seller' | undefined} />;
      case 'product':
        return <ProductPage produitId={nav.params.id} onNavigate={navigate} onBack={goBack} />;
      case 'boutique':
        return <BoutiquePage boutiqueId={nav.params.id} onNavigate={navigate} onBack={goBack} />;
      case 'cart':
        return <CartPage onNavigate={navigate} onBack={goBack} />;
      case 'orders':
        return (
          <ProtectedPage onNavigate={navigate}>
            <OrdersPage onNavigate={navigate} />
          </ProtectedPage>
        );
      case 'order-confirm':
        return <OrderConfirmPage commandeId={nav.params.id} onNavigate={navigate} />;
      case 'order-detail':
        return <OrderDetailPage commandeId={nav.params.id} onNavigate={navigate} onBack={goBack} />;
      case 'chat':
        return (
          <ProtectedPage onNavigate={navigate}>
            <ChatPage boutiqueId={nav.params.boutiqueId} onNavigate={navigate} onBack={goBack} />
          </ProtectedPage>
        );
      case 'profile':
        return (
          <ProtectedPage onNavigate={navigate}>
            <ProfilePage onNavigate={navigate} />
          </ProtectedPage>
        );
      case 'wishlist':
        return <WishlistPage onNavigate={navigate} />;
      case 'vendeur':
        return (
          <SellerOnlyPage onNavigate={navigate}>
            <VendorHomePage onNavigate={navigate} />
          </SellerOnlyPage>
        );
      case 'vendeur-dashboard':
        return (
          <SellerOnlyPage onNavigate={navigate}>
            <VendorDashboard onNavigate={navigate} />
          </SellerOnlyPage>
        );
      case 'vendeur-produits':
        return (
          <SellerOnlyPage onNavigate={navigate}>
            <VendorProducts onNavigate={navigate} onBack={goBack} />
          </SellerOnlyPage>
        );
      case 'vendeur-commandes':
        return (
          <SellerOnlyPage onNavigate={navigate}>
            <VendorOrders onBack={goBack} />
          </SellerOnlyPage>
        );
      case 'vendeur-conseils':
        return (
          <SellerOnlyPage onNavigate={navigate}>
            <VendorAdvice onBack={goBack} />
          </SellerOnlyPage>
        );
      case 'vendeur-messages':
        return (
          <SellerOnlyPage onNavigate={navigate}>
            <VendorMessages onBack={goBack} />
          </SellerOnlyPage>
        );
      default:
        return <HomePage onNavigate={navigate} />;
    }
  };

  const isVendorPage = VENDOR_PAGES.includes(nav.page);
  const showBottomNav = !isVendorPage && nav.page !== 'auth';

  const currentBottomTab = ['home', 'categories', 'chat', 'profile'].includes(nav.page)
    ? nav.page
    : ['orders', 'cart', 'order-confirm', 'order-detail', 'category-products'].includes(nav.page) ? 'orders' : 'home';

  return (
    <div className="max-w-md mx-auto relative min-h-screen bg-white">
      {renderPage()}
      {showBottomNav && (
        <BottomNav
          page={currentBottomTab}
          onNavigate={(p) => {
            if (p === 'orders') navigate('orders');
            else navigate(p);
          }}
        />
      )}
      {showInstall && (
        <div className="fixed top-4 left-4 right-4 bg-[#1D9E75] text-white rounded-2xl p-4 shadow-xl z-50 flex items-center gap-3">
          <Download className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold">Installer AyaMarket</p>
            <p className="text-xs text-white/80">Accédez à l'app depuis votre écran d'accueil</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowInstall(false)} className="text-xs text-white/60 hover:text-white">Plus tard</button>
            <button onClick={handleInstall} className="bg-white text-[#1D9E75] text-xs font-bold px-3 py-1.5 rounded-xl">Installer</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <AppInner />
          <Toast />
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

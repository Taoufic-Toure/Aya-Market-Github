/** Hook de redirection automatique selon le rôle pour AyaMarket JWT */

import { useEffect } from 'react';
import { useAuth } from './useAuthJWT';
import type { User as JwtUser } from '../contexts/AuthContextJWT';

interface UseAuthRedirectOptions {
  onAuthenticated?: (user: JwtUser) => void;
  onUnauthenticated?: () => void;
}

export function useAuthRedirect(options: UseAuthRedirectOptions = {}) {
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Ne rien faire pendant le chargement
    if (isLoading) return;

    // Si authentifié
    if (isAuthenticated && user) {
      options.onAuthenticated?.(user);
    }
    
    // Si non authentifié
    if (!isAuthenticated) {
      options.onUnauthenticated?.();
    }
  }, [isAuthenticated, user, isLoading, options]);

  return {
    user,
    isAuthenticated,
    isLoading,
    shouldRedirectToVendor: isAuthenticated && user?.role === 'vendeur',
    shouldRedirectToHome: isAuthenticated && user?.role === 'acheteur',
  };
}

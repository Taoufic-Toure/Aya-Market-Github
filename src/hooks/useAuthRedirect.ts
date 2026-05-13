import type { Role } from '../lib/database.types';

/**
 * Hook simple pour calculer la page d'arrivée après connexion.
 */
export function useAuthRedirect() {
  const getLandingPage = (role: Role | undefined): 'vendeur' | 'home' => {
    return role === 'vendeur' ? 'vendeur' : 'home';
  };

  return { getLandingPage };
}

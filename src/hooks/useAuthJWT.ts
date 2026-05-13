/** Hook d'accès au contexte d'authentification JWT */

import { useAuthJWT as useAuthContext } from '../contexts/AuthContextJWT';

/**
 * Hook d'accès au contexte d'authentification JWT.
 * On garde ce fichier séparé pour centraliser les imports dans les pages.
 */
export function useAuth() {
  return useAuthContext();
}

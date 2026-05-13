import { useAuth as useAuthContext } from '../contexts/AuthContext';

/**
 * Hook d'accès au contexte d'authentification.
 * On garde ce fichier séparé pour centraliser les imports dans les pages.
 */
export function useAuth() {
  return useAuthContext();
}

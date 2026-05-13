/** Contexte d'authentification JWT pour AyaMarket Backend FastAPI */

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

// Types pour l'authentification
export interface User {
  id: string;
  email: string;
  nom: string;
  ville: string;
  role: 'acheteur' | 'vendeur';
  actif: boolean;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

interface ApiErrorBody {
  detail?: string;
}

function isJwtUser(value: unknown): value is User {
  if (typeof value !== 'object' || value === null) return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.email === 'string' &&
    typeof o.nom === 'string' &&
    typeof o.ville === 'string' &&
    (o.role === 'acheteur' || o.role === 'vendeur') &&
    typeof o.actif === 'boolean' &&
    typeof o.created_at === 'string'
  );
}

export interface RegisterData {
  email: string;
  password: string;
  nom: string;
  ville: string;
  role: 'acheteur' | 'vendeur';
}

export interface LoginData {
  email: string;
  password: string;
}

// Contexte d'authentification
interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (data: LoginData) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider d'authentification
export function AuthProviderJWT({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // URL de l'API backend
  const API_URL = 'http://127.0.0.1:8000';

  // Charger le token et l'utilisateur depuis localStorage au montage
  useEffect(() => {
    const savedToken = localStorage.getItem('ayamarket_token');
    const savedUser = localStorage.getItem('ayamarket_user');

    if (savedToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser) as unknown;
        if (isJwtUser(parsed)) {
          setToken(savedToken);
          setUser(parsed);
        } else {
          localStorage.removeItem('ayamarket_token');
          localStorage.removeItem('ayamarket_user');
        }
      } catch (error) {
        console.error('Erreur parsing user:', error);
        localStorage.removeItem('ayamarket_token');
        localStorage.removeItem('ayamarket_user');
      }
    }
    setIsLoading(false);
  }, []);

  // Fonction de connexion
  const login = async (data: LoginData): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result: unknown = await response.json();

      if (!response.ok) {
        const err = result as ApiErrorBody;
        return {
          success: false,
          error: err.detail || 'Erreur de connexion',
        };
      }

      const body = result as LoginResponse;
      if (!body.access_token || !isJwtUser(body.user)) {
        return { success: false, error: 'Réponse serveur invalide' };
      }

      localStorage.setItem('ayamarket_token', body.access_token);
      localStorage.setItem('ayamarket_user', JSON.stringify(body.user));

      setToken(body.access_token);
      setUser(body.user);

      return { success: true };
    } catch (error) {
      console.error('Erreur login:', error);
      return { 
        success: false, 
        error: 'Erreur réseau. Veuillez réessayer.' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction d'inscription
  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result: unknown = await response.json();

      if (!response.ok) {
        const err = result as ApiErrorBody;
        return {
          success: false,
          error: err.detail || "Erreur d'inscription",
        };
      }

      // Connexion automatique après inscription
      const loginResult = await login({
        email: data.email,
        password: data.password
      });

      return loginResult;
    } catch (error) {
      console.error('Erreur register:', error);
      return { 
        success: false, 
        error: 'Erreur réseau. Veuillez réessayer.' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction de déconnexion
  const logout = () => {
    localStorage.removeItem('ayamarket_token');
    localStorage.removeItem('ayamarket_user');
    setToken(null);
    setUser(null);
  };

  // Vérifier si l'utilisateur est authentifié
  const isAuthenticated = !!token && !!user;

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook pour utiliser le contexte d'authentification
export function useAuthJWT() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthJWT doit être utilisé dans un AuthProviderJWT');
  }
  return context;
}

// Hook pour vérifier le token
export function useAuthToken() {
  const { token } = useAuthJWT();
  
  return {
    token,
    getAuthHeaders: () => ({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }),
  };
}

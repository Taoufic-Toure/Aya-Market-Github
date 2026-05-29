import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Role, User } from '../lib/database.types';

interface RegisterPayload {
  email: string;
  password: string;
  role: 'acheteur' | 'vendeur';
  nom: string;
  nomBoutique?: string;
  telephone?: string;
  ville: string;
}

interface AuthContextType {
  session: Session | null;
  authUser: SupabaseAuthUser | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ errorMessage: string | null }>;
  signUp: (payload: RegisterPayload) => Promise<{ errorMessage: string | null }>;
  signOut: () => Promise<{ errorMessage: string | null }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function cleanAuthError(message: string): string {
  // Traduction minimale des erreurs Supabase les plus courantes.
  if (message.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.';
  if (message.includes('User already registered')) return 'Cet email est déjà utilisé.';
  if (message.includes('Email not confirmed')) return 'Veuillez confirmer votre email avant de vous connecter.';
  return message;
}

function buildFallbackProfile(auth: SupabaseAuthUser): User {
  const metadata = auth.user_metadata ?? {};
  return {
    id: auth.id,
    email: auth.email ?? '',
    role: (metadata.role as Role | undefined) ?? 'acheteur',
    nom: (metadata.nom as string | undefined) ?? auth.email?.split('@')[0] ?? 'Utilisateur',
    telephone: (metadata.telephone as string | undefined) ?? null,
    ville: (metadata.ville as string | undefined) ?? 'Cotonou',
    avatar_url: (metadata.avatar_url as string | undefined) ?? null,
    langue_preferee: 'fr',
    created_at: auth.created_at ?? new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<SupabaseAuthUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string): Promise<User | null> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      return null;
    }
    return data;
  };

  const createProfileIfMissing = async (auth: SupabaseAuthUser): Promise<User | null> => {
    const existing = await fetchProfile(auth.id);
    if (existing) return existing;

    const payload = buildFallbackProfile(auth);

    const { data, error } = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) return null;
    return data;
  };

  const syncUser = async (currentAuthUser: SupabaseAuthUser | null) => {
    if (!currentAuthUser) {
      setUser(null);
      return;
    }
    const profile = await createProfileIfMissing(currentAuthUser);
    // Une session Supabase valide ne doit pas bloquer l'app si le profil public
    // n'est pas encore disponible apres inscription ou a cause d'une policy.
    setUser(profile ?? buildFallbackProfile(currentAuthUser));
  };

  const refreshUser = async () => {
    if (!authUser) return;
    const profile = await fetchProfile(authUser.id);
    setUser(profile ?? buildFallbackProfile(authUser));
  };

  const signIn = async (email: string, password: string): Promise<{ errorMessage: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { errorMessage: cleanAuthError(error.message) };
    }
    return { errorMessage: null };
  };

  const signUp = async (payload: RegisterPayload): Promise<{ errorMessage: string | null }> => {
    const { email, password, role, nom, nomBoutique, telephone, ville } = payload;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          nom,
          telephone: telephone ?? null,
          ville,
        },
      },
    });

    if (error) {
      return { errorMessage: cleanAuthError(error.message) };
    }

    // Création du profil immédiatement après inscription (si user disponible).
    if (data.user) {
      await createProfileIfMissing(data.user);

      // Pour un vendeur, on crée aussi une boutique de base si elle n'existe pas.
      if (role === 'vendeur' && nomBoutique) {
        const { data: existingShop } = await supabase
          .from('boutiques')
          .select('id')
          .eq('vendeur_id', data.user.id)
          .maybeSingle();

        if (!existingShop) {
          await supabase.from('boutiques').insert({
            vendeur_id: data.user.id,
            nom: nomBoutique,
            ville,
            telephone: telephone ?? '',
            actif: true,
            description: `Bienvenue chez ${nomBoutique} sur AyaMarket.`,
            logo_url: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400',
            cover_url: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1200',
            note_moyenne: 0,
            nb_ventes: 0,
          });
        }
      }
    }

    return { errorMessage: null };
  };

  const signOut = async (): Promise<{ errorMessage: string | null }> => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { errorMessage: cleanAuthError(error.message) };
    }
    setSession(null);
    setAuthUser(null);
    setUser(null);
    return { errorMessage: null };
  };

  useEffect(() => {
      const initSession = async () => {
        try {
          const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 5000)
          );
          const sessionPromise = supabase.auth.getSession();
          const { data } = await Promise.race([sessionPromise, timeout]) as any;
          setSession(data.session);
          setAuthUser(data.session?.user ?? null);
          await syncUser(data.session?.user ?? null);
        } catch {
          setSession(null);
          setAuthUser(null);
          setUser(null);
        } finally {
          setLoading(false);
        }
      };

      initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      setAuthUser(nextSession?.user ?? null);
      await syncUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      session,
      authUser,
      user,
      loading,
      signIn,
      signUp,
      signOut,
      refreshUser,
    }),
    [session, authUser, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur de AuthProvider.");
  }
  return context;
}

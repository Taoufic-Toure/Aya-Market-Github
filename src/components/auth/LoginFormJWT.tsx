/** Formulaire de connexion JWT pour AyaMarket */

import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuthJWT';

interface LoginFormJWTProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function LoginFormJWT({ onSuccess, onError }: LoginFormJWTProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      onError?.('Veuillez remplir tous les champs');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await login({ email, password });
      
      if (result.success) {
        onSuccess?.();
      } else {
        onError?.(result.error || 'Erreur de connexion');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email */}
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Adresse email"
          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
          disabled={isLoading}
          required
        />
      </div>

      {/* Mot de passe */}
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
          className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
          disabled={isLoading}
          required
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          disabled={isLoading}
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>

      {/* Bouton de connexion */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-[#1D9E75] text-white py-3 rounded-xl font-medium hover:bg-[#158a62] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Connexion...
          </>
        ) : (
          'Se connecter'
        )}
      </button>
    </form>
  );
}

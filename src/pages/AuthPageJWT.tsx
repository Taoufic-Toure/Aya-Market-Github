/** Page d'authentification JWT pour AyaMarket */

import { useState } from 'react';
import { ArrowLeft, User, ShoppingBag } from 'lucide-react';
import LoginFormJWT from '../components/auth/LoginFormJWT';
import RegisterFormJWT from '../components/auth/RegisterFormJWT';

// Types TypeScript propres
type Mode = 'login' | 'register';
type Role = 'acheteur' | 'vendeur';

interface AuthPageJWTProps {
  onBack: () => void;
  onSuccess?: () => void;
}

export default function AuthPageJWT({ onBack, onSuccess }: AuthPageJWTProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [role, setRole] = useState<Role>('acheteur');
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = () => {
    setError(null);
    onSuccess?.();
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    // Auto-clear après 5 secondes
    setTimeout(() => setError(null), 5000);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-4 pt-12 pb-6 bg-gradient-to-br from-[#1D9E75] to-[#158a62]">
        <button onClick={onBack} className="text-white/80 hover:text-white mb-6 flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Retour</span>
        </button>
        
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">AyaMarket</h1>
          <p className="text-white/80 text-sm mt-1">Le marché en ligne béninois</p>
        </div>
      </div>

      {/* Mode tabs */}
      {mode === 'register' ? (
        <div className="px-4 pt-4 pb-2">
          <div className="flex gap-2">
            <button
              onClick={() => setRole('acheteur')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                role === 'acheteur' 
                  ? 'border-[#1D9E75] bg-[#1D9E75]/5 text-[#1D9E75]' 
                  : 'border-gray-200 text-gray-500'
              }`}
            >
              <User className="w-4 h-4" />
              Acheteur
            </button>
            <button
              onClick={() => setRole('vendeur')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                role === 'vendeur' 
                  ? 'border-[#1D9E75] bg-[#1D9E75]/5 text-[#1D9E75]' 
                  : 'border-gray-200 text-gray-500'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              Vendeur
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 pt-4 pb-2">
          <div className="flex gap-2">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                mode === 'login' 
                  ? 'border-[#1D9E75] bg-[#1D9E75]/5 text-[#1D9E75]' 
                  : 'border-gray-200 text-gray-500'
              }`}
            >
              Connexion
            </button>
            <button
              onClick={() => setMode('register')}
              className="flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-all border-gray-200 text-gray-500"
            >
              Inscription
            </button>
          </div>
        </div>
      )}

      {/* Formulaire */}
      <div className="flex-1 px-4 py-6">
        {/* Message d'erreur */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-600 text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="max-w-md mx-auto">
          {mode === 'login' && (
            <LoginFormJWT onSuccess={handleSuccess} onError={handleError} />
          )}
          
          {mode === 'register' && (
            <RegisterFormJWT 
              onSuccess={handleSuccess} 
              onError={handleError}
              defaultRole={role}
            />
          )}
        </div>
      </div>
    </div>
  );
}

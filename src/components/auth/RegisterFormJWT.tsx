/** Formulaire d'inscription JWT pour AyaMarket */

import { useState } from 'react';
import { Mail, Lock, User, MapPin, Store, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuthJWT';

interface RegisterFormJWTProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  defaultRole?: 'acheteur' | 'vendeur';
}

export default function RegisterFormJWT({ onSuccess, onError, defaultRole = 'acheteur' }: RegisterFormJWTProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nom: '',
    ville: '',
    role: defaultRole as 'acheteur' | 'vendeur'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.email || !formData.password || !formData.nom || !formData.ville) {
      onError?.('Veuillez remplir tous les champs');
      return;
    }

    if (formData.password.length < 8) {
      onError?.('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      onError?.('Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await register({
        email: formData.email,
        password: formData.password,
        nom: formData.nom,
        ville: formData.ville,
        role: formData.role
      });
      
      if (result.success) {
        onSuccess?.();
      } else {
        onError?.(result.error || 'Erreur d\'inscription');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email */}
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          placeholder="Adresse email"
          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
          disabled={isLoading}
          required
        />
      </div>

      {/* Nom complet */}
      <div className="relative">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={formData.nom}
          onChange={(e) => handleInputChange('nom', e.target.value)}
          placeholder="Nom complet"
          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
          disabled={isLoading}
          required
        />
      </div>

      {/* Ville */}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={formData.ville}
          onChange={(e) => handleInputChange('ville', e.target.value)}
          placeholder="Ville"
          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
          disabled={isLoading}
          required
        />
      </div>

      {/* Rôle */}
      <div className="relative">
        <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <select
          value={formData.role}
          onChange={(e) => handleInputChange('role', e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent appearance-none bg-white"
          disabled={isLoading}
          required
        >
          <option value="acheteur">Acheteur</option>
          <option value="vendeur">Vendeur</option>
        </select>
      </div>

      {/* Mot de passe */}
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type={showPassword ? 'text' : 'password'}
          value={formData.password}
          onChange={(e) => handleInputChange('password', e.target.value)}
          placeholder="Mot de passe (min 8 caractères)"
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

      {/* Confirmation mot de passe */}
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type={showPassword ? 'text' : 'password'}
          value={formData.confirmPassword}
          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
          placeholder="Confirmer le mot de passe"
          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
          disabled={isLoading}
          required
        />
      </div>

      {/* Bouton d'inscription */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-[#1D9E75] text-white py-3 rounded-xl font-medium hover:bg-[#158a62] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Inscription...
          </>
        ) : (
          'S\'inscrire'
        )}
      </button>
    </form>
  );
}

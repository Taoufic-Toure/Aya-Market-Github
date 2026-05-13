import { ChevronDown, Eye, EyeOff } from 'lucide-react';

type RegisterMode = 'register-buyer' | 'register-seller';

interface RegisterFormData {
  email: string;
  password: string;
  nom: string;
  nomBoutique: string;
  telephone: string;
  ville: string;
}

interface RegisterFormProps {
  mode: RegisterMode;
  villes: string[];
  form: RegisterFormData;
  showPassword: boolean;
  loading: boolean;
  onChange: (field: keyof RegisterFormData, value: string) => void;
  onTogglePassword: () => void;
  onSubmit: () => void;
}

export default function RegisterForm({
  mode,
  villes,
  form,
  showPassword,
  loading,
  onChange,
  onTogglePassword,
  onSubmit,
}: RegisterFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Votre nom *</label>
        <input
          type="text"
          placeholder="Ex: Koffi Ahouansou"
          value={form.nom}
          onChange={(e) => onChange('nom', e.target.value)}
          className="input-field"
        />
      </div>

      {mode === 'register-seller' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la boutique *</label>
            <input
              type="text"
              placeholder="Ex: Mode Afrique Cotonou"
              value={form.nomBoutique}
              onChange={(e) => onChange('nomBoutique', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de téléphone *</label>
            <input
              type="tel"
              placeholder="Ex: +229 97 XX XX XX"
              value={form.telephone}
              onChange={(e) => onChange('telephone', e.target.value)}
              className="input-field"
            />
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
        <input
          type="email"
          placeholder="votre@email.com"
          value={form.email}
          onChange={(e) => onChange('email', e.target.value)}
          className="input-field"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Minimum 6 caractères"
            value={form.password}
            onChange={(e) => onChange('password', e.target.value)}
            className="input-field pr-10"
          />
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Ville *</label>
        <div className="relative">
          <select
            value={form.ville}
            onChange={(e) => onChange('ville', e.target.value)}
            className="input-field appearance-none pr-10"
          >
            {villes.map((ville) => (
              <option key={ville} value={ville}>
                {ville}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <button
        onClick={onSubmit}
        disabled={loading}
        className="w-full btn-primary py-4 text-base font-semibold mt-4 disabled:opacity-60"
      >
        {loading ? 'Inscription...' : 'Créer mon compte'}
      </button>
    </div>
  );
}

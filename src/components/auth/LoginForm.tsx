import { Eye, EyeOff } from 'lucide-react';

interface LoginFormData {
  email: string;
  password: string;
}

interface LoginFormProps {
  form: LoginFormData;
  showPassword: boolean;
  loading: boolean;
  onChange: (field: keyof LoginFormData, value: string) => void;
  onTogglePassword: () => void;
  onSubmit: () => void;
}

export default function LoginForm({
  form,
  showPassword,
  loading,
  onChange,
  onTogglePassword,
  onSubmit,
}: LoginFormProps) {
  return (
    <div className="space-y-4">
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

      <button
        onClick={onSubmit}
        disabled={loading}
        className="w-full btn-primary py-4 text-base font-semibold mt-4 disabled:opacity-60"
      >
        {loading ? 'Connexion...' : 'Se connecter'}
      </button>
    </div>
  );
}

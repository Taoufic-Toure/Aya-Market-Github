import { useState } from 'react';
import { Store, User, ArrowLeft } from 'lucide-react';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';

const VILLES = ['Cotonou', 'Porto-Novo', 'Parakou', 'Abomey-Calavi', 'Bohicon'];

type AuthMode = 'login' | 'register-buyer' | 'register-seller';

interface AuthPageProps {
  onSuccess: () => void;
  onBack: () => void;
  defaultMode?: AuthMode;
}

export default function AuthPage({ onSuccess, onBack, defaultMode = 'login' }: AuthPageProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const [form, setForm] = useState({
    email: '',
    password: '',
    nom: '',
    nomBoutique: '',
    telephone: '',
    ville: 'Cotonou',
  });

  const update = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleLogin = async () => {
    if (!form.email || !form.password) {
      showToast('Veuillez remplir tous les champs', 'error');
      return;
    }

    setLoading(true);
    const { errorMessage } = await signIn(form.email, form.password);
    if (errorMessage) {
      showToast(errorMessage, 'error');
    } else {
      showToast('Connexion réussie !', 'success');
      onSuccess();
    }

    setLoading(false);
  };

  const handleRegisterBuyer = async () => {
    if (!form.email || !form.password || !form.nom) {
      showToast('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }
    setLoading(true);
    const { errorMessage } = await signUp({
      email: form.email,
      password: form.password,
      role: 'acheteur',
      nom: form.nom,
      ville: form.ville,
    });

    if (errorMessage) {
      showToast(errorMessage, 'error');
    } else {
      showToast('Compte créé avec succès !', 'success');
      onSuccess();
    }

    setLoading(false);
  };

  const handleRegisterSeller = async () => {
    if (!form.email || !form.password || !form.nom || !form.nomBoutique || !form.telephone) {
      showToast('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }
    setLoading(true);
    const { errorMessage } = await signUp({
      email: form.email,
      password: form.password,
      role: 'vendeur',
      nom: form.nom,
      nomBoutique: form.nomBoutique,
      telephone: form.telephone,
      ville: form.ville,
    });

    if (errorMessage) {
      showToast(errorMessage, 'error');
    } else {
      showToast('Boutique créée avec succès !', 'success');
      onSuccess();
    }

    setLoading(false);
  };

  const handleSubmit = () => {
    if (mode === 'login') handleLogin();
    else if (mode === 'register-buyer') handleRegisterBuyer();
    else handleRegisterSeller();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-4 pt-12 pb-6 bg-gradient-to-br from-[#1D9E75] to-[#158a62]">
        <button onClick={onBack} className="text-white/80 hover:text-white mb-6 flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Retour</span>
        </button>
        <h1 className="text-2xl font-bold text-white">AyaMarket</h1>
        <p className="text-white/80 text-sm mt-1">Le marché en ligne béninois</p>
      </div>

      {/* Mode tabs */}
      {mode !== 'login' ? (
        <div className="px-4 pt-4 pb-2">
          <div className="flex gap-2">
            <button
              onClick={() => setMode('register-buyer')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border-2 transition-all ${mode === 'register-buyer' ? 'border-[#1D9E75] bg-[#1D9E75]/5 text-[#1D9E75]' : 'border-gray-200 text-gray-500'}`}
            >
              <User className="w-4 h-4" /> Acheteur
            </button>
            <button
              onClick={() => setMode('register-seller')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border-2 transition-all ${mode === 'register-seller' ? 'border-[#1D9E75] bg-[#1D9E75]/5 text-[#1D9E75]' : 'border-gray-200 text-gray-500'}`}
            >
              <Store className="w-4 h-4" /> Vendeur
            </button>
          </div>
        </div>
      ) : null}

      {/* Form */}
      <div className="flex-1 px-4 py-6 space-y-4 overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900">
          {mode === 'login' ? 'Connexion' : mode === 'register-buyer' ? 'Créer un compte acheteur' : 'Ouvrir ma boutique'}
        </h2>

        {mode === 'login' ? (
          <LoginForm
            form={{ email: form.email, password: form.password }}
            showPassword={showPassword}
            loading={loading}
            onChange={update}
            onTogglePassword={() => setShowPassword((v) => !v)}
            onSubmit={handleSubmit}
          />
        ) : (
          <RegisterForm
            mode={mode}
            villes={VILLES}
            form={form}
            showPassword={showPassword}
            loading={loading}
            onChange={update}
            onTogglePassword={() => setShowPassword((v) => !v)}
            onSubmit={handleSubmit}
          />
        )}

        <div className="text-center pt-2">
          {mode === 'login' ? (
            <p className="text-sm text-gray-600">
              Pas encore de compte ?{' '}
              <button onClick={() => setMode('register-buyer')} className="text-[#1D9E75] font-semibold">
                S'inscrire
              </button>
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              Déjà un compte ?{' '}
              <button onClick={() => setMode('login')} className="text-[#1D9E75] font-semibold">
                Se connecter
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

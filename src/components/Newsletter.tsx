import { Mail, Send } from 'lucide-react';
import { useState } from 'react';

interface NewsletterProps {
  onSubscribe?: (email: string) => void;
  className?: string;
}

export default function Newsletter({ onSubscribe, className = '' }: NewsletterProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Veuillez entrer votre adresse email');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Veuillez entrer une adresse email valide');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onSubscribe?.(email);
      setIsSubscribed(true);
      setEmail('');
      
      // Reset after 3 seconds
      setTimeout(() => {
        setIsSubscribed(false);
      }, 3000);
    } catch (err) {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`bg-gradient-to-r from-[#1D9E75] to-[#16a34a] rounded-2xl p-6 text-white ${className}`}>
      <div className="max-w-md mx-auto text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-white/20 rounded-full p-3 backdrop-blur-sm">
            <Mail className="w-6 h-6" />
          </div>
        </div>
        
        <h3 className="text-xl font-bold mb-2">
          Recevoir les meilleures offres
        </h3>
        
        <p className="text-white/90 text-sm mb-6">
          Inscrivez-vous à notre newsletter pour ne manquer aucune promotion et nouveauté
        </p>
        
        {!isSubscribed ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Entrez votre adresse email"
                className="w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all duration-200"
                disabled={isLoading}
              />
              {error && (
                <p className="absolute -bottom-6 left-0 right-0 text-xs text-red-200">
                  {error}
                </p>
              )}
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white text-[#1D9E75] font-semibold px-4 py-3 rounded-xl hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
                  <span>Inscription...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>S'inscrire</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="text-center py-4">
            <div className="bg-white/20 rounded-full p-3 inline-flex mb-3">
              <Mail className="w-6 h-6" />
            </div>
            <h4 className="font-semibold mb-1">Inscription réussie !</h4>
            <p className="text-white/90 text-sm">
              Merci de vous être inscrit. Vérifiez votre boîte de réception.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

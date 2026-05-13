import { useState } from 'react';

export function useNewsletter() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscribe = async (email: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Simuler un appel API - remplacer par vrai appel
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'inscription');
      }

      // Sauvegarder l'email dans localStorage pour éviter les doublons
      const subscribedEmails = JSON.parse(localStorage.getItem('subscribed-emails') || '[]');
      if (!subscribedEmails.includes(email)) {
        subscribedEmails.push(email);
        localStorage.setItem('subscribed-emails', JSON.stringify(subscribedEmails));
      }

      setIsSubscribed(true);
      
      // Reset après 5 secondes
      setTimeout(() => {
        setIsSubscribed(false);
      }, 5000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const isAlreadySubscribed = (email: string): boolean => {
    const subscribedEmails = JSON.parse(localStorage.getItem('subscribed-emails') || '[]');
    return subscribedEmails.includes(email);
  };

  return {
    subscribe,
    isSubscribed,
    isLoading,
    error,
    isAlreadySubscribed
  };
}

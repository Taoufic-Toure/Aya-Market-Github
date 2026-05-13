// Exemples d'utilisation des API Aya de BeninMarket en React/Vite
// Copiez ces fonctions dans vos composants React

// Configuration de base
const API_BASE_URL = 'http://localhost:8000'; // Adapter selon votre configuration

// Fonction utilitaire pour les requêtes API
const apiRequest = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `Erreur HTTP: ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error('Erreur API:', error);
    throw error;
  }
};

// 1. Service de Chat avec Aya (Groq Llama 3.3)
export const chatWithAya = async (message) => {
  const response = await apiRequest('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
  
  return response.response; // Texte de la réponse de Aya
};

// Exemple d'utilisation dans un composant React:
/*
import { useState } from 'react';
import { chatWithAya } from './frontend-ai-examples';

function ChatComponent() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChat = async () => {
    if (!message.trim()) return;
    
    setLoading(true);
    try {
      const aiResponse = await chatWithAya(message);
      setResponse(aiResponse);
    } catch (error) {
      setResponse(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Votre message..."
      />
      <button onClick={handleChat} disabled={loading}>
        {loading ? 'Envoi...' : 'Envoyer'}
      </button>
      {response && <p>{response}</p>}
    </div>
  );
}
*/

// 2. Service Conseiller Vendeur avec Gemini 2.0 Flash
export const getBusinessAdvice = async (businessType, question) => {
  const response = await apiRequest('/ai/advisor', {
    method: 'POST',
    body: JSON.stringify({
      business_type: businessType,
      question: question,
    }),
  });
  
  return response.response; // Conseils business
};

// Exemple d'utilisation:
/*
import { useState } from 'react';
import { getBusinessAdvice } from './frontend-ai-examples';

function AdvisorComponent() {
  const [businessType, setBusinessType] = useState('vente de tissus');
  const [question, setQuestion] = useState('');
  const [advice, setAdvice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGetAdvice = async () => {
    if (!question.trim()) return;
    
    setLoading(true);
    try {
      const adviceResponse = await getBusinessAdvice(businessType, question);
      setAdvice(adviceResponse);
    } catch (error) {
      setAdvice(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        value={businessType}
        onChange={(e) => setBusinessType(e.target.value)}
        placeholder="Type de business..."
      />
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Votre question..."
      />
      <button onClick={handleGetAdvice} disabled={loading}>
        {loading ? 'Analyse...' : 'Obtenir des conseils'}
      </button>
      {advice && <div>{advice}</div>}
    </div>
  );
}
*/

// 3. Service Transcription Audio avec Groq Whisper
export const transcribeAudio = async (audioFile, language = null) => {
  const formData = new FormData();
  formData.append('audio_file', audioFile);
  
  if (language) {
    formData.append('language', language);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/ai/transcribe`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `Erreur HTTP: ${response.status}`);
    }
    
    return data.response; // Texte transcrit
  } catch (error) {
    console.error('Erreur transcription:', error);
    throw error;
  }
};

// Exemple d'utilisation:
/*
import { useState } from 'react';
import { transcribeAudio } from './frontend-ai-examples';

function TranscriptionComponent() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileSelect = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleTranscribe = async () => {
    if (!selectedFile) return;
    
    setLoading(true);
    try {
      const text = await transcribeAudio(selectedFile, 'fr'); // 'fr', 'fon', ou 'yo'
      setTranscription(text);
    } catch (error) {
      setTranscription(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input type="file" accept="audio/*" onChange={handleFileSelect} />
      <button onClick={handleTranscribe} disabled={loading || !selectedFile}>
        {loading ? 'Transcription...' : 'Transcrire'}
      </button>
      {transcription && (
        <div>
          <h3>Transcription:</h3>
          <p>{transcription}</p>
        </div>
      )}
    </div>
  );
}
*/

// 4. Service Recherche Intelligente avec Mistral
export const intelligentSearch = async (query, category = null, location = null) => {
  const response = await apiRequest('/ai/search', {
    method: 'POST',
    body: JSON.stringify({
      query: query,
      category: category,
      location: location,
    }),
  });
  
  return response.response; // Résultats de recherche optimisés
};

// Exemple d'utilisation:
/*
import { useState } from 'react';
import { intelligentSearch } from './frontend-ai-examples';

function SearchComponent() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [results, setResults] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const searchResults = await intelligentSearch(query, category, location);
      setResults(searchResults);
    } catch (error) {
      setResults(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Que recherchez-vous ?"
      />
      <input
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="Catégorie (optionnel)"
      />
      <input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Localisation (optionnel)"
      />
      <button onClick={handleSearch} disabled={loading}>
        {loading ? 'Recherche...' : 'Rechercher'}
      </button>
      {results && (
        <div>
          <h3>Résultats:</h3>
          <div>{results}</div>
        </div>
      )}
    </div>
  );
}
*/

// 5. Hook personnalisé pour la gestion des erreurs
export const useAIRequest = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const executeRequest = async (requestFunction, ...args) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await requestFunction(...args);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { executeRequest, loading, error };
};

// Exemple d'utilisation du hook:
/*
import { useState } from 'react';
import { chatWithAI, useAIRequest } from './frontend-ai-examples';

function ChatWithHook() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const { executeRequest, loading, error } = useAIRequest();

  const handleChat = async () => {
    if (!message.trim()) return;
    
    try {
      const aiResponse = await executeRequest(chatWithAI, message);
      setResponse(aiResponse);
    } catch (err) {
      // L'erreur est déjà gérée par le hook
    }
  };

  return (
    <div>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Votre message..."
      />
      <button onClick={handleChat} disabled={loading}>
        {loading ? 'Envoi...' : 'Envoyer'}
      </button>
      {error && <div style={{color: 'red'}}>Erreur: {error}</div>}
      {response && <p>{response}</p>}
    </div>
  );
}
*/

export default {
  chatWithAI,
  getBusinessAdvice,
  transcribeAudio,
  intelligentSearch,
  useAIRequest,
};

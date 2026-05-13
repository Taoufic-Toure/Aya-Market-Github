/**
 * Service API pour communiquer avec le backend AyaMarket
 *
 * Ce service remplace les appels directs à l'API Google Gemini
 * par des appels au backend FastAPI pour plus de sécurité.
 */

import { trimHistoryForAdvisor } from './ayaVendorChat';
import type { ChatTurn } from './ayaVendorChat';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export type AdvisorChatTurn = ChatTurn;

interface AdvisorLegacyBody {
  business_type?: string;
  question: string;
}

interface AdvisorChatBody {
  business_type?: string;
  message: string;
  history: ChatTurn[];
  vendor_context?: string;
  memory_hint?: string;
}

interface AIResponse {
  success: boolean;
  response: string;
}

interface ChatRequest {
  message: string;
}

interface ApiErrorJson {
  error?: string;
}

/**
 * Demande des conseils business à Aya via le backend
 * 
 * @param businessType - Type d'activité du vendeur
 * @param question - Question du vendeur
 * @returns Réponse de Aya
 * @throws Error si la requête échoue
 */
export async function askAyaAdvisor(
  businessType: string | undefined,
  question: string
): Promise<string> {
  const requestBody: AdvisorLegacyBody = {
    business_type: businessType,
    question: question
  };

  try {
    const response = await fetch(`${API_URL}/ai/advisor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ApiErrorJson;
      throw new Error(
        errorData.error || `Erreur HTTP ${response.status}: ${response.statusText}`
      );
    }

    const data: AIResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.response || 'Réponse invalide du service Aya');
    }

    return data.response;
  } catch (error) {
    console.error('Erreur lors de l\'appel à Aya Advisor:', error);
    throw error;
  }
}

/**
 * Conseiller vendeur avec historique réduit (tokens) — backend applique un second trim.
 */
export async function askAyaAdvisorChat(input: {
  businessType?: string;
  message: string;
  history: AdvisorChatTurn[];
  vendorContext?: string;
  memoryHint?: string;
}): Promise<string> {
  const trimmed = trimHistoryForAdvisor(input.history);
  const requestBody: AdvisorChatBody = {
    business_type: input.businessType,
    message: input.message,
    history: trimmed,
    vendor_context: input.vendorContext,
    memory_hint: input.memoryHint,
  };

  try {
    const response = await fetch(`${API_URL}/ai/advisor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ApiErrorJson;
      throw new Error(
        errorData.error || `Erreur HTTP ${response.status}: ${response.statusText}`
      );
    }

    const data: AIResponse = await response.json();

    if (!data.success) {
      throw new Error(data.response || 'Réponse invalide du service Aya');
    }

    return data.response;
  } catch (error) {
    console.error("Erreur lors de l'appel à Aya Advisor (chat structuré):", error);
    throw error;
  }
}

/**
 * Chat avec Aya via le backend
 * 
 * @param message - Message de l'utilisateur
 * @returns Réponse de Aya
 * @throws Error si la requête échoue
 */
export async function chatWithAya(message: string): Promise<string> {
  const requestBody: ChatRequest = {
    message: message
  };

  try {
    const response = await fetch(`${API_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ApiErrorJson;
      throw new Error(
        errorData.error || `Erreur HTTP ${response.status}: ${response.statusText}`
      );
    }

    const data: AIResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.response || 'Réponse invalide du chat Aya');
    }

    return data.response;
  } catch (error) {
    console.error('Erreur lors du chat avec Aya:', error);
    throw error;
  }
}

/**
 * Demande une analyse business JSON structurée à Aya
 *
 * @param businessType - Type d'activité
 * @param venteData - Données de vente formatées
 * @returns Analyse structurée en JSON
 * @throws Error si la requête échoue
 */
export async function askAyaForAnalysis<T>(
  businessType: string,
  venteData: string
): Promise<T> {
  const dataBlock = venteData.length > 3800 ? `${venteData.slice(0, 3797)}...` : venteData;
  const compactQuestion =
    'Réponds UNIQUEMENT par un JSON valide (français): {resume,points_forts[],points_faibles[],conseils[{titre,description,impact:fort|moyen|faible}],opportunite_du_mois}. Données: ' +
    dataBlock;

  try {
    const response = await fetch(`${API_URL}/ai/advisor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        business_type: businessType,
        question: compactQuestion,
      }),
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}`);
    }

    const data: AIResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.response);
    }

    // Extraction du JSON depuis la réponse texte
    const jsonMatch = data.response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Aucun JSON trouvé dans la réponse');
    }

    return JSON.parse(jsonMatch[0]) as T;
  } catch (error) {
    console.error('Erreur lors de l\'analyse Aya:', error);
    throw error;
  }
}

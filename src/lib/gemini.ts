interface GeminiMessage {
  role: 'user' | 'model';
  content: string;
}

interface GeminiRequestOptions {
  systemInstruction: string;
  messages: GeminiMessage[];
}

const GEMINI_MODEL = 'gemini-2.5-flash';

function getGeminiApiKey(): string {
  // Vite injecte les variables préfixées par VITE_ depuis .env.
  const key = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim();
  if (!key) {
    throw new Error('Clé API Gemini manquante (VITE_GEMINI_API_KEY).');
  }
  return key;
}

interface GeminiPayload {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string; status?: string };
  promptFeedback?: { blockReason?: string };
}

function extractTextFromGeminiResponse(payload: GeminiPayload): string {
  return payload.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

function extractJsonString(rawText: string): string {
  const clean = rawText.trim();
  if (clean.startsWith('{') || clean.startsWith('[')) return clean;

  // On récupère le premier bloc JSON valide si le modèle a ajouté du texte autour.
  const match = clean.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  return match ? match[0] : clean;
}

async function callGemini({
  systemInstruction,
  messages,
}: GeminiRequestOptions): Promise<string> {
  // On construit un prompt unique pour respecter exactement le format demandé.
  const history = messages
    .map((message) => `${message.role === 'model' ? 'assistant' : 'user'}: ${message.content}`)
    .join('\n');
  const prompt = `${systemInstruction}\n\n${history}`;

  // Appel Gemini EXACT demandé par l'utilisateur.
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );
  const payload = (await response.json()) as GeminiPayload;

  if (!response.ok) {
    const apiMessage =
      payload.error?.message ??
      payload.error?.status ??
      `Erreur HTTP ${response.status}`;
    throw new Error(`Erreur Gemini: ${apiMessage}`);
  }

  if (!payload.candidates?.length) {
    const blockReason =
      payload.promptFeedback?.blockReason ||
      'Réponse Gemini bloquée ou vide.';
    throw new Error(`Gemini n'a pas renvoyé de contenu: ${blockReason}`);
  }

  const text = extractTextFromGeminiResponse(payload);
  if (!text) throw new Error('Réponse Gemini vide.');
  return text;
}

export async function askGeminiText(
  systemInstruction: string,
  messages: GeminiMessage[]
): Promise<string> {
  return callGemini({ systemInstruction, messages });
}

export async function askGeminiJson<T>(
  systemInstruction: string,
  messages: GeminiMessage[]
): Promise<T> {
  try {
    const rawText = await callGemini({ systemInstruction, messages });
    const jsonString = extractJsonString(rawText);
    return JSON.parse(jsonString) as T;
  } catch {
    // Fallback: on retente un parsing JSON simple.
    const rawText = await callGemini({ systemInstruction, messages });
    const jsonString = extractJsonString(rawText);
    return JSON.parse(jsonString) as T;
  }
}

export function getGeminiModelName(): string {
  return GEMINI_MODEL;
}

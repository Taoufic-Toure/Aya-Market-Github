// URL WebSocket du backend AyaMarket.
// Ne pas reutiliser VITE_API_URL ici : HTTP et WebSocket ont des schemes differents.
export const WS_URL = (import.meta.env.VITE_WS_URL || 'ws://localhost:8000').replace(/\/$/, '');

export function buildWsUrl(path = ''): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${WS_URL}${normalizedPath}`;
}

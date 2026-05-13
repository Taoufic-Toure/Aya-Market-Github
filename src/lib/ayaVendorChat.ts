/**
 * Prompts et logique locale pour Aya (conseillère vendeur AyaMarket).
 * Mémoire conversationnelle : `MAX_HISTORY_MESSAGES`, filtrage bruit, contexte compact pour l'API `/ai/advisor`.
 */

export type VendorIntent = 'prix' | 'stock' | 'vente' | 'promo' | 'commande' | 'livraison' | 'general';

export interface ProductBrief {
  nom: string;
  prix: number;
  stock: number;
  nb_ventes: number;
  categorie: string;
  seuil_alerte: number;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

const INTENT_PATTERNS: { intent: VendorIntent; re: RegExp }[] = [
  { intent: 'prix', re: /\b(prix|fcfa|tarif|marge|bénéfice|benefice|moins cher|discount|rabais|promo code)\b/i },
  { intent: 'stock', re: /\b(stock|rupture|quantité|quantite|inventaire|approvision|commander aux)\b/i },
  { intent: 'vente', re: /\b(vente|vendre|client|acheteur|chiffre|ca\b|conversion|panier)\b/i },
  { intent: 'promo', re: /\b(promo|publicité|whatsapp|facebook|réseau|reseau|story|flyer)\b/i },
  { intent: 'commande', re: /\b(commande|livraison partielle|annul|rembourse|fedapay|moov|mtn|paiement)\b/i },
  { intent: 'livraison', re: /\b(livraison|transport|gbé|gbe|zem|motokolo|cotonou|porto|parakou|calavi)\b/i },
];

export function detectVendorIntent(text: string): VendorIntent {
  const t = text.trim();
  for (const { intent, re } of INTENT_PATTERNS) {
    if (re.test(t)) return intent;
  }
  return 'general';
}

/** Priorise : stock critique, rupture, best-sellers (pour conseils ciblés, peu de tokens). */
export function rankProductsForAdvisor(products: ProductBrief[], limit = 6): ProductBrief[] {
  if (!products.length) return [];
  const scored = products.map((p) => {
    let score = p.nb_ventes * 3;
    if (p.stock === 0) score += 80;
    else if (p.stock <= p.seuil_alerte) score += 60;
    if (p.prix > 0 && p.stock > 5) score += 5;
    return { p, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const out: ProductBrief[] = [];
  for (const { p } of scored) {
    const key = p.nom.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}

export function formatProductDigestLines(products: ProductBrief[], maxLineLen = 72): string {
  return products
    .map((p) => {
      const flag = p.stock === 0 ? 'RUPTURE' : p.stock <= p.seuil_alerte ? 'STOCK_BAS' : 'OK';
      const nom = p.nom.length > maxLineLen ? `${p.nom.slice(0, maxLineLen - 1)}…` : p.nom;
      return `${nom} | ${Math.round(p.prix)} FCFA | stk ${p.stock} | V${p.nb_ventes} | ${p.categorie} | ${flag}`;
    })
    .join('\n');
}

/** Plafond d'échanges utiles envoyés au backend (aligné FastAPI `MAX_HISTORY_MESSAGES`). */
export const MAX_HISTORY_MESSAGES = 10;

export function isNoiseUserMessage(content: string, priorUsefulCount: number): boolean {
  const text = content.trim();
  if (!text) return true;
  if (text.length > 120) return false;
  const t = text.toLowerCase();
  if (/^(ok|okay|d['’]accord|merci|thanks?|thank you|super|parfait|nickel|top|génial|genial|👍|🙏)\s*\.{0,3}$/i.test(t)) return true;
  if (/^(bonjour|bonsoir|salut|coucou|hello|hey|yo)\b/i.test(t) && t.length < 28 && priorUsefulCount >= 2) return true;
  return false;
}

/** Filtre le bruit puis `slice(-MAX_HISTORY_MESSAGES)` — même logique que le backend. */
export function trimHistoryForAdvisor(turns: ChatTurn[]): ChatTurn[] {
  const useful: ChatTurn[] = [];
  for (const m of turns) {
    if (m.role !== 'user' && m.role !== 'assistant') continue;
    const prior = useful.length;
    if (m.role === 'user' && isNoiseUserMessage(m.content, prior)) continue;
    useful.push(m);
  }
  return useful.slice(-MAX_HISTORY_MESSAGES);
}

export function extractMemoryHintFromHistory(turns: ChatTurn[]): string {
  const blob = turns
    .filter((t) => t.role === 'user')
    .map((t) => t.content)
    .join(' | ');
  const parts: string[] = [];
  const budget =
    blob.match(/\b\d{1,3}(\s?\d{3})*\s*(fcfa|f\b|cfa)\b/i) ?? blob.match(/budget\s*.{0,40}/i);
  if (budget) parts.push(`Somme/budget: ${budget[0].replace(/\s+/g, ' ').slice(0, 72)}`);
  if (/whatsapp/i.test(blob)) parts.push('Canal: WhatsApp');
  if (/livraison|zem|gbé|gbegni|motokolo/i.test(blob)) parts.push('Livraison');
  return parts.slice(0, 3).join(' · ').slice(0, 450);
}

export function mergeMemoryHints(prev: string, next: string, maxLen = 450): string {
  const n = next.trim();
  if (!n) return prev.trim();
  const p = prev.trim();
  if (!p) return n.slice(0, maxLen);
  return `${p} · ${n}`.slice(0, maxLen);
}

export interface VendorContextParams {
  userMessage: string;
  boutiqueName?: string;
  ville?: string;
  salesBrief?: string;
  products: ProductBrief[];
}

export function buildVendorContextBlock(p: VendorContextParams): string {
  const intent = detectVendorIntent(p.userMessage);
  const ranked = rankProductsForAdvisor(p.products, 6);
  const catalog = ranked.length ? formatProductDigestLines(ranked) : '(aucun produit chargé)';
  const boutique = [p.boutiqueName, p.ville].filter(Boolean).join(' · ') || 'boutique';
  const brief = p.salesBrief?.slice(0, 260) || 'non renseigné';
  return `INTENTION:${intent}
BOUTIQUE:${boutique}
SYNTHÈSE:${brief}
CATALOGUE:
${catalog}`.trim();
}

/** Suggestions dynamiques (remplissent l’input / actions rapides). */
export function buildSuggestionChips(products: ProductBrief[]): string[] {
  const base = [
    'Comment augmenter mes ventes cette semaine ?',
    'Quel message WhatsApp pour un client hésitant ?',
    'Idée promo simple sans baisser trop les marges',
  ];
  if (!products.length) return base;

  const ranked = rankProductsForAdvisor(products, 12);
  const low = ranked.find((p) => p.stock > 0 && p.stock <= p.seuil_alerte);
  const out = ranked.find((p) => p.stock === 0);
  const star = [...products].sort((a, b) => b.nb_ventes - a.nb_ventes)[0];

  const extra: string[] = [];
  if (low) extra.push(`Que faire pour le stock bas sur « ${truncate(low.nom, 28)} » ?`);
  if (out) extra.push(`Que proposer à la place de « ${truncate(out.nom, 28)} » en rupture ?`);
  if (star && star.nb_ventes > 0) extra.push(`Comment exploiter mon best-seller « ${truncate(star.nom, 28)} » ?`);

  return [...extra, ...base].filter((s, i, a) => a.indexOf(s) === i).slice(0, 6);
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}

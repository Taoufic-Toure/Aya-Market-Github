import { useState, useEffect, useRef } from 'react';
import { Brain, TrendingUp, AlertTriangle, Lightbulb, ArrowLeft, Send, Mic, MicOff, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { askAyaAdvisorChat, askAyaForAnalysis } from '../../lib/aiApi';
import {
  buildSuggestionChips,
  buildVendorContextBlock,
  extractMemoryHintFromHistory,
  MAX_HISTORY_MESSAGES,
  mergeMemoryHints,
  trimHistoryForAdvisor,
  type ProductBrief,
} from '../../lib/ayaVendorChat';
import AyaTypingIndicator from '../../components/vendor/AyaTypingIndicator';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';

interface AnalyseResult {
  resume: string;
  points_forts: string[];
  points_faibles: string[];
  conseils: { titre: string; description: string; impact: 'fort' | 'moyen' | 'faible' }[];
  opportunite_du_mois: string;
}

interface ChatMsg { role: 'user' | 'assistant'; content: string }

interface VendorAdviceProps {
  onBack: () => void;
}

const IMPACT_COLORS = { fort: 'text-[#1D9E75] bg-[#1D9E75]/10', moyen: 'text-[#EF9F27] bg-[#EF9F27]/10', faible: 'text-gray-500 bg-gray-100' };

export default function VendorAdvice({ onBack }: VendorAdviceProps) {
  const [analyse, setAnalyse] = useState<AnalyseResult | null>(null);
  const [loadingAnalyse, setLoadingAnalyse] = useState(false);
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const produitsRef = useRef<ProductBrief[]>([]);
  const salesBriefRef = useRef('');
  const memoryHintRef = useRef('');
  const [ayaChips, setAyaChips] = useState<string[]>(() => buildSuggestionChips([]));
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMsgs, chatLoading]);

  /** Contexte compact pour Aya (sans toucher au flux analyse existant). */
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data: boutique } = await supabase.from('boutiques').select('id, nom, ville').eq('vendeur_id', user.id).maybeSingle();
      if (!boutique || cancelled) return;
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      const { data: commandesData } = await supabase
        .from('commandes')
        .select('montant_total, statut, created_at, lignes_commande!inner(boutique_id)')
        .eq('lignes_commande.boutique_id', boutique.id)
        .gte('created_at', monthAgo.toISOString());
      const { data: produits } = await supabase
        .from('produits')
        .select('nom, prix, stock, nb_ventes, categorie, seuil_alerte')
        .eq('boutique_id', boutique.id)
        .eq('actif', true);
      if (cancelled) return;
      type CmdLite = { montant_total: number; statut: string };
      const commandes = (commandesData ?? []) as CmdLite[];
      const actives = commandes.filter((c) => c.statut !== 'annulee');
      const earned = actives.reduce((s, c) => s + c.montant_total, 0);
      const att = commandes.filter((c) => c.statut === 'en_attente').length;
      const plist = produits || [];
      produitsRef.current = plist.map((p) => ({
        nom: p.nom,
        prix: p.prix,
        stock: p.stock,
        nb_ventes: p.nb_ventes,
        categorie: p.categorie,
        seuil_alerte: p.seuil_alerte,
      }));
      salesBriefRef.current = `${boutique.nom}|${boutique.ville}|30j:${actives.length}cmd|${Math.round(earned)}FCFA|att:${att}`;
      setAyaChips(buildSuggestionChips(produitsRef.current));
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const generateAnalyse = async () => {
    setLoadingAnalyse(true);
    const { data: boutique } = await supabase.from('boutiques').select('*').eq('vendeur_id', user!.id).maybeSingle();
    if (!boutique) { setLoadingAnalyse(false); return; }

    const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);
    const { data: commandes } = await supabase.from('commandes').select('montant_total, statut, created_at').gte('created_at', monthAgo.toISOString());
    const { data: produits } = await supabase.from('produits').select('nom, prix, stock, nb_ventes, note_moyenne').eq('boutique_id', boutique.id).eq('actif', true);

    const commandesActives = commandes?.filter(c => c.statut !== 'annulee') || [];
    const totalVentes = commandesActives.reduce((s, c) => s + c.montant_total, 0);
    const venteData = `Boutique: ${boutique.nom}, Ville: ${boutique.ville}, Ventes 30j: ${commandesActives.length} commandes, Revenu: ${totalVentes} FCFA, Produits: ${JSON.stringify(produits?.slice(0, 10))}`;

    try {
      // Appel au backend Aya pour l'analyse business
      const json = await askAyaForAnalysis<AnalyseResult>(
        boutique.nom || 'Commerce',
        venteData
      );
      setAnalyse(json);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      showToast(`Erreur lors de la génération: ${message}`, 'error');
    }
    setLoadingAnalyse(false);
  };

  const sendChat = async () => {
    if (!input.trim()) return;
    const msg = input.trim();
    setInput('');
    const newMsgs: ChatMsg[] = [...chatMsgs, { role: 'user' as const, content: msg }];
    setChatMsgs(newMsgs);
    setChatLoading(true);

    try {
      const { data: boutique } = await supabase.from('boutiques').select('nom, ville, nb_ventes').eq('vendeur_id', user!.id).maybeSingle();
      const historyForApi = trimHistoryForAdvisor(chatMsgs);
      const vendorContext = buildVendorContextBlock({
        userMessage: msg,
        boutiqueName: boutique?.nom,
        ville: boutique?.ville,
        salesBrief: salesBriefRef.current,
        products: produitsRef.current,
      });
      const hintSource: ChatMsg[] = [...chatMsgs, { role: 'user', content: msg }];
      memoryHintRef.current = mergeMemoryHints(
        memoryHintRef.current,
        extractMemoryHintFromHistory(hintSource)
      );
      const reply = await askAyaAdvisorChat({
        businessType: boutique?.nom || 'Commerce',
        message: msg,
        history: historyForApi,
        vendorContext,
        memoryHint: memoryHintRef.current || undefined,
      });
      setChatMsgs([...newMsgs, { role: 'assistant' as const, content: reply }].slice(-MAX_HISTORY_MESSAGES));
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      showToast(`Erreur Aya: ${message}`, 'warning');
      setChatMsgs([...newMsgs, { role: 'assistant' as const, content: 'Désolé, une erreur est survenue. Réessayez dans un instant.' }].slice(-MAX_HISTORY_MESSAGES));
    }
    setChatLoading(false);
  };

  const toggleVoice = () => {
    const SR = (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition; SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SR) { showToast('Reconnaissance vocale non supportée', 'warning'); return; }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const recognition = new SR();
    recognition.lang = 'fr-FR';
    recognition.onresult = e => setInput(p => p + e.results[0][0].transcript);
    recognition.onend = () => setIsListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white px-4 pt-12 pb-4 shadow-sm sticky top-0 z-30 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Aya</h1>
          <p className="text-xs text-gray-500">Votre assistante AyaMarket</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Generate analysis */}
        <div className="bg-gradient-to-r from-[#1D9E75] to-[#158a62] rounded-2xl p-5 text-white">
          <div className="flex items-start gap-3">
            <Sparkles className="w-6 h-6 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="font-bold text-base">Analyse business IA</h2>
              <p className="text-white/80 text-sm mt-1">Obtenez une analyse complète de votre boutique basée sur vos données de ventes</p>
            </div>
          </div>
          <button
            onClick={generateAnalyse}
            disabled={loadingAnalyse}
            className="mt-4 bg-white text-[#1D9E75] rounded-xl px-5 py-2.5 text-sm font-bold flex items-center gap-2 hover:bg-white/90 transition-colors disabled:opacity-60"
          >
            {loadingAnalyse ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyse en cours...</> : <><Brain className="w-4 h-4" /> Générer mon analyse</>}
          </button>
        </div>

        {/* Analysis results */}
        {analyse && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-sm text-gray-700 leading-relaxed">{analyse.resume}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-[#1D9E75]" />
                  <h3 className="text-sm font-bold text-gray-900">Points forts</h3>
                </div>
                {analyse.points_forts.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#1D9E75] mt-1.5 flex-shrink-0" />
                    <p className="text-xs text-gray-600">{p}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-[#EF9F27]" />
                  <h3 className="text-sm font-bold text-gray-900">À améliorer</h3>
                </div>
                {analyse.points_faibles.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#EF9F27] mt-1.5 flex-shrink-0" />
                    <p className="text-xs text-gray-600">{p}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-[#EF9F27]" />
                <h3 className="text-sm font-bold text-gray-900">Conseils personnalisés</h3>
              </div>
              <div className="space-y-3">
                {analyse.conseils.map((c, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-gray-800">{c.titre}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${IMPACT_COLORS[c.impact]}`}>
                        {c.impact === 'fort' ? 'Fort impact' : c.impact === 'moyen' ? 'Impact moyen' : 'Impact faible'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{c.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#EF9F27]/10 border border-[#EF9F27]/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-[#EF9F27]" />
                <h3 className="text-sm font-bold text-[#EF9F27]">Opportunité du mois</h3>
              </div>
              <p className="text-sm text-gray-700">{analyse.opportunite_du_mois}</p>
            </div>
          </div>
        )}

        {/* AI Chat */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-[#1D9E75]" />
              <h3 className="text-sm font-bold text-gray-900">Chat avec Aya</h3>
            </div>
          </div>
          <div className="h-[min(48vh,18rem)] overflow-y-auto overscroll-contain p-4 space-y-3 touch-pan-y">
            {chatMsgs.length === 0 && (
              <div className="text-center pt-6 px-1">
                <Brain className="w-8 h-8 text-[#1D9E75]/25 mx-auto mb-2" />
                <p className="text-xs text-gray-600 font-medium">Posez une question à Aya</p>
                <p className="text-[10px] text-gray-400 mt-1">Prix, stock, clients — réponses courtes, pensées pour le Bénin.</p>
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory">
                  {ayaChips.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setInput(q)}
                      className="snap-start shrink-0 max-w-[88vw] text-left text-[11px] bg-[#1D9E75]/8 text-[#0f3d2e] px-2.5 py-2 rounded-xl font-medium hover:bg-[#1D9E75]/15 touch-manipulation"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatMsgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    m.role === 'user' ? 'bg-[#1D9E75] text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm border border-gray-100/80'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {chatLoading && <AyaTypingIndicator />}
            <div ref={bottomRef} />
          </div>
          {chatMsgs.length > 0 && (
            <div className="px-3 pt-2 flex gap-2 overflow-x-auto pb-1 border-t border-gray-50/80 snap-x">
              {ayaChips.slice(0, 5).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setInput(q)}
                  disabled={chatLoading}
                  className="snap-start shrink-0 text-[11px] bg-[#1D9E75]/8 text-[#0f3d2e] px-2.5 py-1.5 rounded-lg font-medium hover:bg-[#1D9E75]/15 disabled:opacity-40 touch-manipulation"
                >
                  {q.length > 40 ? `${q.slice(0, 38)}…` : q}
                </button>
              ))}
            </div>
          )}
          <div className="px-3 py-2 border-t border-gray-100 flex items-center gap-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-white/95">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
              placeholder="Ex. : promo, stock, message client…"
              disabled={chatLoading}
              className="flex-1 min-w-0 text-sm bg-gray-100 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1D9E75] disabled:opacity-50 touch-manipulation"
            />
            <button type="button" onClick={toggleVoice} disabled={chatLoading} className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40 touch-manipulation ${isListening ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
              {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
            <button type="button" onClick={sendChat} disabled={!input.trim() || chatLoading} className="w-9 h-9 rounded-full bg-[#1D9E75] text-white flex items-center justify-center flex-shrink-0 disabled:opacity-50 touch-manipulation">
              {chatLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

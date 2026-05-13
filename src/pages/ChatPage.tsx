import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Mic, MicOff, Bot, User, Store, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Conversation, Message, Boutique } from '../lib/database.types';
import { askGeminiJson, getGeminiModelName } from '../lib/gemini';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';

interface ChatPageProps {
  boutiqueId?: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onBack: () => void;
}

export default function ChatPage({ boutiqueId, onNavigate, onBack }: ChatPageProps) {
  const [conversations, setConversations] = useState<(Conversation & { boutiques: Boutique })[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [activeBoutique, setActiveBoutique] = useState<Boutique | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user]);

  useEffect(() => {
    if (boutiqueId && user) {
      startConversation(boutiqueId);
    }
  }, [boutiqueId, user]);

  useEffect(() => {
    if (activeConv) {
      loadMessages(activeConv.id);
      // Realtime subscription
      const channel = supabase
        .channel(`messages:${activeConv.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConv.id}` },
          payload => setMessages(prev => [...prev, payload.new as Message])
        )
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [activeConv]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    setLoadingConvs(true);
    const { data } = await supabase
      .from('conversations')
      .select('*, boutiques(*)')
      .eq('acheteur_id', user!.id)
      .order('created_at', { ascending: false });
    if (data) setConversations(data as (Conversation & { boutiques: Boutique })[]);
    setLoadingConvs(false);
  };

  const startConversation = async (bId: string) => {
    if (!user) return;
    const { data: boutiqueData } = await supabase.from('boutiques').select('*').eq('id', bId).maybeSingle();
    if (boutiqueData) setActiveBoutique(boutiqueData);

    let { data: conv } = await supabase.from('conversations').select('*').eq('acheteur_id', user.id).eq('boutique_id', bId).maybeSingle();
    if (!conv) {
      const { data: newConv } = await supabase.from('conversations').insert({ acheteur_id: user.id, boutique_id: bId }).select().single();
      conv = newConv;
    }
    if (conv) {
      setActiveConv(conv);
      await loadConversations();
    }
  };

  const loadMessages = async (convId: string) => {
    const { data } = await supabase.from('messages').select('*').eq('conversation_id', convId).order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeConv || !user) return;
    const content = input.trim();
    setInput('');
    setLoading(true);

    // Insert user message
    const { data: msg } = await supabase.from('messages').insert({
      conversation_id: activeConv.id,
      expediteur_id: user.id,
      contenu: content,
      statut_ia: 'humain',
      est_ia: false,
    }).select().single();

    if (msg) setMessages(prev => [...prev, msg]);

    // Appel IA Gemini pour les réponses automatiques client.
    try {
      const boutique = activeBoutique || conversations.find(c => c.id === activeConv.id)?.boutiques;
      const { data: produits } = await supabase.from('produits').select('nom, prix, stock').eq('boutique_id', activeConv.boutique_id).eq('actif', true).limit(20);
      const produitsStr = produits?.map(p => `${p.nom}: ${p.prix} FCFA, stock: ${p.stock}`).join('; ') || 'Aucun produit disponible';

      const systemPrompt = `Tu es l'assistant client de la boutique "${boutique?.nom || 'la boutique'}" sur AyaMarket.
Tu réponds UNIQUEMENT en français simple et poli.
Données disponibles: ${produitsStr}.
Règle métier:
- Si la question est simple (prix, disponibilité, délai, taille, variantes, stock), réponds directement avec statut "auto".
- Si la question est complexe (négociation, litige, demande spéciale, remboursement, cas ambigu), réponds brièvement et mets statut "transfert".
Format de sortie obligatoire (JSON strict): {"message":"...", "statut":"auto" | "transfert", "langue_detectee":"fr"}.`;

      const history = messages.slice(-6).map((m) => ({
        role: (m.est_ia ? 'model' : 'user') as 'model' | 'user',
        content: m.contenu as string,
      }));

      const parsed = await askGeminiJson<{ message: string; statut: 'auto' | 'transfert'; langue_detectee: string }>(
        systemPrompt,
        [
          // On envoie un petit historique pour garder le contexte de conversation.
          ...history,
          { role: 'user' as const, content },
        ]
      );

      const { data: aiMsg } = await supabase.from('messages').insert({
        conversation_id: activeConv.id,
        expediteur_id: null,
        contenu: parsed.message || 'Je suis désolé, je ne peux pas répondre pour le moment.',
        statut_ia: parsed.statut || 'auto',
        est_ia: true,
      }).select().single();

      if (aiMsg) setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('VITE_GEMINI_API_KEY')) {
        showToast('Clé Gemini manquante dans .env (VITE_GEMINI_API_KEY)', 'error');
      } else {
        showToast(`Erreur Gemini (${getGeminiModelName()}): ${message || 'inconnue'}`, 'warning');
      }
      const { data: errMsg } = await supabase.from('messages').insert({
        conversation_id: activeConv.id,
        expediteur_id: null,
        contenu: "Je suis désolé, je ne peux pas répondre pour le moment. Le vendeur sera notifié.",
        statut_ia: 'transfert',
        est_ia: true,
      }).select().single();
      if (errMsg) setMessages(prev => [...prev, errMsg]);
    }
    setLoading(false);
  };

  const toggleVoice = () => {
    const SpeechRecognitionAPI = (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition; SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) { showToast('Reconnaissance vocale non supportée', 'warning'); return; }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = 'fr-FR';
      recognition.onresult = e => setInput(prev => prev + e.results[0][0].transcript);
      recognition.onend = () => setIsListening(false);
      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center pb-20 px-4">
        <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Messagerie</h2>
        <p className="text-gray-500 text-sm text-center mb-6">Connectez-vous pour discuter avec les vendeurs</p>
        <button onClick={() => onNavigate('auth')} className="btn-primary px-8 py-3">Se connecter</button>
      </div>
    );
  }

  if (activeConv) {
    const boutiqueName = activeBoutique?.nom || conversations.find(c => c.id === activeConv.id)?.boutiques?.nom || 'Boutique';
    return (
      <div className="flex flex-col h-screen bg-white">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => { setActiveConv(null); setActiveBoutique(null); }} className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 rounded-full bg-[#1D9E75]/10 flex items-center justify-center">
            <Store className="w-4 h-4 text-[#1D9E75]" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{boutiqueName}</p>
            <p className="text-xs text-[#1D9E75]">Assistant IA actif</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Bot className="w-10 h-10 text-[#1D9E75]/40 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Bonjour ! Je suis l'assistant de {boutiqueName}.</p>
              <p className="text-xs text-gray-400 mt-1">Posez vos questions sur nos produits</p>
            </div>
          )}
          {messages.map(msg => {
            const isMe = !msg.est_ia && msg.expediteur_id === user.id;
            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                {!isMe && (
                  <div className="w-7 h-7 rounded-full bg-[#1D9E75]/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-[#1D9E75]" />
                  </div>
                )}
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMe ? 'bg-[#1D9E75] text-white rounded-br-md' : 'bg-gray-100 text-gray-800 rounded-bl-md'}`}>
                  <p className="text-sm leading-relaxed">{msg.contenu}</p>
                  {msg.statut_ia === 'transfert' && !isMe && (
                    <p className="text-xs mt-1 opacity-60">Transfert au vendeur...</p>
                  )}
                  <p className={`text-[10px] mt-1 ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {isMe && (
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-gray-600" />
                  </div>
                )}
              </div>
            );
          })}
          {loading && (
            <div className="flex gap-2 justify-start">
              <div className="w-7 h-7 rounded-full bg-[#1D9E75]/10 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-[#1D9E75]" />
              </div>
              <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-100 px-4 py-3 flex items-end gap-2 flex-shrink-0 pb-safe">
          <div className="flex-1 flex items-end bg-gray-100 rounded-2xl px-3 py-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Votre message..."
              rows={1}
              className="flex-1 bg-transparent text-sm resize-none focus:outline-none max-h-24"
            />
          </div>
          <button
            onClick={toggleVoice}
            className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${isListening ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="w-11 h-11 rounded-full bg-[#1D9E75] text-white flex items-center justify-center flex-shrink-0 hover:bg-[#178a64] transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Conversation list
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white px-4 pt-12 pb-4 shadow-sm sticky top-0 z-30">
        <h1 className="text-xl font-bold text-gray-900">Messagerie</h1>
      </div>
      <div className="p-4">
        {loadingConvs ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-16 animate-pulse" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Aucune conversation</p>
            <p className="text-sm text-gray-400 mt-1">Contactez un vendeur depuis la page d'un produit</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => { setActiveConv(conv); setActiveBoutique(conv.boutiques); }}
                className="bg-white rounded-2xl p-4 shadow-sm w-full text-left flex items-center gap-3 hover:border-[#1D9E75] border border-gray-100 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-[#1D9E75]/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {conv.boutiques?.logo_url ? (
                    <img src={conv.boutiques.logo_url} alt={conv.boutiques.nom} className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-5 h-5 text-[#1D9E75]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{conv.boutiques?.nom}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Assistant IA disponible</p>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(conv.created_at).toLocaleDateString('fr-FR')}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

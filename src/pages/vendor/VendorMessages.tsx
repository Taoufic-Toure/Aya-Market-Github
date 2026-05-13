import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Bot, User as UserIcon, Store } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Conversation, Message, User } from '../../lib/database.types';
import { useAuth } from '../../hooks/useAuth';

interface ConversationWithBuyer extends Conversation {
  users: User;
}

interface VendorMessagesProps {
  onBack: () => void;
}

export default function VendorMessages({ onBack }: VendorMessagesProps) {
  const [conversations, setConversations] = useState<ConversationWithBuyer[]>([]);
  const [activeConv, setActiveConv] = useState<ConversationWithBuyer | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [boutique, setBoutique] = useState<{ id: string; nom: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => { if (user) loadData(); }, [user]);
  useEffect(() => { if (activeConv) loadMessages(activeConv.id); }, [activeConv]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadData = async () => {
    const { data: b } = await supabase.from('boutiques').select('id, nom').eq('vendeur_id', user!.id).maybeSingle();
    if (!b) return;
    setBoutique(b);
    const { data } = await supabase.from('conversations').select('*, users(nom, avatar_url)').eq('boutique_id', b.id).order('created_at', { ascending: false });
    if (data) setConversations(data as ConversationWithBuyer[]);
  };

  const loadMessages = async (convId: string) => {
    const { data } = await supabase.from('messages').select('*').eq('conversation_id', convId).order('created_at', { ascending: true });
    if (data) setMessages(data);
    // Realtime
    const channel = supabase.channel(`vendor-msgs:${convId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` },
        payload => setMessages(prev => [...prev, payload.new as Message])
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeConv || !user) return;
    const content = input.trim();
    setInput('');
    await supabase.from('messages').insert({
      conversation_id: activeConv.id,
      expediteur_id: user.id,
      contenu: content,
      statut_ia: 'humain',
      est_ia: false,
    });
  };

  if (activeConv) {
    const buyerName = activeConv.users?.nom || 'Acheteur';
    return (
      <div className="flex flex-col h-screen bg-white">
        <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 flex items-center gap-3">
          <button onClick={() => setActiveConv(null)} className="p-2 rounded-full hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></button>
          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
            {buyerName[0]}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{buyerName}</p>
            <p className="text-xs text-gray-400">Acheteur</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map(msg => {
            const isMe = msg.expediteur_id === user?.id && !msg.est_ia;
            const isAI = msg.est_ia;
            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                {!isMe && (
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isAI ? 'bg-[#1D9E75]/10' : 'bg-gray-200'}`}>
                    {isAI ? <Bot className="w-3.5 h-3.5 text-[#1D9E75]" /> : <UserIcon className="w-3.5 h-3.5 text-gray-600" />}
                  </div>
                )}
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMe ? 'bg-[#1D9E75] text-white rounded-br-md' : isAI ? 'bg-[#1D9E75]/10 text-gray-800 rounded-bl-md' : 'bg-gray-100 text-gray-800 rounded-bl-md'}`}>
                  {isAI && <p className="text-[10px] font-semibold text-[#1D9E75] mb-1">IA</p>}
                  <p className="text-sm">{msg.contenu}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        <div className="bg-white border-t border-gray-100 px-4 py-3 flex items-end gap-2">
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Votre réponse..." rows={1} className="flex-1 bg-gray-100 rounded-2xl px-3 py-2.5 text-sm resize-none focus:outline-none max-h-20" />
          <button onClick={sendMessage} disabled={!input.trim()}
            className="w-11 h-11 rounded-full bg-[#1D9E75] text-white flex items-center justify-center disabled:opacity-50">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white px-4 pt-12 pb-4 shadow-sm sticky top-0 z-30 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-bold text-gray-900">Messages ({conversations.length})</h1>
      </div>
      <div className="p-4 space-y-2">
        {conversations.length === 0 ? (
          <div className="text-center py-16">
            <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucune conversation</p>
          </div>
        ) : (
          conversations.map(conv => (
            <button key={conv.id} onClick={() => setActiveConv(conv)}
              className="bg-white rounded-2xl p-4 shadow-sm w-full text-left flex items-center gap-3 border border-gray-100 hover:border-[#1D9E75] transition-colors">
              <div className="w-11 h-11 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 flex-shrink-0">
                {conv.users?.nom?.[0] || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{conv.users?.nom || 'Acheteur'}</p>
                <p className="text-xs text-gray-400 mt-0.5">Cliquer pour voir la conversation</p>
              </div>
              <span className="text-xs text-gray-400">{new Date(conv.created_at).toLocaleDateString('fr-FR')}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

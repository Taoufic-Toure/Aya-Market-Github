import { useState, useEffect, useRef } from 'react';
import {
  TrendingUp, ShoppingBag, Package, Star, ArrowUpRight, ArrowDownRight,
  Send, Mic, MicOff, Brain, Loader2, BarChart3, PieChart as PieChartIcon,
  LogOut, Store, MessageCircle, Settings, ChevronRight,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { askAyaAdvisorChat } from '../../lib/aiApi';
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
import type { Boutique, Commande, Produit } from '../../lib/database.types';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';

const PIE_COLORS = ['#1D9E75', '#EF9F27', '#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#14B8A6', '#6366F1', '#F43F5E', '#84CC16', '#06B6D4', '#A855F7', '#64748B'];

interface ChatMsg { role: 'user' | 'assistant'; content: string }

interface VendorHomePageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export default function VendorHomePage({ onNavigate }: VendorHomePageProps) {
  const [boutique, setBoutique] = useState<Boutique | null>(null);
  const [loading, setLoading] = useState(true);

  // Dashboard
  const [ventesAujourdhui, setVentesAujourdhui] = useState(0);
  const [revenusMois, setRevenusMois] = useState(0);
  const [commandesEnAttente, setCommandesEnAttente] = useState(0);
  const [meilleurProduit, setMeilleurProduit] = useState<{ nom: string; ventes: number }>({ nom: '-', ventes: 0 });
  const [profitData, setProfitData] = useState<{ jour: string; montant: number }[]>([]);

  // Investments
  const [totalInvesti, setTotalInvesti] = useState(0);
  const [totalGagne, setTotalGagne] = useState(0);
  const [margeBeneficiaire, setMargeBeneficiaire] = useState(0);
  const [repartitionCategories, setRepartitionCategories] = useState<{ name: string; value: number }[]>([]);

  // AI Chat
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const salesDataRef = useRef<string>('');
  const salesBriefRef = useRef<string>('');
  const produitsRef = useRef<ProductBrief[]>([]);
  const memoryHintRef = useRef<string>('');
  const [ayaChips, setAyaChips] = useState<string[]>(() => buildSuggestionChips([]));

  const { user, signOut } = useAuth();
  const { showToast } = useToast();

  useEffect(() => { if (user) loadData(); }, [user]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMsgs, chatLoading]);

  const loadData = async () => {
    setLoading(true);
    const { data: b } = await supabase.from('boutiques').select('*').eq('vendeur_id', user!.id).maybeSingle();
    if (!b) { setLoading(false); return; }
    setBoutique(b);

    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    // Fetch orders for this boutique's products
    const [commandesRes, produitsRes] = await Promise.all([
      supabase.from('commandes').select('id, montant_total, statut, created_at, lignes_commande!inner(boutique_id, prix_unitaire, quantite, produit_id)')
        .eq('lignes_commande.boutique_id', b.id)
        .gte('created_at', thirtyDaysAgoStr)
        .order('created_at', { ascending: true }),
      supabase.from('produits').select('id, nom, prix, stock, nb_ventes, categorie, seuil_alerte').eq('boutique_id', b.id),
    ]);

    const commandes = (commandesRes.data || []) as (Commande & { lignes_commande: { boutique_id: string; prix_unitaire: number; quantite: number; produit_id: string }[] })[];
    const produits = produitsRes.data || [];

    // Dashboard metrics
    const commandesActives = commandes.filter(c => c.statut !== 'annulee');
    const todayVentes = commandesActives.filter(c => c.created_at.split('T')[0] === today);
    setVentesAujourdhui(todayVentes.reduce((s, c) => s + c.montant_total, 0));

    const monthVentes = commandesActives.filter(c => c.created_at >= monthStart);
    setRevenusMois(monthVentes.reduce((s, c) => s + c.montant_total, 0));

    const attente = commandes.filter(c => c.statut === 'en_attente');
    setCommandesEnAttente(attente.length);

    // Best product
    const best = produits.reduce((best, p) => p.nb_ventes > best.nb_ventes ? p : best, { nom: '-', nb_ventes: 0 } as { nom: string; nb_ventes: number });
    setMeilleurProduit({ nom: best.nom, ventes: best.nb_ventes });

    // Profit line chart: last 30 days
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split('T')[0];
    });
    const chart = days.map(day => ({
      jour: new Date(day).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      montant: commandesActives.filter(c => c.created_at.split('T')[0] === day).reduce((s, c) => s + c.montant_total, 0),
    }));
    setProfitData(chart);

    // Investments: total invested = sum of (stock * estimated cost price, using 60% of selling price as estimate)
    const investTotal = produits.reduce((s, p) => s + (p.stock * p.prix * 0.6), 0);
    setTotalInvesti(investTotal);

    const earnedTotal = commandesActives.reduce((s, c) => s + c.montant_total, 0);
    setTotalGagne(earnedTotal);

    const marge = earnedTotal > 0 ? ((earnedTotal - earnedTotal * 0.6) / earnedTotal) * 100 : 0;
    setMargeBeneficiaire(marge);

    // Revenue by category
    const catRevenue: Record<string, number> = {};
    commandesActives.forEach(cmd => {
      cmd.lignes_commande?.forEach(lc => {
        const prod = produits.find(p => p.id === lc.produit_id);
        const cat = prod?.categorie || 'Autre';
        catRevenue[cat] = (catRevenue[cat] || 0) + (lc.prix_unitaire * lc.quantite);
      });
    });
    const pieData = Object.entries(catRevenue)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
    setRepartitionCategories(pieData);

    // Store sales data for AI prompt
    salesDataRef.current = `Boutique: ${b.nom}, Ville: ${b.ville}, Ventes 30j: ${commandesActives.length} commandes, Revenu total: ${earnedTotal} FCFA, Investissement stock: ${Math.round(investTotal)} FCFA, Marge: ${marge.toFixed(1)}%, Produits: ${produits.map(p => `${p.nom} (${p.categorie}, ${p.prix} FCFA, stock: ${p.stock}, ventes: ${p.nb_ventes})`).join('; ')}, Répartition catégories: ${pieData.map(p => `${p.name}: ${p.value} FCFA`).join(', ')}`;

    produitsRef.current = produits.map((p) => ({
      nom: p.nom,
      prix: p.prix,
      stock: p.stock,
      nb_ventes: p.nb_ventes,
      categorie: p.categorie,
      seuil_alerte: p.seuil_alerte,
    }));
    salesBriefRef.current = `${b.nom}|${b.ville}|30j:${commandesActives.length}cmd|${Math.round(earnedTotal)}FCFA|att:${attente.length}|inv:${Math.round(investTotal)}FC`;
    setAyaChips(buildSuggestionChips(produitsRef.current));

    setLoading(false);
  };

  const sendChat = async () => {
    if (!input.trim()) return;
    const msg = input.trim();
    setInput('');
    const newMsgs: ChatMsg[] = [...chatMsgs, { role: 'user' as const, content: msg }];
    setChatMsgs(newMsgs);
    setChatLoading(true);

    try {
      const historyForApi = trimHistoryForAdvisor(chatMsgs);
      const vendorContext = buildVendorContextBlock({
        userMessage: msg,
        boutiqueName: boutique?.nom,
        ville: boutique?.ville,
        salesBrief: salesBriefRef.current,
        products: produitsRef.current,
      });
      const hintSource: { role: 'user' | 'assistant'; content: string }[] = [...chatMsgs, { role: 'user', content: msg }];
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

  const handleSignOut = async () => {
    await signOut();
    showToast('Déconnecté', 'info');
    onNavigate('home');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!boutique) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <Store className="w-16 h-16 text-gray-300 mb-4" />
        <p className="text-gray-600 font-medium">Aucune boutique trouvée</p>
        <button onClick={() => onNavigate('home')} className="mt-4 btn-primary px-6 py-2.5 text-sm">Retour à l'accueil</button>
      </div>
    );
  }

  const navItems = [
    { label: 'Accueil', icon: BarChart3, page: 'vendeur' },
    { label: 'Produits', icon: Package, page: 'vendeur-produits' },
    { label: 'Commandes', icon: ShoppingBag, page: 'vendeur-commandes' },
    { label: 'Messages', icon: MessageCircle, page: 'vendeur-messages' },
    { label: 'Profil', icon: Settings, page: 'profile' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1D9E75] to-[#158a62] px-4 pt-12 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">{boutique.nom}</h1>
            <p className="text-white/70 text-xs">{boutique.ville} · {boutique.nb_ventes} ventes</p>
          </div>
          <button onClick={handleSignOut} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
            <LogOut className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Vendor Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40">
        <div className="max-w-md mx-auto flex">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = item.page === 'vendeur';
            return (
              <button key={item.page} onClick={() => { if (item.page !== 'vendeur') onNavigate(item.page); }}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors ${active ? 'text-[#1D9E75]' : 'text-gray-400 hover:text-[#1D9E75]'}`}>
                <Icon className="w-4 h-4" />
                <span className="text-[9px] font-medium">{item.label}</span>
                {active && <div className="absolute top-0 w-8 h-0.5 bg-[#1D9E75] rounded-full" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* ═══════════════════════════════════════════
            SECTION 1: DASHBOARD
        ═══════════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-[#1D9E75]" />
            <h2 className="text-base font-bold text-gray-900">Tableau de bord</h2>
          </div>

          {/* Metrics cards */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#1D9E75]/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-[#1D9E75]" />
                </div>
                <ArrowUpRight className="w-3 h-3 text-[#1D9E75]" />
              </div>
              <p className="text-xs text-gray-500">Ventes aujourd'hui</p>
              <p className="text-lg font-bold text-gray-900 leading-tight">{ventesAujourdhui.toLocaleString('fr-FR')} <span className="text-xs font-normal text-gray-400">FCFA</span></p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                </div>
                <ArrowUpRight className="w-3 h-3 text-purple-600" />
              </div>
              <p className="text-xs text-gray-500">Revenus ce mois</p>
              <p className="text-lg font-bold text-gray-900 leading-tight">{revenusMois.toLocaleString('fr-FR')} <span className="text-xs font-normal text-gray-400">FCFA</span></p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#EF9F27]/10 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4 text-[#EF9F27]" />
                </div>
                {commandesEnAttente > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{commandesEnAttente}</span>
                )}
              </div>
              <p className="text-xs text-gray-500">Commandes en attente</p>
              <p className="text-lg font-bold text-gray-900 leading-tight">{commandesEnAttente}</p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#EF9F27]/10 flex items-center justify-center">
                  <Star className="w-4 h-4 text-[#EF9F27]" />
                </div>
              </div>
              <p className="text-xs text-gray-500">Meilleur produit</p>
              <p className="text-sm font-bold text-gray-900 leading-tight truncate">{meilleurProduit.nom}</p>
              <p className="text-xs text-gray-400">{meilleurProduit.ventes} ventes</p>
            </div>
          </div>

          {/* Profit evolution line chart */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Evolution du chiffre d'affaires (30 jours)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={profitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="jour" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => v > 0 ? `${(v / 1000).toFixed(0)}k` : '0'} />
                <Tooltip
                  formatter={(value) => [`${Number(value).toLocaleString('fr-FR')} FCFA`, 'Revenus']}
                  labelStyle={{ fontSize: 11 }}
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)', fontSize: 11 }}
                />
                <Line type="monotone" dataKey="montant" stroke="#1D9E75" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#1D9E75' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            SECTION 2: INVESTMENTS & INSIGHTS
        ═══════════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <PieChartIcon className="w-4 h-4 text-[#EF9F27]" />
            <h2 className="text-base font-bold text-gray-900">Investissements & Analyses</h2>
          </div>

          {/* Investment vs Earnings card */}
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-gray-500">Total investi (stock)</p>
                <p className="text-xl font-bold text-gray-900">{totalInvesti.toLocaleString('fr-FR')} <span className="text-xs font-normal text-gray-400">FCFA</span></p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Total gagné</p>
                <p className="text-xl font-bold text-[#1D9E75]">{totalGagne.toLocaleString('fr-FR')} <span className="text-xs font-normal text-gray-400">FCFA</span></p>
              </div>
            </div>

            {/* Profit margin bar */}
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-700">Marge bénéficiaire</span>
                <span className={`text-sm font-bold flex items-center gap-1 ${margeBeneficiaire >= 0 ? 'text-[#1D9E75]' : 'text-red-500'}`}>
                  {margeBeneficiaire >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {margeBeneficiaire.toFixed(1)}%
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${margeBeneficiaire >= 0 ? 'bg-[#1D9E75]' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(Math.abs(margeBeneficiaire), 100)}%` }}
                />
              </div>
            </div>

            {/* Comparison visual */}
            <div className="flex gap-2 mt-4">
              <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Investi</p>
                <p className="text-sm font-bold text-gray-700 mt-0.5">{totalInvesti > 0 ? (totalGagne / totalInvesti).toFixed(1) : '0'}x</p>
                <p className="text-[10px] text-gray-400">retour sur invest.</p>
              </div>
              <div className="flex-1 bg-[#1D9E75]/5 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Bénéfice</p>
                <p className="text-sm font-bold text-[#1D9E75] mt-0.5">{(totalGagne - totalInvesti * 0.6).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</p>
                <p className="text-[10px] text-gray-400">FCFA (estimé)</p>
              </div>
            </div>
          </div>

          {/* Pie chart: revenue by category */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Revenus par catégorie</h3>
            {repartitionCategories.length > 0 ? (
              <div className="flex items-center gap-4">
                <div className="w-36 h-36 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={repartitionCategories} cx="50%" cy="50%" innerRadius={30} outerRadius={60} paddingAngle={2} dataKey="value">
                        {repartitionCategories.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => `${Number(value).toLocaleString('fr-FR')} FCFA`}
                        contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)', fontSize: 11 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1.5">
                  {repartitionCategories.slice(0, 6).map((cat, i) => (
                    <div key={cat.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-xs text-gray-600 flex-1 truncate">{cat.name}</span>
                      <span className="text-xs font-semibold text-gray-800">{cat.value.toLocaleString('fr-FR')}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">Aucune donnée de vente disponible</p>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            SECTION 3: AI ADVISOR CHAT
        ═══════════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-[#1D9E75]" />
            <h2 className="text-base font-bold text-gray-900">Aya</h2>
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Chat header */}
            <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-[#1D9E75]/5 to-[#EF9F27]/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#1D9E75] flex items-center justify-center ring-2 ring-[#EF9F27]/40">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Aya</p>
                  <p className="text-[10px] text-[#1D9E75] font-medium">Conseillère vente · AyaMarket Bénin</p>
                </div>
              </div>
            </div>

            {/* Chat messages — hauteur confortable sur mobile */}
            <div className="h-[min(52vh,20rem)] sm:h-72 overflow-y-auto overscroll-contain p-4 space-y-3 touch-pan-y">
              {chatMsgs.length === 0 && (
                <div className="text-center pt-6 px-1">
                  <Brain className="w-10 h-10 text-[#1D9E75]/30 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 font-medium">Salut ! Moi c&apos;est Aya.</p>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Conseils vente, prix, stock et messages clients — en français simple, pensé pour le marché béninois.
                  </p>
                  <p className="text-[10px] text-gray-400 mt-3 font-medium uppercase tracking-wide">Actions rapides</p>
                  <div className="flex gap-2 mt-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory">
                    {ayaChips.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setInput(q)}
                        className="snap-start shrink-0 max-w-[85vw] text-left text-xs bg-white border border-[#1D9E75]/20 text-[#0f3d2e] px-3 py-2 rounded-xl hover:bg-[#1D9E75]/5 transition-colors font-medium shadow-sm touch-manipulation active:scale-[0.98]"
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
                    className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      m.role === 'user'
                        ? 'bg-[#1D9E75] text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm border border-gray-100/80'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && <AyaTypingIndicator />}
              <div ref={bottomRef} />
            </div>

            {/* Chips quand la conversation a démarré — scroll horizontal */}
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
                    {q.length > 42 ? `${q.slice(0, 40)}…` : q}
                  </button>
                ))}
              </div>
            )}

            {/* Chat input */}
            <div className="px-3 py-3 border-t border-gray-100 flex items-center gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white/95 backdrop-blur-sm">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                placeholder="Ex. : prix lot, message client…"
                disabled={chatLoading}
                className="flex-1 min-w-0 text-sm bg-gray-100 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1D9E75] touch-manipulation disabled:opacity-50"
              />
              <button type="button" onClick={toggleVoice} disabled={chatLoading}
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors touch-manipulation disabled:opacity-40 ${isListening ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
              <button type="button" onClick={sendChat} disabled={!input.trim() || chatLoading}
                className="w-9 h-9 rounded-full bg-[#1D9E75] text-white flex items-center justify-center flex-shrink-0 disabled:opacity-50 hover:bg-[#178a64] transition-colors touch-manipulation">
                {chatLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

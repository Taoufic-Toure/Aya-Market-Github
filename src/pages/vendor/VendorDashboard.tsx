import { useState, useEffect } from 'react';
import { TrendingUp, Package, ShoppingBag, AlertTriangle, BarChart3, ChevronRight, LogOut, Store, MessageCircle, Brain, Settings } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase';
import type { Boutique, Commande } from '../../lib/database.types';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';

interface VendorDashboardProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

const STATUT_COLORS: Record<string, string> = {
  en_attente: 'bg-[#EF9F27]/10 text-[#EF9F27]',
  confirmee: 'bg-blue-50 text-blue-600',
  en_preparation: 'bg-orange-50 text-orange-600',
  expediee: 'bg-purple-50 text-purple-600',
  livree: 'bg-[#1D9E75]/10 text-[#1D9E75]',
  annulee: 'bg-red-50 text-red-500',
};
const STATUT_LABELS: Record<string, string> = {
  en_attente: 'En attente', confirmee: 'Confirmée', en_preparation: 'En préparation',
  expediee: 'Expédiée', livree: 'Livrée', annulee: 'Annulée',
};

type CommandeStats = Pick<Commande, 'montant_total' | 'created_at' | 'statut'>;

export default function VendorDashboard({ onNavigate }: VendorDashboardProps) {
  const [boutique, setBoutique] = useState<Boutique | null>(null);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [metrics, setMetrics] = useState({ ventesDuJour: 0, commandesEnAttente: 0, produitsActifs: 0, revenusduMois: 0 });
  const [chartData, setChartData] = useState<{ jour: string; montant: number }[]>([]);
  const [alertProduits, setAlertProduits] = useState<{ nom: string; stock: number; seuil_alerte: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, signOut } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const { data: bData } = await supabase.from('boutiques').select('*').eq('vendeur_id', user!.id).maybeSingle();
    if (!bData) { setLoading(false); return; }
    setBoutique(bData);

    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [commandesRes, produitsRes] = await Promise.all([
      supabase.from('commandes').select('*, lignes_commande!inner(boutique_id)').eq('lignes_commande.boutique_id', bData.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('produits').select('nom, stock, seuil_alerte, actif, prix, nb_ventes, created_at').eq('boutique_id', bData.id),
    ]);

    const commandesRecentes = (commandesRes.data as Commande[] | null) || [];
    if (commandesRecentes.length) setCommandes(commandesRecentes);
    const produits = produitsRes.data || [];
    const actifs = produits.filter(p => p.actif);
    const alertes = produits.filter(p => p.actif && p.stock <= p.seuil_alerte);
    setAlertProduits(alertes);

    // Metrics
    const { data: commandesMonthData } = await supabase
      .from('commandes')
      .select('montant_total, created_at, statut, lignes_commande!inner(boutique_id)')
      .eq('lignes_commande.boutique_id', bData.id)
      .gte('created_at', monthStart);
    const commandesMonth = (commandesMonthData as CommandeStats[] | null) || [];
    const moisVentes = commandesMonth.filter(c => c.statut !== 'annulee');
    const jourVentes = moisVentes.filter(c => c.created_at.split('T')[0] === today);
    const attente = commandesRecentes.filter(c => c.statut === 'en_attente').length;

    setMetrics({
      ventesDuJour: jourVentes.reduce((s, c) => s + c.montant_total, 0),
      commandesEnAttente: attente,
      produitsActifs: actifs.length,
      revenusduMois: moisVentes.reduce((s, c) => s + c.montant_total, 0),
    });

    // Chart: last 7 days
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });
    const chart = days.map(day => ({
      jour: new Date(day).toLocaleDateString('fr-FR', { weekday: 'short' }),
      montant: moisVentes.filter(c => c.created_at.split('T')[0] === day).reduce((s, c) => s + c.montant_total, 0),
    }));
    setChartData(chart);
    setLoading(false);
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
    { label: 'Tableau de bord', icon: BarChart3, page: 'vendeur-dashboard' },
    { label: 'Produits', icon: Package, page: 'vendeur-produits' },
    { label: 'Commandes', icon: ShoppingBag, page: 'vendeur-commandes' },
    { label: 'Messages', icon: MessageCircle, page: 'vendeur-messages' },
    { label: 'Conseils IA', icon: Brain, page: 'vendeur-conseils' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Vendor Navbar */}
      <div className="bg-gradient-to-r from-[#1D9E75] to-[#158a62] px-4 pt-12 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-lg font-bold text-white">{boutique.nom}</h1>
            <p className="text-white/70 text-xs">Tableau de bord vendeur</p>
          </div>
          <button onClick={handleSignOut} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
            <LogOut className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40">
        <div className="flex">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.page} onClick={() => onNavigate(item.page)} className="flex-1 flex flex-col items-center gap-1 py-2.5 text-gray-400 hover:text-[#1D9E75] transition-colors">
                <Icon className="w-4 h-4" />
                <span className="text-[9px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Ventes aujourd\'hui', value: `${metrics.ventesDuJour.toLocaleString('fr-FR')} FCFA`, icon: TrendingUp, color: 'text-[#1D9E75] bg-[#1D9E75]/10' },
            { label: 'Commandes en attente', value: metrics.commandesEnAttente.toString(), icon: ShoppingBag, color: 'text-[#EF9F27] bg-[#EF9F27]/10', badge: metrics.commandesEnAttente > 0 },
            { label: 'Produits actifs', value: metrics.produitsActifs.toString(), icon: Package, color: 'text-blue-600 bg-blue-50' },
            { label: 'Revenus ce mois', value: `${metrics.revenusduMois.toLocaleString('fr-FR')} FCFA`, icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
          ].map((m, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className={`w-9 h-9 rounded-xl ${m.color} flex items-center justify-center mb-2`}>
                <m.icon className="w-4 h-4" />
              </div>
              <p className="text-xs text-gray-500">{m.label}</p>
              <p className="text-base font-bold text-gray-900 mt-0.5 leading-tight">{m.value}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Ventes des 7 derniers jours</h2>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={chartData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="jour" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => v > 0 ? `${(v / 1000).toFixed(0)}k` : '0'} />
              <Tooltip
                formatter={(value) => [`${Number(value).toLocaleString('fr-FR')} FCFA`, 'Ventes']}
                labelStyle={{ fontSize: 12 }}
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)', fontSize: 12 }}
              />
              <Bar dataKey="montant" fill="#1D9E75" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent orders */}
        {commandes.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
              <h2 className="text-sm font-bold text-gray-900">Commandes récentes</h2>
              <button onClick={() => onNavigate('vendeur-commandes')} className="text-xs text-[#1D9E75] font-medium flex items-center gap-1">
                Tout voir <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {commandes.slice(0, 5).map(cmd => (
              <div key={cmd.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800">#{cmd.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-gray-500">{cmd.montant_total.toLocaleString('fr-FR')} FCFA</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUT_COLORS[cmd.statut]}`}>
                  {STATUT_LABELS[cmd.statut]}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Stock alerts */}
        {alertProduits.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50 bg-[#EF9F27]/5">
              <AlertTriangle className="w-4 h-4 text-[#EF9F27]" />
              <h2 className="text-sm font-bold text-[#EF9F27]">Alertes stock ({alertProduits.length})</h2>
            </div>
            {alertProduits.map((p, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                <p className="text-sm text-gray-800">{p.nom}</p>
                <span className="text-xs font-bold text-red-500">{p.stock} restants</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

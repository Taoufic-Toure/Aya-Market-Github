import { useEffect, useState } from 'react';
import { CheckCircle, Package, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { verifyFedaPayStatus } from '../lib/paymentApi';
import type { Commande } from '../lib/database.types';

interface OrderConfirmPageProps {
  commandeId: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

const STEPS = [
  { key: 'en_attente', label: 'En attente' },
  { key: 'confirmee', label: 'Confirmée' },
  { key: 'en_preparation', label: 'En préparation' },
  { key: 'expediee', label: 'Expédiée' },
  { key: 'livree', label: 'Livrée' },
];

export default function OrderConfirmPage({ commandeId, onNavigate }: OrderConfirmPageProps) {
  const [commande, setCommande] = useState<Commande | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('commandes').select('*').eq('id', commandeId).maybeSingle().then(({ data }) => {
      if (data) setCommande(data);
    });
  }, [commandeId]);

  useEffect(() => {
    const checkPayment = async () => {
      if (!commande?.fedapay_transaction_id || commande.payment_status === 'approved') return;
      setCheckingPayment(true);
      setPaymentError(null);
      try {
        const status = await verifyFedaPayStatus(commandeId);
        setPaymentStatus(status.payment_status);
        setCommande(prev => prev ? { ...prev, statut: status.order_status as Commande['statut'], payment_status: status.payment_status as Commande['payment_status'] } : prev);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Verification paiement impossible.';
        setPaymentError(message);
      } finally {
        setCheckingPayment(false);
      }
    };

    checkPayment();
  }, [commande?.fedapay_transaction_id, commande?.payment_status, commandeId]);

  const currentStep = STEPS.findIndex(s => s.key === (commande?.statut || 'en_attente'));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 pb-20">
      <div className="w-20 h-20 bg-[#1D9E75]/10 rounded-full flex items-center justify-center mb-6">
        <CheckCircle className="w-10 h-10 text-[#1D9E75]" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Commande passée !</h1>
      <p className="text-gray-500 text-sm text-center mb-2">
        Votre commande a bien été enregistrée.
      </p>
      {commande && (
        <p className="text-xs text-gray-400 mb-8 font-mono">#{commande.id.slice(0, 8).toUpperCase()}</p>
      )}

      {commande && commande.mode_paiement !== 'livraison' && (
        <div className="bg-white rounded-2xl p-4 w-full max-w-sm shadow-sm mb-4">
          <div className="flex items-center gap-3">
            {checkingPayment ? (
              <Loader2 className="w-5 h-5 text-[#1D9E75] animate-spin" />
            ) : paymentStatus === 'approved' || commande.payment_status === 'approved' ? (
              <CheckCircle className="w-5 h-5 text-[#1D9E75]" />
            ) : (
              <AlertCircle className="w-5 h-5 text-[#EF9F27]" />
            )}
            <div>
              <p className="text-sm font-bold text-gray-900">Paiement FedaPay</p>
              <p className="text-xs text-gray-500">
                {checkingPayment
                  ? 'Verification du paiement...'
                  : paymentError
                    ? paymentError
                    : `Statut: ${paymentStatus || commande.payment_status || 'en attente'}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stepper */}
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-4 h-4 text-[#1D9E75]" />
          <h2 className="text-sm font-bold text-gray-900">Suivi de commande</h2>
        </div>
        <div className="space-y-3">
          {STEPS.map((step, i) => (
            <div key={step.key} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${i <= currentStep ? 'bg-[#1D9E75]' : 'bg-gray-200'}`}>
                {i < currentStep ? (
                  <CheckCircle className="w-4 h-4 text-white" />
                ) : i === currentStep ? (
                  <div className="w-2.5 h-2.5 bg-white rounded-full" />
                ) : null}
              </div>
              <span className={`text-sm ${i <= currentStep ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                {step.label}
              </span>
              {i === currentStep && (
                <span className="ml-auto text-xs text-[#1D9E75] font-semibold">En cours</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button
          onClick={() => onNavigate('orders')}
          className="flex items-center justify-center gap-2 btn-primary py-3"
        >
          Voir mes commandes <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onNavigate('home')}
          className="py-3 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-2xl"
        >
          Continuer mes achats
        </button>
      </div>
    </div>
  );
}

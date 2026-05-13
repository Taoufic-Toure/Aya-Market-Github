import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export type FedaPayMethod = 'mtn' | 'moov' | 'celtiis';

interface CreatePaymentResponse {
  commande_id: string;
  transaction_id: string;
  payment_status: string;
  payment_url: string;
  environment: 'sandbox' | 'live';
}

export interface PaymentStatusResponse {
  commande_id: string;
  transaction_id: string | null;
  payment_status: string;
  order_status: string;
  verified: boolean;
}

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Connexion requise pour payer.');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

interface ApiDetailBody {
  detail?: string;
}

export async function createFedaPayTransaction(
  commandeId: string,
  paymentMethod: FedaPayMethod
): Promise<CreatePaymentResponse> {
  const response = await fetch(`${API_URL}/payments/fedapay/transactions`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      commande_id: commandeId,
      payment_method: paymentMethod,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as CreatePaymentResponse & ApiDetailBody;
  if (!response.ok) {
    throw new Error(data.detail || 'Impossible de demarrer le paiement.');
  }
  return data;
}

export async function verifyFedaPayStatus(commandeId: string): Promise<PaymentStatusResponse> {
  const response = await fetch(`${API_URL}/payments/fedapay/transactions/${commandeId}/status`, {
    method: 'GET',
    headers: await getAuthHeaders(),
  });

  const data = (await response.json().catch(() => ({}))) as PaymentStatusResponse & ApiDetailBody;
  if (!response.ok) {
    throw new Error(data.detail || 'Verification paiement impossible.');
  }
  return data;
}

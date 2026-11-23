import apiClient from './client';

// ─── Types ─────────────────────────────────────────────────────────────────────
export type FeeStatus = 'pending' | 'paid' | 'overdue';

export interface FeeRecord {
  id: string;
  child_id: string | number;
  child_name: string;
  month: string;          // e.g. "March 2026"
  amount: number;
  due_date: string;       // "YYYY-MM-DD"
  paid_date: string | null;
  status: FeeStatus;
}

export interface BankAccount {
  bank_name: string;
  account_name: string;
  account_number: string;
  iban: string;
  branch: string;
}

export interface PaymentPayload {
  fee_id: string;
  method: 'card' | 'bank_transfer';
  card_last4?: string;
  transaction_ref?: string;
}

export interface PaymentResponse {
  id: string;
  status: string;
  amount: number;
  receipt_url: string;
  created_at: string;
  transaction_ref: string;
}

// ─── API calls ─────────────────────────────────────────────────────────────────
export async function fetchFees(childId: string | number): Promise<FeeRecord[]> {
  const { data } = await apiClient.get<FeeRecord[]>('/api/fees/', {
    params: { child_id: childId, ordering: '-month' },
  });
  return data;
}

export async function fetchFeeById(feeId: string): Promise<FeeRecord> {
  const { data } = await apiClient.get<FeeRecord>(`/api/fees/${feeId}/`);
  return data;
}

export async function fetchBankAccount(): Promise<BankAccount> {
  const { data } = await apiClient.get<BankAccount>('/api/settings/bank-account/');
  return data;
}

export async function submitPayment(
  payload: PaymentPayload,
): Promise<PaymentResponse> {
  const { data } = await apiClient.post<PaymentResponse>('/api/payments/', payload);
  return data;
}

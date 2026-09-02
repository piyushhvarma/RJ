import { apiFetch } from './client';
import type { Payment } from './types';

export async function getPayments(loanId: string): Promise<Payment[]> {
    return apiFetch<Payment[]>(`/payments?loanId=${loanId}`);
}

export async function createPayment(data: Record<string, unknown>): Promise<Payment> {
    return apiFetch<Payment>('/payments', { method: 'POST', body: JSON.stringify(data) });
}

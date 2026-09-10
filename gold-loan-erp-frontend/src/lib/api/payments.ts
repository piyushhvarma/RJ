import { apiFetch } from './client';
import type { Payment } from './types';

export interface PaymentListItem extends Payment {
    loan?: {
        id: string;
        loanCode: string;
        status: string;
        customer: {
            id: string;
            fullName: string;
            customerCode: string;
            mobile: string;
        };
    };
}

export interface ListPaymentsResponse {
    items: PaymentListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    aggregates: {
        totalAmount: number;
        totalPrincipal: number;
        totalInterest: number;
    };
}

export interface ListPaymentsParams {
    loanId?: string;
    q?: string;
    page?: number;
    limit?: number;
}

export async function getPaymentsList(params?: ListPaymentsParams): Promise<ListPaymentsResponse> {
    const sp = new URLSearchParams();
    if (params?.loanId) sp.set('loanId', params.loanId);
    if (params?.q) sp.set('q', params.q);
    if (params?.page) sp.set('page', String(params.page));
    if (params?.limit) sp.set('limit', String(params.limit));
    const qs = sp.toString();
    return apiFetch<ListPaymentsResponse>(`/payments${qs ? `?${qs}` : ''}`);
}

export async function getPayments(loanId: string): Promise<Payment[]> {
    return apiFetch<Payment[]>(`/payments?loanId=${loanId}`);
}

export async function createPayment(data: Record<string, unknown>): Promise<Payment> {
    return apiFetch<Payment>('/payments', { method: 'POST', body: JSON.stringify(data) });
}

import { apiFetch } from './client';
import type { Loan, LoanStatus } from './types';

export interface LoanListItem {
    id: string;
    loanCode: string;
    status: LoanStatus;
    principalAmount: number | null;
    interestRate: number | null;
    interestType: string | null;
    sanctionedDate: string | null;
    maturityDate: string | null;
    createdAt: string;
    customer: {
        id: string;
        fullName: string;
        customerCode: string;
        mobile: string;
        kycStatus: string;
    };
    _count: {
        jewelleryItems: number;
        payments: number;
    };
    packet?: {
        id: string;
        packetCode: string;
        status: string;
    } | null;
}

export interface ListLoansResponse {
    items: LoanListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface ListLoansParams {
    q?: string;
    status?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export async function getLoans(params?: ListLoansParams): Promise<ListLoansResponse> {
    const sp = new URLSearchParams();
    if (params?.q) sp.set('q', params.q);
    if (params?.status && params.status !== 'ALL') sp.set('status', params.status);
    if (params?.page) sp.set('page', String(params.page));
    if (params?.limit) sp.set('limit', String(params.limit));
    if (params?.sortBy) sp.set('sortBy', params.sortBy);
    if (params?.sortOrder) sp.set('sortOrder', params.sortOrder);
    const qs = sp.toString();
    return apiFetch<ListLoansResponse>(`/loans${qs ? `?${qs}` : ''}`);
}

export async function getLoan(id: string): Promise<Loan> {
    return apiFetch<Loan>(`/loans/${id}`);
}

export async function createLoan(data: Record<string, unknown>): Promise<Loan> {
    return apiFetch<Loan>('/loans', { method: 'POST', body: JSON.stringify(data) });
}

export async function disburseLoan(id: string, data: Record<string, unknown>): Promise<Loan> {
    return apiFetch<Loan>(`/loans/${id}/disburse`, { method: 'POST', body: JSON.stringify(data) });
}

import { apiFetch } from './client';
import type { Loan } from './types';

export async function getLoan(id: string): Promise<Loan> {
    return apiFetch<Loan>(`/loans/${id}`);
}

export async function createLoan(data: Record<string, unknown>): Promise<Loan> {
    return apiFetch<Loan>('/loans', { method: 'POST', body: JSON.stringify(data) });
}

export async function disburseLoan(id: string, data: Record<string, unknown>): Promise<Loan> {
    return apiFetch<Loan>(`/loans/${id}/disburse`, { method: 'POST', body: JSON.stringify(data) });
}

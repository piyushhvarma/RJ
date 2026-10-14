import { apiFetch } from './client';
import type { Appraisal } from './types';

export async function createAppraisal(data: Record<string, unknown>): Promise<Appraisal> {
    return apiFetch<Appraisal>('/appraisals', { method: 'POST', body: JSON.stringify(data) });
}

export async function confirmAppraisal(id: string): Promise<Appraisal> {
    return apiFetch<Appraisal>(`/appraisals/${id}/confirm`, { method: 'POST' });
}

export async function approveAppraisal(id: string, data: { notes?: string }): Promise<Appraisal> {
    return apiFetch<Appraisal>(`/appraisals/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

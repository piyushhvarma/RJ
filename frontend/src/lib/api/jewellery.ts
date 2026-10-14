import { apiFetch } from './client';
import type { JewelleryItem, Appraisal } from './types';

export interface JewelleryInventoryItem extends JewelleryItem {
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

export interface ListJewelleryResponse {
    items: JewelleryInventoryItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    aggregates: {
        totalGrossWeight: number;
        totalNetWeight: number;
        totalValuation: number;
        gold?: {
            count: number;
            grossWeight: number;
            netWeight: number;
            valuation: number;
        };
        silver?: {
            count: number;
            grossWeight: number;
            netWeight: number;
            valuation: number;
        };
    };
}

export interface ListJewelleryParams {
    loanId?: string;
    q?: string;
    category?: string;
    purityKarat?: string;
    metalType?: 'ALL' | 'GOLD' | 'SILVER';
    status?: string;
    page?: number;
    limit?: number;
}

export interface AppraisalListItem extends Appraisal {
    loan?: {
        id: string;
        loanCode: string;
        status: string;
        principalAmount: number | null;
        customer: {
            id: string;
            fullName: string;
            customerCode: string;
        };
        _count: {
            jewelleryItems: number;
        };
    };
}

export interface ListAppraisalsResponse {
    items: AppraisalListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export async function getJewelleryInventory(params?: ListJewelleryParams): Promise<ListJewelleryResponse> {
    const sp = new URLSearchParams();
    if (params?.q) sp.set('q', params.q);
    if (params?.category) sp.set('category', params.category);
    if (params?.purityKarat && params.purityKarat !== 'ALL') sp.set('purityKarat', params.purityKarat);
    if (params?.metalType && params.metalType !== 'ALL') sp.set('metalType', params.metalType);
    if (params?.status && params.status !== 'ALL') sp.set('status', params.status);
    if (params?.page) sp.set('page', String(params.page));
    if (params?.limit) sp.set('limit', String(params.limit));
    const qs = sp.toString();
    return apiFetch<ListJewelleryResponse>(`/jewellery${qs ? `?${qs}` : ''}`);
}

export async function getAppraisalsList(page = 1, limit = 20): Promise<ListAppraisalsResponse> {
    return apiFetch<ListAppraisalsResponse>(`/jewellery/appraisals?page=${page}&limit=${limit}`);
}

export async function getJewelleryItems(loanId: string): Promise<JewelleryItem[]> {
    return apiFetch<JewelleryItem[]>(`/jewellery?loanId=${loanId}`);
}

export async function createJewelleryItem(data: Record<string, unknown>): Promise<JewelleryItem> {
    return apiFetch<JewelleryItem>('/jewellery', { method: 'POST', body: JSON.stringify(data) });
}

export async function addJewelleryPhoto(id: string, data: { angle: string; fileUrl: string }): Promise<void> {
    return apiFetch<void>(`/jewellery/${id}/photos`, { method: 'POST', body: JSON.stringify(data) });
}

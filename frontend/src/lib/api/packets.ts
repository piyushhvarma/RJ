import { apiFetch } from './client';
import type { Packet } from './types';

export interface PacketListItem extends Packet {
    loan?: {
        id: string;
        loanCode: string;
        status: string;
        principalAmount: number | null;
        customer: {
            id: string;
            fullName: string;
            customerCode: string;
            mobile: string;
        };
        _count: {
            jewelleryItems: number;
        };
    };
}

export interface ListPacketsResponse {
    items: PacketListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface ListPacketsParams {
    q?: string;
    status?: string;
    page?: number;
    limit?: number;
}

export async function getPacketsList(params?: ListPacketsParams): Promise<ListPacketsResponse> {
    const sp = new URLSearchParams();
    if (params?.q) sp.set('q', params.q);
    if (params?.status && params.status !== 'ALL') sp.set('status', params.status);
    if (params?.page) sp.set('page', String(params.page));
    if (params?.limit) sp.set('limit', String(params.limit));
    const qs = sp.toString();
    return apiFetch<ListPacketsResponse>(`/packets${qs ? `?${qs}` : ''}`);
}

export async function getPacket(id: string): Promise<Packet> {
    return apiFetch<Packet>(`/packets/${id}`);
}

export async function createPacket(loanId: string): Promise<Packet> {
    return apiFetch<Packet>('/packets', { method: 'POST', body: JSON.stringify({ loanId }) });
}

export async function storePacket(id: string, data: Record<string, unknown>): Promise<Packet> {
    return apiFetch<Packet>(`/packets/${id}/store`, { method: 'POST', body: JSON.stringify(data) });
}

export async function retrievePacket(id: string, reason: string): Promise<Packet> {
    return apiFetch<Packet>(`/packets/${id}/retrieve`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
    });
}

export async function releasePacket(id: string): Promise<Packet> {
    return apiFetch<Packet>(`/packets/${id}/release`, { method: 'POST' });
}

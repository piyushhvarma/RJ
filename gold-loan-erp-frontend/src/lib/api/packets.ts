import { apiFetch } from './client';
import type { Packet } from './types';

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

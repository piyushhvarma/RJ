import { apiFetch } from './client';
import type { JewelleryItem } from './types';

export async function getJewelleryItems(loanId: string): Promise<JewelleryItem[]> {
    return apiFetch<JewelleryItem[]>(`/jewellery?loanId=${loanId}`);
}

export async function createJewelleryItem(data: Record<string, unknown>): Promise<JewelleryItem> {
    return apiFetch<JewelleryItem>('/jewellery', { method: 'POST', body: JSON.stringify(data) });
}

export async function addJewelleryPhoto(id: string, data: { angle: string; fileUrl: string }): Promise<void> {
    return apiFetch<void>(`/jewellery/${id}/photos`, { method: 'POST', body: JSON.stringify(data) });
}

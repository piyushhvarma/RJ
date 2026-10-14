import { apiFetch } from './client';
import type { Customer, PaginatedResponse } from './types';

export interface LoginResponse {
    accessToken: string;
    user: { id: string; employeeCode: string; name: string; role: string };
}

export interface CustomerSearchParams {
    q?: string;
    page?: number;
    limit?: number;
    kycStatus?: string;
}

export type CustomerListResponse = PaginatedResponse<Customer>;

export async function login(email: string, password: string): Promise<LoginResponse> {
    return apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
}

export async function getCustomers(
    params?: string | CustomerSearchParams
): Promise<CustomerListResponse> {
    const searchParams = new URLSearchParams();
    if (typeof params === 'string') {
        if (params.trim()) searchParams.set('q', params.trim());
    } else if (params) {
        if (params.q?.trim()) searchParams.set('q', params.q.trim());
        if (params.page) searchParams.set('page', String(params.page));
        if (params.limit) searchParams.set('limit', String(params.limit));
        if (params.kycStatus) searchParams.set('kycStatus', params.kycStatus);
    }
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiFetch<CustomerListResponse>(`/customers${qs}`);
}

export async function getCustomer(id: string): Promise<Customer> {
    return apiFetch<Customer>(`/customers/${id}`);
}

export async function createCustomer(data: Record<string, unknown>): Promise<Customer> {
    return apiFetch<Customer>('/customers', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateCustomer(
    id: string,
    data: Partial<{
        fullName: string;
        guardianName: string;
        dateOfBirth: string;
        mobile: string;
        alternateMobile: string;
        address: string;
        city: string;
        state: string;
        pincode: string;
        occupation: string;
        photoUrl: string;
    }>
): Promise<Customer> {
    return apiFetch<Customer>(`/customers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

export async function updateCustomerPhoto(id: string, photoUrl: string): Promise<Customer> {
    return apiFetch<Customer>(`/customers/${id}/photo`, {
        method: 'POST',
        body: JSON.stringify({ photoUrl }),
    });
}

export async function addCustomerDocument(
    id: string,
    data: { docType: string; docNumber: string; fileUrl: string; issueDate?: string; expiryDate?: string }
): Promise<unknown> {
    return apiFetch(`/customers/${id}/documents`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}



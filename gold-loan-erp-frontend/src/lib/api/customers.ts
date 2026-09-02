import { apiFetch } from './client';
import type { Customer } from './types';

export interface LoginResponse {
    accessToken: string;
    user: { id: string; employeeCode: string; name: string; role: string };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
    return apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
}

export async function getCustomers(q?: string): Promise<Customer[]> {
    const qs = q ? `?q=${encodeURIComponent(q)}` : '';
    return apiFetch<Customer[]>(`/customers${qs}`);
}

export async function getCustomer(id: string): Promise<Customer> {
    return apiFetch<Customer>(`/customers/${id}`);
}

export async function createCustomer(data: Record<string, unknown>): Promise<Customer> {
    return apiFetch<Customer>('/customers', { method: 'POST', body: JSON.stringify(data) });
}

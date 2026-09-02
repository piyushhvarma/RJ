import { apiFetch } from './client';

export interface BiometricVerifyResult {
    result: 'MATCH' | 'NO_MATCH' | 'DEVICE_ERROR';
    attemptsRemaining: number;
    fallbackAvailable: boolean;
}

export async function enrollBiometric(customerId: string): Promise<unknown> {
    return apiFetch(`/customers/${customerId}/biometric/enroll`, { method: 'POST' });
}

export async function verifyBiometric(
    customerId: string,
    loanId?: string,
): Promise<BiometricVerifyResult> {
    return apiFetch(`/customers/${customerId}/biometric/verify`, {
        method: 'POST',
        body: JSON.stringify({ loanId }),
    });
}

export async function biometricFallback(
    customerId: string,
    data: { reason: string; approvedById: string; loanId?: string },
): Promise<unknown> {
    return apiFetch(`/customers/${customerId}/biometric/fallback`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

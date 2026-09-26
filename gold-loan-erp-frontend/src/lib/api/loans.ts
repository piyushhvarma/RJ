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

export type TopUpMode = 'RENEW_WITH_INTEREST_DEDUCTED' | 'DIRECT_TOPUP';

export interface TopUpLoanDto {
    mode: TopUpMode;
    topupAmount: number;
    interestDeducted?: number;
    netDisbursed: number;
    paymentMode?: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER';
    notes?: string;
    customerPhotoUrl?: string;
    customerSignatureUrl?: string;
    tenureMonths?: number;
}

export interface TopUpResponse {
    loan: Loan;
    documentId: string;
    paymentId?: string;
    summary: {
        mode: TopUpMode;
        previousPrincipal: number;
        topupAmount: number;
        interestDeducted: number;
        netDisbursed: number;
        newPrincipal: number;
        sanctionedDate: string;
        customerPhotoUrl?: string;
        customerSignatureUrl?: string;
    };
}

export async function topupLoan(id: string, data: TopUpLoanDto): Promise<TopUpResponse> {
    return apiFetch<TopUpResponse>(`/loans/${id}/topup`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export interface ClosureChecklistResponse {
    loanId: string;
    loanCode: string;
    status: LoanStatus;
    canClose: boolean;
    outstandingPrincipal: number;
    isSettled: boolean;
    packetStatus: string | null;
    packetRetrieved: boolean;
    storageLocation: string | null;
    biometricVerified: boolean;
    jewelleryItemCount: number;
    totalGrossWeight: number;
    totalNetWeight: number;
    blockers: string[];
}

export interface CloseLoanDto {
    notes?: string;
    customerSignatureUrl?: string;
    verifiedJewelleryCount: boolean;
    biometricOverrideReason?: string;
}

export interface CloseLoanResponse {
    success: boolean;
    loanId: string;
    loanCode: string;
    status: LoanStatus;
    closedAt: string;
    releasedItemsCount: number;
    packetCode: string;
    message: string;
}

export async function getClosureChecklist(id: string): Promise<ClosureChecklistResponse> {
    return apiFetch<ClosureChecklistResponse>(`/loans/${id}/closure-checklist`);
}

export async function closeLoan(id: string, data: CloseLoanDto): Promise<CloseLoanResponse> {
    return apiFetch<CloseLoanResponse>(`/loans/${id}/close`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export interface CounterJewelleryItemDto {
    metalType: 'GOLD' | 'SILVER';
    category: string;
    description: string;
    quantity: number;
    grossWeight: number;
    stoneWeight?: number;
    netWeight: number;
    purityKarat: string;
    fineness?: number;
    valuationRate: number;
    valuation: number;
    photos?: string[];
}

export interface CounterOriginationDto {
    customerId: string;
    customerPhotoUrl?: string;
    customerSignatureUrl?: string;
    principalAmount: number;
    interestRate: number;
    interestType?: 'MONTHLY_SIMPLE' | 'DAILY_SIMPLE' | 'ANNUAL_SIMPLE';
    sanctionedDate?: string;
    tenureMonths?: number;
    deductFirstMonthInterest?: boolean;
    storageLocationLabel?: string;
    paymentMode?: 'CASH' | 'UPI' | 'BANK_TRANSFER';
    transactionRef?: string;
    notes?: string;
    jewelleryItems: CounterJewelleryItemDto[];
}

export interface CounterOriginationResponse {
    success: boolean;
    loanId: string;
    loanCode: string;
    packetCode: string;
    storageLocation: string;
    principalAmount: number;
    netCashDisbursed: number;
    totalNetWeight: number;
    totalGrossWeight: number;
    totalValuation: number;
    message: string;
}

export async function counterOriginateLoan(data: CounterOriginationDto): Promise<CounterOriginationResponse> {
    return apiFetch<CounterOriginationResponse>('/loans/counter-origination', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}



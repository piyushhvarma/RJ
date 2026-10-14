import { apiFetch } from './client';

export interface InterestEpoch {
    from: string;
    to: string;
    days: number;
    principal: number;
    annualRate: number;
    accruedInterest: number;
}

export interface SettlementQuote {
    loanId: string;
    loanCode: string;
    asOfDate: string;
    sanctionedDate: string;
    maturityDate?: string | null;
    daysElapsed: number;
    principalOutstanding: number;
    interestRate: number;
    interestType: string;
    monthlyInterestRate: number;
    totalInterestAccrued: number;
    totalInterestPaid: number;
    interestDue: number;
    isOverdue: boolean;
    overdueDays: number;
    gracePeriodDays: number;
    penaltyRate: number;
    penaltyAccrued: number;
    penaltyPaid: number;
    penaltyDue: number;
    otherChargesDue: number;
    totalDue: number;
    epochs: InterestEpoch[];
}

export interface PaymentAllocation {
    amount: number;
    principalComponent: number;
    interestComponent: number;
    penaltyComponent: number;
    otherCharges: number;
    remainingUnallocated: number;
}

export async function getSettlementQuote(loanId: string, asOfDate?: string): Promise<SettlementQuote> {
    const qs = asOfDate ? `?asOfDate=${encodeURIComponent(asOfDate)}` : '';
    return apiFetch<SettlementQuote>(`/loans/${loanId}/settlement-quote${qs}`);
}

export async function getAllocation(
    loanId: string,
    amount: number,
    asOfDate?: string,
): Promise<PaymentAllocation> {
    const sp = new URLSearchParams();
    sp.set('amount', String(amount));
    if (asOfDate) sp.set('asOfDate', asOfDate);
    return apiFetch<PaymentAllocation>(`/loans/${loanId}/allocate-payment?${sp.toString()}`);
}

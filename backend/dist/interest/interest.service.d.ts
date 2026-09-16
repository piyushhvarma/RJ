import { PrismaService } from '../prisma/prisma.service.js';
import { InterestType } from '@prisma/client';
export interface InterestEpoch {
    from: Date;
    to: Date;
    days: number;
    principal: number;
    annualRate: number;
    accruedInterest: number;
}
export interface SettlementQuote {
    loanId: string;
    loanCode: string;
    asOfDate: Date;
    sanctionedDate: Date;
    maturityDate?: Date | null;
    daysElapsed: number;
    principalOutstanding: number;
    interestRate: number;
    interestType: InterestType;
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
export declare class InterestService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    calculateSettlementQuote(loanId: string, asOfDate?: Date): Promise<SettlementQuote>;
    allocatePayment(loanId: string, amount: number, asOfDate?: Date): Promise<PaymentAllocation>;
    private computeInterest;
}

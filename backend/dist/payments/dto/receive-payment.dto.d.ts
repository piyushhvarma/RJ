import { PaymentMode } from '@prisma/client';
export declare class ReceivePaymentDto {
    loanId: string;
    amount: number;
    mode: PaymentMode;
    principalComponent?: number;
    interestComponent?: number;
    penaltyComponent?: number;
    otherCharges?: number;
    transactionRef?: string;
    notes?: string;
}

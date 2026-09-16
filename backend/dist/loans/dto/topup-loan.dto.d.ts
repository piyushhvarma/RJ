import { PaymentMode } from '@prisma/client';
export declare enum TopUpMode {
    RENEW_WITH_INTEREST_DEDUCTED = "RENEW_WITH_INTEREST_DEDUCTED",
    DIRECT_TOPUP = "DIRECT_TOPUP"
}
export declare class TopUpLoanDto {
    mode: TopUpMode;
    topupAmount: number;
    interestDeducted?: number;
    netDisbursed: number;
    paymentMode?: PaymentMode;
    notes?: string;
    customerPhotoUrl?: string;
    customerSignatureUrl?: string;
    tenureMonths?: number;
}

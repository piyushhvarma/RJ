import { InterestType } from '@prisma/client';
export declare class DisburseLoanDto {
    principalAmount: number;
    interestRate: number;
    interestType: InterestType;
    processingCharges?: number;
    maturityDate: string;
}

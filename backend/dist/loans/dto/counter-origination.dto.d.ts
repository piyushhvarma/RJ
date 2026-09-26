import { InterestType, MetalType, PaymentMode } from '@prisma/client';
export declare class CounterJewelleryItemDto {
    metalType: MetalType;
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
export declare class CounterOriginationDto {
    customerId: string;
    customerPhotoUrl?: string;
    customerSignatureUrl?: string;
    principalAmount: number;
    interestRate: number;
    interestType?: InterestType;
    sanctionedDate?: string;
    tenureMonths?: number;
    deductFirstMonthInterest?: boolean;
    storageLocationLabel?: string;
    paymentMode?: PaymentMode;
    transactionRef?: string;
    notes?: string;
    jewelleryItems: CounterJewelleryItemDto[];
}

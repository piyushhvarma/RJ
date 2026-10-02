import { VerificationStatus } from '@prisma/client';
export declare class SearchCustomersDto {
    q?: string;
    page?: number;
    limit?: number;
    kycStatus?: VerificationStatus;
}

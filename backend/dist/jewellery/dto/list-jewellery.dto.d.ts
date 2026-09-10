import { JewelleryStatus } from '@prisma/client';
export declare class ListJewelleryDto {
    loanId?: string;
    q?: string;
    category?: string;
    purityKarat?: string;
    status?: JewelleryStatus;
    metalType?: 'ALL' | 'GOLD' | 'SILVER';
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

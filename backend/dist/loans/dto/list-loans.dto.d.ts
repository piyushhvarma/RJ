import { LoanStatus } from '@prisma/client';
export declare class ListLoansDto {
    q?: string;
    status?: LoanStatus;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

import { PrismaService } from '../prisma/prisma.service.js';
export declare class DashboardService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getSummary(): Promise<{
        kpis: {
            activeLoansCount: number;
            activeLoansPrincipal: number;
            totalLoansCount: number;
            totalLoansPrincipal: number;
            closedLoansCount: number;
            closedLoansPrincipal: number;
            totalCustomersCount: number;
            kycVerifiedCount: number;
            pledgedGoldNetWeightGrams: number;
            pledgedGoldGrossWeightGrams: number;
            pledgedGoldValuation: number;
            pledgedJewelleryItemsCount: number;
            packetsInVaultCount: number;
            sealedPacketsCount: number;
            createdPacketsCount: number;
            totalPacketsCount: number;
        };
        loanDistribution: {
            status: import("@prisma/client").$Enums.LoanStatus;
            count: number;
            principal: number;
        }[];
        collateralOverview: {
            pledged: {
                count: number;
                grossWeight: number;
                netWeight: number;
                valuation: number;
            };
            released: {
                count: number;
                grossWeight: number;
                netWeight: number;
                valuation: number;
            };
        };
        recentLoans: {
            customer: {
                id: string;
                fullName: string;
                mobile: string;
                customerCode: string;
            };
            id: string;
            createdAt: Date;
            status: import("@prisma/client").$Enums.LoanStatus;
            loanCode: string;
            principalAmount: number | null;
        }[];
        recentCustomers: {
            id: string;
            createdAt: Date;
            fullName: string;
            mobile: string;
            customerCode: string;
            kycStatus: import("@prisma/client").$Enums.VerificationStatus;
        }[];
    }>;
}

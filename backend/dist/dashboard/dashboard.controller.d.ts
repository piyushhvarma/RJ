import { DashboardService } from './dashboard.service.js';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
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
                mobile: string | null;
                customerCode: string;
            };
            id: string;
            createdAt: Date;
            status: import("@prisma/client").$Enums.LoanStatus;
            principalAmount: number | null;
            loanCode: string;
        }[];
        recentCustomers: {
            id: string;
            createdAt: Date;
            fullName: string;
            mobile: string | null;
            customerCode: string;
            kycStatus: import("@prisma/client").$Enums.VerificationStatus;
        }[];
    }>;
}

import { ReportsService } from './reports.service.js';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    getPortfolioHealth(): Promise<{
        statusGroups: {
            status: import("@prisma/client").$Enums.LoanStatus;
            count: number;
            principal: number;
        }[];
        totalLoans: number;
        activeLoansCount: number;
        activePrincipal: number;
        avgTicketSize: number;
        closedLoansCount: number;
        closedPrincipal: number;
        recoveryRate: number;
        ticketDistribution: {
            label: string;
            count: number;
            share: number;
        }[];
    }>;
    getGoldStockAudit(): Promise<{
        pledged: {
            count: number;
            grossWeight: number;
            netWeight: number;
            valuation: number;
        };
        goldPledged: {
            count: number;
            grossWeight: number;
            netWeight: number;
            valuation: number;
        };
        silverPledged: {
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
        purityBreakdown: {
            purity: string;
            count: number;
            grossWeight: number;
            netWeight: number;
            valuation: number;
        }[];
        categoryBreakdown: {
            category: string;
            count: number;
            netWeight: number;
            valuation: number;
        }[];
    }>;
    getBorrowerAudit(): Promise<{
        totalCustomers: number;
        kycVerified: number;
        kycPending: number;
        kycVerifiedRate: number;
        biometricEnrolled: number;
    }>;
    getCollectionsSummary(): Promise<{
        totalCount: number;
        totalAmount: number;
        totalPrincipalRecovered: number;
        totalInterestEarned: number;
        modes: {
            mode: string;
            count: number;
            amount: number;
            principal: number;
            interest: number;
        }[];
    }>;
}

import { apiFetch } from './client';

export interface PortfolioHealthData {
    statusGroups: {
        status: string;
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
}

export interface GoldStockAuditData {
    pledged: {
        count: number;
        grossWeight: number;
        netWeight: number;
        valuation: number;
    };
    goldPledged?: {
        count: number;
        grossWeight: number;
        netWeight: number;
        valuation: number;
    };
    silverPledged?: {
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
}

export interface BorrowerAuditData {
    totalCustomers: number;
    kycVerified: number;
    kycPending: number;
    kycVerifiedRate: number;
    biometricEnrolled: number;
}

export interface CollectionsSummaryData {
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
}

export async function getPortfolioReport(): Promise<PortfolioHealthData> {
    return apiFetch<PortfolioHealthData>('/reports/portfolio');
}

export async function getGoldStockReport(): Promise<GoldStockAuditData> {
    return apiFetch<GoldStockAuditData>('/reports/gold-stock');
}

export async function getBorrowerReport(): Promise<BorrowerAuditData> {
    return apiFetch<BorrowerAuditData>('/reports/borrowers');
}

export async function getCollectionsReport(): Promise<CollectionsSummaryData> {
    return apiFetch<CollectionsSummaryData>('/reports/collections');
}

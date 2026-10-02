import { apiFetch } from './client';

// ─────────────────────────────────────────────────────────────────────────────
// TIER 1: DAILY OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface DueLoanItem {
    id: string;
    loanCode: string;
    principalAmount: number;
    maturityDate: string;
    customer: {
        fullName: string;
        mobile?: string;
    };
}

export interface OverdueBucket {
    count: number;
    exposure: number;
    label: string;
}

export interface DailyOperationsData {
    asOf: string;
    summary: {
        newLoans: { count: number; amount: number };
        paymentsReceived: {
            count: number;
            totalAmount: number;
            cash: number;
            upi: number;
            bankTransfer: number;
            other: number;
            principalRecovered: number;
        };
        loansClosed: { count: number; principalAmount: number };
        packetsStored: number;
        packetsReleased: number;
    };
    interestToday: {
        realized: number;
        unrealizedEstimated: number;
        note: string;
    };
    cashReconciliation: {
        openingCash: number;
        cashCollections: number;
        cashDisbursements: number;
        expectedClosingCash: number;
        lastRecordedPhysicalCash: number | null;
        lastVariance: number | null;
        lastReconciledAt: string | null;
        status: string;
    };
    dueLoans: {
        dueToday: DueLoanItem[];
        due3Days: DueLoanItem[];
        due7Days: DueLoanItem[];
    };
    overdueBuckets: {
        b1_7: OverdueBucket;
        b8_30: OverdueBucket;
        b31_90: OverdueBucket;
        b90Plus: OverdueBucket;
    };
    inventoryReconciliation: {
        lastPhysicalCount: number | null;
        lastExpectedCount: number | null;
        lastVariance: number | null;
        lastReconciledAt: string | null;
        status: string;
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 2: FINANCIAL & PORTFOLIO
// ─────────────────────────────────────────────────────────────────────────────

export interface LtvBand {
    count: number;
    principal: number;
    label: string;
}

export interface MonthlyTrendItem {
    month: string;
    collectedInterest: number;
    principalReceived: number;
    capitalDisbursed: number;
    releasedPrincipal?: number;
    netCashFlow?: number;
}

export interface PeriodicTrendRow {
    period: string;
    loansDisbursedCount: number;
    capitalLent: number;
    paymentsCount: number;
    principalRepaid: number;
    interestCollected: number;
    penaltiesAndFees: number;
    totalCashReceived: number;
    loansClosedCount: number;
    releasedPrincipal: number;
    itemsReleasedCount: number;
    netWeightReleased: number;
    releasedValuation: number;
    netCashFlow: number;
}

export interface PeriodicTrendsReport {
    asOf: string;
    groupBy: 'day' | 'month' | 'year';
    startDate?: string;
    endDate?: string;
    summary: {
        totalCapitalLent: number;
        totalLoansDisbursed: number;
        totalPrincipalRepaid: number;
        totalPaymentsCount: number;
        totalInterestCollected: number;
        totalPenaltiesAndFees: number;
        totalCashReceived: number;
        totalLoansClosed: number;
        totalReleasedPrincipal: number;
        totalItemsReleased: number;
        totalNetWeightReleased: number;
        totalNetCashFlow: number;
    };
    rows: PeriodicTrendRow[];
}

export interface FinancialPortfolioData {
    asOf: string;
    interest: {
        totalRealizedCollected: number;
        totalUnrealizedAccruedActiveBook: number;
        activePrincipalBook: number;
        note: string;
    };
    capitalSummary: {
        capitalLent: { amount: number; loanCount: number };
        capitalReceived: { amount: number; paymentCount: number };
        activeOutstandingPrincipal: number;
        netCashFlow: number;
    };
    loansClosedSummary: {
        normalClosure: { count: number; principal: number };
        auctionClosure: { count: number; principal: number };
    };
    profitAndLoss: {
        realizedInterestIncome: number;
        feesAndPenalties: number;
        badDebtWriteOffs: number;
        netLendingProfit: number;
        disclaimer: string;
    };
    ltvDistribution: {
        under50: LtvBand;
        b50_75: LtvBand;
        b75_85: LtvBand;
        above85: LtvBand;
    };
    monthlyTrends: MonthlyTrendItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 3: GOLD/SILVER & CUSTODY
// ─────────────────────────────────────────────────────────────────────────────

export interface PurityBreakdownItem {
    purity: string;
    metalType: string;
    count: number;
    grossWeight: number;
    netWeight: number;
    valuation: number;
}

export interface CategoryBreakdownItem {
    category: string;
    count: number;
    grossWeight: number;
    netWeight: number;
    valuation: number;
}

export interface BoxOccupancyItem {
    box: string;
    packetCount: number;
    isOverloaded: boolean;
    status: 'NORMAL' | 'BUSY' | 'OVERLOADED';
}

export interface CustodyData {
    asOf: string;
    goldPledged: {
        count: number;
        grossWeight: number;
        netWeight: number;
        valuation: number;
        estimatedMarketValue: number;
    };
    silverPledged: {
        count: number;
        grossWeight: number;
        netWeight: number;
        valuation: number;
        estimatedMarketValue: number;
    };
    releasedCustody: {
        goldNetWeight: number;
        goldCount: number;
        silverNetWeight: number;
        silverCount: number;
    };
    marginOfSafety: {
        totalCollateralMarketValue: number;
        totalExposurePrincipal: number;
        safetyMarginPercent: number;
        goldSpotRateUsed: number;
        silverSpotRateUsed: number;
    };
    purityBreakdown: PurityBreakdownItem[];
    categoryBreakdown: CategoryBreakdownItem[];
    boxes: {
        totalBoxes: number;
        totalPacketsInVault: number;
        occupancy: BoxOccupancyItem[];
    };
    physicalReconciliation: {
        lastAuditAt: string | null;
        expectedPackets: number;
        actualPhysicalCount: number;
        variance: number;
        status: string;
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 4: CUSTOMERS
// ─────────────────────────────────────────────────────────────────────────────

export interface TopBorrowerItem {
    id: string;
    customerCode: string;
    fullName: string;
    mobile: string;
    kycStatus: string;
    activeLoansCount: number;
    activeExposure: number;
}

export interface CustomerReportData {
    asOf: string;
    acquisition: {
        totalCustomers: number;
        kycVerified: number;
        kycPending: number;
        kycVerifiedRate: number;
    };
    kycMissingTracker: {
        missingMobileCount: number;
        missingMobilePercent: number;
        missingKycDocsCount: number;
        missingKycDocsPercent: number;
    };
    topBorrowers: TopBorrowerItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 5: STAFF ACCOUNTABILITY
// ─────────────────────────────────────────────────────────────────────────────

export interface CashierCollectionItem {
    cashierId: string;
    cashierName: string;
    role: string;
    totalCollected: number;
    receiptsCount: number;
    modes: {
        CASH: number;
        UPI: number;
        BANK_TRANSFER: number;
        OTHER: number;
    };
}

export interface EmployeeActivityItem {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    performedBy: string;
    role: string;
    result: string;
    reason?: string;
    timestamp: string;
}

export interface ExceptionItem {
    id: string;
    type: string;
    customerName: string;
    customerCode: string;
    reason: string;
    authorizedById: string;
    timestamp: string;
}

export interface StaffAccountabilityData {
    asOf: string;
    cashierCollections: CashierCollectionItem[];
    employeeActivity: EmployeeActivityItem[];
    exceptionsAndOverrides: ExceptionItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// API CLIENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function getDailyOperationsReport(date?: string): Promise<DailyOperationsData> {
    const q = date ? `?date=${encodeURIComponent(date)}` : '';
    return apiFetch<DailyOperationsData>(`/reports/daily-operations${q}`);
}

export async function recordDailyCashReconciliation(data: {
    openingCash: number;
    actualPhysicalCash: number;
    notes?: string;
}) {
    return apiFetch('/reports/daily-cash-reconciliation', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function recordPhysicalInventoryReconciliation(data: {
    actualPhysicalPackets: number;
    notes?: string;
}) {
    return apiFetch('/reports/physical-inventory-reconciliation', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function getFinancialPortfolioReport(params?: {
    range?: string;
    asOfDate?: string;
}): Promise<FinancialPortfolioData> {
    const qp = new URLSearchParams();
    if (params?.range) qp.append('range', params.range);
    if (params?.asOfDate) qp.append('asOfDate', params.asOfDate);
    const qs = qp.toString() ? `?${qp.toString()}` : '';
    return apiFetch<FinancialPortfolioData>(`/reports/financial-portfolio${qs}`);
}

export async function getCustodyReport(): Promise<CustodyData> {
    return apiFetch<CustodyData>('/reports/custody');
}

export async function getCustomerReport(): Promise<CustomerReportData> {
    return apiFetch<CustomerReportData>('/reports/customers');
}

export async function getStaffAccountabilityReport(): Promise<StaffAccountabilityData> {
    return apiFetch<StaffAccountabilityData>('/reports/staff-accountability');
}

export async function getPeriodicTrendsReport(params?: {
    groupBy?: 'day' | 'month' | 'year';
    startDate?: string;
    endDate?: string;
    limit?: number;
}): Promise<PeriodicTrendsReport> {
    const qp = new URLSearchParams();
    if (params?.groupBy) qp.append('groupBy', params.groupBy);
    if (params?.startDate) qp.append('startDate', params.startDate);
    if (params?.endDate) qp.append('endDate', params.endDate);
    if (params?.limit) qp.append('limit', params.limit.toString());
    const qs = qp.toString() ? `?${qp.toString()}` : '';
    return apiFetch<PeriodicTrendsReport>(`/reports/periodic-trends${qs}`);
}

export function getReportExportUrl(
    reportKey: string,
    params?: { groupBy?: string; startDate?: string; endDate?: string }
): string {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const qp = new URLSearchParams();
    if (params?.groupBy) qp.append('groupBy', params.groupBy);
    if (params?.startDate) qp.append('startDate', params.startDate);
    if (params?.endDate) qp.append('endDate', params.endDate);
    const qs = qp.toString() ? `?${qp.toString()}` : '';
    return `${apiBase}/reports/export/${encodeURIComponent(reportKey)}${qs}`;
}

// Backwards compatibility functions
export interface PortfolioHealthData {
    statusGroups: { status: string; count: number; principal: number }[];
    totalLoans: number;
    activeLoansCount: number;
    activePrincipal: number;
    avgTicketSize: number;
    closedLoansCount: number;
    closedPrincipal: number;
    recoveryRate: number;
    ticketDistribution: { label: string; count: number; share: number }[];
}

export interface GoldStockAuditData {
    pledged: { count: number; grossWeight: number; netWeight: number; valuation: number };
    goldPledged?: { count: number; grossWeight: number; netWeight: number; valuation: number };
    silverPledged?: { count: number; grossWeight: number; netWeight: number; valuation: number };
    released: { count: number; grossWeight: number; netWeight: number; valuation: number };
    purityBreakdown: { purity: string; count: number; grossWeight: number; netWeight: number; valuation: number }[];
    categoryBreakdown: { category: string; count: number; netWeight: number; valuation: number }[];
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
    modes: { mode: string; count: number; amount: number; principal: number; interest: number }[];
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

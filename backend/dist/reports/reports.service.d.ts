import { PrismaService } from '../prisma/prisma.service.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
export declare class ReportsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getDailyOperations(dateStr?: string): Promise<{
        asOf: string;
        summary: {
            newLoans: {
                count: number;
                amount: number;
            };
            paymentsReceived: {
                count: number;
                totalAmount: number;
                cash: number;
                upi: number;
                bankTransfer: number;
                other: number;
                principalRecovered: number;
            };
            loansClosed: {
                count: number;
                principalAmount: number;
            };
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
            lastRecordedPhysicalCash: any;
            lastVariance: any;
            lastReconciledAt: Date | null;
            status: string;
        };
        dueLoans: {
            dueToday: {
                customer: {
                    mobile: string | null;
                    fullName: string;
                };
                id: string;
                loanCode: string;
                principalAmount: number | null;
                maturityDate: Date | null;
            }[];
            due3Days: {
                customer: {
                    mobile: string | null;
                    fullName: string;
                };
                id: string;
                loanCode: string;
                principalAmount: number | null;
                maturityDate: Date | null;
            }[];
            due7Days: {
                customer: {
                    mobile: string | null;
                    fullName: string;
                };
                id: string;
                loanCode: string;
                principalAmount: number | null;
                maturityDate: Date | null;
            }[];
        };
        overdueBuckets: {
            b1_7: {
                count: number;
                exposure: number;
                label: string;
            };
            b8_30: {
                count: number;
                exposure: number;
                label: string;
            };
            b31_90: {
                count: number;
                exposure: number;
                label: string;
            };
            b90Plus: {
                count: number;
                exposure: number;
                label: string;
            };
        };
        inventoryReconciliation: {
            lastPhysicalCount: any;
            lastExpectedCount: any;
            lastVariance: any;
            lastReconciledAt: Date | null;
            status: string;
        };
    }>;
    recordDailyCashReconciliation(dto: {
        openingCash: number;
        actualPhysicalCash: number;
        notes?: string;
    }, actor: AuthenticatedUser): Promise<{
        success: boolean;
        openingCash: number;
        cashCollections: number;
        cashDisbursements: number;
        expectedClosingCash: number;
        actualPhysicalCash: number;
        variance: number;
        result: string;
        auditId: string;
    }>;
    recordPhysicalInventoryReconciliation(dto: {
        actualPhysicalPackets: number;
        notes?: string;
    }, actor: AuthenticatedUser): Promise<{
        success: boolean;
        expectedStoredPackets: number;
        actualPhysicalPackets: number;
        variance: number;
        result: string;
        auditId: string;
    }>;
    getFinancialPortfolio(query?: {
        range?: string;
        asOfDate?: string;
    }): Promise<{
        asOf: string;
        interest: {
            totalRealizedCollected: number;
            totalUnrealizedAccruedActiveBook: number;
            activePrincipalBook: number;
            note: string;
        };
        capitalSummary: {
            capitalLent: {
                amount: number;
                loanCount: number;
            };
            capitalReceived: {
                amount: number;
                paymentCount: number;
            };
            activeOutstandingPrincipal: number;
            netCashFlow: number;
        };
        loansClosedSummary: {
            normalClosure: {
                count: number;
                principal: number;
            };
            auctionClosure: {
                count: number;
                principal: number;
            };
        };
        profitAndLoss: {
            realizedInterestIncome: number;
            feesAndPenalties: number;
            badDebtWriteOffs: number;
            netLendingProfit: number;
            disclaimer: string;
        };
        ltvDistribution: {
            under50: {
                count: number;
                principal: number;
                label: string;
            };
            b50_75: {
                count: number;
                principal: number;
                label: string;
            };
            b75_85: {
                count: number;
                principal: number;
                label: string;
            };
            above85: {
                count: number;
                principal: number;
                label: string;
            };
        };
        monthlyTrends: {
            month: string;
            collectedInterest: number;
            principalReceived: number;
            capitalDisbursed: number;
            releasedPrincipal: number;
            netCashFlow: number;
        }[];
    }>;
    getPeriodicTrends(params?: {
        groupBy?: 'day' | 'month' | 'year';
        startDate?: string;
        endDate?: string;
        limit?: number;
    }): Promise<{
        asOf: string;
        groupBy: "year" | "day" | "month";
        startDate: string | undefined;
        endDate: string | undefined;
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
        rows: {
            netCashFlow: number;
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
        }[];
    }>;
    getCustodyReport(): Promise<{
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
        purityBreakdown: {
            purity: string;
            metalType: import("@prisma/client").$Enums.MetalType;
            count: number;
            grossWeight: number;
            netWeight: number;
            valuation: number;
        }[];
        categoryBreakdown: {
            category: string;
            count: number;
            grossWeight: number;
            netWeight: number;
            valuation: number;
        }[];
        boxes: {
            totalBoxes: number;
            totalPacketsInVault: number;
            occupancy: {
                box: string;
                packetCount: number;
                isOverloaded: boolean;
                status: string;
            }[];
        };
        physicalReconciliation: {
            lastAuditAt: Date | null;
            expectedPackets: any;
            actualPhysicalCount: any;
            variance: any;
            status: string;
        };
    }>;
    getCustomerReport(): Promise<{
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
        topBorrowers: {
            id: string;
            customerCode: string;
            fullName: string;
            mobile: string | null;
            kycStatus: import("@prisma/client").$Enums.VerificationStatus;
            activeLoansCount: number;
            activeExposure: number;
        }[];
    }>;
    getStaffAccountabilityReport(): Promise<{
        asOf: string;
        cashierCollections: any[];
        employeeActivity: {
            id: string;
            action: string;
            entityType: string;
            entityId: string;
            performedBy: string;
            role: import("@prisma/client").$Enums.UserRole;
            result: string;
            reason: string | null;
            timestamp: string;
        }[];
        exceptionsAndOverrides: {
            id: string;
            type: string;
            customerName: string;
            customerCode: string;
            reason: string | null;
            authorizedById: string;
            timestamp: string;
        }[];
    }>;
    generateCsv(reportType: string, query?: {
        groupBy?: 'day' | 'month' | 'year';
        startDate?: string;
        endDate?: string;
    }): Promise<string>;
    getPortfolioHealth(): Promise<{
        asOf: string;
        interest: {
            totalRealizedCollected: number;
            totalUnrealizedAccruedActiveBook: number;
            activePrincipalBook: number;
            note: string;
        };
        capitalSummary: {
            capitalLent: {
                amount: number;
                loanCount: number;
            };
            capitalReceived: {
                amount: number;
                paymentCount: number;
            };
            activeOutstandingPrincipal: number;
            netCashFlow: number;
        };
        loansClosedSummary: {
            normalClosure: {
                count: number;
                principal: number;
            };
            auctionClosure: {
                count: number;
                principal: number;
            };
        };
        profitAndLoss: {
            realizedInterestIncome: number;
            feesAndPenalties: number;
            badDebtWriteOffs: number;
            netLendingProfit: number;
            disclaimer: string;
        };
        ltvDistribution: {
            under50: {
                count: number;
                principal: number;
                label: string;
            };
            b50_75: {
                count: number;
                principal: number;
                label: string;
            };
            b75_85: {
                count: number;
                principal: number;
                label: string;
            };
            above85: {
                count: number;
                principal: number;
                label: string;
            };
        };
        monthlyTrends: {
            month: string;
            collectedInterest: number;
            principalReceived: number;
            capitalDisbursed: number;
            releasedPrincipal: number;
            netCashFlow: number;
        }[];
    }>;
    getGoldStockAudit(): Promise<{
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
        purityBreakdown: {
            purity: string;
            metalType: import("@prisma/client").$Enums.MetalType;
            count: number;
            grossWeight: number;
            netWeight: number;
            valuation: number;
        }[];
        categoryBreakdown: {
            category: string;
            count: number;
            grossWeight: number;
            netWeight: number;
            valuation: number;
        }[];
        boxes: {
            totalBoxes: number;
            totalPacketsInVault: number;
            occupancy: {
                box: string;
                packetCount: number;
                isOverloaded: boolean;
                status: string;
            }[];
        };
        physicalReconciliation: {
            lastAuditAt: Date | null;
            expectedPackets: any;
            actualPhysicalCount: any;
            variance: any;
            status: string;
        };
    }>;
    getBorrowerAudit(): Promise<{
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
        topBorrowers: {
            id: string;
            customerCode: string;
            fullName: string;
            mobile: string | null;
            kycStatus: import("@prisma/client").$Enums.VerificationStatus;
            activeLoansCount: number;
            activeExposure: number;
        }[];
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

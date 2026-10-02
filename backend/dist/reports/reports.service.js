var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}
let ReportsService = class ReportsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDailyOperations(dateStr) {
        const targetDate = dateStr ? new Date(dateStr) : new Date();
        const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);
        const now = new Date();
        const d3 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const d7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const [newLoansToday, paymentsToday, closedLoansToday, packetsStoredToday, packetsReleasedToday, activeLoans, dueTodayLoans, due3DaysLoans, due7DaysLoans, latestCashRecon, latestPhysicalRecon,] = await Promise.all([
            this.prisma.loan.aggregate({
                where: {
                    sanctionedDate: { gte: startOfDay, lte: endOfDay },
                    status: { not: 'DRAFT' },
                },
                _count: { id: true },
                _sum: { principalAmount: true },
            }),
            this.prisma.payment.findMany({
                where: {
                    paymentDate: { gte: startOfDay, lte: endOfDay },
                    lifecycle: 'ACTIVE',
                },
                select: {
                    amount: true,
                    mode: true,
                    principalComponent: true,
                    interestComponent: true,
                    penaltyComponent: true,
                    otherCharges: true,
                },
            }),
            this.prisma.loan.aggregate({
                where: {
                    status: 'CLOSED',
                    updatedAt: { gte: startOfDay, lte: endOfDay },
                },
                _count: { id: true },
                _sum: { principalAmount: true },
            }),
            this.prisma.packet.count({
                where: {
                    storedAt: { gte: startOfDay, lte: endOfDay },
                },
            }),
            this.prisma.packet.count({
                where: {
                    releasedAt: { gte: startOfDay, lte: endOfDay },
                },
            }),
            this.prisma.loan.findMany({
                where: { status: 'ACTIVE' },
                select: {
                    id: true,
                    principalAmount: true,
                    interestRate: true,
                    maturityDate: true,
                    sanctionedDate: true,
                },
            }),
            this.prisma.loan.findMany({
                where: {
                    status: 'ACTIVE',
                    maturityDate: {
                        gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
                        lte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
                    },
                },
                select: { id: true, loanCode: true, principalAmount: true, maturityDate: true, customer: { select: { fullName: true, mobile: true } } },
            }),
            this.prisma.loan.findMany({
                where: {
                    status: 'ACTIVE',
                    maturityDate: { gte: now, lte: d3 },
                },
                select: { id: true, loanCode: true, principalAmount: true, maturityDate: true, customer: { select: { fullName: true, mobile: true } } },
            }),
            this.prisma.loan.findMany({
                where: {
                    status: 'ACTIVE',
                    maturityDate: { gte: now, lte: d7 },
                },
                select: { id: true, loanCode: true, principalAmount: true, maturityDate: true, customer: { select: { fullName: true, mobile: true } } },
            }),
            this.prisma.auditLog.findFirst({
                where: { entityType: 'DailyCashReconciliation' },
                orderBy: { timestamp: 'desc' },
            }),
            this.prisma.auditLog.findFirst({
                where: { entityType: 'PhysicalInventoryReconciliation' },
                orderBy: { timestamp: 'desc' },
            }),
        ]);
        let cashCollections = 0;
        let upiCollections = 0;
        let bankCollections = 0;
        let otherCollections = 0;
        let totalPaymentsAmount = 0;
        let totalPrincipalRecovered = 0;
        let totalRealizedInterest = 0;
        for (const p of paymentsToday) {
            totalPaymentsAmount += p.amount;
            totalPrincipalRecovered += p.principalComponent;
            totalRealizedInterest += p.interestComponent;
            if (p.mode === 'CASH')
                cashCollections += p.amount;
            else if (p.mode === 'UPI')
                upiCollections += p.amount;
            else if (p.mode === 'BANK_TRANSFER')
                bankCollections += p.amount;
            else
                otherCollections += p.amount;
        }
        let dailyUnrealizedAccrual = 0;
        for (const l of activeLoans) {
            const p = l.principalAmount ?? 0;
            const r = l.interestRate ?? 18;
            dailyUnrealizedAccrual += (p * (r / 100)) / 365;
        }
        const overdueBuckets = {
            b1_7: { count: 0, exposure: 0, label: '1–7 days' },
            b8_30: { count: 0, exposure: 0, label: '8–30 days' },
            b31_90: { count: 0, exposure: 0, label: '31–90 days' },
            b90Plus: { count: 0, exposure: 0, label: '90+ days' },
        };
        for (const l of activeLoans) {
            if (l.maturityDate && l.maturityDate < now) {
                const diffMs = now.getTime() - l.maturityDate.getTime();
                const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                const amt = l.principalAmount ?? 0;
                if (days >= 1 && days <= 7) {
                    overdueBuckets.b1_7.count++;
                    overdueBuckets.b1_7.exposure += amt;
                }
                else if (days >= 8 && days <= 30) {
                    overdueBuckets.b8_30.count++;
                    overdueBuckets.b8_30.exposure += amt;
                }
                else if (days >= 31 && days <= 90) {
                    overdueBuckets.b31_90.count++;
                    overdueBuckets.b31_90.exposure += amt;
                }
                else if (days > 90) {
                    overdueBuckets.b90Plus.count++;
                    overdueBuckets.b90Plus.exposure += amt;
                }
            }
        }
        const cashDisbursements = newLoansToday._sum.principalAmount ?? 0;
        const latestReconVal = latestCashRecon?.newValue;
        const openingCash = latestReconVal?.closingCash ?? 100000;
        const expectedClosingCash = openingCash + cashCollections - cashDisbursements;
        return {
            asOf: targetDate.toISOString(),
            summary: {
                newLoans: {
                    count: newLoansToday._count.id,
                    amount: newLoansToday._sum.principalAmount ?? 0,
                },
                paymentsReceived: {
                    count: paymentsToday.length,
                    totalAmount: round2(totalPaymentsAmount),
                    cash: round2(cashCollections),
                    upi: round2(upiCollections),
                    bankTransfer: round2(bankCollections),
                    other: round2(otherCollections),
                    principalRecovered: round2(totalPrincipalRecovered),
                },
                loansClosed: {
                    count: closedLoansToday._count.id,
                    principalAmount: closedLoansToday._sum.principalAmount ?? 0,
                },
                packetsStored: packetsStoredToday,
                packetsReleased: packetsReleasedToday,
            },
            interestToday: {
                realized: round2(totalRealizedInterest),
                unrealizedEstimated: round2(dailyUnrealizedAccrual),
                note: 'Realized interest is actual cash/UPI collected today via payments. Unrealized interest is daily calculated accrual across active portfolio.',
            },
            cashReconciliation: {
                openingCash: round2(openingCash),
                cashCollections: round2(cashCollections),
                cashDisbursements: round2(cashDisbursements),
                expectedClosingCash: round2(expectedClosingCash),
                lastRecordedPhysicalCash: latestReconVal?.actualPhysicalCash ?? null,
                lastVariance: latestReconVal?.variance ?? null,
                lastReconciledAt: latestCashRecon?.timestamp ?? null,
                status: latestCashRecon?.result ?? 'PENDING_PHYSICAL_COUNT',
            },
            dueLoans: {
                dueToday: dueTodayLoans,
                due3Days: due3DaysLoans,
                due7Days: due7DaysLoans,
            },
            overdueBuckets,
            inventoryReconciliation: {
                lastPhysicalCount: latestPhysicalRecon?.newValue?.actualCount ?? null,
                lastExpectedCount: latestPhysicalRecon?.oldValue?.expectedCount ?? null,
                lastVariance: latestPhysicalRecon?.newValue?.variance ?? null,
                lastReconciledAt: latestPhysicalRecon?.timestamp ?? null,
                status: latestPhysicalRecon?.result ?? 'VERIFIED',
            },
        };
    }
    async recordDailyCashReconciliation(dto, actor) {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
        const [disbursementsToday, cashPaymentsToday] = await Promise.all([
            this.prisma.loan.aggregate({
                where: {
                    sanctionedDate: { gte: startOfDay, lte: endOfDay },
                    status: { not: 'DRAFT' },
                },
                _sum: { principalAmount: true },
            }),
            this.prisma.payment.aggregate({
                where: {
                    paymentDate: { gte: startOfDay, lte: endOfDay },
                    mode: 'CASH',
                    lifecycle: 'ACTIVE',
                },
                _sum: { amount: true },
            }),
        ]);
        const cashCollections = cashPaymentsToday._sum.amount ?? 0;
        const cashDisbursements = disbursementsToday._sum.principalAmount ?? 0;
        const expectedClosingCash = dto.openingCash + cashCollections - cashDisbursements;
        const variance = round2(dto.actualPhysicalCash - expectedClosingCash);
        const hasDiscrepancy = Math.abs(variance) > 1.0;
        const audit = await this.prisma.auditLog.create({
            data: {
                entityType: 'DailyCashReconciliation',
                entityId: `RECON-${today.toISOString().split('T')[0]}`,
                action: 'DAILY_CASH_RECONCILIATION',
                userId: actor.id,
                roleAtTime: actor.role,
                oldValue: {
                    openingCash: dto.openingCash,
                    expectedClosingCash,
                    cashCollections,
                    cashDisbursements,
                },
                newValue: {
                    actualPhysicalCash: dto.actualPhysicalCash,
                    closingCash: dto.actualPhysicalCash,
                    variance,
                },
                reason: dto.notes ?? (hasDiscrepancy ? 'Cash variance detected' : 'Physical cash matched expected closing balance'),
                result: hasDiscrepancy ? 'VARIANCE_FLAGGED' : 'MATCH',
            },
        });
        return {
            success: true,
            openingCash: dto.openingCash,
            cashCollections,
            cashDisbursements,
            expectedClosingCash,
            actualPhysicalCash: dto.actualPhysicalCash,
            variance,
            result: audit.result,
            auditId: audit.id,
        };
    }
    async recordPhysicalInventoryReconciliation(dto, actor) {
        const expectedStoredPackets = await this.prisma.packet.count({
            where: { status: 'STORED' },
        });
        const variance = dto.actualPhysicalPackets - expectedStoredPackets;
        const isMatched = variance === 0;
        const audit = await this.prisma.auditLog.create({
            data: {
                entityType: 'PhysicalInventoryReconciliation',
                entityId: `VAULT-RECON-${new Date().toISOString().split('T')[0]}`,
                action: 'PHYSICAL_INVENTORY_RECONCILIATION',
                userId: actor.id,
                roleAtTime: actor.role,
                oldValue: { expectedCount: expectedStoredPackets },
                newValue: { actualCount: dto.actualPhysicalPackets, variance },
                reason: dto.notes ?? (isMatched ? 'Vault physical audit verified with database' : 'Physical packet count mismatch!'),
                result: isMatched ? 'MATCH' : 'VARIANCE_FLAGGED',
            },
        });
        return {
            success: true,
            expectedStoredPackets,
            actualPhysicalPackets: dto.actualPhysicalPackets,
            variance,
            result: audit.result,
            auditId: audit.id,
        };
    }
    async getFinancialPortfolio(query) {
        const targetDate = query?.asOfDate ? new Date(query.asOfDate) : new Date();
        const activeLoans = await this.prisma.loan.findMany({
            where: { status: 'ACTIVE' },
            include: {
                jewelleryItems: { select: { valuation: true } },
            },
        });
        let totalActivePrincipal = 0;
        let totalUnrealizedInterestAccrued = 0;
        const ltvBands = {
            under50: { count: 0, principal: 0, label: 'Under 50% (Very Safe)' },
            b50_75: { count: 0, principal: 0, label: '50% – 75% (Standard)' },
            b75_85: { count: 0, principal: 0, label: '75% – 85% (RBI Warning Threshold)' },
            above85: { count: 0, principal: 0, label: 'Above 85% (High Risk)' },
        };
        for (const l of activeLoans) {
            const p = l.principalAmount ?? 0;
            totalActivePrincipal += p;
            const startDate = l.sanctionedDate ?? l.createdAt;
            const days = Math.max(0, Math.round((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
            const rate = l.interestRate ?? 18;
            const accrued = (p * (rate / 12 / 100) * days) / 30;
            totalUnrealizedInterestAccrued += accrued;
            const itemValuation = l.jewelleryItems.reduce((sum, item) => sum + (item.valuation || 0), 0);
            const ltv = itemValuation > 0 ? (p / itemValuation) * 100 : 70;
            if (ltv < 50) {
                ltvBands.under50.count++;
                ltvBands.under50.principal += p;
            }
            else if (ltv <= 75) {
                ltvBands.b50_75.count++;
                ltvBands.b50_75.principal += p;
            }
            else if (ltv <= 85) {
                ltvBands.b75_85.count++;
                ltvBands.b75_85.principal += p;
            }
            else {
                ltvBands.above85.count++;
                ltvBands.above85.principal += p;
            }
        }
        const [paymentsAgg, normalClosedLoansAgg, auctionedLoansAgg, totalDisbursedAgg] = await Promise.all([
            this.prisma.payment.aggregate({
                where: { lifecycle: 'ACTIVE' },
                _sum: {
                    amount: true,
                    principalComponent: true,
                    interestComponent: true,
                    penaltyComponent: true,
                    otherCharges: true,
                },
                _count: { id: true },
            }),
            this.prisma.loan.aggregate({
                where: { status: 'CLOSED' },
                _count: { id: true },
                _sum: { principalAmount: true },
            }),
            this.prisma.loan.aggregate({
                where: { status: 'AUCTIONED' },
                _count: { id: true },
                _sum: { principalAmount: true },
            }),
            this.prisma.loan.aggregate({
                where: { status: { not: 'DRAFT' } },
                _count: { id: true },
                _sum: { principalAmount: true },
            }),
        ]);
        const periodicTrendsResult = await this.getPeriodicTrends({ groupBy: 'month', limit: 12 });
        const monthlyTrends = periodicTrendsResult.rows.map((r) => ({
            month: r.period,
            collectedInterest: r.interestCollected,
            principalReceived: r.principalRepaid,
            capitalDisbursed: r.capitalLent,
            releasedPrincipal: r.releasedPrincipal,
            netCashFlow: r.netCashFlow,
        }));
        const capitalLentTotal = totalDisbursedAgg._sum.principalAmount ?? 0;
        const capitalReceivedTotal = paymentsAgg._sum.principalComponent ?? 0;
        const totalCollectedInterest = paymentsAgg._sum.interestComponent ?? 0;
        const totalFeesCollected = (paymentsAgg._sum.penaltyComponent ?? 0) + (paymentsAgg._sum.otherCharges ?? 0);
        const netCashFlow = (capitalReceivedTotal + totalCollectedInterest + totalFeesCollected) - capitalLentTotal;
        const badDebtWriteOff = 0;
        const lendingProfit = round2(totalCollectedInterest + totalFeesCollected - badDebtWriteOff);
        return {
            asOf: targetDate.toISOString(),
            interest: {
                totalRealizedCollected: round2(totalCollectedInterest),
                totalUnrealizedAccruedActiveBook: round2(totalUnrealizedInterestAccrued),
                activePrincipalBook: round2(totalActivePrincipal),
                note: 'Realized Interest represents actual cash received in payments. Unrealized Interest Accrued represents active interest owed across live loans as of this date.',
            },
            capitalSummary: {
                capitalLent: {
                    amount: round2(capitalLentTotal),
                    loanCount: totalDisbursedAgg._count.id,
                },
                capitalReceived: {
                    amount: round2(capitalReceivedTotal),
                    paymentCount: paymentsAgg._count.id,
                },
                activeOutstandingPrincipal: round2(totalActivePrincipal),
                netCashFlow: round2(netCashFlow),
            },
            loansClosedSummary: {
                normalClosure: {
                    count: normalClosedLoansAgg._count.id,
                    principal: normalClosedLoansAgg._sum.principalAmount ?? 0,
                },
                auctionClosure: {
                    count: auctionedLoansAgg._count.id,
                    principal: auctionedLoansAgg._sum.principalAmount ?? 0,
                },
            },
            profitAndLoss: {
                realizedInterestIncome: round2(totalCollectedInterest),
                feesAndPenalties: round2(totalFeesCollected),
                badDebtWriteOffs: badDebtWriteOff,
                netLendingProfit: lendingProfit,
                disclaimer: 'Lending-side operating margin only. Does not include showroom overhead (rent, staff salaries, electricity, insurance).',
            },
            ltvDistribution: ltvBands,
            monthlyTrends: [...monthlyTrends].reverse(),
        };
    }
    async getPeriodicTrends(params) {
        const validGroupBys = ['day', 'month', 'year'];
        const groupBy = validGroupBys.includes(params?.groupBy || '') ? params.groupBy : 'month';
        const truncUnit = groupBy === 'day' ? 'day' : groupBy === 'year' ? 'year' : 'month';
        const charFormat = groupBy === 'day' ? 'YYYY-MM-DD' : groupBy === 'year' ? 'YYYY' : 'YYYY-MM';
        let dateFilterDisb = '';
        let dateFilterPay = '';
        let dateFilterRel = '';
        let dateFilterClosed = '';
        let startIso;
        let endIso;
        if (params?.startDate && !isNaN(Date.parse(params.startDate))) {
            const s = new Date(params.startDate);
            s.setHours(0, 0, 0, 0);
            startIso = s.toISOString();
        }
        if (params?.endDate && !isNaN(Date.parse(params.endDate))) {
            const e = new Date(params.endDate);
            e.setHours(23, 59, 59, 999);
            endIso = e.toISOString();
        }
        if (startIso && endIso) {
            dateFilterDisb = `AND "sanctionedDate" >= '${startIso}'::timestamptz AND "sanctionedDate" <= '${endIso}'::timestamptz`;
            dateFilterPay = `AND "paymentDate" >= '${startIso}'::timestamptz AND "paymentDate" <= '${endIso}'::timestamptz`;
            dateFilterRel = `AND "releasedAt" >= '${startIso}'::timestamptz AND "releasedAt" <= '${endIso}'::timestamptz`;
            dateFilterClosed = `AND "closureDate" >= '${startIso}'::timestamptz AND "closureDate" <= '${endIso}'::timestamptz`;
        }
        else if (startIso) {
            dateFilterDisb = `AND "sanctionedDate" >= '${startIso}'::timestamptz`;
            dateFilterPay = `AND "paymentDate" >= '${startIso}'::timestamptz`;
            dateFilterRel = `AND "releasedAt" >= '${startIso}'::timestamptz`;
            dateFilterClosed = `AND "closureDate" >= '${startIso}'::timestamptz`;
        }
        else if (endIso) {
            dateFilterDisb = `AND "sanctionedDate" <= '${endIso}'::timestamptz`;
            dateFilterPay = `AND "paymentDate" <= '${endIso}'::timestamptz`;
            dateFilterRel = `AND "releasedAt" <= '${endIso}'::timestamptz`;
            dateFilterClosed = `AND "closureDate" <= '${endIso}'::timestamptz`;
        }
        const defaultLimit = groupBy === 'day' ? 30 : groupBy === 'year' ? 10 : 24;
        const limitClause = (params?.limit || (!startIso && !endIso)) ? `LIMIT ${Math.min(365, params?.limit || defaultLimit)}` : '';
        const [disbursements, payments, closures, jewelleryReleases] = await Promise.all([
            this.prisma.$queryRawUnsafe(`
        SELECT 
          to_char(date_trunc('${truncUnit}', "sanctionedDate"), '${charFormat}') as period,
          COUNT(id)::int as "loansDisbursedCount",
          ROUND(COALESCE(SUM("principalAmount"), 0)::numeric, 2)::float as "capitalLent"
        FROM loans
        WHERE status != 'DRAFT' AND "sanctionedDate" IS NOT NULL ${dateFilterDisb}
        GROUP BY date_trunc('${truncUnit}', "sanctionedDate")
        ORDER BY date_trunc('${truncUnit}', "sanctionedDate") DESC
        ${limitClause};
      `),
            this.prisma.$queryRawUnsafe(`
        SELECT 
          to_char(date_trunc('${truncUnit}', "paymentDate"), '${charFormat}') as period,
          COUNT(id)::int as "paymentsCount",
          ROUND(COALESCE(SUM("principalComponent"), 0)::numeric, 2)::float as "principalRepaid",
          ROUND(COALESCE(SUM("interestComponent"), 0)::numeric, 2)::float as "interestCollected",
          ROUND(COALESCE(SUM("penaltyComponent" + "otherCharges"), 0)::numeric, 2)::float as "penaltiesAndFees",
          ROUND(COALESCE(SUM(amount), 0)::numeric, 2)::float as "totalCashReceived"
        FROM payments
        WHERE lifecycle = 'ACTIVE' ${dateFilterPay}
        GROUP BY date_trunc('${truncUnit}', "paymentDate")
        ORDER BY date_trunc('${truncUnit}', "paymentDate") DESC
        ${limitClause};
      `),
            this.prisma.$queryRawUnsafe(`
        WITH closed_loans AS (
          SELECT 
            l.id,
            l."principalAmount",
            MAX(j."releasedAt") as "closureDate"
          FROM loans l
          JOIN jewellery_items j ON j."loanId" = l.id
          WHERE l.status = 'CLOSED' AND j."releasedAt" IS NOT NULL
          GROUP BY l.id, l."principalAmount"
        )
        SELECT 
          to_char(date_trunc('${truncUnit}', "closureDate"), '${charFormat}') as period,
          COUNT(id)::int as "loansClosedCount",
          ROUND(COALESCE(SUM("principalAmount"), 0)::numeric, 2)::float as "releasedPrincipal"
        FROM closed_loans
        WHERE 1=1 ${dateFilterClosed}
        GROUP BY date_trunc('${truncUnit}', "closureDate")
        ORDER BY date_trunc('${truncUnit}', "closureDate") DESC
        ${limitClause};
      `),
            this.prisma.$queryRawUnsafe(`
        SELECT 
          to_char(date_trunc('${truncUnit}', "releasedAt"), '${charFormat}') as period,
          COUNT(id)::int as "itemsReleasedCount",
          ROUND(COALESCE(SUM("netWeight"), 0)::numeric, 3)::float as "netWeightReleased",
          ROUND(COALESCE(SUM("valuation"), 0)::numeric, 2)::float as "releasedValuation"
        FROM jewellery_items
        WHERE "releasedAt" IS NOT NULL ${dateFilterRel}
        GROUP BY date_trunc('${truncUnit}', "releasedAt")
        ORDER BY date_trunc('${truncUnit}', "releasedAt") DESC
        ${limitClause};
      `),
        ]);
        const map = new Map();
        const ensureRow = (p) => {
            if (!map.has(p)) {
                map.set(p, {
                    period: p,
                    loansDisbursedCount: 0,
                    capitalLent: 0,
                    paymentsCount: 0,
                    principalRepaid: 0,
                    interestCollected: 0,
                    penaltiesAndFees: 0,
                    totalCashReceived: 0,
                    loansClosedCount: 0,
                    releasedPrincipal: 0,
                    itemsReleasedCount: 0,
                    netWeightReleased: 0,
                    releasedValuation: 0,
                    netCashFlow: 0,
                });
            }
            return map.get(p);
        };
        for (const d of disbursements) {
            const row = ensureRow(d.period);
            row.loansDisbursedCount = d.loansDisbursedCount;
            row.capitalLent = d.capitalLent;
        }
        for (const p of payments) {
            const row = ensureRow(p.period);
            row.paymentsCount = p.paymentsCount;
            row.principalRepaid = p.principalRepaid;
            row.interestCollected = p.interestCollected;
            row.penaltiesAndFees = p.penaltiesAndFees;
            row.totalCashReceived = p.totalCashReceived;
        }
        for (const c of closures) {
            const row = ensureRow(c.period);
            row.loansClosedCount = c.loansClosedCount;
            row.releasedPrincipal = c.releasedPrincipal;
        }
        for (const j of jewelleryReleases) {
            const row = ensureRow(j.period);
            row.itemsReleasedCount = j.itemsReleasedCount;
            row.netWeightReleased = j.netWeightReleased;
            row.releasedValuation = j.releasedValuation;
        }
        const rows = Array.from(map.values()).map((r) => ({
            ...r,
            netCashFlow: round2(r.totalCashReceived - r.capitalLent),
        }));
        rows.sort((a, b) => b.period.localeCompare(a.period));
        const summary = rows.reduce((acc, r) => {
            acc.totalCapitalLent += r.capitalLent;
            acc.totalLoansDisbursed += r.loansDisbursedCount;
            acc.totalPrincipalRepaid += r.principalRepaid;
            acc.totalPaymentsCount += r.paymentsCount;
            acc.totalInterestCollected += r.interestCollected;
            acc.totalPenaltiesAndFees += r.penaltiesAndFees;
            acc.totalCashReceived += r.totalCashReceived;
            acc.totalLoansClosed += r.loansClosedCount;
            acc.totalReleasedPrincipal += r.releasedPrincipal;
            acc.totalItemsReleased += r.itemsReleasedCount;
            acc.totalNetWeightReleased += r.netWeightReleased;
            acc.totalNetCashFlow += r.netCashFlow;
            return acc;
        }, {
            totalCapitalLent: 0,
            totalLoansDisbursed: 0,
            totalPrincipalRepaid: 0,
            totalPaymentsCount: 0,
            totalInterestCollected: 0,
            totalPenaltiesAndFees: 0,
            totalCashReceived: 0,
            totalLoansClosed: 0,
            totalReleasedPrincipal: 0,
            totalItemsReleased: 0,
            totalNetWeightReleased: 0,
            totalNetCashFlow: 0,
        });
        summary.totalCapitalLent = round2(summary.totalCapitalLent);
        summary.totalPrincipalRepaid = round2(summary.totalPrincipalRepaid);
        summary.totalInterestCollected = round2(summary.totalInterestCollected);
        summary.totalPenaltiesAndFees = round2(summary.totalPenaltiesAndFees);
        summary.totalCashReceived = round2(summary.totalCashReceived);
        summary.totalReleasedPrincipal = round2(summary.totalReleasedPrincipal);
        summary.totalNetWeightReleased = round2(summary.totalNetWeightReleased);
        summary.totalNetCashFlow = round2(summary.totalNetCashFlow);
        return {
            asOf: new Date().toISOString(),
            groupBy,
            startDate: startIso,
            endDate: endIso,
            summary,
            rows,
        };
    }
    async getCustodyReport() {
        const [goldPledged, silverPledged, releasedGold, releasedSilver, purityGroups, categoryGroups, boxLocations, latestPhysicalRecon, activeLoansPrincipal,] = await Promise.all([
            this.prisma.jewelleryItem.aggregate({
                where: { status: 'PLEDGED', metalType: 'GOLD' },
                _sum: { netWeight: true, grossWeight: true, valuation: true },
                _count: { id: true },
            }),
            this.prisma.jewelleryItem.aggregate({
                where: { status: 'PLEDGED', metalType: 'SILVER' },
                _sum: { netWeight: true, grossWeight: true, valuation: true },
                _count: { id: true },
            }),
            this.prisma.jewelleryItem.aggregate({
                where: { status: 'RELEASED', metalType: 'GOLD' },
                _sum: { netWeight: true, grossWeight: true, valuation: true },
                _count: { id: true },
            }),
            this.prisma.jewelleryItem.aggregate({
                where: { status: 'RELEASED', metalType: 'SILVER' },
                _sum: { netWeight: true, grossWeight: true, valuation: true },
                _count: { id: true },
            }),
            this.prisma.jewelleryItem.groupBy({
                by: ['purityKarat', 'metalType'],
                where: { status: 'PLEDGED' },
                _count: { id: true },
                _sum: { netWeight: true, grossWeight: true, valuation: true },
                orderBy: { _sum: { netWeight: 'desc' } },
            }),
            this.prisma.jewelleryItem.groupBy({
                by: ['category'],
                where: { status: 'PLEDGED' },
                _count: { id: true },
                _sum: { netWeight: true, grossWeight: true, valuation: true },
                orderBy: { _count: { id: 'desc' } },
                take: 20,
            }),
            this.prisma.storageLocation.findMany({
                where: { safe: 'Vault', locker: 'Box' },
                include: {
                    packets: {
                        where: { status: 'STORED' },
                        select: { id: true, packetCode: true },
                    },
                },
                orderBy: { position: 'asc' },
            }),
            this.prisma.auditLog.findFirst({
                where: { entityType: 'PhysicalInventoryReconciliation' },
                orderBy: { timestamp: 'desc' },
            }),
            this.prisma.loan.aggregate({
                where: { status: 'ACTIVE' },
                _sum: { principalAmount: true },
            }),
        ]);
        const goldMarketRatePerGram = 7500;
        const silverMarketRatePerGram = 92;
        const goldNetGrams = goldPledged._sum.netWeight ?? 0;
        const silverNetGrams = silverPledged._sum.netWeight ?? 0;
        const goldEstimatedMarketVal = goldNetGrams * goldMarketRatePerGram;
        const silverEstimatedMarketVal = silverNetGrams * silverMarketRatePerGram;
        const totalCollateralMarketValue = goldEstimatedMarketVal + silverEstimatedMarketVal;
        const totalExposurePrincipal = activeLoansPrincipal._sum.principalAmount ?? 0;
        const overallMarginOfSafety = totalCollateralMarketValue > 0
            ? round2(((totalCollateralMarketValue - totalExposurePrincipal) / totalCollateralMarketValue) * 100)
            : 0;
        const boxMap = new Map();
        for (let i = 1; i <= 100; i++)
            boxMap.set(i, 0);
        for (const loc of boxLocations) {
            const boxNum = parseInt(loc.position, 10);
            if (!isNaN(boxNum) && boxNum >= 1 && boxNum <= 100) {
                boxMap.set(boxNum, loc.packets.length);
            }
        }
        const boxOccupancy = Array.from(boxMap.entries()).map(([boxNum, packetCount]) => ({
            box: String(boxNum).padStart(2, '0'),
            packetCount,
            isOverloaded: packetCount > 30,
            status: packetCount > 30 ? 'OVERLOADED' : packetCount > 20 ? 'BUSY' : 'NORMAL',
        }));
        const totalVaultPackets = boxOccupancy.reduce((sum, b) => sum + b.packetCount, 0);
        return {
            asOf: new Date().toISOString(),
            goldPledged: {
                count: goldPledged._count.id,
                grossWeight: round2(goldPledged._sum.grossWeight ?? 0),
                netWeight: round2(goldNetGrams),
                valuation: round2(goldPledged._sum.valuation ?? 0),
                estimatedMarketValue: round2(goldEstimatedMarketVal),
            },
            silverPledged: {
                count: silverPledged._count.id,
                grossWeight: round2(silverPledged._sum.grossWeight ?? 0),
                netWeight: round2(silverNetGrams),
                valuation: round2(silverPledged._sum.valuation ?? 0),
                estimatedMarketValue: round2(silverEstimatedMarketVal),
            },
            releasedCustody: {
                goldNetWeight: round2(releasedGold._sum.netWeight ?? 0),
                goldCount: releasedGold._count.id,
                silverNetWeight: round2(releasedSilver._sum.netWeight ?? 0),
                silverCount: releasedSilver._count.id,
            },
            marginOfSafety: {
                totalCollateralMarketValue: round2(totalCollateralMarketValue),
                totalExposurePrincipal: round2(totalExposurePrincipal),
                safetyMarginPercent: overallMarginOfSafety,
                goldSpotRateUsed: goldMarketRatePerGram,
                silverSpotRateUsed: silverMarketRatePerGram,
            },
            purityBreakdown: purityGroups.map((g) => ({
                purity: g.purityKarat,
                metalType: g.metalType,
                count: g._count.id,
                grossWeight: round2(g._sum.grossWeight ?? 0),
                netWeight: round2(g._sum.netWeight ?? 0),
                valuation: round2(g._sum.valuation ?? 0),
            })),
            categoryBreakdown: categoryGroups.map((g) => ({
                category: g.category,
                count: g._count.id,
                grossWeight: round2(g._sum.grossWeight ?? 0),
                netWeight: round2(g._sum.netWeight ?? 0),
                valuation: round2(g._sum.valuation ?? 0),
            })),
            boxes: {
                totalBoxes: 100,
                totalPacketsInVault: totalVaultPackets,
                occupancy: boxOccupancy,
            },
            physicalReconciliation: {
                lastAuditAt: latestPhysicalRecon?.timestamp ?? null,
                expectedPackets: latestPhysicalRecon?.oldValue?.expectedCount ?? totalVaultPackets,
                actualPhysicalCount: latestPhysicalRecon?.newValue?.actualCount ?? totalVaultPackets,
                variance: latestPhysicalRecon?.newValue?.variance ?? 0,
                status: latestPhysicalRecon?.result ?? 'MATCH',
            },
        };
    }
    async getCustomerReport() {
        const [totalCustomers, missingMobile, missingKycDocs, kycStats, topBorrowers] = await Promise.all([
            this.prisma.customer.count(),
            this.prisma.customer.count({
                where: {
                    OR: [{ mobile: null }, { mobile: '' }, { mobile: { startsWith: 'UNKNOWN' } }, { mobile: '0000000000' }],
                },
            }),
            this.prisma.customer.count({
                where: {
                    documents: { none: {} },
                },
            }),
            this.prisma.customer.groupBy({
                by: ['kycStatus'],
                _count: { id: true },
            }),
            this.prisma.customer.findMany({
                where: {
                    loans: { some: { status: 'ACTIVE' } },
                },
                select: {
                    id: true,
                    customerCode: true,
                    fullName: true,
                    mobile: true,
                    kycStatus: true,
                    loans: {
                        where: { status: 'ACTIVE' },
                        select: { id: true, loanCode: true, principalAmount: true },
                    },
                },
                take: 50,
            }),
        ]);
        const rankedBorrowers = topBorrowers
            .map((c) => {
            const activeExposure = c.loans.reduce((sum, l) => sum + (l.principalAmount || 0), 0);
            return {
                id: c.id,
                customerCode: c.customerCode,
                fullName: c.fullName,
                mobile: c.mobile,
                kycStatus: c.kycStatus,
                activeLoansCount: c.loans.length,
                activeExposure: round2(activeExposure),
            };
        })
            .sort((a, b) => b.activeExposure - a.activeExposure)
            .slice(0, 10);
        const verified = kycStats.find((s) => s.kycStatus === 'VERIFIED')?._count.id ?? 0;
        const pending = kycStats.find((s) => s.kycStatus === 'PENDING')?._count.id ?? 0;
        return {
            asOf: new Date().toISOString(),
            acquisition: {
                totalCustomers,
                kycVerified: verified,
                kycPending: pending,
                kycVerifiedRate: totalCustomers > 0 ? round2((verified / totalCustomers) * 100) : 0,
            },
            kycMissingTracker: {
                missingMobileCount: missingMobile,
                missingMobilePercent: totalCustomers > 0 ? round2((missingMobile / totalCustomers) * 100) : 0,
                missingKycDocsCount: missingKycDocs,
                missingKycDocsPercent: totalCustomers > 0 ? round2((missingKycDocs / totalCustomers) * 100) : 0,
            },
            topBorrowers: rankedBorrowers,
        };
    }
    async getStaffAccountabilityReport() {
        const [cashierCollections, auditLogs, exceptions] = await Promise.all([
            this.prisma.payment.groupBy({
                by: ['cashierId', 'mode'],
                where: { lifecycle: 'ACTIVE' },
                _count: { id: true },
                _sum: { amount: true, principalComponent: true, interestComponent: true },
            }),
            this.prisma.auditLog.findMany({
                take: 50,
                orderBy: { timestamp: 'desc' },
                include: {
                    user: { select: { id: true, fullName: true, role: true } },
                },
            }),
            this.prisma.biometricVerificationLog.findMany({
                where: { fallbackUsed: true },
                take: 50,
                orderBy: { timestamp: 'desc' },
                include: {
                    customer: { select: { fullName: true, customerCode: true } },
                },
            }),
        ]);
        const cashierIds = [...new Set(cashierCollections.map((c) => c.cashierId))];
        const users = await this.prisma.user.findMany({
            where: { id: { in: cashierIds } },
            select: { id: true, fullName: true, email: true, role: true },
        });
        const userMap = new Map(users.map((u) => [u.id, u]));
        const cashierMap = new Map();
        for (const c of cashierCollections) {
            if (!cashierMap.has(c.cashierId)) {
                const u = userMap.get(c.cashierId);
                cashierMap.set(c.cashierId, {
                    cashierId: c.cashierId,
                    cashierName: u?.fullName ?? 'Counter Cashier',
                    role: u?.role ?? 'STAFF',
                    totalCollected: 0,
                    receiptsCount: 0,
                    modes: { CASH: 0, UPI: 0, BANK_TRANSFER: 0, OTHER: 0 },
                });
            }
            const record = cashierMap.get(c.cashierId);
            record.totalCollected += c._sum.amount ?? 0;
            record.receiptsCount += c._count.id;
            if (record.modes[c.mode] !== undefined) {
                record.modes[c.mode] += c._sum.amount ?? 0;
            }
        }
        return {
            asOf: new Date().toISOString(),
            cashierCollections: Array.from(cashierMap.values()).map((c) => ({
                ...c,
                totalCollected: round2(c.totalCollected),
            })),
            employeeActivity: auditLogs.map((a) => ({
                id: a.id,
                action: a.action,
                entityType: a.entityType,
                entityId: a.entityId,
                performedBy: a.user?.fullName ?? a.userId,
                role: a.roleAtTime,
                result: a.result,
                reason: a.reason,
                timestamp: a.timestamp.toISOString(),
            })),
            exceptionsAndOverrides: exceptions.map((e) => ({
                id: e.id,
                type: 'BIOMETRIC_FALLBACK',
                customerName: e.customer.fullName,
                customerCode: e.customer.customerCode,
                reason: e.fallbackReason,
                authorizedById: e.verifiedById,
                timestamp: e.timestamp.toISOString(),
            })),
        };
    }
    async generateCsv(reportType, query) {
        const timestamp = new Date().toISOString();
        switch (reportType) {
            case 'periodic-trends': {
                const trends = await this.getPeriodicTrends({
                    groupBy: query?.groupBy || 'month',
                    startDate: query?.startDate,
                    endDate: query?.endDate,
                });
                const rows = [
                    `# RADHIKA JEWELLERS - CAPITAL CASH FLOW & RELEASE BREAKDOWN (${trends.groupBy.toUpperCase()}-WISE)`,
                    `# Generated As Of: ${timestamp}`,
                    `# Date Filter: ${trends.startDate || 'Beginning of time'} to ${trends.endDate || 'Present'}`,
                    `# Summary: Total Lent: INR ${trends.summary.totalCapitalLent} across ${trends.summary.totalLoansDisbursed} loans | Total Received: INR ${trends.summary.totalCashReceived} (Principal: INR ${trends.summary.totalPrincipalRepaid} + Interest: INR ${trends.summary.totalInterestCollected} + Fees: INR ${trends.summary.totalPenaltiesAndFees}) | Total Released: INR ${trends.summary.totalReleasedPrincipal} across ${trends.summary.totalLoansClosed} closed loans (${trends.summary.totalNetWeightReleased}g gold) | Net Cash Flow: INR ${trends.summary.totalNetCashFlow}`,
                    `\nPeriod,Loans Disbursed,Capital Lent (INR),Payments Count,Principal Repaid (INR),Realized Interest (INR),Fees & Penalties (INR),Total Cash Received (INR),Loans Closed,Released Principal (INR),Jewellery Items Released,Net Gold Weight Released (g),Released Collateral Valuation (INR),Net Cash Flow (INR)`,
                    ...trends.rows.map((r) => [
                        `"${r.period}"`,
                        r.loansDisbursedCount,
                        r.capitalLent,
                        r.paymentsCount,
                        r.principalRepaid,
                        r.interestCollected,
                        r.penaltiesAndFees,
                        r.totalCashReceived,
                        r.loansClosedCount,
                        r.releasedPrincipal,
                        r.itemsReleasedCount,
                        r.netWeightReleased,
                        r.releasedValuation,
                        r.netCashFlow,
                    ].join(',')),
                ];
                return rows.join('\n');
            }
            case 'daily-operations': {
                const data = await this.getDailyOperations();
                const rows = [
                    `# RADHIKA JEWELLERS - DAILY OPERATIONS REPORT`,
                    `# Generated As Of: ${timestamp}`,
                    `Metric,Count,Amount (INR)`,
                    `New Loans Disbursed Today,${data.summary.newLoans.count},${data.summary.newLoans.amount}`,
                    `Total Payments Received,${data.summary.paymentsReceived.count},${data.summary.paymentsReceived.totalAmount}`,
                    `Cash Collections,-,${data.summary.paymentsReceived.cash}`,
                    `UPI Collections,-,${data.summary.paymentsReceived.upi}`,
                    `Bank Transfer Collections,-,${data.summary.paymentsReceived.bankTransfer}`,
                    `Realized Interest Collected Today,-,${data.interestToday.realized}`,
                    `Unrealized Estimated Accrual Today,-,${data.interestToday.unrealizedEstimated}`,
                    `Loans Closed Today,${data.summary.loansClosed.count},${data.summary.loansClosed.principalAmount}`,
                    `Packets Stored Today,${data.summary.packetsStored},-`,
                    `Packets Released Today,${data.summary.packetsReleased},-`,
                    `Overdue 1-7 Days,${data.overdueBuckets.b1_7.count},${data.overdueBuckets.b1_7.exposure}`,
                    `Overdue 8-30 Days,${data.overdueBuckets.b8_30.count},${data.overdueBuckets.b8_30.exposure}`,
                    `Overdue 31-90 Days,${data.overdueBuckets.b31_90.count},${data.overdueBuckets.b31_90.exposure}`,
                    `Overdue 90+ Days,${data.overdueBuckets.b90Plus.count},${data.overdueBuckets.b90Plus.exposure}`,
                ];
                return rows.join('\n');
            }
            case 'financial-portfolio': {
                const data = await this.getFinancialPortfolio();
                const rows = [
                    `# RADHIKA JEWELLERS - FINANCIAL & PORTFOLIO REPORT`,
                    `# Generated As Of: ${timestamp}`,
                    `Metric,Value (INR),Notes`,
                    `Realized Collected Interest,${data.interest.totalRealizedCollected},Actual cash collected via payments`,
                    `Unrealized Accrued Interest Active Book,${data.interest.totalUnrealizedAccruedActiveBook},Interest owed across live portfolio`,
                    `Active Principal Book,${data.interest.activePrincipalBook},Live loan capital`,
                    `Total Capital Disbursed,${data.capitalSummary.capitalLent.amount},Total lent across ${data.capitalSummary.capitalLent.loanCount} loans`,
                    `Total Capital Repaid,${data.capitalSummary.capitalReceived.amount},Total principal recovered`,
                    `Net Cash Flow,${data.capitalSummary.netCashFlow},Liquidity balance`,
                    `Lending Profit,${data.profitAndLoss.netLendingProfit},Realized interest + fees`,
                    `\n# LTV Risk Bands`,
                    `Band,Count,Principal (INR)`,
                    `Under 50%,${data.ltvDistribution.under50.count},${data.ltvDistribution.under50.principal}`,
                    `50% - 75%,${data.ltvDistribution.b50_75.count},${data.ltvDistribution.b50_75.principal}`,
                    `75% - 85% (RBI Warning),${data.ltvDistribution.b75_85.count},${data.ltvDistribution.b75_85.principal}`,
                    `Above 85% (Critical),${data.ltvDistribution.above85.count},${data.ltvDistribution.above85.principal}`,
                ];
                return rows.join('\n');
            }
            case 'custody': {
                const data = await this.getCustodyReport();
                const rows = [
                    `# RADHIKA JEWELLERS - GOLD/SILVER CUSTODY & VAULT REPORT`,
                    `# Generated As Of: ${timestamp}`,
                    `Category,Count,Net Weight (g),Valuation (INR)`,
                    `Gold Pledged,${data.goldPledged.count},${data.goldPledged.netWeight},${data.goldPledged.valuation}`,
                    `Silver Pledged,${data.silverPledged.count},${data.silverPledged.netWeight},${data.silverPledged.valuation}`,
                    `Total Collateral Market Value,-,-,${data.marginOfSafety.totalCollateralMarketValue}`,
                    `Total Principal Exposure,-,-,${data.marginOfSafety.totalExposurePrincipal}`,
                    `Portfolio Margin of Safety Percent,-,-,${data.marginOfSafety.safetyMarginPercent}%`,
                    `\n# Purity Breakdown`,
                    `Purity,Metal,Count,Net Weight (g)`,
                    ...data.purityBreakdown.map((p) => `"${p.purity}",${p.metalType},${p.count},${p.netWeight}`),
                    `\n# Box Occupancy Matrix (100 Boxes)`,
                    `Box Number,Packet Count,Status`,
                    ...data.boxes.occupancy.map((b) => `Box-${b.box},${b.packetCount},${b.status}`),
                ];
                return rows.join('\n');
            }
            case 'customers': {
                const data = await this.getCustomerReport();
                const rows = [
                    `# RADHIKA JEWELLERS - CUSTOMER & CONCENTRATION REPORT`,
                    `# Generated As Of: ${timestamp}`,
                    `Metric,Value`,
                    `Total Customers,${data.acquisition.totalCustomers}`,
                    `KYC Verified,${data.acquisition.kycVerified} (${data.acquisition.kycVerifiedRate}%)`,
                    `KYC Pending,${data.acquisition.kycPending}`,
                    `Missing Mobile Numbers,${data.kycMissingTracker.missingMobileCount}`,
                    `Missing KYC ID Proof,${data.kycMissingTracker.missingKycDocsCount}`,
                    `\n# Top Borrowers (Concentration Risk)`,
                    `Customer Code,Name,Mobile,Active Loans,Exposure (INR)`,
                    ...data.topBorrowers.map((b) => `"${b.customerCode}","${b.fullName}","${b.mobile}",${b.activeLoansCount},${b.activeExposure}`),
                ];
                return rows.join('\n');
            }
            case 'staff': {
                const data = await this.getStaffAccountabilityReport();
                const rows = [
                    `# RADHIKA JEWELLERS - STAFF ACCOUNTABILITY REPORT`,
                    `# Generated As Of: ${timestamp}`,
                    `Cashier Name,Role,Receipts Count,Cash (INR),UPI (INR),Bank (INR),Total Collected (INR)`,
                    ...data.cashierCollections.map((c) => `"${c.cashierName}","${c.role}",${c.receiptsCount},${c.modes.CASH},${c.modes.UPI},${c.modes.BANK_TRANSFER},${c.totalCollected}`),
                    `\n# Exceptions & Overrides`,
                    `Customer Code,Customer Name,Type,Reason,Timestamp`,
                    ...data.exceptionsAndOverrides.map((e) => `"${e.customerCode}","${e.customerName}","${e.type}","${e.reason}","${e.timestamp}"`),
                ];
                return rows.join('\n');
            }
            default:
                throw new BadRequestException(`Unknown report type for export: ${reportType}`);
        }
    }
    async getPortfolioHealth() {
        return this.getFinancialPortfolio();
    }
    async getGoldStockAudit() {
        return this.getCustodyReport();
    }
    async getBorrowerAudit() {
        return this.getCustomerReport();
    }
    async getCollectionsSummary() {
        const data = await this.getDailyOperations();
        return {
            totalCount: data.summary.paymentsReceived.count,
            totalAmount: data.summary.paymentsReceived.totalAmount,
            totalPrincipalRecovered: data.summary.paymentsReceived.principalRecovered,
            totalInterestEarned: data.interestToday.realized,
            modes: [
                { mode: 'CASH', count: 0, amount: data.summary.paymentsReceived.cash, principal: 0, interest: 0 },
                { mode: 'UPI', count: 0, amount: data.summary.paymentsReceived.upi, principal: 0, interest: 0 },
                { mode: 'BANK_TRANSFER', count: 0, amount: data.summary.paymentsReceived.bankTransfer, principal: 0, interest: 0 },
            ],
        };
    }
};
ReportsService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], ReportsService);
export { ReportsService };
//# sourceMappingURL=reports.service.js.map
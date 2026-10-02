var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { InterestType } from '@prisma/client';
function getCalendarDays(start, end) {
    const d1 = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const d2 = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const diff = d2.getTime() - d1.getTime();
    return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}
function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}
let InterestService = class InterestService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async calculateSettlementQuote(loanId, asOfDate = new Date()) {
        const loan = await this.prisma.loan.findUnique({
            where: { id: loanId },
            include: {
                scheme: true,
                ledgerEntries: {
                    orderBy: { createdAt: 'asc' },
                },
                payments: {
                    where: { lifecycle: 'ACTIVE' },
                    orderBy: { paymentDate: 'asc' },
                },
            },
        });
        if (!loan) {
            throw new NotFoundException(`Loan with ID ${loanId} not found`);
        }
        const startDate = loan.sanctionedDate ?? loan.createdAt;
        const isClosed = loan.status === 'CLOSED';
        const lastPaymentDate = loan.payments.length > 0
            ? loan.payments[loan.payments.length - 1].paymentDate
            : loan.updatedAt;
        const targetDate = isClosed && asOfDate > lastPaymentDate ? lastPaymentDate : asOfDate;
        const daysElapsed = getCalendarDays(startDate, targetDate);
        const annualRate = loan.interestRate ?? loan.scheme?.interestRate ?? 18;
        const interestType = loan.interestType ?? loan.scheme?.interestType ?? InterestType.MONTHLY_SIMPLE;
        const monthlyRate = round2(annualRate / 12);
        if (isClosed) {
            const totalInterestPaid = round2(loan.payments.reduce((sum, p) => sum + (p.interestComponent || 0), 0));
            const penaltyPaid = round2(loan.payments.reduce((sum, p) => sum + (p.penaltyComponent || 0), 0));
            return {
                loanId: loan.id,
                loanCode: loan.loanCode,
                asOfDate: targetDate,
                sanctionedDate: startDate,
                maturityDate: loan.maturityDate,
                daysElapsed,
                principalOutstanding: 0,
                interestRate: annualRate,
                interestType,
                monthlyInterestRate: monthlyRate,
                totalInterestAccrued: totalInterestPaid,
                totalInterestPaid,
                interestDue: 0,
                isOverdue: false,
                overdueDays: 0,
                gracePeriodDays: 7,
                penaltyRate: 0,
                penaltyAccrued: penaltyPaid,
                penaltyPaid,
                penaltyDue: 0,
                otherChargesDue: 0,
                totalDue: 0,
                epochs: [],
            };
        }
        const principalEvents = [];
        for (const entry of loan.ledgerEntries) {
            if (entry.type === 'DISBURSEMENT' ||
                entry.type === 'PRINCIPAL_PAID' ||
                entry.type === 'REVERSAL') {
                const eventDate = entry.type === 'DISBURSEMENT'
                    ? (loan.sanctionedDate ?? entry.createdAt)
                    : entry.createdAt;
                principalEvents.push({
                    date: eventDate,
                    type: entry.type,
                    amount: entry.amount,
                    balanceAfter: entry.balanceAfter,
                });
            }
        }
        const epochs = [];
        let currentPrincipal = 0;
        let epochStart = startDate;
        for (const event of principalEvents) {
            const eventDate = event.date;
            if (eventDate > epochStart && currentPrincipal > 0) {
                const cutDate = eventDate > targetDate ? targetDate : eventDate;
                const daysInEpoch = getCalendarDays(epochStart, cutDate);
                if (daysInEpoch > 0) {
                    const accrued = this.computeInterest(currentPrincipal, annualRate, interestType, daysInEpoch);
                    epochs.push({
                        from: epochStart,
                        to: cutDate,
                        days: daysInEpoch,
                        principal: currentPrincipal,
                        annualRate,
                        accruedInterest: round2(accrued),
                    });
                }
            }
            currentPrincipal = event.balanceAfter;
            epochStart = eventDate > startDate ? eventDate : startDate;
            if (eventDate >= targetDate)
                break;
        }
        if (targetDate > epochStart && currentPrincipal > 0) {
            const remainingDays = getCalendarDays(epochStart, targetDate);
            if (remainingDays > 0) {
                const accrued = this.computeInterest(currentPrincipal, annualRate, interestType, remainingDays);
                epochs.push({
                    from: epochStart,
                    to: targetDate,
                    days: remainingDays,
                    principal: currentPrincipal,
                    annualRate,
                    accruedInterest: round2(accrued),
                });
            }
        }
        const totalInterestAccrued = round2(epochs.reduce((sum, ep) => sum + ep.accruedInterest, 0));
        const totalInterestPaid = round2(loan.payments.reduce((sum, p) => sum + (p.interestComponent || 0), 0));
        const interestDue = Math.max(0, round2(totalInterestAccrued - totalInterestPaid));
        let isOverdue = false;
        let overdueDays = 0;
        const schemeConfig = loan.scheme?.config || {};
        const gracePeriodDays = schemeConfig.gracePeriodDays ?? 7;
        const penaltyRate = schemeConfig.penaltyRate ?? 3.0;
        let penaltyAccrued = 0;
        if (loan.maturityDate && targetDate > loan.maturityDate && currentPrincipal > 0) {
            const rawOverdueDays = getCalendarDays(loan.maturityDate, targetDate);
            if (rawOverdueDays > 0) {
                isOverdue = true;
                overdueDays = rawOverdueDays;
                if (overdueDays > gracePeriodDays) {
                    penaltyAccrued = round2((currentPrincipal * (penaltyRate / 100) * overdueDays) / 365);
                }
            }
        }
        const penaltyPaid = round2(loan.payments.reduce((sum, p) => sum + (p.penaltyComponent || 0), 0));
        const penaltyDue = Math.max(0, round2(penaltyAccrued - penaltyPaid));
        const totalOtherChargesExpected = (loan.otherCharges ?? 0) + (loan.processingCharges ?? 0);
        const totalOtherChargesPaid = round2(loan.payments.reduce((sum, p) => sum + (p.otherCharges || 0), 0));
        const otherChargesDue = Math.max(0, round2(totalOtherChargesExpected - totalOtherChargesPaid));
        const totalDue = round2(currentPrincipal + interestDue + penaltyDue + otherChargesDue);
        return {
            loanId: loan.id,
            loanCode: loan.loanCode,
            asOfDate: targetDate,
            sanctionedDate: startDate,
            maturityDate: loan.maturityDate,
            daysElapsed,
            principalOutstanding: currentPrincipal,
            interestRate: annualRate,
            interestType,
            monthlyInterestRate: monthlyRate,
            totalInterestAccrued,
            totalInterestPaid,
            interestDue,
            isOverdue,
            overdueDays,
            gracePeriodDays,
            penaltyRate,
            penaltyAccrued,
            penaltyPaid,
            penaltyDue,
            otherChargesDue,
            totalDue,
            epochs,
        };
    }
    async allocatePayment(loanId, amount, asOfDate = new Date()) {
        const quote = await this.calculateSettlementQuote(loanId, asOfDate);
        let remaining = Math.max(0, amount);
        const otherAlloc = Math.min(remaining, quote.otherChargesDue);
        remaining -= otherAlloc;
        const penaltyAlloc = Math.min(remaining, quote.penaltyDue);
        remaining -= penaltyAlloc;
        const interestAlloc = Math.min(remaining, quote.interestDue);
        remaining -= interestAlloc;
        const principalAlloc = Math.min(remaining, quote.principalOutstanding);
        remaining -= principalAlloc;
        return {
            amount,
            principalComponent: round2(principalAlloc),
            interestComponent: round2(interestAlloc),
            penaltyComponent: round2(penaltyAlloc),
            otherCharges: round2(otherAlloc),
            remainingUnallocated: round2(remaining),
        };
    }
    computeInterest(principal, annualRate, type, days) {
        if (principal <= 0 || days <= 0 || annualRate <= 0)
            return 0;
        switch (type) {
            case InterestType.MONTHLY_SIMPLE: {
                const monthlyRate = annualRate / 12 / 100;
                return (principal * monthlyRate * days) / 30;
            }
            case InterestType.DAILY_SIMPLE:
            case InterestType.ANNUAL_SIMPLE:
            default: {
                return (principal * (annualRate / 100) * days) / 365;
            }
        }
    }
};
InterestService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], InterestService);
export { InterestService };
//# sourceMappingURL=interest.service.js.map
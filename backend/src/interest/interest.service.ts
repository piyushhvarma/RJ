import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { InterestType } from '@prisma/client';

export interface InterestEpoch {
  from: Date;
  to: Date;
  days: number;
  principal: number;
  annualRate: number;
  accruedInterest: number;
}

export interface SettlementQuote {
  loanId: string;
  loanCode: string;
  asOfDate: Date;
  sanctionedDate: Date;
  maturityDate?: Date | null;
  daysElapsed: number;
  principalOutstanding: number;
  interestRate: number;
  interestType: InterestType;
  monthlyInterestRate: number;
  totalInterestAccrued: number;
  totalInterestPaid: number;
  interestDue: number;
  isOverdue: boolean;
  overdueDays: number;
  gracePeriodDays: number;
  penaltyRate: number;
  penaltyAccrued: number;
  penaltyPaid: number;
  penaltyDue: number;
  otherChargesDue: number;
  totalDue: number;
  epochs: InterestEpoch[];
}

export interface PaymentAllocation {
  amount: number;
  principalComponent: number;
  interestComponent: number;
  penaltyComponent: number;
  otherCharges: number;
  remainingUnallocated: number;
}

function getCalendarDays(start: Date, end: Date): number {
  const d1 = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const d2 = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const diff = d2.getTime() - d1.getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

@Injectable()
export class InterestService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculates a complete settlement quote for a loan as of a specific date.
   * Reconstructs principal balance over time (reducing balance) using the append-only ledger,
   * computes exact accrued simple interest per epoch, checks maturity/grace period for overdue penalty,
   * and nets out payments already made.
   */
  async calculateSettlementQuote(loanId: string, asOfDate: Date = new Date()): Promise<SettlementQuote> {
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

    const targetDate = asOfDate;
    const startDate = loan.sanctionedDate ?? loan.createdAt;
    const daysElapsed = getCalendarDays(startDate, targetDate);

    const annualRate = loan.interestRate ?? loan.scheme?.interestRate ?? 18; // Default 18% p.a.
    const interestType = loan.interestType ?? loan.scheme?.interestType ?? InterestType.MONTHLY_SIMPLE;
    const monthlyRate = round2(annualRate / 12);

    // 1. Reconstruct Principal Timeline across Ledger Entries
    // We identify all events that changed the principal balance (DISBURSEMENT, PRINCIPAL_PAID, REVERSAL).
    const principalEvents: Array<{ date: Date; type: string; amount: number; balanceAfter: number }> = [];

    for (const entry of loan.ledgerEntries) {
      if (
        entry.type === 'DISBURSEMENT' ||
        entry.type === 'PRINCIPAL_PAID' ||
        entry.type === 'REVERSAL'
      ) {
        principalEvents.push({
          date: entry.createdAt,
          type: entry.type,
          amount: entry.amount,
          balanceAfter: entry.balanceAfter,
        });
      }
    }

    // 2. Build Accrual Epochs between events up to targetDate
    const epochs: InterestEpoch[] = [];
    let currentPrincipal = 0;
    let epochStart = startDate;

    for (const event of principalEvents) {
      const eventDate = event.date;

      // If event happened after start and before targetDate, accrue for the preceding interval
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

      if (eventDate >= targetDate) break;
    }

    // Accrue for the final interval up to targetDate
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

    // 3. Subtract Interest Already Paid
    const totalInterestPaid = round2(
      loan.payments.reduce((sum, p) => sum + (p.interestComponent || 0), 0),
    );
    const interestDue = Math.max(0, round2(totalInterestAccrued - totalInterestPaid));

    // 4. Check Maturity and Overdue Penalties
    let isOverdue = false;
    let overdueDays = 0;
    const schemeConfig = (loan.scheme?.config as any) || {};
    const gracePeriodDays = schemeConfig.gracePeriodDays ?? 7;
    const penaltyRate = schemeConfig.penaltyRate ?? 3.0; // 3% p.a. default overdue penalty
    let penaltyAccrued = 0;

    if (loan.maturityDate && targetDate > loan.maturityDate && currentPrincipal > 0) {
      const rawOverdueDays = getCalendarDays(loan.maturityDate, targetDate);
      if (rawOverdueDays > 0) {
        isOverdue = true;
        overdueDays = rawOverdueDays;

        if (overdueDays > gracePeriodDays) {
          // Accrue penalty on outstanding principal for the overdue duration
          penaltyAccrued = round2((currentPrincipal * (penaltyRate / 100) * overdueDays) / 365);
        }
      }
    }

    const penaltyPaid = round2(
      loan.payments.reduce((sum, p) => sum + (p.penaltyComponent || 0), 0),
    );
    const penaltyDue = Math.max(0, round2(penaltyAccrued - penaltyPaid));

    // 5. Other Charges
    const totalOtherChargesExpected = (loan.otherCharges ?? 0) + (loan.processingCharges ?? 0);
    const totalOtherChargesPaid = round2(
      loan.payments.reduce((sum, p) => sum + (p.otherCharges || 0), 0),
    );
    const otherChargesDue = Math.max(0, round2(totalOtherChargesExpected - totalOtherChargesPaid));

    // 6. Total Net Due
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

  /**
   * Allocates an arbitrary incoming payment amount according to the PRD §28 waterfall policy:
   * 1. Other Charges Due
   * 2. Overdue Penalty Due
   * 3. Accrued Interest Due
   * 4. Outstanding Principal
   */
  async allocatePayment(
    loanId: string,
    amount: number,
    asOfDate: Date = new Date(),
  ): Promise<PaymentAllocation> {
    const quote = await this.calculateSettlementQuote(loanId, asOfDate);

    let remaining = Math.max(0, amount);

    // 1. Other charges
    const otherAlloc = Math.min(remaining, quote.otherChargesDue);
    remaining -= otherAlloc;

    // 2. Penalty
    const penaltyAlloc = Math.min(remaining, quote.penaltyDue);
    remaining -= penaltyAlloc;

    // 3. Interest
    const interestAlloc = Math.min(remaining, quote.interestDue);
    remaining -= interestAlloc;

    // 4. Principal
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

  /**
   * Internal simple interest formula based on configured interest type.
   */
  private computeInterest(
    principal: number,
    annualRate: number,
    type: InterestType,
    days: number,
  ): number {
    if (principal <= 0 || days <= 0 || annualRate <= 0) return 0;

    switch (type) {
      case InterestType.MONTHLY_SIMPLE: {
        // Standard Indian gold loan / girvi practice: Monthly Rate = (AnnualRate / 12)%
        // Accrual pro-rata per 30 days
        const monthlyRate = annualRate / 12 / 100;
        return (principal * monthlyRate * days) / 30;
      }
      case InterestType.DAILY_SIMPLE:
      case InterestType.ANNUAL_SIMPLE:
      default: {
        // Daily simple: (P * R * days) / (365 * 100)
        return (principal * (annualRate / 100) * days) / 365;
      }
    }
  }
}

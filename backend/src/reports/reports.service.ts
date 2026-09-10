import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPortfolioHealth() {
    const [statusGroups, totalLoans, activeLoansAgg, closedLoansAgg] = await Promise.all([
      this.prisma.loan.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { principalAmount: true },
      }),
      this.prisma.loan.count(),
      this.prisma.loan.aggregate({
        where: { status: 'ACTIVE' },
        _sum: { principalAmount: true },
        _avg: { principalAmount: true },
        _count: { id: true },
      }),
      this.prisma.loan.aggregate({
        where: { status: 'CLOSED' },
        _sum: { principalAmount: true },
        _count: { id: true },
      }),
    ]);

    // Ticket size breakdown across active loans
    const [micro, standard, medium, large] = await Promise.all([
      this.prisma.loan.count({ where: { status: 'ACTIVE', principalAmount: { lt: 10000 } } }),
      this.prisma.loan.count({
        where: { status: 'ACTIVE', principalAmount: { gte: 10000, lt: 50000 } },
      }),
      this.prisma.loan.count({
        where: { status: 'ACTIVE', principalAmount: { gte: 50000, lt: 100000 } },
      }),
      this.prisma.loan.count({ where: { status: 'ACTIVE', principalAmount: { gte: 100000 } } }),
    ]);

    const activePrincipal = activeLoansAgg._sum.principalAmount ?? 0;
    const closedPrincipal = closedLoansAgg._sum.principalAmount ?? 0;
    const totalPrincipal = activePrincipal + closedPrincipal;

    return {
      statusGroups: statusGroups.map((g) => ({
        status: g.status,
        count: g._count.id,
        principal: g._sum.principalAmount ?? 0,
      })),
      totalLoans,
      activeLoansCount: activeLoansAgg._count.id,
      activePrincipal,
      avgTicketSize: Math.round(activeLoansAgg._avg.principalAmount ?? 0),
      closedLoansCount: closedLoansAgg._count.id,
      closedPrincipal,
      recoveryRate: totalPrincipal > 0 ? (closedPrincipal / totalPrincipal) * 100 : 0,
      ticketDistribution: [
        { label: 'Under ₹10k', count: micro, share: (micro / (activeLoansAgg._count.id || 1)) * 100 },
        { label: '₹10k - ₹50k', count: standard, share: (standard / (activeLoansAgg._count.id || 1)) * 100 },
        { label: '₹50k - ₹1L', count: medium, share: (medium / (activeLoansAgg._count.id || 1)) * 100 },
        { label: 'Above ₹1L', count: large, share: (large / (activeLoansAgg._count.id || 1)) * 100 },
      ],
    };
  }

  async getGoldStockAudit() {
    const [purityGroups, categoryGroups, pledgedAgg, releasedAgg, goldPledgedAgg, silverPledgedAgg] =
      await Promise.all([
        this.prisma.jewelleryItem.groupBy({
          by: ['purityKarat'],
          where: { status: 'PLEDGED' },
          _count: { id: true },
          _sum: { grossWeight: true, netWeight: true, valuation: true },
        }),
        this.prisma.jewelleryItem.groupBy({
          by: ['category'],
          where: { status: 'PLEDGED' },
          _count: { id: true },
          _sum: { netWeight: true, valuation: true },
          orderBy: { _count: { id: 'desc' } },
          take: 14,
        }),
        this.prisma.jewelleryItem.aggregate({
          where: { status: 'PLEDGED' },
          _sum: { grossWeight: true, netWeight: true, valuation: true },
          _count: { id: true },
        }),
        this.prisma.jewelleryItem.aggregate({
          where: { status: 'RELEASED' },
          _sum: { grossWeight: true, netWeight: true, valuation: true },
          _count: { id: true },
        }),
        this.prisma.jewelleryItem.aggregate({
          where: { status: 'PLEDGED', category: { startsWith: 'Gold' } },
          _sum: { grossWeight: true, netWeight: true, valuation: true },
          _count: { id: true },
        }),
        this.prisma.jewelleryItem.aggregate({
          where: { status: 'PLEDGED', category: { startsWith: 'Silver' } },
          _sum: { grossWeight: true, netWeight: true, valuation: true },
          _count: { id: true },
        }),
      ]);

    return {
      pledged: {
        count: pledgedAgg._count.id,
        grossWeight: pledgedAgg._sum.grossWeight ?? 0,
        netWeight: pledgedAgg._sum.netWeight ?? 0,
        valuation: pledgedAgg._sum.valuation ?? 0,
      },
      goldPledged: {
        count: goldPledgedAgg._count.id,
        grossWeight: goldPledgedAgg._sum.grossWeight ?? 0,
        netWeight: goldPledgedAgg._sum.netWeight ?? 0,
        valuation: goldPledgedAgg._sum.valuation ?? 0,
      },
      silverPledged: {
        count: silverPledgedAgg._count.id,
        grossWeight: silverPledgedAgg._sum.grossWeight ?? 0,
        netWeight: silverPledgedAgg._sum.netWeight ?? 0,
        valuation: silverPledgedAgg._sum.valuation ?? 0,
      },
      released: {
        count: releasedAgg._count.id,
        grossWeight: releasedAgg._sum.grossWeight ?? 0,
        netWeight: releasedAgg._sum.netWeight ?? 0,
        valuation: releasedAgg._sum.valuation ?? 0,
      },
      purityBreakdown: purityGroups.map((g) => ({
        purity: g.purityKarat,
        count: g._count.id,
        grossWeight: g._sum.grossWeight ?? 0,
        netWeight: g._sum.netWeight ?? 0,
        valuation: g._sum.valuation ?? 0,
      })),
      categoryBreakdown: categoryGroups.map((g) => ({
        category: g.category,
        count: g._count.id,
        netWeight: g._sum.netWeight ?? 0,
        valuation: g._sum.valuation ?? 0,
      })),
    };
  }

  async getBorrowerAudit() {
    const [totalCustomers, kycStats, bioStats] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.customer.groupBy({
        by: ['kycStatus'],
        _count: { id: true },
      }),
      this.prisma.customer.groupBy({
        by: ['biometricStatus'],
        _count: { id: true },
      }),
    ]);

    const verified = kycStats.find((s) => s.kycStatus === 'VERIFIED')?._count.id ?? 0;
    const pending = kycStats.find((s) => s.kycStatus === 'PENDING')?._count.id ?? 0;
    const enrolledBio = bioStats.find((s) => s.biometricStatus === 'ENROLLED')?._count.id ?? 0;

    return {
      totalCustomers,
      kycVerified: verified,
      kycPending: pending,
      kycVerifiedRate: totalCustomers > 0 ? (verified / totalCustomers) * 100 : 0,
      biometricEnrolled: enrolledBio,
    };
  }

  async getCollectionsSummary() {
    const [paymentModes, totalPayments] = await Promise.all([
      this.prisma.payment.groupBy({
        by: ['mode'],
        _count: { id: true },
        _sum: {
          amount: true,
          principalComponent: true,
          interestComponent: true,
          penaltyComponent: true,
        },
      }),
      this.prisma.payment.aggregate({
        _count: { id: true },
        _sum: {
          amount: true,
          principalComponent: true,
          interestComponent: true,
        },
      }),
    ]);

    if (totalPayments._count.id === 0) {
      const ledgerPaymentAgg = await this.prisma.ledgerEntry.aggregate({
        where: { type: 'PAYMENT' },
        _count: { id: true },
        _sum: { amount: true },
      });
      return {
        totalCount: ledgerPaymentAgg._count.id,
        totalAmount: ledgerPaymentAgg._sum.amount ?? 0,
        totalPrincipalRecovered: ledgerPaymentAgg._sum.amount ?? 0,
        totalInterestEarned: 0,
        modes: [
          {
            mode: 'CASH',
            count: ledgerPaymentAgg._count.id,
            amount: ledgerPaymentAgg._sum.amount ?? 0,
            principal: ledgerPaymentAgg._sum.amount ?? 0,
            interest: 0,
          },
        ],
      };
    }

    return {
      totalCount: totalPayments._count.id,
      totalAmount: totalPayments._sum.amount ?? 0,
      totalPrincipalRecovered: totalPayments._sum.principalComponent ?? 0,
      totalInterestEarned: totalPayments._sum.interestComponent ?? 0,
      modes: paymentModes.map((m) => ({
        mode: m.mode,
        count: m._count.id,
        amount: m._sum.amount ?? 0,
        principal: m._sum.principalComponent ?? 0,
        interest: m._sum.interestComponent ?? 0,
      })),
    };
  }
}

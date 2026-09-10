import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const [
      totalCustomersCount,
      kycVerifiedCount,
      loanStatusGroups,
      pledgedJewellery,
      releasedJewellery,
      packetsStats,
      recentLoans,
      recentCustomers,
    ] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.customer.count({ where: { kycStatus: 'VERIFIED' } }),
      this.prisma.loan.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { principalAmount: true },
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
      this.prisma.packet.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.loan.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          loanCode: true,
          status: true,
          principalAmount: true,
          createdAt: true,
          customer: {
            select: {
              id: true,
              fullName: true,
              customerCode: true,
              mobile: true,
            },
          },
        },
      }),
      this.prisma.customer.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          customerCode: true,
          fullName: true,
          mobile: true,
          kycStatus: true,
          createdAt: true,
        },
      }),
    ]);

    const activeGroup = loanStatusGroups.find((g) => g.status === 'ACTIVE');
    const activeLoansCount = activeGroup?._count.id ?? 0;
    const activeLoansPrincipal = activeGroup?._sum.principalAmount ?? 0;

    const closedGroup = loanStatusGroups.find((g) => g.status === 'CLOSED');
    const closedLoansCount = closedGroup?._count.id ?? 0;
    const closedLoansPrincipal = closedGroup?._sum.principalAmount ?? 0;

    const totalLoansCount = loanStatusGroups.reduce((acc, g) => acc + g._count.id, 0);
    const totalLoansPrincipal = loanStatusGroups.reduce(
      (acc, g) => acc + (g._sum.principalAmount ?? 0),
      0,
    );

    const storedPackets = packetsStats.find((p) => p.status === 'STORED')?._count.id ?? 0;
    const sealedPackets = packetsStats.find((p) => p.status === 'SEALED')?._count.id ?? 0;
    const createdPackets = packetsStats.find((p) => p.status === 'CREATED')?._count.id ?? 0;
    const totalPackets = packetsStats.reduce((acc, p) => acc + p._count.id, 0);

    return {
      kpis: {
        activeLoansCount,
        activeLoansPrincipal,
        totalLoansCount,
        totalLoansPrincipal,
        closedLoansCount,
        closedLoansPrincipal,
        totalCustomersCount,
        kycVerifiedCount,
        pledgedGoldNetWeightGrams: pledgedJewellery._sum.netWeight ?? 0,
        pledgedGoldGrossWeightGrams: pledgedJewellery._sum.grossWeight ?? 0,
        pledgedGoldValuation: pledgedJewellery._sum.valuation ?? 0,
        pledgedJewelleryItemsCount: pledgedJewellery._count.id ?? 0,
        packetsInVaultCount: storedPackets,
        sealedPacketsCount: sealedPackets,
        createdPacketsCount: createdPackets,
        totalPacketsCount: totalPackets,
      },
      loanDistribution: loanStatusGroups.map((g) => ({
        status: g.status,
        count: g._count.id,
        principal: g._sum.principalAmount ?? 0,
      })),
      collateralOverview: {
        pledged: {
          count: pledgedJewellery._count.id,
          grossWeight: pledgedJewellery._sum.grossWeight ?? 0,
          netWeight: pledgedJewellery._sum.netWeight ?? 0,
          valuation: pledgedJewellery._sum.valuation ?? 0,
        },
        released: {
          count: releasedJewellery._count.id,
          grossWeight: releasedJewellery._sum.grossWeight ?? 0,
          netWeight: releasedJewellery._sum.netWeight ?? 0,
          valuation: releasedJewellery._sum.valuation ?? 0,
        },
      },
      recentLoans,
      recentCustomers,
    };
  }
}

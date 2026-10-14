import { apiFetch } from './client';

export interface DashboardKpis {
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
}

export interface LoanDistributionItem {
  status: string;
  count: number;
  principal: number;
}

export interface CollateralBucket {
  count: number;
  grossWeight: number;
  netWeight: number;
  valuation: number;
}

export interface RecentLoanItem {
  id: string;
  loanCode: string;
  status: string;
  principalAmount: number | null;
  createdAt: string;
  customer: {
    id: string;
    fullName: string;
    customerCode: string;
    mobile: string;
  };
}

export interface RecentCustomerItem {
  id: string;
  customerCode: string;
  fullName: string;
  mobile: string;
  kycStatus: string;
  createdAt: string;
}

export interface DashboardSummary {
  kpis: DashboardKpis;
  loanDistribution: LoanDistributionItem[];
  collateralOverview: {
    pledged: CollateralBucket;
    released: CollateralBucket;
  };
  recentLoans: RecentLoanItem[];
  recentCustomers: RecentCustomerItem[];
}

export function getDashboardSummary(): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>('/dashboard/summary');
}

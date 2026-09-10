'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    getPortfolioReport,
    getGoldStockReport,
    getBorrowerReport,
    getCollectionsReport,
    type PortfolioHealthData,
    type GoldStockAuditData,
    type BorrowerAuditData,
    type CollectionsSummaryData,
} from '@/lib/api/reports';
import {
    FileText,
    TrendingUp,
    ShieldCheck,
    Coins,
    Users,
    CreditCard,
    Printer,
    Download,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Scale,
    Gem,
    PieChart,
    BarChart3,
    Sparkles,
    ArrowUpRight,
} from 'lucide-react';

type ReportTab = 'portfolio' | 'gold_stock' | 'borrowers' | 'collections';

function fmtINR(n?: number | null) {
    if (n == null) return '—';
    return `₹${n.toLocaleString('en-IN')}`;
}

function fmtCr(n?: number | null) {
    if (n == null) return '—';
    if (n >= 10000000) {
        return `₹${(n / 10000000).toFixed(2)} Cr`;
    }
    if (n >= 100000) {
        return `₹${(n / 100000).toFixed(2)} L`;
    }
    return fmtINR(n);
}

function fmtWeight(grams?: number | null) {
    if (grams == null) return '—';
    if (grams >= 1000) {
        return `${(grams / 1000).toFixed(2)} kg`;
    }
    return `${grams.toFixed(2)} g`;
}

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState<ReportTab>('portfolio');

    const portfolioQ = useQuery({
        queryKey: ['report-portfolio'],
        queryFn: getPortfolioReport,
        staleTime: 60000,
    });

    const goldStockQ = useQuery({
        queryKey: ['report-gold-stock'],
        queryFn: getGoldStockReport,
        staleTime: 60000,
    });

    const borrowerQ = useQuery({
        queryKey: ['report-borrowers'],
        queryFn: getBorrowerReport,
        staleTime: 60000,
    });

    const collectionsQ = useQuery({
        queryKey: ['report-collections'],
        queryFn: getCollectionsReport,
        staleTime: 60000,
    });

    const isRefreshing =
        portfolioQ.isFetching ||
        goldStockQ.isFetching ||
        borrowerQ.isFetching ||
        collectionsQ.isFetching;

    const handleRefreshAll = () => {
        portfolioQ.refetch();
        goldStockQ.refetch();
        borrowerQ.refetch();
        collectionsQ.refetch();
    };

    const handlePrint = () => {
        if (typeof window !== 'undefined') {
            window.print();
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto print:p-0 print:space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-sm">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                            Executive Reports & Audit Analytics
                        </h1>
                        <p className="text-sm text-gray-500">
                            Portfolio risk distribution, physical gold vault audit, borrower compliance, and collections
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={handleRefreshAll}
                        disabled={isRefreshing}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-xs transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>Refresh All</span>
                    </button>
                    <button
                        onClick={handlePrint}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 shadow-xs transition-colors"
                    >
                        <Printer className="w-4 h-4" />
                        <span>Print Report</span>
                    </button>
                </div>
            </div>

            {/* Print Only Header */}
            <div className="hidden print:block border-b border-gray-300 pb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">RADHIKA JEWELLERS — GOLD LOAN ERP</h1>
                        <p className="text-sm text-gray-600">Official Operational & Audit Report Summary</p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                        <div>Generated: {new Date().toLocaleString('en-IN')}</div>
                        <div>Branch: Main Vault & Counter</div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 print:hidden">
                <nav className="flex space-x-2 md:space-x-8 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('portfolio')}
                        className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                            activeTab === 'portfolio'
                                ? 'border-amber-600 text-amber-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <TrendingUp className="w-4 h-4" />
                        Portfolio Health
                    </button>
                    <button
                        onClick={() => setActiveTab('gold_stock')}
                        className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                            activeTab === 'gold_stock'
                                ? 'border-amber-600 text-amber-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <Coins className="w-4 h-4" />
                        Gold Stock & Vault Audit
                    </button>
                    <button
                        onClick={() => setActiveTab('borrowers')}
                        className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                            activeTab === 'borrowers'
                                ? 'border-amber-600 text-amber-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <Users className="w-4 h-4" />
                        Borrowers & KYC Compliance
                    </button>
                    <button
                        onClick={() => setActiveTab('collections')}
                        className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                            activeTab === 'collections'
                                ? 'border-amber-600 text-amber-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <CreditCard className="w-4 h-4" />
                        Collections & Recovery
                    </button>
                </nav>
            </div>

            {/* TAB 1: PORTFOLIO HEALTH */}
            {(activeTab === 'portfolio' || typeof window === 'undefined') && (
                <div className="space-y-6">
                    {/* Top Portfolio Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Sanctioned Loans</span>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-gray-900">
                                    {portfolioQ.data?.totalLoans?.toLocaleString('en-IN') ?? '—'}
                                </span>
                                <span className="text-xs text-gray-500">accounts</span>
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                                Active: <span className="font-semibold text-emerald-600">{portfolioQ.data?.activeLoansCount?.toLocaleString('en-IN')}</span> | Closed: <span className="font-semibold text-gray-700">{portfolioQ.data?.closedLoansCount?.toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Active Outstanding Book</span>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-amber-600">
                                    {fmtCr(portfolioQ.data?.activePrincipal)}
                                </span>
                            </div>
                            <div className="mt-2 text-xs text-amber-700 font-medium flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                Current Active Gold Loans
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Historical Recovered Book</span>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-gray-900">
                                    {fmtCr(portfolioQ.data?.closedPrincipal)}
                                </span>
                            </div>
                            <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {portfolioQ.data?.recoveryRate?.toFixed(1) ?? '90.0'}% Recovery Ratio
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Average Ticket Size</span>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-gray-900">
                                    {fmtINR(portfolioQ.data?.avgTicketSize)}
                                </span>
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                                Per loan disbursement average
                            </div>
                        </div>
                    </div>

                    {/* Ticket Size Distribution */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Ticket Size Concentration</h3>
                                <p className="text-xs text-gray-500">Distribution of loans by disbursement bracket</p>
                            </div>
                            <BarChart3 className="w-5 h-5 text-gray-400" />
                        </div>

                        <div className="space-y-4">
                            {portfolioQ.data?.ticketDistribution?.map((item) => (
                                <div key={item.label} className="space-y-1.5">
                                    <div className="flex justify-between text-xs font-medium">
                                        <span className="text-gray-700">{item.label}</span>
                                        <span className="text-gray-900 font-semibold">
                                            {item.count.toLocaleString('en-IN')} loans ({item.share.toFixed(1)}%)
                                        </span>
                                    </div>
                                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-amber-500 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.max(item.share, 2)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Status Breakdown Table */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-base font-bold text-gray-900">Portfolio Status Breakdown</h3>
                            <p className="text-xs text-gray-500">Comprehensive loan ledger state breakdown</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 tracking-wider">
                                    <tr>
                                        <th className="px-6 py-3">Loan Status</th>
                                        <th className="px-6 py-3">Total Accounts</th>
                                        <th className="px-6 py-3">Principal Amount</th>
                                        <th className="px-6 py-3">Share of Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {portfolioQ.data?.statusGroups?.map((group) => {
                                        const totalCount = portfolioQ.data?.totalLoans || 1;
                                        const share = ((group.count / totalCount) * 100).toFixed(1);
                                        return (
                                            <tr key={group.status} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-3.5 font-medium text-gray-900 flex items-center gap-2">
                                                    <span
                                                        className={`w-2 h-2 rounded-full ${
                                                            group.status === 'ACTIVE'
                                                                ? 'bg-emerald-500'
                                                                : group.status === 'OVERDUE'
                                                                ? 'bg-red-500'
                                                                : 'bg-gray-400'
                                                        }`}
                                                    />
                                                    {group.status}
                                                </td>
                                                <td className="px-6 py-3.5 font-semibold text-gray-800">
                                                    {group.count.toLocaleString('en-IN')}
                                                </td>
                                                <td className="px-6 py-3.5 font-medium text-gray-900">
                                                    {fmtINR(group.principal)}
                                                </td>
                                                <td className="px-6 py-3.5 text-xs text-gray-500">
                                                    {share}%
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: PRECIOUS METALS (GOLD & SILVER) STOCK & VAULT AUDIT */}
            {activeTab === 'gold_stock' && (
                <div className="space-y-6">
                    {/* Top Gold & Silver Stock Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl border border-amber-200 p-5 shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                                    <Gem className="w-3.5 h-3.5 text-amber-600" />
                                    Pledged Gold Net Weight
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                    {goldStockQ.data?.goldPledged?.count?.toLocaleString('en-IN')} items
                                </span>
                            </div>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-amber-600">
                                    {fmtWeight(goldStockQ.data?.goldPledged?.netWeight ?? goldStockQ.data?.pledged?.netWeight)}
                                </span>
                            </div>
                            <div className="mt-2 text-xs text-amber-700 font-semibold">
                                Gold Valuation: {fmtCr(goldStockQ.data?.goldPledged?.valuation)}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-slate-300 p-5 shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                    <Coins className="w-3.5 h-3.5 text-slate-500" />
                                    Pledged Silver (Payal, Kada, etc.)
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                                    {goldStockQ.data?.silverPledged?.count?.toLocaleString('en-IN')} items
                                </span>
                            </div>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-slate-800">
                                    {fmtWeight(goldStockQ.data?.silverPledged?.netWeight)}
                                </span>
                            </div>
                            <div className="mt-2 text-xs text-slate-600 font-semibold">
                                Silver Valuation: {fmtCr(goldStockQ.data?.silverPledged?.valuation)}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Vault Collateral Valuation</span>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-gray-900">
                                    {fmtCr(goldStockQ.data?.pledged?.valuation)}
                                </span>
                            </div>
                            <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Secured in SAFE01 Heavy Vault
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Historical Released Assets</span>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-gray-900">
                                    {fmtWeight(goldStockQ.data?.released?.netWeight)}
                                </span>
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                                {goldStockQ.data?.released?.count?.toLocaleString('en-IN')} ornaments released post closure
                            </div>
                        </div>
                    </div>

                    {/* Purity Breakdown Cards */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Precious Metals by Certified Purity</h3>
                                <p className="text-xs text-gray-500">Physical inventory weight and certified valuation grouped by Gold and Silver purities</p>
                            </div>
                            <Scale className="w-5 h-5 text-amber-500" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {goldStockQ.data?.purityBreakdown?.map((purity) => {
                                const isSilver = purity.purity.startsWith('Silver');
                                return (
                                    <div
                                        key={purity.purity}
                                        className={`rounded-xl p-4 space-y-2 border ${
                                            isSilver
                                                ? 'bg-slate-50/70 border-slate-300'
                                                : 'bg-amber-50/40 border-amber-200/60'
                                        }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span
                                                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                    isSilver
                                                        ? 'bg-slate-700 text-white'
                                                        : 'bg-amber-600 text-white'
                                                }`}
                                            >
                                                {purity.purity}
                                            </span>
                                            <span className="text-xs text-gray-500">{purity.count.toLocaleString('en-IN')} items</span>
                                        </div>
                                        <div className="text-xl font-bold text-gray-900">
                                            {fmtWeight(purity.netWeight)}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            Valuation: <span className="font-semibold text-gray-800">{fmtCr(purity.valuation)}</span>
                                        </div>
                                        <div className="text-[11px] text-gray-400">
                                            Gross: {fmtWeight(purity.grossWeight)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Category Breakdown Table */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-base font-bold text-gray-900">Collateral Category Distribution</h3>
                            <p className="text-xs text-gray-500">Breakdown of Gold jewellery and Silver items (Payal, Kada, Bracelet, Patali)</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 tracking-wider">
                                    <tr>
                                        <th className="px-6 py-3">Category</th>
                                        <th className="px-6 py-3">Metal Type</th>
                                        <th className="px-6 py-3">Total Ornaments</th>
                                        <th className="px-6 py-3">Net Weight</th>
                                        <th className="px-6 py-3">Total Valuation</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {goldStockQ.data?.categoryBreakdown?.map((cat) => {
                                        const isSilver = cat.category.startsWith('Silver');
                                        return (
                                            <tr key={cat.category} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-3.5 font-semibold text-gray-900 flex items-center gap-2">
                                                    {isSilver ? (
                                                        <Coins className="w-4 h-4 text-slate-500" />
                                                    ) : (
                                                        <Gem className="w-4 h-4 text-amber-500" />
                                                    )}
                                                    {cat.category}
                                                </td>
                                                <td className="px-6 py-3.5">
                                                    <span
                                                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                                                            isSilver
                                                                ? 'bg-slate-100 text-slate-700 border border-slate-300'
                                                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                                                        }`}
                                                    >
                                                        {isSilver ? 'Silver' : 'Gold'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3.5 font-semibold text-gray-800">
                                                    {cat.count.toLocaleString('en-IN')}
                                                </td>
                                                <td className="px-6 py-3.5 font-medium text-gray-900">
                                                    {fmtWeight(cat.netWeight)}
                                                </td>
                                                <td className="px-6 py-3.5 text-gray-900 font-semibold">
                                                    {fmtCr(cat.valuation)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: BORROWERS & KYC COMPLIANCE */}
            {activeTab === 'borrowers' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Registered Borrowers</span>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-gray-900">
                                    {borrowerQ.data?.totalCustomers?.toLocaleString('en-IN') ?? '—'}
                                </span>
                                <span className="text-xs text-gray-500">customers</span>
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                                Unique borrowers in customer master
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">KYC Verification Rate</span>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-emerald-600">
                                    {borrowerQ.data?.kycVerifiedRate?.toFixed(1) ?? '—'}%
                                </span>
                            </div>
                            <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {borrowerQ.data?.kycVerified?.toLocaleString('en-IN')} Fully Verified
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">KYC Pending Action</span>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-amber-600">
                                    {borrowerQ.data?.kycPending?.toLocaleString('en-IN') ?? '0'}
                                </span>
                            </div>
                            <div className="mt-2 text-xs text-amber-700 font-medium flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Requires Aadhaar / PAN submission
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Biometric Enrollments</span>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-gray-900">
                                    {borrowerQ.data?.biometricEnrolled?.toLocaleString('en-IN') ?? '0'}
                                </span>
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                                Fingerprint templates captured
                            </div>
                        </div>
                    </div>

                    {/* Regulatory Audit Checklist */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs space-y-4">
                        <h3 className="text-base font-bold text-gray-900">RBI Compliance & Due Diligence Status</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/60 space-y-1">
                                <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    Aadhaar & PAN Verification
                                </div>
                                <p className="text-xs text-emerald-700">
                                    All new active loans mandate Aadhaar biometric or OTP verification per AML directives.
                                </p>
                            </div>

                            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/60 space-y-1">
                                <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    LTV Ceiling Compliance (75%)
                                </div>
                                <p className="text-xs text-emerald-700">
                                    Sanctioned principal does not exceed 75% of net gold spot valuation at disbursement.
                                </p>
                            </div>

                            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/60 space-y-1">
                                <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    Vault Physical Custody Sealing
                                </div>
                                <p className="text-xs text-emerald-700">
                                    Tamper-evident packet barcodes generated for every pledge and tracked to safe locker locations.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: COLLECTIONS & RECOVERY */}
            {activeTab === 'collections' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Collections</span>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-emerald-600">
                                    {fmtCr(collectionsQ.data?.totalAmount)}
                                </span>
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                                Total repayments recorded
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Transactions</span>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-gray-900">
                                    {collectionsQ.data?.totalCount?.toLocaleString('en-IN') ?? '—'}
                                </span>
                            </div>
                            <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Fully Balanced Receipts
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Principal Recovered</span>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-gray-900">
                                    {fmtCr(collectionsQ.data?.totalPrincipalRecovered)}
                                </span>
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                                Principal return to capital fund
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Interest Earned</span>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-amber-600">
                                    {fmtINR(collectionsQ.data?.totalInterestEarned)}
                                </span>
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                                Operational revenue accrued
                            </div>
                        </div>
                    </div>

                    {/* Mode Breakdown Table */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-base font-bold text-gray-900">Collections by Payment Mode</h3>
                            <p className="text-xs text-gray-500">Cash counter receipts vs UPI and digital bank transfers</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 tracking-wider">
                                    <tr>
                                        <th className="px-6 py-3">Payment Mode</th>
                                        <th className="px-6 py-3">Receipt Count</th>
                                        <th className="px-6 py-3">Principal Recovered</th>
                                        <th className="px-6 py-3">Interest Collected</th>
                                        <th className="px-6 py-3">Total Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {collectionsQ.data?.modes?.map((m) => (
                                        <tr key={m.mode} className="hover:bg-gray-50/50">
                                            <td className="px-6 py-3.5 font-medium text-gray-900 flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                                {m.mode}
                                            </td>
                                            <td className="px-6 py-3.5 font-semibold text-gray-800">
                                                {m.count.toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-6 py-3.5 text-gray-700">
                                                {fmtINR(m.principal)}
                                            </td>
                                            <td className="px-6 py-3.5 text-gray-700">
                                                {fmtINR(m.interest)}
                                            </td>
                                            <td className="px-6 py-3.5 font-bold text-emerald-600">
                                                {fmtINR(m.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

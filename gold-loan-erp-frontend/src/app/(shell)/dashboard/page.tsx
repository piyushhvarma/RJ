'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDashboardSummary } from '@/lib/api/dashboard';
import { LoanStatusBadge } from '@/components/shared/StatusBadge';
import {
    Coins,
    Gem,
    Users,
    Package,
    ShieldCheck,
    ArrowUpRight,
    RefreshCw,
    Plus,
    CreditCard,
    Search,
    Clock,
    Scale,
    Layers,
    ChevronRight,
    CheckCircle2,
    Lock
} from 'lucide-react';
import { format } from 'date-fns';

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

export default function DashboardPage() {
    const qc = useQueryClient();
    const {
        data,
        isLoading,
        isFetching,
        error,
        refetch
    } = useQuery({
        queryKey: ['dashboard', 'summary'],
        queryFn: getDashboardSummary,
        staleTime: 30000,
    });

    if (isLoading) {
        return (
            <div className="p-8 space-y-6 max-w-7xl mx-auto">
                <div className="flex justify-between items-center">
                    <div>
                        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-72 bg-gray-100 rounded mt-2 animate-pulse" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-32 rounded-2xl bg-gray-100 animate-pulse" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-72 rounded-2xl bg-gray-100 animate-pulse" />
                    <div className="h-72 rounded-2xl bg-gray-100 animate-pulse" />
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="p-8 max-w-4xl mx-auto">
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
                    <p className="text-base font-semibold text-red-800">Failed to load dashboard metrics</p>
                    <p className="text-sm text-red-600 mt-1">{(error as Error)?.message ?? 'An unknown error occurred'}</p>
                    <button
                        onClick={() => refetch()}
                        className="mt-4 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    const { kpis, loanDistribution, collateralOverview, recentLoans, recentCustomers } = data;
    const avgTicketSize = kpis.activeLoansCount > 0
        ? Math.round(kpis.activeLoansPrincipal / kpis.activeLoansCount)
        : 0;

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header with live status & refresh */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-950 tracking-tight">Executive Dashboard</h1>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live Portfolio
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                        Radhika Jewellers • Gold Loan Operations, Custody & Appraisals
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition shadow-sm disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-amber-600' : 'text-gray-400'}`} />
                        {isFetching ? 'Syncing...' : 'Refresh'}
                    </button>

                    <Link
                        href="/loans/new"
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        New Loan
                    </Link>
                </div>
            </div>

            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* 1. Active Loan Portfolio */}
                <div className="relative overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-amber-800/80">
                            Active Portfolio
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-700">
                            <Coins className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="text-3xl font-extrabold text-gray-900 tracking-tight">
                            {fmtCr(kpis.activeLoansPrincipal)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                            <span>{fmtINR(kpis.activeLoansPrincipal)}</span>
                            <span className="font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                                {kpis.activeLoansCount.toLocaleString()} loans
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. Pledged Gold Weight */}
                <div className="relative overflow-hidden rounded-2xl border border-yellow-200 bg-gradient-to-br from-yellow-500/10 via-white to-yellow-500/5 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-yellow-800/80">
                            Pledged Gold (Vault)
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-yellow-500/15 flex items-center justify-center text-yellow-700">
                            <Scale className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="text-3xl font-extrabold text-gray-900 tracking-tight">
                            {fmtWeight(kpis.pledgedGoldNetWeightGrams)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                            <span>Gross: {fmtWeight(kpis.pledgedGoldGrossWeightGrams)}</span>
                            <span className="font-semibold text-yellow-800 bg-yellow-100/80 px-2 py-0.5 rounded-md">
                                {kpis.pledgedJewelleryItemsCount.toLocaleString()} items
                            </span>
                        </div>
                    </div>
                </div>

                {/* 3. Gold Valuation */}
                <div className="relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-500/10 via-white to-blue-500/5 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-blue-800/80">
                            Collateral Valuation
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-700">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="text-3xl font-extrabold text-gray-900 tracking-tight">
                            {fmtCr(kpis.pledgedGoldValuation)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                            <span>Exact: {fmtINR(kpis.pledgedGoldValuation)}</span>
                            <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                                Appraised
                            </span>
                        </div>
                    </div>
                </div>

                {/* 4. Customer Base */}
                <div className="relative overflow-hidden rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-500/10 via-white to-purple-500/5 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-purple-800/80">
                            Registered Borrowers
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-700">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="text-3xl font-extrabold text-gray-900 tracking-tight">
                            {kpis.totalCustomersCount.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                            <span>KYC Verified: {kpis.kycVerifiedCount}</span>
                            <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                                Custody: {kpis.totalPacketsCount} pkts
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions Shortcuts */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-600">
                        Operational Shortcuts
                    </h2>
                    <span className="text-xs text-gray-400">Fast action launchpad</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    <Link
                        href="/customers/new"
                        className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-150 bg-gray-50/70 hover:bg-amber-50 hover:border-amber-200 transition group"
                    >
                        <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition">
                            <Users className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-900">Register Customer</p>
                            <p className="text-[11px] text-gray-500">KYC & Aadhaar</p>
                        </div>
                    </Link>

                    <Link
                        href="/loans/new"
                        className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-150 bg-gray-50/70 hover:bg-emerald-50 hover:border-emerald-200 transition group"
                    >
                        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition">
                            <Plus className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-900">Create Loan</p>
                            <p className="text-[11px] text-gray-500">Appraise & Disburse</p>
                        </div>
                    </Link>

                    <Link
                        href="/payments/new"
                        className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-150 bg-gray-50/70 hover:bg-blue-50 hover:border-blue-200 transition group"
                    >
                        <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition">
                            <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-900">Receive Payment</p>
                            <p className="text-[11px] text-gray-500">Principal & Interest</p>
                        </div>
                    </Link>

                    <Link
                        href="/customers"
                        className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-150 bg-gray-50/70 hover:bg-purple-50 hover:border-purple-200 transition group"
                    >
                        <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition">
                            <Search className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-900">Customer Directory</p>
                            <p className="text-[11px] text-gray-500">Search 8,600+ records</p>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Middle Section: Collateral & Portfolio Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Collateral Vault Inventory */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
                                    <Gem className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-gray-900">Gold Collateral & Vault Inventory</h2>
                                    <p className="text-xs text-gray-500">Active pledged security vs released gold</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-2">
                            {/* Pledged Gold */}
                            <div className="rounded-xl border border-amber-200/90 bg-amber-50/40 p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-amber-900 uppercase">In Vault Custody</span>
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                </div>
                                <p className="text-2xl font-black text-amber-950 mt-2">
                                    {fmtWeight(collateralOverview.pledged.netWeight)}
                                </p>
                                <div className="space-y-1 mt-3 text-xs text-amber-900/80 border-t border-amber-200/60 pt-2.5">
                                    <div className="flex justify-between">
                                        <span>Gross Weight:</span>
                                        <span className="font-semibold">{fmtWeight(collateralOverview.pledged.grossWeight)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Valuation:</span>
                                        <span className="font-semibold">{fmtCr(collateralOverview.pledged.valuation)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Jewellery Items:</span>
                                        <span className="font-semibold">{collateralOverview.pledged.count.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Released Gold */}
                            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-700 uppercase">Released / Historical</span>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-gray-400" />
                                </div>
                                <p className="text-2xl font-black text-gray-800 mt-2">
                                    {fmtWeight(collateralOverview.released.netWeight)}
                                </p>
                                <div className="space-y-1 mt-3 text-xs text-gray-600 border-t border-gray-200 pt-2.5">
                                    <div className="flex justify-between">
                                        <span>Gross Weight:</span>
                                        <span className="font-semibold">{fmtWeight(collateralOverview.released.grossWeight)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Valuation:</span>
                                        <span className="font-semibold">{fmtCr(collateralOverview.released.valuation)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Items Released:</span>
                                        <span className="font-semibold">{collateralOverview.released.count.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                        <span>Vault Security: Dual-custody biometric & sealed packet management</span>
                        <Link href="/packets" className="text-amber-700 hover:text-amber-800 font-semibold inline-flex items-center gap-1">
                            View Packets <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>

                {/* Loan Portfolio Lifecycle & Distribution */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                                    <Layers className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-gray-900">Loan Lifecycle Distribution</h2>
                                    <p className="text-xs text-gray-500">Cumulative lending portfolio tracking</p>
                                </div>
                            </div>
                            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                                {kpis.totalLoansCount.toLocaleString()} Total Loans
                            </span>
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="space-y-2 mt-4">
                            <div className="flex justify-between text-xs font-medium text-gray-600">
                                <span className="text-emerald-700 font-semibold">Active: {kpis.activeLoansCount.toLocaleString()}</span>
                                <span className="text-slate-600">Closed: {kpis.closedLoansCount.toLocaleString()}</span>
                            </div>
                            <div className="h-3.5 w-full rounded-full bg-gray-100 overflow-hidden flex">
                                <div
                                    style={{ width: `${(kpis.activeLoansCount / kpis.totalLoansCount) * 100}%` }}
                                    className="bg-emerald-500 h-full rounded-l-full"
                                    title={`Active: ${((kpis.activeLoansCount / kpis.totalLoansCount) * 100).toFixed(1)}%`}
                                />
                                <div
                                    style={{ width: `${(kpis.closedLoansCount / kpis.totalLoansCount) * 100}%` }}
                                    className="bg-slate-300 h-full rounded-r-full"
                                    title={`Closed: ${((kpis.closedLoansCount / kpis.totalLoansCount) * 100).toFixed(1)}%`}
                                />
                            </div>
                        </div>

                        {/* Breakdown Metrics */}
                        <div className="grid grid-cols-2 gap-3.5 mt-5">
                            <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
                                <p className="text-xs font-medium text-emerald-800">Active Book Size</p>
                                <p className="text-lg font-bold text-emerald-950 mt-1">{fmtCr(kpis.activeLoansPrincipal)}</p>
                                <p className="text-[11px] text-emerald-700 mt-0.5">Avg Ticket: {fmtINR(avgTicketSize)}</p>
                            </div>
                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                                <p className="text-xs font-medium text-slate-700">Cumulative Disbursed</p>
                                <p className="text-lg font-bold text-slate-900 mt-1">{fmtCr(kpis.totalLoansPrincipal)}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">Recovered: {fmtCr(kpis.closedLoansPrincipal)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                        <span>Recovery Rate: {((kpis.closedLoansPrincipal / kpis.totalLoansPrincipal) * 100).toFixed(1)}%</span>
                        <Link href="/loans" className="text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1">
                            Browse All Loans <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Bottom: Recent Loans & Recent Customers */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Loans (2 Cols) */}
                <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">Recent Loan Applications</h2>
                            <p className="text-xs text-gray-500">Real-time ledger updates</p>
                        </div>
                        <Link
                            href="/loans"
                            className="text-xs font-semibold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1"
                        >
                            View All <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50/75 text-gray-500 font-medium border-b border-gray-100">
                                <tr>
                                    <th className="px-5 py-3">Loan Code</th>
                                    <th className="px-5 py-3">Borrower</th>
                                    <th className="px-5 py-3 text-right">Principal</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3">Date</th>
                                    <th className="px-5 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {recentLoans.map((loan) => (
                                    <tr key={loan.id} className="hover:bg-gray-50/60 transition">
                                        <td className="px-5 py-3.5 font-semibold text-gray-900">
                                            <Link href={`/loans/${loan.id}`} className="hover:text-amber-700 transition">
                                                {loan.loanCode}
                                            </Link>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <Link href={`/customers/${loan.customer.id}`} className="font-medium text-gray-900 hover:text-amber-700 block">
                                                {loan.customer.fullName}
                                            </Link>
                                            <span className="text-[11px] text-gray-400">{loan.customer.customerCode}</span>
                                        </td>
                                        <td className="px-5 py-3.5 text-right font-semibold text-gray-900">
                                            {fmtINR(loan.principalAmount)}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <LoanStatusBadge status={loan.status as any} />
                                        </td>
                                        <td className="px-5 py-3.5 text-gray-500">
                                            {format(new Date(loan.createdAt), 'dd MMM yyyy')}
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <Link
                                                href={`/loans/${loan.id}`}
                                                className="text-xs font-semibold text-amber-700 hover:text-amber-800"
                                            >
                                                Details →
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Borrowers (1 Col) */}
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col justify-between">
                    <div>
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-base font-bold text-gray-900">Recent Customers</h2>
                                <p className="text-xs text-gray-500">Newly registered borrowers</p>
                            </div>
                            <Link
                                href="/customers"
                                className="text-xs font-semibold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1"
                            >
                                All <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        <div className="p-4 space-y-3">
                            {recentCustomers.map((cust) => (
                                <Link
                                    key={cust.id}
                                    href={`/customers/${cust.id}`}
                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition border border-gray-100"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                                            {cust.fullName.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-900 line-clamp-1">{cust.fullName}</p>
                                            <p className="text-[11px] text-gray-500">{cust.customerCode}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                        cust.kycStatus === 'VERIFIED'
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                                    }`}>
                                        {cust.kycStatus}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                        <Link
                            href="/customers/new"
                            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition shadow-sm"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Register Another Customer
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

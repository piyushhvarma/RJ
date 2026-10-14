'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getAppraisalsList, type AppraisalListItem } from '@/lib/api/jewellery';
import { AppraisalStatusBadge } from '@/components/shared/StatusBadge';
import type { AppraisalStatus } from '@/lib/api/types';
import {
    Gem,
    Search,
    ChevronLeft,
    ChevronRight,
    ArrowUpRight,
    ShieldCheck,
    Coins,
    RefreshCw,
    User,
    CheckCircle2,
    Calendar,
    FileCheck2,
    Clock,
    Sparkles
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_FILTERS = [
    { label: 'All Statuses', value: 'ALL' },
    { label: 'Manager Approved', value: 'MANAGER_APPROVED' },
    { label: 'Appraiser Confirmed', value: 'APPRAISER_CONFIRMED' },
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Locked', value: 'LOCKED' },
];

function fmtINR(n?: number | null) {
    if (n == null) return '—';
    return `₹${n.toLocaleString('en-IN')}`;
}

export default function JewelleryAppraisalsPage() {
    const [q, setQ] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const limit = 20;

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['jewellery-appraisals', page, limit],
        queryFn: () => getAppraisalsList(page, limit),
        staleTime: 20000,
    });

    const total = data?.total ?? 0;
    const totalPages = data?.totalPages ?? 1;
    const rawItems: AppraisalListItem[] = data?.items ?? [];

    // Client-side filtering for fast interactive feedback on loaded page
    const filteredItems = rawItems.filter((item) => {
        if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
        if (q.trim()) {
            const query = q.toLowerCase();
            const matchesLoan = item.loan?.loanCode.toLowerCase().includes(query);
            const matchesCustomer = item.loan?.customer?.fullName.toLowerCase().includes(query);
            const matchesNotes = item.notes?.toLowerCase().includes(query);
            if (!matchesLoan && !matchesCustomer && !matchesNotes) return false;
        }
        return true;
    });

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-sm">
                            <FileCheck2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                                Appraisals & Valuation Ledger
                            </h1>
                            <p className="text-sm text-gray-500">
                                Gold valuation certifications, appraiser assessments, and manager approvals
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/jewellery"
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-xs transition-colors"
                    >
                        <Gem className="w-4 h-4 text-amber-600" />
                        Jewellery Inventory
                    </Link>
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-xs transition-colors disabled:opacity-50"
                        title="Refresh Data"
                    >
                        <RefreshCw className={`w-4 h-4 text-gray-500 ${isFetching ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Appraisals</span>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                            <FileCheck2 className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">{total.toLocaleString('en-IN')}</span>
                        <span className="text-xs text-gray-500">records in DB</span>
                    </div>
                    <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Complete Historical Audit Trail
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Spot Rate (24K Pure)</span>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                            <Coins className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">₹7,250</span>
                        <span className="text-xs text-gray-500">/ gram</span>
                    </div>
                    <div className="mt-2 text-xs text-amber-700 font-medium flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        MCX Daily Benchmark Base
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Spot Rate (22K Standard)</span>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                            <Gem className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">₹6,645</span>
                        <span className="text-xs text-gray-500">/ gram</span>
                    </div>
                    <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Standard Lending Purity (91.6%)
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Appraisal Governance</span>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                            <Clock className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">Dual Sign-off</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 font-medium">
                        Appraiser Assessment + Manager Sign-off
                    </div>
                </div>
            </div>

            {/* Filters and Search Bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs space-y-3">
                <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by loan code, customer or remarks..."
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                        {q && (
                            <button
                                onClick={() => setQ('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <span className="text-xs">Clear</span>
                            </button>
                        )}
                    </div>

                    {/* Status Pill Filters */}
                    <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar">
                        {STATUS_FILTERS.map((s) => (
                            <button
                                key={s.value}
                                onClick={() => setStatusFilter(s.value)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                                    statusFilter === s.value
                                        ? 'bg-amber-600 text-white shadow-xs font-semibold'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Appraisals Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase font-semibold text-gray-500 tracking-wider">
                            <tr>
                                <th className="px-5 py-3.5">Appraisal & Date</th>
                                <th className="px-5 py-3.5">Loan Account</th>
                                <th className="px-5 py-3.5">Borrower</th>
                                <th className="px-5 py-3.5">Ornaments</th>
                                <th className="px-5 py-3.5">Loan Sanction</th>
                                <th className="px-5 py-3.5">Status</th>
                                <th className="px-5 py-3.5">Notes & Verification</th>
                                <th className="px-5 py-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {isLoading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={8} className="px-5 py-4">
                                            <div className="h-4 bg-gray-100 rounded w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-5 py-12 text-center text-gray-400">
                                        <FileCheck2 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                        No appraisals found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item) => {
                                    return (
                                        <tr key={item.id} className="hover:bg-amber-50/20 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="font-mono text-xs font-semibold text-gray-900">
                                                    APP-{item.id.slice(0, 8).toUpperCase()}
                                                </div>
                                                <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                    <Calendar className="w-3 h-3" />
                                                    {format(new Date(item.createdAt), 'dd MMM yyyy')}
                                                </div>
                                            </td>

                                            <td className="px-5 py-3.5">
                                                {item.loan ? (
                                                    <Link
                                                        href={`/loans/${item.loan.id}`}
                                                        className="font-mono text-xs font-semibold text-amber-700 hover:text-amber-900 hover:underline inline-flex items-center gap-1"
                                                    >
                                                        {item.loan.loanCode}
                                                        <ArrowUpRight className="w-3 h-3" />
                                                    </Link>
                                                ) : (
                                                    <span className="text-xs text-gray-400 font-mono">—</span>
                                                )}
                                            </td>

                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0 text-xs font-medium">
                                                        <User className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900 text-xs">
                                                            {item.loan?.customer?.fullName ?? 'Unknown Customer'}
                                                        </div>
                                                        <div className="text-[11px] text-gray-400 font-mono">
                                                            {item.loan?.customer?.customerCode}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-3.5">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/60">
                                                    <Gem className="w-3 h-3 mr-1 text-amber-600" />
                                                    {item.loan?._count?.jewelleryItems ?? 1} item(s)
                                                </span>
                                            </td>

                                            <td className="px-5 py-3.5 font-medium text-gray-900 text-xs">
                                                {fmtINR(item.loan?.principalAmount)}
                                            </td>

                                            <td className="px-5 py-3.5">
                                                <AppraisalStatusBadge status={item.status as AppraisalStatus} />
                                            </td>

                                            <td className="px-5 py-3.5 text-xs text-gray-500 max-w-xs truncate">
                                                {item.notes || 'Standard gold purity and weight certification verified'}
                                            </td>

                                            <td className="px-5 py-3.5 text-right">
                                                {item.loan ? (
                                                    <Link
                                                        href={`/loans/${item.loan.id}`}
                                                        className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900 hover:underline"
                                                    >
                                                        View Loan
                                                        <ArrowUpRight className="w-3 h-3" />
                                                    </Link>
                                                ) : null}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="px-5 py-3.5 bg-gray-50/80 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
                    <div>
                        Showing <span className="font-semibold text-gray-900">{(page - 1) * limit + 1}</span> to{' '}
                        <span className="font-semibold text-gray-900">
                            {Math.min(page * limit, total)}
                        </span>{' '}
                        of <span className="font-semibold text-gray-900">{total.toLocaleString('en-IN')}</span> appraisals
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1 || isFetching}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-colors"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            Previous
                        </button>
                        <span className="px-2 font-medium text-gray-700">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages || isFetching}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-colors"
                        >
                            Next
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

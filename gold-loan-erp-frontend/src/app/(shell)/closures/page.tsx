'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getLoans, type ListLoansParams } from '@/lib/api/loans';
import { LoanStatusBadge } from '@/components/shared/StatusBadge';
import type { LoanStatus } from '@/lib/api/types';
import {
    LockKeyhole,
    Search,
    ChevronLeft,
    ChevronRight,
    ArrowUpRight,
    RefreshCw,
    User,
    Calendar,
    CheckCircle2,
    ShieldCheck,
    Fingerprint,
    Package,
    Gem,
    AlertCircle,
    ArrowRight,
    Printer,
} from 'lucide-react';
import { format } from 'date-fns';
import { getClosureReceiptPdfUrl } from '@/lib/api/documents';

const CLOSURE_FILTERS = [
    { label: 'Active Loans (Ready for Closure)', value: 'ACTIVE' },
    { label: 'Closed Accounts', value: 'CLOSED' },
    { label: 'Overdue Loans', value: 'OVERDUE' },
    { label: 'All Records', value: 'ALL' },
];

function fmtINR(n?: number | null) {
    if (n == null) return '—';
    return `₹${n.toLocaleString('en-IN')}`;
}

export default function ClosuresPage() {
    const [q, setQ] = useState('');
    const [debouncedQ, setDebouncedQ] = useState('');
    const [statusFilter, setStatusFilter] = useState('ACTIVE');
    const [page, setPage] = useState(1);
    const limit = 20;

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQ(q);
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [q]);

    const params: ListLoansParams = {
        q: debouncedQ || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        page,
        limit,
    };

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['closures-queue', params],
        queryFn: () => getLoans(params),
        staleTime: 15000,
    });

    const total = data?.total ?? 0;
    const totalPages = data?.totalPages ?? 1;
    const items = data?.items ?? [];

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-sm">
                        <LockKeyhole className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                            Closures & Gold Release Queue
                        </h1>
                        <p className="text-sm text-gray-500">
                            9-step closure verification, zero-balance settlement, vault retrieval, and biometric gold handover
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
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

            {/* Top Closure Protocol Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Closure Queue Pool</span>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                            <LockKeyhole className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">{total.toLocaleString('en-IN')}</span>
                        <span className="text-xs text-gray-500">loans</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                        {statusFilter === 'ACTIVE' ? 'Active loans eligible for settlement' : 'Filtered portfolio records'}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Step 1: Balance Check</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-emerald-600">Zero Ledger</span>
                    </div>
                    <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Principal & Interest fully cleared
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Step 2: Custody Release</span>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                            <Package className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">Vault Exit</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 font-medium">
                        Tamper seal cut with dual custody
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Step 3: Handover Gate</span>
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                            <Fingerprint className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">Biometric</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 font-medium">
                        Thumbprint sign-off upon return
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs space-y-3">
                <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by loan code, customer name or mobile..."
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

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar">
                        {CLOSURE_FILTERS.map((f) => (
                            <button
                                key={f.value}
                                onClick={() => {
                                    setStatusFilter(f.value);
                                    setPage(1);
                                }}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                                    statusFilter === f.value
                                        ? 'bg-amber-600 text-white shadow-xs font-semibold'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Loans Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase font-semibold text-gray-500 tracking-wider">
                            <tr>
                                <th className="px-5 py-3.5">Loan Account</th>
                                <th className="px-5 py-3.5">Borrower</th>
                                <th className="px-5 py-3.5">Sanctioned Principal</th>
                                <th className="px-5 py-3.5">Status</th>
                                <th className="px-5 py-3.5">Pledged Gold</th>
                                <th className="px-5 py-3.5">Sanction Date</th>
                                <th className="px-5 py-3.5 text-right">Closure Wizard Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {isLoading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={7} className="px-5 py-4">
                                            <div className="h-4 bg-gray-100 rounded w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                                        <LockKeyhole className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                        No loans found in this closure view.
                                    </td>
                                </tr>
                            ) : (
                                items.map((loan) => {
                                    const isClosed = loan.status === 'CLOSED';
                                    return (
                                        <tr key={loan.id} className="hover:bg-amber-50/20 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="font-mono text-xs font-bold text-gray-900">
                                                    {loan.loanCode}
                                                </div>
                                                <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                                                    <Calendar className="w-3 h-3" />
                                                    {format(new Date(loan.createdAt), 'dd MMM yyyy')}
                                                </div>
                                            </td>

                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0 text-xs font-medium">
                                                        <User className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900 text-xs">
                                                            {loan.customer?.fullName ?? 'Unknown Borrower'}
                                                        </div>
                                                        <div className="text-[11px] text-gray-400 font-mono">
                                                            {loan.customer?.customerCode}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-3.5 font-semibold text-gray-900 text-xs">
                                                {fmtINR(loan.principalAmount)}
                                            </td>

                                            <td className="px-5 py-3.5">
                                                <LoanStatusBadge status={loan.status as LoanStatus} />
                                            </td>

                                            <td className="px-5 py-3.5">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/60">
                                                    <Gem className="w-3 h-3 mr-1 text-amber-600" />
                                                    {loan._count?.jewelleryItems ?? 1} ornament(s)
                                                </span>
                                            </td>

                                            <td className="px-5 py-3.5 text-xs text-gray-500">
                                                {loan.sanctionedDate
                                                    ? format(new Date(loan.sanctionedDate), 'dd MMM yyyy')
                                                    : format(new Date(loan.createdAt), 'dd MMM yyyy')}
                                            </td>

                                            <td className="px-5 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {isClosed && (
                                                        <a
                                                            href={getClosureReceiptPdfUrl(loan.id)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            title="Print Official Gold Release Voucher"
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold shadow-2xs transition-colors"
                                                        >
                                                            <Printer className="w-3.5 h-3.5 text-emerald-700" />
                                                            <span>Voucher</span>
                                                        </a>
                                                    )}
                                                    <Link
                                                        href={`/closures/${loan.id}`}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all ${
                                                            isClosed
                                                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                                : 'bg-amber-600 text-white hover:bg-amber-700'
                                                        }`}
                                                    >
                                                        {isClosed ? 'View Closure' : 'Close Loan & Release'}
                                                        <ArrowRight className="w-3.5 h-3.5" />
                                                    </Link>
                                                </div>
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
                        Showing <span className="font-semibold text-gray-900">{total === 0 ? 0 : (page - 1) * limit + 1}</span> to{' '}
                        <span className="font-semibold text-gray-900">
                            {Math.min(page * limit, total)}
                        </span>{' '}
                        of <span className="font-semibold text-gray-900">{total.toLocaleString('en-IN')}</span> loans
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

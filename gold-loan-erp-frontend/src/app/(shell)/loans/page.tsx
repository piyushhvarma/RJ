'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getLoans, type ListLoansParams } from '@/lib/api/loans';
import { LoanStatusBadge } from '@/components/shared/StatusBadge';
import {
    Coins,
    Search,
    X,
    Plus,
    Filter,
    ChevronLeft,
    ChevronRight,
    ArrowUpRight,
    Gem,
    Package,
    Calendar,
    Phone,
    User,
    ShieldCheck,
    Clock,
    RefreshCw,
    Layers
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_FILTERS = [
    { label: 'All Loans', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Closed', value: 'CLOSED' },
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Overdue', value: 'OVERDUE' },
    { label: 'Hold', value: 'HOLD' },
];

function fmtINR(n?: number | null) {
    if (n == null) return '—';
    return `₹${n.toLocaleString('en-IN')}`;
}

export default function LoansPage() {
    const [q, setQ] = useState('');
    const [debouncedQ, setDebouncedQ] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const limit = 20;

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQ(q);
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [q]);

    const params: ListLoansParams = {
        q: debouncedQ || undefined,
        status: statusFilter,
        page,
        limit,
        sortBy: 'createdAt',
        sortOrder: 'desc',
    };

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['loans', params],
        queryFn: () => getLoans(params),
        staleTime: 15000,
    });

    const total = data?.total ?? 0;
    const totalPages = data?.totalPages ?? 1;
    const items = data?.items ?? [];

    const startIdx = total === 0 ? 0 : (page - 1) * limit + 1;
    const endIdx = Math.min(page * limit, total);

    return (
        <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-950 tracking-tight">Loans Portfolio</h1>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            {total.toLocaleString()} Total Records
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                        Radhika Jewellers • Complete ledger of active, pledged, and historical gold loans
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition shadow-2xs disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-amber-600' : 'text-gray-400'}`} />
                        Sync
                    </button>

                    <Link
                        href="/loans/new"
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 transition shadow-xs"
                    >
                        <Plus className="w-4 h-4" />
                        Create Loan
                    </Link>
                </div>
            </div>

            {/* Filter Bar & Search */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs space-y-3.5">
                {/* Search Bar */}
                <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="search"
                        placeholder="Search by loan code (e.g. LGY- / GL-), borrower name, mobile number, or customer code..."
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-10 pr-9 py-2.5 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                    {q && (
                        <button
                            onClick={() => setQ('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Status Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 pt-0.5">
                    {STATUS_FILTERS.map(f => {
                        const isSelected = statusFilter === f.value;
                        return (
                            <button
                                key={f.value}
                                onClick={() => {
                                    setStatusFilter(f.value);
                                    setPage(1);
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                                    isSelected
                                        ? 'bg-amber-600 text-white shadow-xs'
                                        : 'bg-gray-100/80 text-gray-600 hover:bg-gray-200/80'
                                }`}
                            >
                                {f.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Table Container */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-100 uppercase tracking-wider text-[11px]">
                            <tr>
                                <th className="px-5 py-3.5">Loan Reference</th>
                                <th className="px-5 py-3.5">Borrower</th>
                                <th className="px-5 py-3.5 text-right">Principal</th>
                                <th className="px-5 py-3.5">Collateral</th>
                                <th className="px-5 py-3.5">Status</th>
                                <th className="px-5 py-3.5">Sanction Date</th>
                                <th className="px-5 py-3.5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                [1, 2, 3, 4, 5, 6].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-5 py-4"><div className="h-4 w-28 bg-gray-100 rounded" /></td>
                                        <td className="px-5 py-4"><div className="h-4 w-36 bg-gray-100 rounded" /></td>
                                        <td className="px-5 py-4 text-right"><div className="h-4 w-16 bg-gray-100 rounded ml-auto" /></td>
                                        <td className="px-5 py-4"><div className="h-4 w-20 bg-gray-100 rounded" /></td>
                                        <td className="px-5 py-4"><div className="h-4 w-16 bg-gray-100 rounded" /></td>
                                        <td className="px-5 py-4"><div className="h-4 w-24 bg-gray-100 rounded" /></td>
                                        <td className="px-5 py-4 text-right"><div className="h-4 w-12 bg-gray-100 rounded ml-auto" /></td>
                                    </tr>
                                ))
                            ) : items.length > 0 ? (
                                items.map(loan => (
                                    <tr key={loan.id} className="hover:bg-amber-50/30 transition-colors group">
                                        {/* Loan Reference */}
                                        <td className="px-5 py-3.5">
                                            <Link
                                                href={`/loans/${loan.id}`}
                                                className="font-bold text-gray-900 group-hover:text-amber-700 transition flex items-center gap-1.5 font-mono text-xs"
                                            >
                                                <Coins className="w-3.5 h-3.5 text-amber-500" />
                                                {loan.loanCode}
                                            </Link>
                                            <span className="text-[10px] text-gray-400 block mt-0.5">
                                                Created {format(new Date(loan.createdAt), 'dd MMM yyyy')}
                                            </span>
                                        </td>

                                        {/* Borrower */}
                                        <td className="px-5 py-3.5">
                                            <Link
                                                href={`/customers/${loan.customer.id}`}
                                                className="font-bold text-gray-900 hover:text-amber-700 transition block truncate max-w-[200px]"
                                            >
                                                {loan.customer.fullName}
                                            </Link>
                                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                                                <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-[10px]">
                                                    {loan.customer.customerCode}
                                                </span>
                                                <span className="flex items-center gap-0.5 text-gray-400">
                                                    <Phone className="w-2.5 h-2.5" />
                                                    {loan.customer.mobile}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Principal Amount */}
                                        <td className="px-5 py-3.5 text-right font-extrabold text-gray-900">
                                            {fmtINR(loan.principalAmount)}
                                            {loan.interestRate != null && (
                                                <span className="block text-[10px] font-normal text-gray-400">
                                                    {loan.interestRate}% {loan.interestType === 'MONTHLY_SIMPLE' ? 'p.m.' : 'p.a.'}
                                                </span>
                                            )}
                                        </td>

                                        {/* Collateral */}
                                        <td className="px-5 py-3.5">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-medium">
                                                <Gem className="w-3 h-3 text-amber-600" />
                                                {loan._count.jewelleryItems} item{loan._count.jewelleryItems === 1 ? '' : 's'}
                                            </span>
                                            {loan.packet && (
                                                <span className="block text-[10px] text-gray-400 mt-0.5 font-mono">
                                                    {loan.packet.packetCode}
                                                </span>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className="px-5 py-3.5">
                                            <LoanStatusBadge status={loan.status} />
                                        </td>

                                        {/* Sanction Date */}
                                        <td className="px-5 py-3.5 text-gray-500">
                                            {loan.sanctionedDate
                                                ? format(new Date(loan.sanctionedDate), 'dd MMM yyyy')
                                                : format(new Date(loan.createdAt), 'dd MMM yyyy')}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-5 py-3.5 text-right">
                                            <Link
                                                href={`/loans/${loan.id}`}
                                                className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 group-hover:bg-amber-100/80 px-2.5 py-1 rounded-lg transition"
                                            >
                                                Details <ArrowUpRight className="w-3 h-3" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-5 py-12 text-center">
                                        <Coins className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm font-bold text-gray-800">No loans found</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {debouncedQ
                                                ? `No records matching "${debouncedQ}". Try adjusting your search query.`
                                                : 'No loans in this category.'}
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination footer */}
                <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-500 bg-gray-50/40">
                    <div>
                        Showing <span className="font-bold text-gray-900">{startIdx.toLocaleString()}</span> to{' '}
                        <span className="font-bold text-gray-900">{endIdx.toLocaleString()}</span> of{' '}
                        <span className="font-bold text-gray-900">{total.toLocaleString()}</span> loans
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page <= 1 || isLoading}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition shadow-2xs"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" /> Previous
                        </button>

                        <span className="px-2 text-xs font-semibold text-gray-700">
                            Page {page} of {totalPages}
                        </span>

                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages || isLoading}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition shadow-2xs"
                        >
                            Next <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

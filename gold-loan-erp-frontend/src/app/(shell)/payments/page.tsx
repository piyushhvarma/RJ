'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getPaymentsList, type ListPaymentsParams } from '@/lib/api/payments';
import {
    CreditCard,
    Search,
    ChevronLeft,
    ChevronRight,
    ArrowUpRight,
    Plus,
    RefreshCw,
    User,
    Calendar,
    CheckCircle2,
    Banknote,
    QrCode,
    Printer,
    Coins,
    TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { getPaymentReceiptPdfUrl } from '@/lib/api/documents';

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

export default function PaymentsPage() {
    const [q, setQ] = useState('');
    const [debouncedQ, setDebouncedQ] = useState('');
    const [page, setPage] = useState(1);
    const limit = 20;

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQ(q);
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [q]);

    const params: ListPaymentsParams = {
        q: debouncedQ || undefined,
        page,
        limit,
    };

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['payments-list', params],
        queryFn: () => getPaymentsList(params),
        staleTime: 15000,
    });

    const total = data?.total ?? 0;
    const totalPages = data?.totalPages ?? 1;
    const items = data?.items ?? [];
    const aggregates = data?.aggregates;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-sm">
                        <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                            Repayments & Cash Counter Ledger
                        </h1>
                        <p className="text-sm text-gray-500">
                            Cash counter collections, UPI settlements, and principal/interest ledger reconciliation
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
                    <Link
                        href="/payments/new"
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 shadow-xs transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Receive Payment
                    </Link>
                </div>
            </div>

            {/* Top Collections KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Collections</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <Banknote className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-emerald-600">
                            {fmtCr(aggregates?.totalAmount)}
                        </span>
                    </div>
                    <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Reconciled Counter Collections
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Principal Recovered</span>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">
                            {fmtCr(aggregates?.totalPrincipal)}
                        </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                        Principal returned to lending pool
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Transactions</span>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                            <Coins className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">
                            {total.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-gray-500">receipts</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                        Full historical counter ledger
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Counter Protocol</span>
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                            <QrCode className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">Cash & UPI</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 font-medium">
                        Instant SMS & printed receipts
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
                <div className="relative w-full md:w-96">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search by receipt, loan, borrower name or mobile..."
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
            </div>

            {/* Payments Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase font-semibold text-gray-500 tracking-wider">
                            <tr>
                                <th className="px-5 py-3.5">Receipt & Payment</th>
                                <th className="px-5 py-3.5">Date & Time</th>
                                <th className="px-5 py-3.5">Loan Account</th>
                                <th className="px-5 py-3.5">Borrower</th>
                                <th className="px-5 py-3.5">Payment Mode</th>
                                <th className="px-5 py-3.5">Principal Paid</th>
                                <th className="px-5 py-3.5 font-bold text-gray-900">Total Collected</th>
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
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-5 py-12 text-center text-gray-400">
                                        <CreditCard className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                        No payments found matching your query.
                                    </td>
                                </tr>
                            ) : (
                                items.map((payment) => {
                                    return (
                                        <tr key={payment.id} className="hover:bg-amber-50/20 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="font-mono text-xs font-bold text-gray-900">
                                                    {payment.receiptNumber || `RCP-${payment.id.slice(0, 8).toUpperCase()}`}
                                                </div>
                                                <div className="font-mono text-[11px] text-gray-400">
                                                    {payment.paymentCode || `PAY-${payment.id.slice(0, 8).toUpperCase()}`}
                                                </div>
                                            </td>

                                            <td className="px-5 py-3.5 text-xs text-gray-500">
                                                <div className="flex items-center gap-1 font-medium text-gray-700">
                                                    <Calendar className="w-3 h-3 text-gray-400" />
                                                    {format(new Date(payment.paymentDate || payment.createdAt), 'dd MMM yyyy')}
                                                </div>
                                                <div className="text-[11px] text-gray-400 pl-4">
                                                    {format(new Date(payment.paymentDate || payment.createdAt), 'HH:mm')}
                                                </div>
                                            </td>

                                            <td className="px-5 py-3.5">
                                                {payment.loan ? (
                                                    <Link
                                                        href={`/loans/${payment.loan.id}`}
                                                        className="font-mono text-xs font-semibold text-amber-700 hover:text-amber-900 hover:underline inline-flex items-center gap-1"
                                                    >
                                                        {payment.loan.loanCode}
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
                                                            {payment.loan?.customer?.fullName ?? 'Counter Settlement'}
                                                        </div>
                                                        <div className="text-[11px] text-gray-400 font-mono">
                                                            {payment.loan?.customer?.customerCode}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-3.5">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                    <Banknote className="w-3 h-3" />
                                                    {payment.mode || 'CASH'}
                                                </span>
                                            </td>

                                            <td className="px-5 py-3.5 text-xs text-gray-700">
                                                {fmtINR(payment.principalComponent)}
                                            </td>

                                            <td className="px-5 py-3.5 font-bold text-sm text-emerald-700">
                                                {fmtINR(payment.amount)}
                                            </td>

                                            <td className="px-5 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <a
                                                        href={getPaymentReceiptPdfUrl(payment.id)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title="Print Counter Receipt PDF"
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:border-amber-400 hover:bg-amber-50 text-gray-700 hover:text-amber-800 text-xs font-semibold shadow-2xs transition-colors"
                                                    >
                                                        <Printer className="w-3.5 h-3.5 text-amber-600" />
                                                        <span>Receipt</span>
                                                    </a>
                                                    {payment.loan ? (
                                                        <Link
                                                            href={`/loans/${payment.loan.id}`}
                                                            className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900 hover:underline"
                                                        >
                                                            Loan
                                                            <ArrowUpRight className="w-3 h-3" />
                                                        </Link>
                                                    ) : null}
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
                        of <span className="font-semibold text-gray-900">{total.toLocaleString('en-IN')}</span> collections
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

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getPacketsList, type ListPacketsParams } from '@/lib/api/packets';
import { PacketStatusBadge } from '@/components/shared/StatusBadge';
import type { PacketStatus } from '@/lib/api/types';
import {
    Package,
    Search,
    ChevronLeft,
    ChevronRight,
    ArrowUpRight,
    MapPin,
    ShieldCheck,
    Lock,
    RefreshCw,
    User,
    Calendar,
    Gem,
    CheckCircle2,
    Clock
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_FILTERS = [
    { label: 'All Statuses', value: 'ALL' },
    { label: 'In Safe Locker (Stored)', value: 'STORED' },
    { label: 'Sealed (Pending Storing)', value: 'SEALED' },
    { label: 'In Closure Process', value: 'IN_CLOSURE_PROCESS' },
    { label: 'Retrieved from Safe', value: 'RETRIEVED' },
    { label: 'Released to Customer', value: 'RELEASED' },
];

function fmtINR(n?: number | null) {
    if (n == null) return '—';
    return `₹${n.toLocaleString('en-IN')}`;
}

export default function PacketsPage() {
    const [q, setQ] = useState('');
    const [debouncedQ, setDebouncedQ] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const limit = 20;

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQ(q);
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [q]);

    const params: ListPacketsParams = {
        q: debouncedQ || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        page,
        limit,
    };

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['packets-list', params],
        queryFn: () => getPacketsList(params),
        staleTime: 20000,
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
                        <Package className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                            Vault Custody & Storage Packets
                        </h1>
                        <p className="text-sm text-gray-500">
                            Physical tamper-evident gold packet custody, safe locker coordinates, and chain of custody tracking
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

            {/* Top Vault Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Vault Packets</span>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                            <Package className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">{total.toLocaleString('en-IN')}</span>
                        <span className="text-xs text-gray-500">packets</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                        Tamper-evident barcode sealed
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Main Vault Security</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-emerald-600">SAFE01</span>
                    </div>
                    <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Class-A Heavy Fireproof Safe
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Custody Protocol</span>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                            <Lock className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">Dual Custody</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 font-medium">
                        Dual key & OTP sign-off required
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Movement Audit</span>
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                            <Clock className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">Logged</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 font-medium">
                        Every safe deposit & retrieval tracked
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
                            placeholder="Search by packet code, locker, loan, or borrower..."
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
                                onClick={() => {
                                    setStatusFilter(s.value);
                                    setPage(1);
                                }}
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

            {/* Packets Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase font-semibold text-gray-500 tracking-wider">
                            <tr>
                                <th className="px-5 py-3.5">Packet Code</th>
                                <th className="px-5 py-3.5">Locker Storage Location</th>
                                <th className="px-5 py-3.5">Loan Account</th>
                                <th className="px-5 py-3.5">Borrower</th>
                                <th className="px-5 py-3.5">Sanction Amount</th>
                                <th className="px-5 py-3.5">Custody Status</th>
                                <th className="px-5 py-3.5">Sealed Date</th>
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
                                        <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                        No packets found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                items.map((packet) => {
                                    const locationLabel = packet.storageLocation?.label;
                                    return (
                                        <tr key={packet.id} className="hover:bg-amber-50/20 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200/50 flex items-center justify-center text-amber-700">
                                                        <Package className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div>
                                                        <div className="font-mono text-xs font-bold text-gray-900">
                                                            {packet.packetCode}
                                                        </div>
                                                        <div className="text-[11px] text-gray-400 flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {format(new Date(packet.createdAt), 'dd MMM yyyy')}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-3.5">
                                                {locationLabel ? (
                                                    <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                        <MapPin className="w-3 h-3 text-emerald-600" />
                                                        {locationLabel}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 font-medium">
                                                        Pending Locker Assign
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-5 py-3.5">
                                                {packet.loan ? (
                                                    <Link
                                                        href={`/loans/${packet.loan.id}`}
                                                        className="font-mono text-xs font-semibold text-amber-700 hover:text-amber-900 hover:underline inline-flex items-center gap-1"
                                                    >
                                                        {packet.loan.loanCode}
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
                                                            {packet.loan?.customer?.fullName ?? 'Unknown Borrower'}
                                                        </div>
                                                        <div className="text-[11px] text-gray-400 font-mono">
                                                            {packet.loan?.customer?.customerCode}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-3.5 font-medium text-gray-900 text-xs">
                                                {fmtINR(packet.loan?.principalAmount)}
                                            </td>

                                            <td className="px-5 py-3.5">
                                                <PacketStatusBadge status={packet.status as PacketStatus} />
                                            </td>

                                            <td className="px-5 py-3.5 text-xs text-gray-500">
                                                {packet.sealedAt
                                                    ? format(new Date(packet.sealedAt), 'dd MMM yyyy, HH:mm')
                                                    : '—'}
                                            </td>

                                            <td className="px-5 py-3.5 text-right">
                                                <Link
                                                    href={`/packets/${packet.id}`}
                                                    className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900 hover:underline"
                                                >
                                                    Manage Custody
                                                    <ArrowUpRight className="w-3 h-3" />
                                                </Link>
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
                        of <span className="font-semibold text-gray-900">{total.toLocaleString('en-IN')}</span> packets
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

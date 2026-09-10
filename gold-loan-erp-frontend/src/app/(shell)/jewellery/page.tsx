'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getJewelleryInventory, type ListJewelleryParams } from '@/lib/api/jewellery';
import {
    Gem,
    Search,
    X,
    Filter,
    ChevronLeft,
    ChevronRight,
    ArrowUpRight,
    Scale,
    ShieldCheck,
    Coins,
    Camera,
    RefreshCw,
    User,
    CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';

const PURITY_FILTERS = ['ALL', '22K (91.6%)', '20K (80%)', '24K (95%)', 'Silver 80%'];
const METAL_FILTERS = [
    { label: 'All Metals', value: 'ALL' },
    { label: 'Gold Ornaments', value: 'GOLD' },
    { label: 'Silver (Payal, Kada, Bracelet, etc.)', value: 'SILVER' },
];
const STATUS_FILTERS = [
    { label: 'All Status', value: 'ALL' },
    { label: 'In Vault (Pledged)', value: 'PLEDGED' },
    { label: 'Released / Settled', value: 'RELEASED' },
];

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

export default function JewelleryInventoryPage() {
    const [q, setQ] = useState('');
    const [debouncedQ, setDebouncedQ] = useState('');
    const [metalFilter, setMetalFilter] = useState<'ALL' | 'GOLD' | 'SILVER'>('ALL');
    const [purityFilter, setPurityFilter] = useState('ALL');
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

    const params: ListJewelleryParams = {
        q: debouncedQ || undefined,
        metalType: metalFilter !== 'ALL' ? metalFilter : undefined,
        purityKarat: purityFilter !== 'ALL' ? purityFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        page,
        limit,
    };

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['jewellery-inventory', params],
        queryFn: () => getJewelleryInventory(params),
        staleTime: 20000,
    });

    const total = data?.total ?? 0;
    const totalPages = data?.totalPages ?? 1;
    const items = data?.items ?? [];
    const aggregates = data?.aggregates;

    const startIdx = total === 0 ? 0 : (page - 1) * limit + 1;
    const endIdx = Math.min(page * limit, total);

    return (
        <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-950 tracking-tight">Jewellery Inventory</h1>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            {total.toLocaleString()} Total Collateral Items
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                        Radhika Jewellers • Gold & Silver collateral verification, purity register & vault custody
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition shadow-2xs disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>

                    <Link
                        href="/jewellery/appraisals"
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 transition shadow-2xs"
                    >
                        <Scale className="w-4 h-4" />
                        Appraisals Queue
                    </Link>
                </div>
            </div>

            {/* Top Aggregate Metric Cards - Gold & Silver Separated */}
            {aggregates && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 p-4.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                                <Gem className="w-3.5 h-3.5 text-amber-600" />
                                Gold Net Weight
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                {aggregates.gold?.count?.toLocaleString() ?? 0} items
                            </span>
                        </div>
                        <p className="text-2xl font-black text-gray-900 mt-1">
                            {fmtWeight(aggregates.gold?.netWeight ?? aggregates.totalNetWeight)}
                        </p>
                        <p className="text-xs text-amber-700 font-semibold mt-0.5">
                            Valuation: {fmtCr(aggregates.gold?.valuation)}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-300 bg-gradient-to-br from-slate-100 via-white to-cyan-500/5 p-4.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                <Coins className="w-3.5 h-3.5 text-slate-500" />
                                Silver Net Weight (Payal, Kada, etc.)
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                                {aggregates.silver?.count?.toLocaleString() ?? 0} items
                            </span>
                        </div>
                        <p className="text-2xl font-black text-gray-900 mt-1">
                            {fmtWeight(aggregates.silver?.netWeight)}
                        </p>
                        <p className="text-xs text-slate-600 font-semibold mt-0.5">
                            Valuation: {fmtCr(aggregates.silver?.valuation)}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-500/10 via-white to-blue-500/5 p-4.5 shadow-2xs">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
                            Total Valuation (Gold + Silver)
                        </span>
                        <p className="text-2xl font-black text-gray-900 mt-1">
                            {fmtCr(aggregates.totalValuation)}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Across all active and released collateral
                        </p>
                    </div>
                </div>
            )}

            {/* Filter Bar & Search */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs space-y-3.5">
                {/* Metal Filter Tabs */}
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                    <span className="text-xs font-semibold text-gray-400 mr-1">Metal:</span>
                    {METAL_FILTERS.map(m => {
                        const isSelected = metalFilter === m.value;
                        return (
                            <button
                                key={m.value}
                                onClick={() => {
                                    setMetalFilter(m.value as any);
                                    setPage(1);
                                }}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                    isSelected
                                        ? m.value === 'SILVER'
                                            ? 'bg-slate-700 text-white shadow-xs'
                                            : 'bg-amber-600 text-white shadow-xs'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {m.value === 'GOLD' && <Gem className="w-3.5 h-3.5" />}
                                {m.value === 'SILVER' && <Coins className="w-3.5 h-3.5" />}
                                {m.label}
                            </button>
                        );
                    })}
                </div>

                <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="search"
                        placeholder="Search by Payal, Kada, Bracelet, Ring, Necklace, Mani, description, or loan code..."
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

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    {/* Purity Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                        <span className="text-xs font-semibold text-gray-400 mr-1">Purity:</span>
                        {PURITY_FILTERS.map(p => {
                            const isSelected = purityFilter === p;
                            return (
                                <button
                                    key={p}
                                    onClick={() => {
                                        setPurityFilter(p);
                                        setPage(1);
                                    }}
                                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                        isSelected
                                            ? 'bg-amber-600 text-white shadow-xs'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {p === 'ALL' ? 'All Purities' : p}
                                </button>
                            );
                        })}
                    </div>

                    {/* Status Tabs */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-gray-400 mr-1">Status:</span>
                        {STATUS_FILTERS.map(s => {
                            const isSelected = statusFilter === s.value;
                            return (
                                <button
                                    key={s.value}
                                    onClick={() => {
                                        setStatusFilter(s.value);
                                        setPage(1);
                                    }}
                                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                        isSelected
                                            ? 'bg-amber-600 text-white shadow-xs'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {s.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Jewellery Inventory Table */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-100 uppercase tracking-wider text-[11px]">
                            <tr>
                                <th className="px-5 py-3.5">Ornament Item</th>
                                <th className="px-5 py-3.5">Category & Desc</th>
                                <th className="px-5 py-3.5 text-right">Net Weight</th>
                                <th className="px-5 py-3.5">Purity</th>
                                <th className="px-5 py-3.5 text-right">Valuation</th>
                                <th className="px-5 py-3.5">Associated Loan</th>
                                <th className="px-5 py-3.5">Status</th>
                                <th className="px-5 py-3.5 text-right">Photos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-5 py-4"><div className="h-4 w-28 bg-gray-100 rounded" /></td>
                                        <td className="px-5 py-4"><div className="h-4 w-36 bg-gray-100 rounded" /></td>
                                        <td className="px-5 py-4 text-right"><div className="h-4 w-16 bg-gray-100 rounded ml-auto" /></td>
                                        <td className="px-5 py-4"><div className="h-4 w-12 bg-gray-100 rounded" /></td>
                                        <td className="px-5 py-4 text-right"><div className="h-4 w-20 bg-gray-100 rounded ml-auto" /></td>
                                        <td className="px-5 py-4"><div className="h-4 w-28 bg-gray-100 rounded" /></td>
                                        <td className="px-5 py-4"><div className="h-4 w-16 bg-gray-100 rounded" /></td>
                                        <td className="px-5 py-4 text-right"><div className="h-4 w-8 bg-gray-100 rounded ml-auto" /></td>
                                    </tr>
                                ))
                            ) : items.length > 0 ? (
                                items.map(item => {
                                    const isSilver = item.category.startsWith('Silver') || item.purityKarat.startsWith('Silver');
                                    return (
                                    <tr key={item.id} className={`transition-colors ${isSilver ? 'hover:bg-slate-50/80 bg-slate-50/20' : 'hover:bg-amber-50/30'}`}>
                                        {/* Item Code */}
                                        <td className="px-5 py-3.5 font-bold font-mono text-gray-900">
                                            <div className="flex items-center gap-1.5">
                                                {isSilver ? (
                                                    <Coins className="w-3.5 h-3.5 text-slate-500" />
                                                ) : (
                                                    <Gem className="w-3.5 h-3.5 text-amber-500" />
                                                )}
                                                {item.itemCode}
                                            </div>
                                            {item.hallmarkDetails && (
                                                <span className="text-[10px] text-gray-400 font-sans block mt-0.5">
                                                    HM: {item.hallmarkDetails}
                                                </span>
                                            )}
                                        </td>

                                        {/* Category & Description */}
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`w-1.5 h-1.5 rounded-full ${isSilver ? 'bg-slate-500' : 'bg-amber-500'}`} />
                                                <span className={`font-bold block ${isSilver ? 'text-slate-800' : 'text-gray-900'}`}>
                                                    {item.category}
                                                </span>
                                            </div>
                                            <span className="text-gray-500 line-clamp-1 max-w-[220px] text-[11px] mt-0.5">
                                                {item.description}
                                            </span>
                                        </td>

                                        {/* Net Weight */}
                                        <td className="px-5 py-3.5 text-right font-extrabold text-gray-900">
                                            {item.netWeight} g
                                            <span className="block text-[10px] text-gray-400 font-normal">
                                                Gross: {item.grossWeight}g
                                            </span>
                                        </td>

                                        {/* Purity */}
                                        <td className="px-5 py-3.5">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                                                isSilver
                                                    ? 'bg-slate-100 text-slate-800 border-slate-300'
                                                    : 'bg-amber-100/80 text-amber-800 border-amber-200'
                                            }`}>
                                                {item.purityKarat} {item.fineness ? `(${item.fineness})` : ''}
                                            </span>
                                        </td>

                                        {/* Valuation */}
                                        <td className="px-5 py-3.5 text-right font-extrabold text-gray-900">
                                            {fmtINR(item.valuation)}
                                            <span className="block text-[10px] text-gray-400 font-normal">
                                                @{item.valuationRate}/g
                                            </span>
                                        </td>

                                        {/* Loan & Customer */}
                                        <td className="px-5 py-3.5">
                                            {item.loan ? (
                                                <div>
                                                    <Link
                                                        href={`/loans/${item.loan.id}`}
                                                        className="font-mono font-bold text-gray-900 hover:text-amber-700 transition"
                                                    >
                                                        {item.loan.loanCode}
                                                    </Link>
                                                    <span className="block text-[11px] text-gray-500 truncate max-w-[150px]">
                                                        {item.loan.customer.fullName}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className="px-5 py-3.5">
                                            <span
                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                                    item.status === 'PLEDGED'
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                                }`}
                                            >
                                                {item.status === 'PLEDGED' ? 'In Vault' : 'Released'}
                                            </span>
                                        </td>

                                        {/* Photos count */}
                                        <td className="px-5 py-3.5 text-right">
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500">
                                                <Camera className="w-3.5 h-3.5 text-gray-400" />
                                                {item.photos?.length ?? 0}
                                            </span>
                                        </td>
                                    </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={8} className="px-5 py-12 text-center">
                                        <Gem className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm font-bold text-gray-800">No jewellery items found</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Try adjusting your search query or filters.
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-500 bg-gray-50/40">
                    <div>
                        Showing <span className="font-bold text-gray-900">{startIdx.toLocaleString()}</span> to{' '}
                        <span className="font-bold text-gray-900">{endIdx.toLocaleString()}</span> of{' '}
                        <span className="font-bold text-gray-900">{total.toLocaleString()}</span> items
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

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getCustomers } from '@/lib/api/customers';
import type { Customer } from '@/lib/api/types';
import { EditCustomerModal } from '@/components/shared/EditCustomerModal';
import {
    Search,
    Plus,
    User,
    Phone,
    MapPin,
    Edit3,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    FileText,
    AlertCircle,
    CheckCircle2,
    Clock,
    XCircle,
    Building,
} from 'lucide-react';
import Link from 'next/link';

function KycBadge({ status }: { status: string }) {
    const cfg: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
        PENDING: {
            label: 'KYC Pending',
            cls: 'bg-amber-50 text-amber-800 border border-amber-200',
            icon: <Clock className="w-3 h-3 text-amber-600" />,
        },
        VERIFIED: {
            label: 'KYC Verified',
            cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
            icon: <CheckCircle2 className="w-3 h-3 text-emerald-600" />,
        },
        REJECTED: {
            label: 'KYC Rejected',
            cls: 'bg-rose-50 text-rose-700 border border-rose-200',
            icon: <XCircle className="w-3 h-3 text-rose-600" />,
        },
    };
    const c = cfg[status] ?? {
        label: status,
        cls: 'bg-gray-50 text-gray-600 border border-gray-200',
        icon: null,
    };
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${c.cls}`}>
            {c.icon}
            {c.label}
        </span>
    );
}

function BiosBadge({ status }: { status: string }) {
    const cfg: Record<string, { label: string; cls: string }> = {
        NOT_ENROLLED: { label: 'Bio: None', cls: 'bg-gray-100 text-gray-500' },
        ENROLLED: { label: 'Bio: Enrolled', cls: 'bg-blue-50 text-blue-700 border border-blue-200 font-medium' },
        ENROLLMENT_FAILED: { label: 'Bio: Failed', cls: 'bg-red-50 text-red-700 border border-red-200' },
    };
    const c = cfg[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${c.cls}`}>
            {c.label}
        </span>
    );
}

export default function CustomersPage() {
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [kycFilter, setKycFilter] = useState<'ALL' | 'VERIFIED' | 'PENDING' | 'REJECTED'>('ALL');
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

    const router = useRouter();

    // Debounce search input to avoid hitting backend on every keypress
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query);
            setPage(1); // reset to page 1 on search
        }, 300);
        return () => clearTimeout(handler);
    }, [query]);

    // Handle filter tab change
    const handleFilterChange = (filter: 'ALL' | 'VERIFIED' | 'PENDING' | 'REJECTED') => {
        setKycFilter(filter);
        setPage(1);
    };

    const { data, isLoading, error, isPlaceholderData } = useQuery({
        queryKey: ['customers', debouncedQuery, page, limit, kycFilter],
        queryFn: () =>
            getCustomers({
                q: debouncedQuery || undefined,
                page,
                limit,
                kycStatus: kycFilter === 'ALL' ? undefined : kycFilter,
            }),
        placeholderData: (previousData) => previousData,
        staleTime: 15_000,
    });

    const customers = data?.items ?? [];
    const total = data?.total ?? 0;
    const totalPages = data?.totalPages ?? 1;

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') setQuery('');
    }, []);

    const startRecord = total === 0 ? 0 : (page - 1) * limit + 1;
    const endRecord = Math.min(page * limit, total);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Customer Directory</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Search and manage borrowers • Total {total.toLocaleString('en-IN')} customers registered
                    </p>
                </div>
                <Link
                    href="/customers/new"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-600 transition-colors shadow-xs"
                >
                    <Plus className="w-4 h-4" />
                    New Customer Registration
                </Link>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="search"
                            autoFocus
                            placeholder="Search by name, 10-digit mobile, guardian name, or customer code…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent placeholder:text-gray-400"
                        />
                    </div>

                    {/* Per-Page Selector */}
                    <div className="flex items-center gap-2 text-xs text-gray-600 self-end md:self-auto">
                        <span>Show</span>
                        <select
                            value={limit}
                            onChange={(e) => {
                                setLimit(Number(e.target.value));
                                setPage(1);
                            }}
                            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                            <option value={25}>25 per page</option>
                            <option value={50}>50 per page</option>
                            <option value={100}>100 per page</option>
                        </select>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-2 border-t border-gray-100 pt-3 flex-wrap">
                    <span className="text-xs font-semibold text-gray-500 mr-2">Filter KYC:</span>
                    {(['ALL', 'VERIFIED', 'PENDING', 'REJECTED'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => handleFilterChange(tab)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                                kycFilter === tab
                                    ? 'bg-amber-500 text-white shadow-xs'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {tab === 'ALL'
                                ? 'All Customers'
                                : tab === 'VERIFIED'
                                ? 'Verified'
                                : tab === 'PENDING'
                                ? 'Pending KYC'
                                : 'Rejected'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results Status Banner */}
            <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                <span>
                    Showing <strong className="text-gray-900">{startRecord.toLocaleString('en-IN')}</strong> to{' '}
                    <strong className="text-gray-900">{endRecord.toLocaleString('en-IN')}</strong> of{' '}
                    <strong className="text-gray-900">{total.toLocaleString('en-IN')}</strong> customers
                </span>
                <span>
                    Page <strong className="text-gray-900">{page}</strong> of{' '}
                    <strong className="text-gray-900">{totalPages || 1}</strong>
                </span>
            </div>

            {/* Loading Skeleton */}
            {isLoading && !data && (
                <div className="space-y-3">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse border border-gray-200/50" />
                    ))}
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <span>{(error as Error).message}</span>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && customers.length === 0 && (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 text-gray-400 space-y-3">
                    <User className="w-12 h-12 mx-auto text-gray-300" />
                    <p className="text-base font-semibold text-gray-700">No customers found</p>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                        {query
                            ? `No records matched your search query "${query}". Try searching by a different name or partial phone number.`
                            : 'No customers available under this filter.'}
                    </p>
                    <Link
                        href="/customers/new"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Register New Customer
                    </Link>
                </div>
            )}

            {/* Customer List Items */}
            {customers.length > 0 && (
                <div className={`space-y-2.5 ${isPlaceholderData ? 'opacity-70 transition-opacity' : ''}`}>
                    {customers.map((c: Customer) => (
                        <div
                            key={c.id}
                            className="w-full text-left rounded-2xl border border-gray-200 bg-white p-4.5
                         hover:border-amber-300 hover:shadow-xs transition-all group flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                            {/* Left: Info */}
                            <div
                                onClick={() => router.push(`/customers/${c.id}`)}
                                className="flex items-start sm:items-center gap-4 cursor-pointer flex-1 min-w-0"
                            >
                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center flex-shrink-0 border border-amber-200 shadow-xs">
                                    {c.photoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={c.photoUrl}
                                            alt={c.fullName}
                                            className="w-full h-full object-cover rounded-2xl"
                                        />
                                    ) : (
                                        <User className="w-5 h-5 text-amber-700" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-bold text-gray-900 group-hover:text-amber-700 transition-colors text-base truncate">
                                            {c.fullName}
                                        </p>
                                        <span className="text-[11px] font-mono font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200">
                                            {c.customerCode}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 flex-wrap">
                                        {c.guardianName && (
                                            <span>S/o or W/o: <strong className="text-gray-700">{c.guardianName}</strong></span>
                                        )}
                                        {c.city && (
                                            <span className="inline-flex items-center gap-1 text-gray-600">
                                                <MapPin className="w-3 h-3 text-gray-400" />
                                                {c.city}
                                            </span>
                                        )}
                                        {c._count?.loans !== undefined && c._count.loans > 0 && (
                                            <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 text-[11px]">
                                                {c._count.loans} {c._count.loans === 1 ? 'Loan' : 'Loans'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Phone, Badges, and Action Buttons */}
                            <div className="flex items-center gap-3 flex-wrap md:flex-nowrap justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-gray-100">
                                {/* Phone Number or Missing Phone prompt */}
                                <div className="text-sm">
                                    {c.mobile ? (
                                        <div className="flex items-center gap-1.5 font-mono text-gray-800 font-semibold bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                            {c.mobile}
                                        </div>
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingCustomer(c);
                                            }}
                                            className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition-colors"
                                        >
                                            <AlertCircle className="w-3 h-3 text-amber-600" />
                                            + Add Phone
                                        </button>
                                    )}
                                </div>

                                {/* Badges */}
                                <div className="flex items-center gap-1.5">
                                    <KycBadge status={c.kycStatus} />
                                    <BiosBadge status={c.biometricStatus} />
                                </div>

                                {/* Edit Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingCustomer(c);
                                    }}
                                    title="Edit phone, address, and profile details"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 hover:border-amber-400 hover:bg-amber-50 text-gray-700 hover:text-amber-900 text-xs font-bold transition-all shadow-2xs"
                                >
                                    <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                                    Edit
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination Controls Footer */}
            {totalPages > 1 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-gray-500">
                        Showing {startRecord.toLocaleString('en-IN')} – {endRecord.toLocaleString('en-IN')} of{' '}
                        {total.toLocaleString('en-IN')} records
                    </div>

                    <div className="flex items-center gap-1.5">
                        {/* First Page */}
                        <button
                            onClick={() => setPage(1)}
                            disabled={page === 1 || isLoading}
                            title="First page"
                            className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        >
                            <ChevronsLeft className="w-4 h-4" />
                        </button>

                        {/* Prev Page */}
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1 || isLoading}
                            title="Previous page"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Prev
                        </button>

                        {/* Page Numbers */}
                        <div className="flex items-center gap-1 px-2">
                            {page > 2 && (
                                <button
                                    onClick={() => setPage(1)}
                                    className="w-8 h-8 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100"
                                >
                                    1
                                </button>
                            )}
                            {page > 3 && <span className="text-xs text-gray-400 px-1">…</span>}

                            {page > 1 && (
                                <button
                                    onClick={() => setPage(page - 1)}
                                    className="w-8 h-8 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100"
                                >
                                    {page - 1}
                                </button>
                            )}

                            <span className="w-8 h-8 rounded-lg bg-amber-500 text-white text-xs font-bold flex items-center justify-center shadow-xs">
                                {page}
                            </span>

                            {page < totalPages && (
                                <button
                                    onClick={() => setPage(page + 1)}
                                    className="w-8 h-8 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100"
                                >
                                    {page + 1}
                                </button>
                            )}

                            {page < totalPages - 2 && <span className="text-xs text-gray-400 px-1">…</span>}
                            {page < totalPages - 1 && (
                                <button
                                    onClick={() => setPage(totalPages)}
                                    className="w-8 h-8 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100"
                                >
                                    {totalPages}
                                </button>
                            )}
                        </div>

                        {/* Next Page */}
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages || isLoading}
                            title="Next page"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        >
                            Next
                            <ChevronRight className="w-4 h-4" />
                        </button>

                        {/* Last Page */}
                        <button
                            onClick={() => setPage(totalPages)}
                            disabled={page >= totalPages || isLoading}
                            title="Last page"
                            className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        >
                            <ChevronsRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Quick Edit Modal */}
            <EditCustomerModal
                isOpen={Boolean(editingCustomer)}
                onClose={() => setEditingCustomer(null)}
                customer={editingCustomer}
            />
        </div>
    );
}

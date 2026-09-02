'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getCustomers } from '@/lib/api/customers';
import type { Customer } from '@/lib/api/types';
import { Search, Plus, User, Phone } from 'lucide-react';
import Link from 'next/link';

function KycBadge({ status }: { status: string }) {
    const cfg: Record<string, { label: string; cls: string }> = {
        PENDING: { label: 'KYC Pending', cls: 'bg-yellow-100 text-yellow-800' },
        VERIFIED: { label: 'KYC Verified', cls: 'bg-green-100 text-green-700' },
        REJECTED: { label: 'KYC Rejected', cls: 'bg-red-100 text-red-700' },
    };
    const c = cfg[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.cls}`}>
            {c.label}
        </span>
    );
}

function BiosBadge({ status }: { status: string }) {
    const cfg: Record<string, { label: string; cls: string }> = {
        NOT_ENROLLED: { label: 'Biometric: Not Enrolled', cls: 'bg-gray-100 text-gray-500' },
        ENROLLED: { label: 'Biometric: Enrolled', cls: 'bg-green-100 text-green-700' },
        ENROLLMENT_FAILED: { label: 'Biometric: Failed', cls: 'bg-red-100 text-red-700' },
    };
    const c = cfg[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.cls}`}>
            {c.label}
        </span>
    );
}

export default function CustomersPage() {
    const [query, setQuery] = useState('');
    const router = useRouter();

    const { data: customers, isLoading, error } = useQuery({
        queryKey: ['customers', query],
        queryFn: () => getCustomers(query || undefined),
        staleTime: 30_000,
    });

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') setQuery('');
    }, []);

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
                    <p className="text-sm text-gray-500 mt-1">Search or register a customer</p>
                </div>
                <Link
                    href="/customers/new"
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Customer
                </Link>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="search"
                    autoFocus
                    placeholder="Search by name, mobile, or customer code…"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
            </div>

            {/* Results */}
            {isLoading && (
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
                    ))}
                </div>
            )}

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {(error as Error).message}
                </div>
            )}

            {customers && customers.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                    <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">
                        {query ? `No customers found for "${query}"` : 'No customers yet.'}
                    </p>
                </div>
            )}

            {customers && customers.length > 0 && (
                <div className="space-y-2">
                    {customers.map((c: Customer) => (
                        <button
                            key={c.id}
                            onClick={() => router.push(`/customers/${c.id}`)}
                            className="w-full text-left rounded-xl border border-gray-200 bg-white px-5 py-4
                         hover:border-amber-300 hover:shadow-sm transition-all group"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                        <User className="w-5 h-5 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 group-hover:text-amber-700 transition-colors">
                                            {c.fullName}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">{c.customerCode}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500">
                                        <Phone className="w-3.5 h-3.5" />
                                        {c.mobile}
                                    </div>
                                    <div className="flex gap-2">
                                        <KycBadge status={c.kycStatus} />
                                        <BiosBadge status={c.biometricStatus} />
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

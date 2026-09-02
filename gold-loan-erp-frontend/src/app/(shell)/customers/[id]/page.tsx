'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCustomer } from '@/lib/api/customers';
import { enrollBiometric } from '@/lib/api/biometric';
import { LoanStatusBadge } from '@/components/shared/StatusBadge';
import { RoleGate } from '@/components/shared/RoleGate';
import { ArrowLeft, MapPin, Phone, User, FileText, Fingerprint } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useState } from 'react';

export default function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const qc = useQueryClient();
    const [enrollMsg, setEnrollMsg] = useState<string | null>(null);

    const { data: customer, isLoading, error } = useQuery({
        queryKey: ['customer', id],
        queryFn: () => getCustomer(id),
    });

    const enrollMutation = useMutation({
        mutationFn: () => enrollBiometric(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['customer', id] });
            setEnrollMsg('Biometric enrollment successful.');
        },
        onError: (err: Error) => setEnrollMsg(`Enrollment failed: ${err.message}`),
    });

    if (isLoading) {
        return (
            <div className="p-8 space-y-4">
                <div className="h-8 w-48 rounded-lg bg-gray-200 animate-pulse" />
                <div className="h-48 rounded-xl bg-gray-100 animate-pulse" />
            </div>
        );
    }

    if (error || !customer) {
        return (
            <div className="p-8">
                <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                    {(error as Error)?.message ?? 'Customer not found'}
                </div>
            </div>
        );
    }

    const activeLoans = customer.loans?.filter(l => l.status === 'ACTIVE' || l.status === 'OVERDUE') ?? [];
    const closedLoans = customer.loans?.filter(l => l.status === 'CLOSED') ?? [];

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6">
            <Link
                href="/customers"
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                All Customers
            </Link>

            {/* Profile header */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <User className="w-8 h-8 text-amber-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">{customer.fullName}</h1>
                            <p className="text-sm text-gray-500 mt-0.5">{customer.customerCode}</p>
                            {customer.guardianName && (
                                <p className="text-sm text-gray-600 mt-1">S/o or W/o {customer.guardianName}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${customer.kycStatus === 'VERIFIED' ? 'bg-green-100 text-green-700'
                                : customer.kycStatus === 'REJECTED' ? 'bg-red-100 text-red-700'
                                    : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            KYC: {customer.kycStatus}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${customer.biometricStatus === 'ENROLLED' ? 'bg-green-100 text-green-700'
                                : customer.biometricStatus === 'ENROLLMENT_FAILED' ? 'bg-red-100 text-red-700'
                                    : 'bg-gray-100 text-gray-600'
                            }`}>
                            Bio: {customer.biometricStatus}
                        </span>
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-4 pt-5 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {customer.mobile}
                        {customer.alternateMobile && <span className="text-gray-400">, {customer.alternateMobile}</span>}
                    </div>
                    {customer.address && (
                        <div className="flex items-start gap-2 text-sm text-gray-600 col-span-2">
                            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            {[customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(', ')}
                        </div>
                    )}
                    {customer.dateOfBirth && (
                        <div className="text-sm text-gray-600">
                            DOB: {format(new Date(customer.dateOfBirth), 'd MMM yyyy')}
                        </div>
                    )}
                    {customer.occupation && (
                        <div className="text-sm text-gray-600">Occupation: {customer.occupation}</div>
                    )}
                </div>

                {/* Biometric actions */}
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Fingerprint className="w-4 h-4" />
                        {customer.biometric
                            ? `Enrolled ${format(new Date(customer.biometric.enrolledAt), 'd MMM yyyy')}`
                            : 'Not enrolled'}
                    </div>
                    <RoleGate roles={['OWNER', 'MANAGER', 'STAFF']}>
                        {customer.biometricStatus !== 'ENROLLED' && (
                            <button
                                onClick={() => { setEnrollMsg(null); enrollMutation.mutate(); }}
                                disabled={enrollMutation.isPending}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white
                           hover:bg-blue-700 disabled:opacity-60 transition-colors"
                            >
                                <Fingerprint className="w-4 h-4" />
                                {enrollMutation.isPending ? 'Enrolling…' : 'Enroll Biometric'}
                            </button>
                        )}
                    </RoleGate>
                </div>
                {enrollMsg && (
                    <p className="mt-2 text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2">{enrollMsg}</p>
                )}
            </div>

            {/* Documents */}
            {customer.documents && customer.documents.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> KYC Documents
                    </h2>
                    <div className="space-y-2">
                        {customer.documents.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{doc.docType}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{doc.docNumberMasked}</p>
                                </div>
                                <span className={`text-xs font-medium rounded-full px-2.5 py-0.5 ${doc.verificationStatus === 'VERIFIED' ? 'bg-green-100 text-green-700'
                                        : doc.verificationStatus === 'REJECTED' ? 'bg-red-100 text-red-700'
                                            : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                    {doc.verificationStatus}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Loans */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-gray-900">Active Loans</h2>
                    <Link
                        href={`/loans/new?customerId=${customer.id}`}
                        className="text-sm font-medium text-amber-600 hover:text-amber-700"
                    >
                        + Create Loan
                    </Link>
                </div>
                {activeLoans.length === 0 ? (
                    <p className="text-sm text-gray-400">No active loans.</p>
                ) : (
                    <div className="space-y-2">
                        {activeLoans.map(loan => (
                            <Link key={loan.id} href={`/loans/${loan.id}`}
                                className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 hover:border-amber-200 transition-colors">
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">{loan.loanCode}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {loan.principalAmount ? `₹${loan.principalAmount.toLocaleString('en-IN')}` : 'Amount TBD'} ·{' '}
                                        Created {format(new Date(loan.createdAt), 'd MMM yyyy')}
                                    </p>
                                </div>
                                <LoanStatusBadge status={loan.status} />
                            </Link>
                        ))}
                    </div>
                )}

                {closedLoans.length > 0 && (
                    <>
                        <h2 className="text-base font-semibold text-gray-900 mt-6 mb-3">Closed Loans</h2>
                        <div className="space-y-2">
                            {closedLoans.map(loan => (
                                <Link key={loan.id} href={`/loans/${loan.id}`}
                                    className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 hover:border-gray-200 transition-colors">
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">{loan.loanCode}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            ₹{loan.principalAmount?.toLocaleString('en-IN')} · {format(new Date(loan.createdAt), 'd MMM yyyy')}
                                        </p>
                                    </div>
                                    <LoanStatusBadge status={loan.status} />
                                </Link>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

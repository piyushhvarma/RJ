'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCustomer, updateCustomerPhoto } from '@/lib/api/customers';
import { LoanStatusBadge } from '@/components/shared/StatusBadge';
import { RoleGate } from '@/components/shared/RoleGate';
import { PhotoCaptureModal } from '@/components/shared/PhotoCaptureModal';
import { BiometricScannerModal } from '@/components/shared/BiometricScannerModal';
import { AadhaarKycModal } from '@/components/shared/AadhaarKycModal';
import {
    ArrowLeft,
    MapPin,
    Phone,
    User,
    FileText,
    Fingerprint,
    Camera,
    Plus,
    ShieldCheck,
    CheckCircle2,
    Calendar,
    Briefcase,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const qc = useQueryClient();

    // Modal states
    const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
    const [isBioModalOpen, setIsBioModalOpen] = useState(false);
    const [bioMode, setBioMode] = useState<'enroll' | 'verify'>('enroll');
    const [isAadhaarModalOpen, setIsAadhaarModalOpen] = useState(false);

    const { data: customer, isLoading, error } = useQuery({
        queryKey: ['customer', id],
        queryFn: () => getCustomer(id),
    });

    const photoMutation = useMutation({
        mutationFn: (photoUrl: string) => updateCustomerPhoto(id, photoUrl),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['customer', id] });
        },
    });

    if (isLoading) {
        return (
            <div className="p-8 space-y-4 max-w-4xl mx-auto">
                <div className="h-8 w-48 rounded-lg bg-gray-200 animate-pulse" />
                <div className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
            </div>
        );
    }

    if (error || !customer) {
        return (
            <div className="p-8 max-w-4xl mx-auto">
                <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                    {(error as Error)?.message ?? 'Customer not found'}
                </div>
            </div>
        );
    }

    const activeLoans = customer.loans?.filter(l => l.status === 'ACTIVE' || l.status === 'OVERDUE') ?? [];
    const closedLoans = customer.loans?.filter(l => l.status === 'CLOSED') ?? [];
    const aadhaarDoc = customer.documents?.find(d => d.docType === 'AADHAAR');

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6">
            <Link
                href="/customers"
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                All Customers
            </Link>

            {/* Profile Header Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex items-center gap-5">
                        {/* Customer Photo with Camera Capture Overlay */}
                        <div className="relative group">
                            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-amber-50 border-2 border-amber-200 flex items-center justify-center flex-shrink-0 shadow-inner">
                                {customer.photoUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={customer.photoUrl}
                                        alt={customer.fullName}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <User className="w-10 h-10 text-amber-500" />
                                )}
                            </div>
                            <RoleGate roles={['OWNER', 'MANAGER', 'STAFF']}>
                                <button
                                    onClick={() => setIsPhotoModalOpen(true)}
                                    title="Take or change customer photo"
                                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-md transition-all hover:scale-110"
                                >
                                    <Camera className="w-3.5 h-3.5" />
                                </button>
                            </RoleGate>
                        </div>

                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-gray-900">{customer.fullName}</h1>
                                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-semibold">
                                    {customer.customerCode}
                                </span>
                            </div>
                            {customer.guardianName && (
                                <p className="text-sm text-gray-500 mt-0.5">S/o or W/o {customer.guardianName}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                                <button
                                    onClick={() => setIsPhotoModalOpen(true)}
                                    className="text-xs text-amber-700 hover:text-amber-800 font-medium inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-md transition-colors"
                                >
                                    <Camera className="w-3 h-3" />
                                    {customer.photoUrl ? 'Update Photo' : 'Add Customer Photo'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex gap-2 flex-wrap sm:justify-end">
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                            customer.kycStatus === 'VERIFIED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : customer.kycStatus === 'REJECTED'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                            <ShieldCheck className="w-3 h-3" /> KYC: {customer.kycStatus}
                        </span>

                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                            customer.biometricStatus === 'ENROLLED'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : customer.biometricStatus === 'ENROLLMENT_FAILED'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-gray-100 text-gray-600'
                        }`}>
                            <Fingerprint className="w-3 h-3" /> Bio: {customer.biometricStatus}
                        </span>
                    </div>
                </div>

                {/* Details Grid */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-5 border-t border-gray-100">
                    <div className="flex items-center gap-2.5 text-sm text-gray-700">
                        <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium">{customer.mobile}</span>
                        {customer.alternateMobile && (
                            <span className="text-gray-400 text-xs">({customer.alternateMobile})</span>
                        )}
                    </div>
                    {customer.address && (
                        <div className="flex items-start gap-2.5 text-sm text-gray-700 col-span-1 sm:col-span-2">
                            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            <span>{[customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(', ')}</span>
                        </div>
                    )}
                    {customer.dateOfBirth && (
                        <div className="flex items-center gap-2.5 text-sm text-gray-700">
                            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span>DOB: {format(new Date(customer.dateOfBirth), 'd MMM yyyy')}</span>
                        </div>
                    )}
                    {customer.occupation && (
                        <div className="flex items-center gap-2.5 text-sm text-gray-700">
                            <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span>{customer.occupation}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* KYC & Biometrics Section Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Aadhaar / KYC Document Card */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-amber-600" /> Aadhaar & KYC Verification
                            </h2>
                            <RoleGate roles={['OWNER', 'MANAGER', 'STAFF']}>
                                <button
                                    onClick={() => setIsAadhaarModalOpen(true)}
                                    className="text-xs font-semibold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add Document
                                </button>
                            </RoleGate>
                        </div>

                        {aadhaarDoc ? (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        <span className="text-xs font-bold uppercase text-emerald-800">Aadhaar Card Linked</span>
                                    </div>
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded">
                                        Verified
                                    </span>
                                </div>
                                <p className="text-base font-mono font-bold text-emerald-900">
                                    {aadhaarDoc.docNumberMasked}
                                </p>
                                <p className="text-[11px] text-emerald-700">
                                    Document code: {aadhaarDoc.documentCode}
                                </p>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-gray-300 p-5 text-center space-y-2">
                                <FileText className="w-8 h-8 text-gray-400 mx-auto" />
                                <p className="text-sm font-semibold text-gray-700">No Aadhaar Card on file</p>
                                <p className="text-xs text-gray-500">
                                    Upload customer Aadhaar or enter 12-digit number for KYC verification.
                                </p>
                                <button
                                    onClick={() => setIsAadhaarModalOpen(true)}
                                    className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add Aadhaar Card
                                </button>
                            </div>
                        )}

                        {/* Other documents list */}
                        {customer.documents && customer.documents.length > 0 && (
                            <div className="mt-4 space-y-2">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">All Attached Documents</p>
                                {customer.documents.map((doc) => (
                                    <div
                                        key={doc.id}
                                        className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 bg-gray-50/70 text-xs"
                                    >
                                        <div>
                                            <span className="font-semibold text-gray-900">{doc.docType}</span>
                                            <span className="text-gray-500 ml-2 font-mono">{doc.docNumberMasked}</span>
                                        </div>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">
                                            {doc.verificationStatus}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Biometric Fingerprint Enrollment Card */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <Fingerprint className="w-4 h-4 text-blue-600" /> Biometric Identity
                            </h2>
                            <span className="text-[11px] font-mono text-gray-500">
                                Sensor: MOCK-BIO-01
                            </span>
                        </div>

                        {customer.biometricStatus === 'ENROLLED' && customer.biometric ? (
                            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                                        <span className="text-xs font-bold uppercase text-blue-900">Fingerprint Enrolled</span>
                                    </div>
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-blue-200 text-blue-800 rounded">
                                        Active Template
                                    </span>
                                </div>
                                <p className="text-xs font-mono text-blue-800 font-semibold">
                                    Ref: {customer.biometric.enrollmentCode}
                                </p>
                                <p className="text-[11px] text-blue-600">
                                    Enrolled on {format(new Date(customer.biometric.enrolledAt), 'd MMM yyyy, h:mm a')}
                                </p>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-gray-300 p-5 text-center space-y-2">
                                <Fingerprint className="w-8 h-8 text-gray-400 mx-auto" />
                                <p className="text-sm font-semibold text-gray-700">Not Biometrically Enrolled</p>
                                <p className="text-xs text-gray-500">
                                    Fingerprint enrollment is required for high-value loans and safe gold release closures.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 flex gap-2 mt-4 border-t border-gray-100">
                        <RoleGate roles={['OWNER', 'MANAGER', 'STAFF']}>
                            <button
                                onClick={() => {
                                    setBioMode('enroll');
                                    setIsBioModalOpen(true);
                                }}
                                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition-colors"
                            >
                                <Fingerprint className="w-3.5 h-3.5" />
                                {customer.biometricStatus === 'ENROLLED' ? 'Re-enroll Fingerprint' : 'Enroll Biometrics'}
                            </button>
                        </RoleGate>

                        {customer.biometricStatus === 'ENROLLED' && (
                            <button
                                onClick={() => {
                                    setBioMode('verify');
                                    setIsBioModalOpen(true);
                                }}
                                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                                Test Match
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Active Loans */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-gray-900">Active Loans</h2>
                    <Link
                        href={`/loans/new?customerId=${customer.id}`}
                        className="text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        + Create Loan
                    </Link>
                </div>
                {activeLoans.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">No active loans for this customer.</p>
                ) : (
                    <div className="space-y-2">
                        {activeLoans.map((loan) => (
                            <Link
                                key={loan.id}
                                href={`/loans/${loan.id}`}
                                className="flex items-center justify-between rounded-xl border border-gray-100 p-4 hover:border-amber-300 hover:shadow-xs transition-all"
                            >
                                <div>
                                    <p className="text-sm font-bold text-gray-900">{loan.loanCode}</p>
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
                        <h2 className="text-base font-bold text-gray-900 mt-6 mb-3">Closed Loans</h2>
                        <div className="space-y-2">
                            {closedLoans.map((loan) => (
                                <Link
                                    key={loan.id}
                                    href={`/loans/${loan.id}`}
                                    className="flex items-center justify-between rounded-xl border border-gray-100 p-3.5 hover:border-gray-200 transition-colors opacity-80"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">{loan.loanCode}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">
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

            {/* Modals */}
            <PhotoCaptureModal
                isOpen={isPhotoModalOpen}
                onClose={() => setIsPhotoModalOpen(false)}
                title="Customer Profile Photo"
                subtitle="Take a live portrait with the webcam or upload a photo of the customer."
                onConfirm={async (photoDataUrl) => {
                    await photoMutation.mutateAsync(photoDataUrl);
                }}
            />

            <BiometricScannerModal
                isOpen={isBioModalOpen}
                onClose={() => setIsBioModalOpen(false)}
                customerId={customer.id}
                customerName={customer.fullName}
                mode={bioMode}
                onSuccess={() => {
                    qc.invalidateQueries({ queryKey: ['customer', id] });
                }}
            />

            <AadhaarKycModal
                isOpen={isAadhaarModalOpen}
                onClose={() => setIsAadhaarModalOpen(false)}
                customerId={customer.id}
                customerName={customer.fullName}
                onSuccess={() => {
                    qc.invalidateQueries({ queryKey: ['customer', id] });
                }}
            />
        </div>
    );
}

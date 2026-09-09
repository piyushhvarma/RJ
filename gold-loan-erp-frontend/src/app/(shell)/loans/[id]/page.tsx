'use client';

import { use, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getLoan } from '@/lib/api/loans';
import { addJewelleryPhoto } from '@/lib/api/jewellery';
import { LoanStatusBadge, PacketStatusBadge, AppraisalStatusBadge } from '@/components/shared/StatusBadge';
import { RoleGate } from '@/components/shared/RoleGate';
import { PhotoCaptureModal } from '@/components/shared/PhotoCaptureModal';
import { ArrowLeft, Package, CreditCard, Gem, FileText, Camera, Maximize2, X } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-baseline justify-between py-2 border-b border-gray-50 last:border-0">
            <span className="text-sm text-gray-500">{label}</span>
            <span className="text-sm font-medium text-gray-900">{value}</span>
        </div>
    );
}

function fmt(n?: number | null) {
    if (n == null) return '—';
    return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export default function LoanProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const qc = useQueryClient();
    const [activeItemForPhoto, setActiveItemForPhoto] = useState<{ id: string; code: string } | null>(null);
    const [enlargedPhoto, setEnlargedPhoto] = useState<{ url: string; title: string; angle?: string } | null>(null);

    const { data: loan, isLoading, error } = useQuery({
        queryKey: ['loan', id],
        queryFn: () => getLoan(id),
    });

    if (isLoading) {
        return (
            <div className="p-8 space-y-4">
                <div className="h-8 w-48 rounded-lg bg-gray-200 animate-pulse" />
                <div className="h-64 rounded-xl bg-gray-100 animate-pulse" />
            </div>
        );
    }
    if (error || !loan) {
        return (
            <div className="p-8">
                <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                    {(error as Error)?.message ?? 'Loan not found'}
                </div>
            </div>
        );
    }

    // Derive outstanding from ledger
    const outstanding = loan.ledgerEntries?.length
        ? loan.ledgerEntries[loan.ledgerEntries.length - 1].balanceAfter
        : loan.principalAmount ?? 0;

    const latestAppraisal = loan.appraisals?.at(-1);
    const totalPaid = loan.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6">
            <Link
                href="/loans"
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                All Loans
            </Link>

            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold text-gray-900">{loan.loanCode}</h1>
                            <LoanStatusBadge status={loan.status} />
                        </div>
                        {loan.customer && (
                            <Link
                                href={`/customers/${loan.customerId}`}
                                className="text-sm text-amber-600 hover:text-amber-700 mt-1 block"
                            >
                                {loan.customer.fullName} · {loan.customer.mobile}
                            </Link>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <RoleGate roles={['OWNER', 'MANAGER']}>
                            {(loan.status === 'DRAFT' || loan.status === 'APPROVED') && (
                                <Link
                                    href={`/loans/${loan.id}/disburse`}
                                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
                                >
                                    Disburse Loan
                                </Link>
                            )}
                            {loan.status === 'ACTIVE' && (
                                <Link
                                    href={`/closures/${loan.id}`}
                                    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition-colors"
                                >
                                    Close Loan
                                </Link>
                            )}
                        </RoleGate>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Principal', value: fmt(loan.principalAmount) },
                        { label: 'Outstanding', value: fmt(outstanding) },
                        { label: 'Total Paid', value: fmt(totalPaid) },
                        { label: 'Interest Rate', value: loan.interestRate ? `${loan.interestRate}% (${loan.interestType})` : '—' },
                    ].map(({ label, value }) => (
                        <div key={label} className="rounded-lg bg-gray-50 px-4 py-3">
                            <p className="text-xs text-gray-500">{label}</p>
                            <p className="text-base font-semibold text-gray-900 mt-0.5">{value}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-x-8 pt-4 border-t border-gray-100">
                    <InfoRow label="Sanctioned" value={loan.sanctionedDate ? format(new Date(loan.sanctionedDate), 'd MMM yyyy') : '—'} />
                    <InfoRow label="Maturity" value={loan.maturityDate ? format(new Date(loan.maturityDate), 'd MMM yyyy') : '—'} />
                    <InfoRow label="Processing Charges" value={fmt(loan.processingCharges)} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Jewellery */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                            <Gem className="w-4 h-4" /> Collateral
                        </h2>
                        <RoleGate roles={['OWNER', 'MANAGER', 'APPRAISER']}>
                            <Link
                                href={`/jewellery/new?loanId=${loan.id}`}
                                className="text-sm font-medium text-amber-600 hover:text-amber-700"
                            >
                                + Add Item
                            </Link>
                        </RoleGate>
                    </div>
                    {!loan.jewelleryItems?.length ? (
                        <p className="text-sm text-gray-400">No jewellery items added yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {loan.jewelleryItems.map(item => (
                                <div key={item.id} className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-gray-900">{item.itemCode}</p>
                                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                                                    {item.category}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-gray-900">{fmt(item.valuation)}</p>
                                            <p className="text-xs text-gray-500">{item.netWeight}g · {item.purityKarat}</p>
                                        </div>
                                    </div>

                                    {/* Item Photo Gallery & Add Photo Trigger */}
                                    <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center gap-2">
                                        {item.photos && item.photos.length > 0 ? (
                                            item.photos.map((photo) => (
                                                <div
                                                    key={photo.id}
                                                    onClick={() => setEnlargedPhoto({
                                                        url: photo.fileUrl,
                                                        title: `${item.itemCode} (${item.category})`,
                                                        angle: photo.angle
                                                    })}
                                                    className="group relative w-14 h-14 rounded-lg overflow-hidden border border-gray-200 bg-black cursor-pointer shadow-xs hover:border-amber-400 transition-all flex items-center justify-center flex-shrink-0"
                                                >
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={photo.fileUrl}
                                                        alt={photo.angle}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                    />
                                                    <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[8px] text-center font-medium capitalize truncate py-0.5">
                                                        {photo.angle}
                                                    </span>
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                                        <Maximize2 className="w-3 h-3" />
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">No item photos attached</span>
                                        )}

                                        <RoleGate roles={['OWNER', 'MANAGER', 'APPRAISER', 'STAFF']}>
                                            <button
                                                type="button"
                                                onClick={() => setActiveItemForPhoto({ id: item.id, code: item.itemCode })}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/60 hover:bg-amber-100 text-amber-700 text-xs font-bold transition-colors ml-auto"
                                            >
                                                <Camera className="w-3.5 h-3.5" />
                                                + Add Photo
                                            </button>
                                        </RoleGate>
                                    </div>
                                </div>
                            ))}
                            <div className="text-right text-xs font-semibold text-gray-600 pt-1">
                                Total weight: {loan.jewelleryItems.reduce((s, i) => s + i.netWeight, 0).toFixed(2)}g net ·{' '}
                                Total value: {fmt(loan.jewelleryItems.reduce((s, i) => s + i.valuation, 0))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Appraisal + Packet */}
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Appraisal
                        </h2>
                        {!latestAppraisal ? (
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-400">No appraisal yet.</p>
                                <RoleGate roles={['OWNER', 'MANAGER', 'APPRAISER']}>
                                    <Link
                                        href={`/jewellery/appraisals/new?loanId=${loan.id}`}
                                        className="text-sm font-medium text-amber-600 hover:text-amber-700"
                                    >
                                        Create Appraisal
                                    </Link>
                                </RoleGate>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <AppraisalStatusBadge status={latestAppraisal.status} />
                                    <p className="text-xs text-gray-500">{format(new Date(latestAppraisal.createdAt), 'd MMM yyyy')}</p>
                                </div>
                                {latestAppraisal.goldRateValue && (
                                    <p className="text-sm text-gray-600">
                                        Gold rate: ₹{latestAppraisal.goldRateValue.toLocaleString('en-IN')}/g ({latestAppraisal.goldRateSource})
                                    </p>
                                )}
                                <RoleGate roles={['OWNER', 'MANAGER', 'APPRAISER']}>
                                    <div className="flex gap-2 pt-2">
                                        {latestAppraisal.status === 'DRAFT' && (
                                            <Link
                                                href={`/jewellery/appraisals/${latestAppraisal.id}/confirm`}
                                                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                                            >
                                                Confirm Appraisal
                                            </Link>
                                        )}
                                        <RoleGate roles={['OWNER', 'MANAGER']}>
                                            {latestAppraisal.status === 'APPRAISER_CONFIRMED' && (
                                                <Link
                                                    href={`/jewellery/appraisals/${latestAppraisal.id}/approve`}
                                                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition-colors"
                                                >
                                                    Approve & Lock
                                                </Link>
                                            )}
                                        </RoleGate>
                                    </div>
                                </RoleGate>
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Package className="w-4 h-4" /> Packet
                        </h2>
                        {!loan.packet ? (
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-400">No packet created yet.</p>
                                <RoleGate roles={['OWNER', 'MANAGER', 'STAFF']}>
                                    <Link
                                        href={`/packets/new?loanId=${loan.id}`}
                                        className="text-sm font-medium text-amber-600 hover:text-amber-700"
                                    >
                                        Create Packet
                                    </Link>
                                </RoleGate>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-gray-900">{loan.packet.packetCode}</p>
                                    <PacketStatusBadge status={loan.packet.status} />
                                </div>
                                {loan.packet.storageLocation && (
                                    <p className="text-sm text-gray-600">📍 {loan.packet.storageLocation.label}</p>
                                )}
                                <Link
                                    href={`/packets/${loan.packet.id}`}
                                    className="text-sm text-amber-600 hover:text-amber-700"
                                >
                                    View packet details →
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Payments */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" /> Payments
                    </h2>
                    <RoleGate roles={['OWNER', 'MANAGER', 'CASHIER']}>
                        {['ACTIVE', 'OVERDUE', 'NOTICE'].includes(loan.status) && (
                            <Link
                                href={`/payments/new?loanId=${loan.id}`}
                                className="text-sm font-medium text-amber-600 hover:text-amber-700"
                            >
                                + Receive Payment
                            </Link>
                        )}
                    </RoleGate>
                </div>
                {!loan.payments?.length ? (
                    <p className="text-sm text-gray-400">No payments recorded.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 text-left">
                                    <th className="pb-2 font-medium text-gray-500 pr-4">Date</th>
                                    <th className="pb-2 font-medium text-gray-500 pr-4">Receipt</th>
                                    <th className="pb-2 font-medium text-gray-500 pr-4">Mode</th>
                                    <th className="pb-2 font-medium text-gray-500 pr-4 text-right">Amount</th>
                                    <th className="pb-2 font-medium text-gray-500 text-right">Principal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loan.payments.map(p => (
                                    <tr key={p.id}>
                                        <td className="py-2 pr-4 text-gray-600">{format(new Date(p.paymentDate), 'd MMM yyyy')}</td>
                                        <td className="py-2 pr-4 text-gray-700 font-mono text-xs">{p.receiptNumber}</td>
                                        <td className="py-2 pr-4 text-gray-600">{p.mode}</td>
                                        <td className="py-2 pr-4 text-gray-900 font-semibold text-right">{fmt(p.amount)}</td>
                                        <td className="py-2 text-gray-600 text-right">{fmt(p.principalComponent)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {/* Photo Capture Modal for Jewellery */}
            <PhotoCaptureModal
                isOpen={!!activeItemForPhoto}
                onClose={() => setActiveItemForPhoto(null)}
                title={`Add Photo: ${activeItemForPhoto?.code}`}
                subtitle="Take a live photo of the pledged piece or upload high-res image."
                showAngleSelect={true}
                defaultAngle="front"
                onConfirm={async (fileUrl, angle) => {
                    if (activeItemForPhoto) {
                        await addJewelleryPhoto(activeItemForPhoto.id, {
                            angle: angle ?? 'front',
                            fileUrl,
                        });
                        qc.invalidateQueries({ queryKey: ['loan', id] });
                    }
                }}
            />

            {/* Lightbox Enlarged Viewer Modal */}
            {enlargedPhoto && (
                <div
                    onClick={() => setEnlargedPhoto(null)}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="relative max-w-3xl max-h-[85vh] bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center justify-center p-2"
                    >
                        <button
                            onClick={() => setEnlargedPhoto(null)}
                            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center z-10"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={enlargedPhoto.url}
                            alt={enlargedPhoto.title}
                            className="max-h-[75vh] max-w-full object-contain rounded-xl"
                        />
                        <div className="text-center pt-2 pb-1 text-white text-xs">
                            <span className="font-bold">{enlargedPhoto.title}</span>
                            {enlargedPhoto.angle && (
                                <span className="ml-2 px-2 py-0.5 rounded bg-white/20 uppercase font-mono text-[10px]">
                                    {enlargedPhoto.angle}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

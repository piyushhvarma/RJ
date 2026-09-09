'use client';

/**
 * Loan Creation Wizard — multi-step, resumable via localStorage.
 * Steps: 1.Customer → 2.Loan Draft → 3.Jewellery → 4.Appraisal → 5.Disburse → 6.Packet → 7.Storage (→ 8.Document stub)
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
    createLoanSchema, disburseLoanSchema, createJewelleryItemSchema, createAppraisalSchema, storePacketSchema,
    type CreateLoanDto, type DisburseLoanDto, type CreateJewelleryItemDto, type CreateAppraisalDto, type StorePacketDto,
} from '@/lib/schemas';
import { createLoan, disburseLoan } from '@/lib/api/loans';
import { createJewelleryItem, addJewelleryPhoto } from '@/lib/api/jewellery';
import { createAppraisal, confirmAppraisal, approveAppraisal } from '@/lib/api/appraisals';
import { createPacket, storePacket } from '@/lib/api/packets';
import { getCustomers, getCustomer } from '@/lib/api/customers';
import { RoleGate } from '@/components/shared/RoleGate';
import { AppraisalStatusBadge } from '@/components/shared/StatusBadge';
import { PhotoCaptureModal } from '@/components/shared/PhotoCaptureModal';
import { ArrowLeft, ArrowRight, Check, AlertTriangle, Camera } from 'lucide-react';
import Link from 'next/link';
import type { Loan, JewelleryItem, Appraisal, Packet } from '@/lib/api/types';

const WIZARD_KEY = 'gl_loan_wizard';

interface WizardState {
    step: number;
    customerId?: string;
    loanId?: string;
    jewelleryItemIds?: string[];
    appraisalId?: string;
    packetId?: string;
}

const STEPS = [
    'Customer',
    'Loan Draft',
    'Jewellery',
    'Appraisal',
    'Disburse',
    'Packet',
    'Storage',
    'Document',
];

const inputCls = 'w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-50';

function StepHeader({ step, total }: { step: number; total: number }) {
    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-8">
            {STEPS.map((label, i) => (
                <div key={label} className="flex items-center gap-1 flex-shrink-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
            ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                        {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                    </div>
                    <span className={`text-xs ${i === step ? 'font-semibold text-amber-700' : 'text-gray-400'}`}>{label}</span>
                    {i < STEPS.length - 1 && <div className={`w-6 h-px ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
                </div>
            ))}
        </div>
    );
}

// Step 1: Customer selection
function CustomerStep({ onNext, initialCustomerId }: { onNext: (id: string) => void; initialCustomerId?: string }) {
    const [q, setQ] = useState('');
    const [selectedId, setSelectedId] = useState(initialCustomerId ?? '');
    const { data: customers, isLoading } = useQuery({
        queryKey: ['customers', q],
        queryFn: () => getCustomers(q || undefined),
    });
    const { data: selected } = useQuery({
        queryKey: ['customer', selectedId],
        queryFn: () => getCustomer(selectedId),
        enabled: !!selectedId,
    });

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Select Customer</h2>
            <input
                type="search"
                placeholder="Search by name or mobile…"
                value={q}
                onChange={e => setQ(e.target.value)}
                className={inputCls}
            />
            {isLoading && <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />}
            {customers?.map(c => (
                <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition-colors ${selectedId === c.id ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                >
                    <p className="font-semibold text-gray-900">{c.fullName}</p>
                    <p className="text-xs text-gray-500">{c.customerCode} · {c.mobile}</p>
                </button>
            ))}
            {selected && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                    <p className="text-sm font-medium text-amber-800">Selected: {selected.fullName}</p>
                    {selected.kycStatus !== 'VERIFIED' && (
                        <p className="text-xs text-amber-600 mt-1">⚠ KYC not yet verified — proceed with caution.</p>
                    )}
                </div>
            )}
            <div className="flex justify-between pt-4">
                <Link href="/customers/new" className="text-sm text-amber-600 hover:text-amber-700">
                    + Register new customer
                </Link>
                <button
                    disabled={!selectedId}
                    onClick={() => onNext(selectedId)}
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
                >
                    Next <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

// Step 2: Create loan draft
function LoanDraftStep({
    customerId,
    initialLoanId,
    onNext,
    onBack,
}: {
    customerId: string;
    initialLoanId?: string;
    onNext: (loanId: string) => void;
    onBack: () => void;
}) {
    const [error, setError] = useState<string | null>(null);
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateLoanDto>({
        resolver: zodResolver(createLoanSchema),
        defaultValues: { customerId },
    });

    if (initialLoanId) {
        return (
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Loan Draft</h2>
                <div className="rounded-xl bg-green-50 border border-green-200 p-4">
                    <p className="text-sm font-medium text-green-800">✓ Loan draft already created. Continue to add jewellery.</p>
                </div>
                <div className="flex justify-between">
                    <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-800">← Back</button>
                    <button onClick={() => onNext(initialLoanId)} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors">
                        Next <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Create Loan Draft</h2>
            <form
                onSubmit={handleSubmit(async (data) => {
                    setError(null);
                    try {
                        const loan = await createLoan({ customerId: data.customerId, schemeId: data.schemeId });
                        onNext(loan.id);
                    } catch (e: any) { setError(e.message); }
                })}
                className="space-y-4"
            >
                <input type="hidden" {...register('customerId')} value={customerId} />
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Scheme ID (optional)</label>
                    <input type="text" placeholder="Leave blank if no specific scheme" className={inputCls} {...register('schemeId')} />
                </div>
                {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
                <div className="flex justify-between pt-2">
                    <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-gray-800">← Back</button>
                    <button type="submit" disabled={isSubmitting}
                        className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors">
                        Create Draft <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </form>
        </div>
    );
}

// Step 3: Add jewellery items
function JewelleryStep({
    loanId,
    addedItems,
    onItemAdded,
    onNext,
    onBack,
}: {
    loanId: string;
    addedItems: string[];
    onItemAdded: (id: string) => void;
    onNext: () => void;
    onBack: () => void;
}) {
    const [error, setError] = useState<string | null>(null);
    const [lastItem, setLastItem] = useState<JewelleryItem | null>(null);
    const [photoModalOpen, setPhotoModalOpen] = useState(false);
    const [itemPhotoCount, setItemPhotoCount] = useState<Record<string, number>>({});
    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateJewelleryItemDto>({
        resolver: zodResolver(createJewelleryItemSchema),
        defaultValues: { loanId, stoneWeight: 0, ownershipDeclaration: false },
    });

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Add Jewellery Items</h2>
                {addedItems.length > 0 && (
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700">
                        {addedItems.length} item{addedItems.length > 1 ? 's' : ''} added
                    </span>
                )}
            </div>

            {lastItem && (
                <div className="rounded-xl bg-green-50 border border-green-200 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-green-900">✓ Item added: {lastItem.itemCode}</p>
                        <button
                            type="button"
                            onClick={() => setPhotoModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-colors shadow-xs"
                        >
                            <Camera className="w-3.5 h-3.5" />
                            {itemPhotoCount[lastItem.id] ? `Add Another Photo (${itemPhotoCount[lastItem.id]} attached)` : 'Attach Item Photo'}
                        </button>
                    </div>
                    <p className="text-xs text-green-700">
                        Net weight: {lastItem.netWeight}g · Valuation: ₹{lastItem.valuation.toLocaleString('en-IN')}
                    </p>
                </div>
            )}

            <form
                onSubmit={handleSubmit(async (data) => {
                    setError(null);
                    try {
                        const item = await createJewelleryItem(data as Record<string, unknown>);
                        setLastItem(item);
                        onItemAdded(item.id);
                        reset({ loanId, stoneWeight: 0, ownershipDeclaration: false });
                    } catch (e: any) { setError(e.message); }
                })}
                className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-4"
            >
                <input type="hidden" {...register('loanId')} />
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                        <input type="text" placeholder="Necklace, Ring, Bangle…" className={inputCls} {...register('category')} />
                        {errors.category && <p className="text-xs text-red-600 mt-1">{errors.category.message}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Purity *</label>
                        <input type="text" placeholder="22K" className={inputCls} {...register('purityKarat')} />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                    <input type="text" placeholder="Brief description of the piece" className={inputCls} {...register('description')} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gross Weight (g) *</label>
                        <input type="number" step="0.01" className={inputCls} {...register('grossWeight', { valueAsNumber: true })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Stone Weight (g)</label>
                        <input type="number" step="0.01" defaultValue={0} className={inputCls} {...register('stoneWeight', { valueAsNumber: true })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Rate per Gram (₹) *</label>
                        <input type="number" step="0.01" className={inputCls} {...register('valuationRate', { valueAsNumber: true })} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hallmark Details</label>
                        <input type="text" className={inputCls} {...register('hallmarkDetails')} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                        <input type="text" placeholder="Good / Fair / Used" className={inputCls} {...register('condition')} />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <input type="checkbox" id="ownershipDeclaration" className="rounded" {...register('ownershipDeclaration')} />
                    <label htmlFor="ownershipDeclaration" className="text-sm text-gray-700">Customer declares ownership of this item</label>
                </div>
                <p className="text-xs text-gray-500 italic">
                    Net weight and valuation are computed by the server and shown in the confirmation above — do not calculate client-side.
                </p>
                {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
                <button type="submit" disabled={isSubmitting}
                    className="w-full rounded-lg border-2 border-dashed border-amber-300 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-colors">
                    {isSubmitting ? 'Adding…' : '+ Add This Item'}
                </button>
            </form>

            <div className="flex justify-between pt-2">
                <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-800">← Back</button>
                <button
                    onClick={onNext}
                    disabled={addedItems.length === 0}
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
                >
                    Next (Appraisal) <ArrowRight className="w-4 h-4" />
                </button>
            </div>

            <PhotoCaptureModal
                isOpen={photoModalOpen && !!lastItem}
                onClose={() => setPhotoModalOpen(false)}
                title={`Item Photo: ${lastItem?.itemCode}`}
                subtitle="Capture or upload photo of the pledged jewellery piece."
                showAngleSelect={true}
                defaultAngle="front"
                onConfirm={async (fileUrl, angle) => {
                    if (lastItem) {
                        await addJewelleryPhoto(lastItem.id, {
                            angle: angle ?? 'front',
                            fileUrl,
                        });
                        setItemPhotoCount(prev => ({
                            ...prev,
                            [lastItem.id]: (prev[lastItem.id] ?? 0) + 1,
                        }));
                    }
                }}
            />
        </div>
    );
}

// Step 4: Appraisal
function AppraisalStep({
    loanId,
    appraisalId,
    onAppraisalCreated,
    onNext,
    onBack,
}: {
    loanId: string;
    appraisalId?: string;
    onAppraisalCreated: (id: string) => void;
    onNext: () => void;
    onBack: () => void;
}) {
    const [error, setError] = useState<string | null>(null);
    const [appraisal, setAppraisal] = useState<Appraisal | null>(null);
    const { register, handleSubmit, formState: { isSubmitting } } = useForm<CreateAppraisalDto>({
        resolver: zodResolver(createAppraisalSchema),
        defaultValues: { loanId },
    });

    async function handleCreate(data: CreateAppraisalDto) {
        setError(null);
        try {
            const a = await createAppraisal(data as Record<string, unknown>);
            setAppraisal(a);
            onAppraisalCreated(a.id);
        } catch (e: any) { setError(e.message); }
    }

    async function handleConfirm() {
        if (!appraisalId && !appraisal?.id) return;
        setError(null);
        try {
            const a = await confirmAppraisal(appraisalId ?? appraisal!.id);
            setAppraisal(a);
        } catch (e: any) { setError(e.message); }
    }

    async function handleApprove() {
        if (!appraisalId && !appraisal?.id) return;
        setError(null);
        try {
            const a = await approveAppraisal(appraisalId ?? appraisal!.id, {});
            setAppraisal(a);
        } catch (e: any) { setError(e.message); }
    }

    const currentStatus = appraisal?.status;
    const isLocked = currentStatus === 'LOCKED' || currentStatus === 'MANAGER_APPROVED';

    return (
        <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Appraisal</h2>
            {currentStatus && (
                <div className="flex items-center gap-3">
                    <AppraisalStatusBadge status={currentStatus} />
                    {isLocked && <span className="text-sm text-green-700 font-medium">✓ Appraisal locked — can proceed</span>}
                </div>
            )}

            {!appraisal && !appraisalId ? (
                <form onSubmit={handleSubmit(handleCreate)} className="space-y-4">
                    <input type="hidden" {...register('loanId')} />
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Gold Rate Source</label>
                            <input type="text" placeholder="MCX spot, internal sheet…" className={inputCls} {...register('goldRateSource')} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Gold Rate (₹/g)</label>
                            <input type="number" step="0.01" className={inputCls} {...register('goldRateValue', { valueAsNumber: true })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <input type="text" className={inputCls} {...register('notes')} />
                    </div>
                    {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
                    <button type="submit" disabled={isSubmitting}
                        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                        {isSubmitting ? 'Creating…' : 'Create Appraisal'}
                    </button>
                </form>
            ) : (
                <div className="space-y-3">
                    {!isLocked && (
                        <div className="flex gap-3">
                            <RoleGate roles={['OWNER', 'MANAGER', 'APPRAISER']}>
                                {currentStatus === 'DRAFT' && (
                                    <button onClick={handleConfirm}
                                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                                        Confirm (Appraiser)
                                    </button>
                                )}
                            </RoleGate>
                            <RoleGate roles={['OWNER', 'MANAGER']}>
                                {currentStatus === 'APPRAISER_CONFIRMED' && (
                                    <button onClick={handleApprove}
                                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors">
                                        Approve & Lock (Manager)
                                    </button>
                                )}
                            </RoleGate>
                        </div>
                    )}
                    {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
                </div>
            )}

            <div className="flex justify-between pt-2">
                <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-800">← Back</button>
                <button
                    onClick={onNext}
                    disabled={!isLocked}
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
                >
                    {isLocked ? <>Next (Disburse) <ArrowRight className="w-4 h-4" /></> : 'Lock appraisal to continue'}
                </button>
            </div>
        </div>
    );
}

// Step 5: Disburse
function DisburseStep({
    loanId,
    onNext,
    onBack,
}: {
    loanId: string;
    onNext: () => void;
    onBack: () => void;
}) {
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<DisburseLoanDto>({
        resolver: zodResolver(disburseLoanSchema),
    });

    if (done) {
        return (
            <div className="space-y-4">
                <div className="rounded-xl bg-green-50 border border-green-200 p-5">
                    <p className="text-sm font-bold text-green-800">✓ Loan Disbursed — status is now ACTIVE</p>
                </div>
                <div className="flex justify-between">
                    <button onClick={onBack} className="text-sm text-gray-500">← Back</button>
                    <button onClick={onNext} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors">
                        Next (Packet) <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-lg font-semibold text-gray-900">Disburse Loan</h2>
                <p className="text-sm text-gray-500 mt-1">This locks the principal amount and activates the loan. Manager or Owner only.</p>
            </div>
            <RoleGate roles={['OWNER', 'MANAGER']} fallback={
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    Only a Manager or Owner can disburse a loan. Ask your manager to complete this step.
                </div>
            }>
                <form
                    onSubmit={handleSubmit(async (data) => {
                        setError(null);
                        try {
                            await disburseLoan(loanId, data as Record<string, unknown>);
                            setDone(true);
                        } catch (e: any) { setError(e.message); }
                    })}
                    className="space-y-4"
                >
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Principal Amount (₹) *</label>
                            <input type="number" step="0.01" className={inputCls} {...register('principalAmount', { valueAsNumber: true })} />
                            {errors.principalAmount && <p className="text-xs text-red-600 mt-1">{errors.principalAmount.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%) *</label>
                            <input type="number" step="0.01" className={inputCls} {...register('interestRate', { valueAsNumber: true })} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Interest Type *</label>
                            <select className={inputCls} {...register('interestType')}>
                                <option value="">Select…</option>
                                <option value="MONTHLY_SIMPLE">Monthly Simple</option>
                                <option value="DAILY_SIMPLE">Daily Simple</option>
                                <option value="ANNUAL_SIMPLE">Annual Simple</option>
                                <option value="CUSTOM">Custom</option>
                            </select>
                            {errors.interestType && <p className="text-xs text-red-600 mt-1">{errors.interestType.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Processing Charges (₹)</label>
                            <input type="number" step="0.01" defaultValue={0} className={inputCls} {...register('processingCharges', { valueAsNumber: true })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Maturity Date *</label>
                        <input type="date" className={inputCls} {...register('maturityDate')} />
                        {errors.maturityDate && <p className="text-xs text-red-600 mt-1">{errors.maturityDate.message}</p>}
                    </div>
                    {error && (
                        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-gray-800">← Back</button>
                        <button type="submit" disabled={isSubmitting}
                            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
                            {isSubmitting ? 'Disbursing…' : 'Disburse Loan'}
                        </button>
                    </div>
                </form>
            </RoleGate>
        </div>
    );
}

// Step 6: Create packet
function PacketStep({
    loanId,
    packetId,
    onPacketCreated,
    onNext,
    onBack,
}: {
    loanId: string;
    packetId?: string;
    onPacketCreated: (id: string) => void;
    onNext: () => void;
    onBack: () => void;
}) {
    const [error, setError] = useState<string | null>(null);
    const [packet, setPacket] = useState<Packet | null>(null);
    const [creating, setCreating] = useState(false);

    async function handleCreate() {
        setError(null);
        setCreating(true);
        try {
            const p = await createPacket(loanId);
            setPacket(p);
            onPacketCreated(p.id);
        } catch (e: any) { setError(e.message); }
        finally { setCreating(false); }
    }

    const pid = packetId ?? packet?.id;

    return (
        <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Create Packet</h2>
            {pid ? (
                <div className="rounded-xl bg-green-50 border border-green-200 p-4">
                    <p className="text-sm font-medium text-green-800">✓ Packet created: {packet?.packetCode ?? pid}</p>
                </div>
            ) : (
                <>
                    <p className="text-sm text-gray-600">Create a physical packet code for the sealed gold envelope.</p>
                    {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
                    <button onClick={handleCreate} disabled={creating}
                        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                        {creating ? 'Creating…' : 'Create Packet'}
                    </button>
                </>
            )}
            <div className="flex justify-between pt-2">
                <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-800">← Back</button>
                <button onClick={onNext} disabled={!pid}
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors">
                    Next (Storage) <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

// Step 7: Storage
function StorageStep({
    packetId,
    onNext,
    onBack,
}: {
    packetId: string;
    onNext: () => void;
    onBack: () => void;
}) {
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);
    const [locationLabel, setLocationLabel] = useState('');
    const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<StorePacketDto>({
        resolver: zodResolver(storePacketSchema),
    });

    const [safe, locker, shelf, position] = [watch('safe'), watch('locker'), watch('shelf'), watch('position')];
    const preview = safe && locker && shelf && position
        ? `${safe}-L${locker}-S${shelf}-P${position}`
        : '—';

    if (done) {
        return (
            <div className="space-y-4">
                <div className="rounded-xl bg-green-50 border border-green-200 p-5 space-y-1">
                    <p className="text-sm font-bold text-green-800">✓ Packet Stored</p>
                    <p className="text-sm text-green-700">Location: <span className="font-mono">{locationLabel}</span></p>
                    <p className="text-sm text-green-700">The packet is now digitally registered as stored at this location.</p>
                </div>
                <div className="flex justify-end">
                    <button onClick={onNext}
                        className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors">
                        Next <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Assign Storage Location</h2>
            <form
                onSubmit={handleSubmit(async (data) => {
                    setError(null);
                    try {
                        await storePacket(packetId, data as Record<string, unknown>);
                        setLocationLabel(preview);
                        setDone(true);
                    } catch (e: any) { setError(e.message); }
                })}
                className="space-y-4"
            >
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Safe *</label>
                        <input type="text" placeholder="SAFE01" className={inputCls} {...register('safe')} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Locker *</label>
                        <input type="text" placeholder="L03" className={inputCls} {...register('locker')} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Shelf *</label>
                        <input type="text" placeholder="S12" className={inputCls} {...register('shelf')} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Position *</label>
                        <input type="text" placeholder="P07" className={inputCls} {...register('position')} />
                    </div>
                </div>
                <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
                    <p className="text-sm text-gray-500">Location label preview:</p>
                    <p className="text-base font-mono font-semibold text-gray-900 mt-0.5">{preview}</p>
                </div>
                {error && (
                    <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}
                <div className="flex justify-between">
                    <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-gray-800">← Back</button>
                    <button type="submit" disabled={isSubmitting}
                        className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
                        {isSubmitting ? 'Storing…' : 'Confirm Storage'}
                    </button>
                </div>
            </form>
        </div>
    );
}

// Step 8: Document stub
function DocumentStep({ loanId }: { loanId: string }) {
    return (
        <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Document Generation</h2>
            <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-6 space-y-2">
                <p className="text-sm font-semibold text-amber-800">⚠ Document generation not yet available</p>
                <p className="text-sm text-amber-700">
                    The pledge agreement, jewellery annexure, and other documents will be generated here once the
                    document module is built on the backend. This step is a placeholder.
                </p>
                <p className="text-sm text-amber-700 font-medium">
                    Do not mark this loan as complete until a physical pledge document has been printed and physically signed by the customer.
                </p>
            </div>
            <div className="rounded-xl bg-white border border-gray-200 p-5 space-y-2">
                <p className="text-sm font-semibold text-gray-900">Checklist before proceeding:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc pl-4">
                    <li>Physical gold packet is sealed and labelled with the packet code</li>
                    <li>Customer has been informed of the loan terms</li>
                    <li>All jewellery items have been recorded and photographed</li>
                    <li>Packet is stored at the location recorded in the previous step</li>
                </ul>
            </div>
            <Link
                href={`/loans/${loanId}`}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
            >
                Go to Loan Profile <ArrowRight className="w-4 h-4" />
            </Link>
        </div>
    );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export default function NewLoanPage() {
    return (
        <React.Suspense fallback={<div className="p-8 text-gray-500">Loading form...</div>}>
            <NewLoanPageContent />
        </React.Suspense>
    );
}

function NewLoanPageContent() {
    const searchParams = useSearchParams();
    const initialCustomerId = searchParams.get('customerId') ?? undefined;

    const [state, setState] = useState<WizardState>(() => {
        if (typeof window === 'undefined') return { step: 0, customerId: initialCustomerId };
        try {
            const saved = localStorage.getItem(WIZARD_KEY);
            if (saved) return JSON.parse(saved);
        } catch { }
        return { step: 0, customerId: initialCustomerId };
    });

    // Persist to localStorage whenever state changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(WIZARD_KEY, JSON.stringify(state));
        }
    }, [state]);

    function clearWizard() {
        if (typeof window !== 'undefined') localStorage.removeItem(WIZARD_KEY);
    }

    function update(patch: Partial<WizardState>) {
        setState(s => ({ ...s, ...patch }));
    }

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <Link href="/loans" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    All Loans
                </Link>
                {state.step > 0 && (
                    <button
                        onClick={() => { clearWizard(); setState({ step: 0 }); }}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                        Start Over
                    </button>
                )}
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Loan</h1>
            <StepHeader step={state.step} total={STEPS.length} />

            <div className="bg-white rounded-xl border border-gray-200 p-6">
                {state.step === 0 && (
                    <CustomerStep
                        initialCustomerId={state.customerId}
                        onNext={cid => update({ customerId: cid, step: 1 })}
                    />
                )}
                {state.step === 1 && state.customerId && (
                    <LoanDraftStep
                        customerId={state.customerId}
                        initialLoanId={state.loanId}
                        onNext={loanId => update({ loanId, step: 2 })}
                        onBack={() => update({ step: 0 })}
                    />
                )}
                {state.step === 2 && state.loanId && (
                    <JewelleryStep
                        loanId={state.loanId}
                        addedItems={state.jewelleryItemIds ?? []}
                        onItemAdded={id => update({ jewelleryItemIds: [...(state.jewelleryItemIds ?? []), id] })}
                        onNext={() => update({ step: 3 })}
                        onBack={() => update({ step: 1 })}
                    />
                )}
                {state.step === 3 && state.loanId && (
                    <AppraisalStep
                        loanId={state.loanId}
                        appraisalId={state.appraisalId}
                        onAppraisalCreated={id => update({ appraisalId: id })}
                        onNext={() => update({ step: 4 })}
                        onBack={() => update({ step: 2 })}
                    />
                )}
                {state.step === 4 && state.loanId && (
                    <DisburseStep
                        loanId={state.loanId}
                        onNext={() => update({ step: 5 })}
                        onBack={() => update({ step: 3 })}
                    />
                )}
                {state.step === 5 && state.loanId && (
                    <PacketStep
                        loanId={state.loanId}
                        packetId={state.packetId}
                        onPacketCreated={id => update({ packetId: id })}
                        onNext={() => update({ step: 6 })}
                        onBack={() => update({ step: 4 })}
                    />
                )}
                {state.step === 6 && state.packetId && (
                    <StorageStep
                        packetId={state.packetId}
                        onNext={() => update({ step: 7 })}
                        onBack={() => update({ step: 5 })}
                    />
                )}
                {state.step === 7 && state.loanId && (
                    <DocumentStep loanId={state.loanId} />
                )}
            </div>
        </div>
    );
}

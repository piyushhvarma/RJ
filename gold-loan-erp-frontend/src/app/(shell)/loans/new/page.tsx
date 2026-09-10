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
import {
    ArrowLeft,
    ArrowRight,
    Check,
    AlertTriangle,
    Camera,
    User,
    FileSpreadsheet,
    Gem,
    Scale,
    Banknote,
    Package,
    Lock,
    FileCheck,
    Search,
    X,
    UserPlus,
    Phone,
    ShieldCheck,
    Clock,
    Sparkles,
    RotateCcw,
    CheckCircle2,
    Printer,
    ExternalLink,
    FileText,
} from 'lucide-react';
import Link from 'next/link';
import type { Loan, JewelleryItem, Appraisal, Packet, Customer } from '@/lib/api/types';
import {
    getPledgeAgreementPdfUrl,
    getJewelleryAnnexurePdfUrl,
    getLoanDocuments,
    markDocumentSigned,
    markDocumentPrinted,
} from '@/lib/api/documents';

const WIZARD_KEY = 'gl_loan_wizard';

interface WizardState {
    step: number;
    customerId?: string;
    loanId?: string;
    jewelleryItemIds?: string[];
    appraisalId?: string;
    packetId?: string;
}

const STEP_CONFIG = [
    { label: 'Customer', icon: User, desc: 'Borrower identification' },
    { label: 'Loan Draft', icon: FileSpreadsheet, desc: 'Scheme & parameters' },
    { label: 'Jewellery', icon: Gem, desc: 'Collateral ornaments' },
    { label: 'Appraisal', icon: Scale, desc: 'Gold purity & value' },
    { label: 'Disburse', icon: Banknote, desc: 'Sanction & release' },
    { label: 'Packet', icon: Package, desc: 'Physical envelope' },
    { label: 'Vault Storage', icon: Lock, desc: 'Locker allocation' },
    { label: 'Agreement', icon: FileCheck, desc: 'Pledge receipt' },
];

const inputCls =
    'w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:bg-gray-50 disabled:text-gray-500 transition-all';

function StepHeader({ step, total }: { step: number; total: number }) {
    const progressPct = Math.round(((step + 1) / total) * 100);

    return (
        <div className="mb-8 space-y-4">
            {/* Top progress indicator bar */}
            <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Step {step + 1} of {total}: <span className="text-amber-700">{STEP_CONFIG[step].label}</span>
                </span>
                <span className="font-mono text-gray-600 font-medium">{progressPct}% completed</span>
            </div>

            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                />
            </div>

            {/* Stepper pills with no-scrollbar */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-1 -mx-2 px-2">
                {STEP_CONFIG.map((s, i) => {
                    const Icon = s.icon;
                    const isCompleted = i < step;
                    const isCurrent = i === step;

                    return (
                        <div
                            key={s.label}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs whitespace-nowrap flex-shrink-0 transition-all ${
                                isCurrent
                                    ? 'border-amber-400 bg-amber-50/90 text-amber-950 font-bold shadow-xs ring-2 ring-amber-400/30'
                                    : isCompleted
                                    ? 'border-emerald-200 bg-emerald-50/60 text-emerald-800 font-semibold'
                                    : 'border-gray-200/80 bg-white text-gray-500 hover:border-gray-300'
                            }`}
                        >
                            <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                    isCurrent
                                        ? 'bg-amber-600 text-white'
                                        : isCompleted
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-gray-100 text-gray-500'
                                }`}
                            >
                                {isCompleted ? <Check className="w-3 h-3 stroke-[2.5]" /> : i + 1}
                            </div>
                            <span className="tracking-tight">{s.label}</span>
                        </div>
                    );
                })}
            </div>
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
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 pb-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-950">Select Borrower</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Search existing registered customers or register a new customer</p>
                </div>
                <Link
                    href="/customers/new"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-xs font-semibold hover:bg-amber-100 transition shadow-xs w-fit"
                >
                    <UserPlus className="w-3.5 h-3.5" />
                    Register New Customer
                </Link>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                    type="search"
                    placeholder="Search by borrower name, mobile number, or customer ID (e.g. CLGY-)..."
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    className={`${inputCls} pl-10 pr-9 text-sm shadow-xs`}
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

            {/* Results count & loading */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
                    ))}
                </div>
            ) : customers && customers.length > 0 ? (
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                    {customers.map(c => {
                        const isSelected = selectedId === c.id;
                        return (
                            <div
                                key={c.id}
                                onClick={() => setSelectedId(c.id)}
                                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                                    isSelected
                                        ? 'border-amber-500 bg-amber-50/70 shadow-sm ring-2 ring-amber-500/20'
                                        : 'border-gray-200 bg-white hover:border-amber-300 hover:bg-amber-50/20 shadow-xs'
                                }`}
                            >
                                <div className="flex items-center gap-3.5 min-w-0">
                                    {/* Avatar circle */}
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 transition-colors ${
                                            isSelected
                                                ? 'bg-amber-500 text-white shadow-xs'
                                                : 'bg-amber-100 text-amber-800'
                                        }`}
                                    >
                                        {c.fullName.charAt(0)}
                                    </div>

                                    {/* Info */}
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm text-gray-900 truncate">{c.fullName}</p>
                                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 flex-wrap">
                                            <span className="font-mono text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                                {c.customerCode}
                                            </span>
                                            <span className="flex items-center gap-1 text-gray-600">
                                                <Phone className="w-3 h-3 text-gray-400" />
                                                {c.mobile}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: status + radio check */}
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <span
                                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                            c.kycStatus === 'VERIFIED'
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                                        }`}
                                    >
                                        {c.kycStatus === 'VERIFIED' ? 'KYC Verified' : 'KYC Pending'}
                                    </span>

                                    <div
                                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                            isSelected
                                                ? 'border-amber-600 bg-amber-600 text-white'
                                                : 'border-gray-300 bg-white'
                                        }`}
                                    >
                                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center bg-gray-50/50">
                    <User className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-gray-800">No customers found</p>
                    <p className="text-xs text-gray-500 mt-1">Try adjusting your search or register a new customer.</p>
                    <Link
                        href="/customers/new"
                        className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition"
                    >
                        <UserPlus className="w-3.5 h-3.5" />
                        Register Customer Now
                    </Link>
                </div>
            )}

            {/* Selected Confirmation Banner */}
            {selected && (
                <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
                                {selected.fullName.charAt(0)}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                                    Selected Borrower
                                </p>
                                <p className="text-sm font-extrabold text-gray-950">{selected.fullName}</p>
                            </div>
                        </div>
                        <span className="font-mono text-xs text-gray-600 bg-white border border-amber-200 px-2.5 py-1 rounded-lg">
                            {selected.customerCode}
                        </span>
                    </div>

                    {selected.kycStatus !== 'VERIFIED' && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-amber-800 bg-amber-100/60 rounded-xl px-3 py-1.5">
                            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                            <span>KYC not verified for this customer. Please verify Aadhaar prior to disbursement.</span>
                        </div>
                    )}
                </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <Link
                    href="/customers/new"
                    className="text-xs font-semibold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1"
                >
                    <UserPlus className="w-3.5 h-3.5" />
                    Register new customer
                </Link>

                <button
                    disabled={!selectedId}
                    onClick={() => onNext(selectedId)}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-sm font-bold text-white shadow-xs hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 transition-all cursor-pointer"
                >
                    Continue to Draft
                    <ArrowRight className="w-4 h-4" />
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
    const { data: customer } = useQuery({
        queryKey: ['customer', customerId],
        queryFn: () => getCustomer(customerId),
    });

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateLoanDto>({
        resolver: zodResolver(createLoanSchema),
        defaultValues: { customerId },
    });

    if (initialLoanId) {
        return (
            <div className="space-y-6">
                <div className="border-b border-gray-100 pb-4">
                    <h2 className="text-lg font-bold text-gray-950">Loan Draft Created</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Application initialized with official tracking reference</p>
                </div>

                <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200 p-5 space-y-2">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                            <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                        <p className="text-sm font-bold text-emerald-950">Loan draft successfully registered</p>
                    </div>
                    <p className="text-xs text-emerald-800 pl-9.5">
                        Borrower: <span className="font-semibold">{customer?.fullName ?? customerId}</span> ({customer?.customerCode})
                    </p>
                </div>

                <div className="flex justify-between pt-4 border-t border-gray-100">
                    <button
                        onClick={onBack}
                        className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition"
                    >
                        ← Back
                    </button>
                    <button
                        onClick={() => onNext(initialLoanId)}
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-amber-700 transition"
                    >
                        Next: Add Collateral Jewellery <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="border-b border-gray-100 pb-4">
                <h2 className="text-lg font-bold text-gray-950">Initialize Loan Application</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                    Generate an official atomic loan code (GL-2026-...) for this borrower
                </p>
            </div>

            {customer && (
                <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                            {customer.fullName.charAt(0)}
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-900">{customer.fullName}</p>
                            <p className="text-[11px] text-gray-500 font-mono">{customer.customerCode}</p>
                        </div>
                    </div>
                    <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {customer.kycStatus}
                    </span>
                </div>
            )}

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
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                        Lending Scheme Reference (Optional)
                    </label>
                    <input
                        type="text"
                        placeholder="Leave blank to use default monthly simple interest scheme"
                        className={inputCls}
                        {...register('schemeId')}
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                        Schemes determine default interest rates, grace periods, and valuation thresholds.
                    </p>
                </div>

                {error && (
                    <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="flex justify-between pt-4 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onBack}
                        className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition"
                    >
                        ← Back
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-amber-700 disabled:opacity-50 transition"
                    >
                        {isSubmitting ? 'Creating Draft...' : 'Create Loan Draft'}
                        <ArrowRight className="w-4 h-4" />
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
    const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<CreateJewelleryItemDto>({
        resolver: zodResolver(createJewelleryItemSchema),
        defaultValues: { loanId, stoneWeight: 0, ownershipDeclaration: false },
    });

    const grossW = watch('grossWeight');
    const stoneW = watch('stoneWeight') ?? 0;
    const estNet = (grossW && !isNaN(grossW)) ? Math.max(0, grossW - stoneW) : null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-950">Add Collateral Ornaments</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Record weight, purity, hallmark, and capture inspection photos</p>
                </div>
                {addedItems.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Check className="w-3 h-3 stroke-[3]" />
                        {addedItems.length} Piece{addedItems.length > 1 ? 's' : ''} Pledged
                    </span>
                )}
            </div>

            {lastItem && (
                <div className="rounded-2xl bg-emerald-50/80 border border-emerald-200 p-4 space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-emerald-950">
                                    Item Recorded: <span className="font-mono">{lastItem.itemCode}</span> ({lastItem.category})
                                </p>
                                <p className="text-[11px] text-emerald-700">
                                    Net Weight: <span className="font-bold">{lastItem.netWeight}g</span> · Appraised Value: <span className="font-bold">₹{lastItem.valuation.toLocaleString('en-IN')}</span>
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setPhotoModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                        >
                            <Camera className="w-3.5 h-3.5" />
                            {itemPhotoCount[lastItem.id]
                                ? `Add Angle Photo (${itemPhotoCount[lastItem.id]} attached)`
                                : 'Attach Item Photo'}
                        </button>
                    </div>
                </div>
            )}

            <form
                onSubmit={handleSubmit(async (data) => {
                    setError(null);
                    try {
                        const item = await createJewelleryItem(data as Record<string, unknown>);
                        onItemAdded(item.id);
                        setLastItem(item);
                        reset({ loanId, stoneWeight: 0, ownershipDeclaration: true });
                    } catch (e: any) { setError(e.message); }
                })}
                className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50/40 p-5"
            >
                <input type="hidden" {...register('loanId')} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                            Category *
                        </label>
                        <select className={inputCls} {...register('category')}>
                            <option value="">Select ornament type...</option>
                            <option value="Necklace">Necklace</option>
                            <option value="Chain">Chain</option>
                            <option value="Bangles">Bangles</option>
                            <option value="Ring">Ring</option>
                            <option value="Earrings">Earrings</option>
                            <option value="Bracelet">Bracelet</option>
                            <option value="Coin">Gold Coin / Bar</option>
                            <option value="Other">Other Jewellery</option>
                        </select>
                        {errors.category && <p className="text-xs text-red-600 mt-1">{errors.category.message}</p>}
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                            Description *
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. 22K floral pattern gold necklace with clasp"
                            className={inputCls}
                            {...register('description')}
                        />
                        {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description.message}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                            Gross Weight (g) *
                        </label>
                        <input
                            type="number"
                            step="0.001"
                            placeholder="0.000"
                            className={inputCls}
                            {...register('grossWeight', { valueAsNumber: true })}
                        />
                        {errors.grossWeight && <p className="text-xs text-red-600 mt-1">{errors.grossWeight.message}</p>}
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                            Stone Weight (g)
                        </label>
                        <input
                            type="number"
                            step="0.001"
                            placeholder="0.000"
                            className={inputCls}
                            {...register('stoneWeight', { valueAsNumber: true })}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                            Est. Net Gold Weight
                        </label>
                        <div className="h-[42px] px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white font-mono font-bold text-sm text-amber-700 flex items-center">
                            {estNet != null ? `${estNet.toFixed(3)} g` : '—'}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                            Purity Karat *
                        </label>
                        <select className={inputCls} {...register('purityKarat')}>
                            <option value="22K">22K (916 Standard)</option>
                            <option value="24K">24K (999 Pure)</option>
                            <option value="20K">20K (833)</option>
                            <option value="18K">18K (750)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                            Valuation Rate (₹/g) *
                        </label>
                        <input
                            type="number"
                            step="1"
                            placeholder="e.g. 5800"
                            className={inputCls}
                            {...register('valuationRate', { valueAsNumber: true })}
                        />
                        {errors.valuationRate && <p className="text-xs text-red-600 mt-1">{errors.valuationRate.message}</p>}
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                            Hallmark Details
                        </label>
                        <input
                            type="text"
                            placeholder="BIS Hallmark stamp, laser HUID..."
                            className={inputCls}
                            {...register('hallmarkDetails')}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                    <input
                        type="checkbox"
                        id="ownershipDeclaration"
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                        {...register('ownershipDeclaration')}
                    />
                    <label htmlFor="ownershipDeclaration" className="text-xs text-gray-700 cursor-pointer font-medium">
                        Borrower solemnly declares exclusive ownership and unencumbered title of this gold ornament
                    </label>
                </div>

                {error && (
                    <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 py-3 text-xs font-bold text-amber-800 hover:bg-amber-100 hover:border-amber-400 disabled:opacity-50 transition cursor-pointer"
                >
                    {isSubmitting ? 'Recording Ornament...' : '+ Add This Jewellery Piece'}
                </button>
            </form>

            <div className="flex justify-between pt-4 border-t border-gray-100">
                <button
                    onClick={onBack}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition"
                >
                    ← Back
                </button>
                <button
                    onClick={onNext}
                    disabled={addedItems.length === 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-amber-700 disabled:opacity-50 transition"
                >
                    Next: Appraisal ({addedItems.length} added) <ArrowRight className="w-4 h-4" />
                </button>
            </div>

            <PhotoCaptureModal
                isOpen={photoModalOpen && !!lastItem}
                onClose={() => setPhotoModalOpen(false)}
                title={`Collateral Photo: ${lastItem?.itemCode}`}
                subtitle="Capture high-resolution camera photo of the jewellery item and hallmark."
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
        <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-950">Appraisal & Verification</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Appraiser verification and manager authorization</p>
                </div>
                {currentStatus && <AppraisalStatusBadge status={currentStatus} />}
            </div>

            {!appraisal && !appraisalId ? (
                <form onSubmit={handleSubmit(handleCreate)} className="space-y-4">
                    <input type="hidden" {...register('loanId')} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                Gold Rate Source
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. MCX Spot / In-house rate sheet"
                                className={inputCls}
                                {...register('goldRateSource')}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                Spot Gold Rate (₹/g)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="6150"
                                className={inputCls}
                                {...register('goldRateValue', { valueAsNumber: true })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                            Appraisal Notes
                        </label>
                        <input
                            type="text"
                            placeholder="All ornaments verified for 916 BIS purity marks..."
                            className={inputCls}
                            {...register('notes')}
                        />
                    </div>

                    {error && (
                        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-xs"
                    >
                        {isSubmitting ? 'Recording Appraisal...' : 'Create Official Appraisal'}
                    </button>
                </form>
            ) : (
                <div className="space-y-4 rounded-2xl bg-gray-50/60 border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-gray-900">Appraisal Workflow Progression</p>
                            <p className="text-xs text-gray-500">Requires dual authorization (§7.2)</p>
                        </div>
                        {isLocked && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                Appraisal Locked & Authorized
                            </span>
                        )}
                    </div>

                    {!isLocked && (
                        <div className="flex flex-wrap gap-3 pt-2">
                            <RoleGate roles={['OWNER', 'MANAGER', 'APPRAISER']}>
                                {currentStatus === 'DRAFT' && (
                                    <button
                                        onClick={handleConfirm}
                                        className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition shadow-xs"
                                    >
                                        Confirm Assessment (Appraiser)
                                    </button>
                                )}
                            </RoleGate>
                            <RoleGate roles={['OWNER', 'MANAGER']}>
                                {currentStatus === 'APPRAISER_CONFIRMED' && (
                                    <button
                                        onClick={handleApprove}
                                        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-xs"
                                    >
                                        Approve & Lock Valuation (Manager)
                                    </button>
                                )}
                            </RoleGate>
                        </div>
                    )}

                    {error && (
                        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>
            )}

            <div className="flex justify-between pt-4 border-t border-gray-100">
                <button
                    onClick={onBack}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition"
                >
                    ← Back
                </button>
                <button
                    onClick={onNext}
                    disabled={!isLocked}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-amber-700 disabled:opacity-50 transition"
                >
                    {isLocked ? (
                        <>Next: Disburse Loan <ArrowRight className="w-4 h-4" /></>
                    ) : (
                        'Approve Appraisal to Continue'
                    )}
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
            <div className="space-y-6">
                <div className="rounded-2xl bg-emerald-50/80 border border-emerald-200 p-6 space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                            <Check className="w-5 h-5 stroke-[3]" />
                        </div>
                        <div>
                            <p className="text-base font-bold text-emerald-950">Loan Disbursed & Activated</p>
                            <p className="text-xs text-emerald-800">Financial ledger entry created and interest clock initiated</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-gray-100">
                    <button
                        onClick={onBack}
                        className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition"
                    >
                        ← Back
                    </button>
                    <button
                        onClick={onNext}
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-amber-700 transition"
                    >
                        Next: Custody Packet <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="border-b border-gray-100 pb-4">
                <h2 className="text-lg font-bold text-gray-950">Loan Sanction & Disbursement</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                    Locks principal sanction, establishes repayment terms, and transitions status to ACTIVE
                </p>
            </div>

            <RoleGate
                roles={['OWNER', 'MANAGER']}
                fallback={
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <span>Manager or Owner authorization required to sanction loan disbursement.</span>
                    </div>
                }
            >
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                Sanctioned Principal (₹) *
                            </label>
                            <input
                                type="number"
                                step="100"
                                placeholder="25000"
                                className={inputCls}
                                {...register('principalAmount', { valueAsNumber: true })}
                            />
                            {errors.principalAmount && <p className="text-xs text-red-600 mt-1">{errors.principalAmount.message}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                Interest Rate (% p.a.) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="12.00"
                                className={inputCls}
                                {...register('interestRate', { valueAsNumber: true })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                Interest Calculation Frequency *
                            </label>
                            <select className={inputCls} {...register('interestType')}>
                                <option value="MONTHLY_SIMPLE">Monthly Simple Interest (Standard)</option>
                                <option value="DAILY_SIMPLE">Daily Simple Interest</option>
                                <option value="ANNUAL_SIMPLE">Annual Simple Interest</option>
                                <option value="CUSTOM">Custom Schedule</option>
                            </select>
                            {errors.interestType && <p className="text-xs text-red-600 mt-1">{errors.interestType.message}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                Processing Fee / Documentation Charges (₹)
                            </label>
                            <input
                                type="number"
                                step="1"
                                defaultValue={0}
                                className={inputCls}
                                {...register('processingCharges', { valueAsNumber: true })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                            Loan Maturity Date *
                        </label>
                        <input
                            type="date"
                            className={inputCls}
                            {...register('maturityDate')}
                        />
                        {errors.maturityDate && <p className="text-xs text-red-600 mt-1">{errors.maturityDate.message}</p>}
                    </div>

                    {error && (
                        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="flex justify-between pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onBack}
                            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition"
                        >
                            ← Back
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition"
                        >
                            {isSubmitting ? 'Sanctioning...' : 'Disburse & Sanction Loan'}
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
        <div className="space-y-6">
            <div className="border-b border-gray-100 pb-4">
                <h2 className="text-lg font-bold text-gray-950">Sealed Custody Packet</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                    Generate unique tamper-evident security packet identifier for gold custody
                </p>
            </div>

            {pid ? (
                <div className="rounded-2xl bg-emerald-50/80 border border-emerald-200 p-5 space-y-2">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                            <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                        <p className="text-sm font-bold text-emerald-950">
                            Packet Created: <span className="font-mono">{packet?.packetCode ?? pid}</span>
                        </p>
                    </div>
                    <p className="text-xs text-emerald-800 pl-9.5">
                        Ready for vault locker storage assignment and security verification.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    <p className="text-xs text-gray-600 leading-relaxed">
                        Place all pledged jewellery ornaments in the official tamper-evident security pouch. Generating the packet will issue a unique barcode label (`PKT-2026-...`).
                    </p>

                    {error && (
                        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        onClick={handleCreate}
                        disabled={creating}
                        className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-xs"
                    >
                        {creating ? 'Generating Security Packet...' : 'Create Custody Packet'}
                    </button>
                </div>
            )}

            <div className="flex justify-between pt-4 border-t border-gray-100">
                <button
                    onClick={onBack}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition"
                >
                    ← Back
                </button>
                <button
                    onClick={onNext}
                    disabled={!pid}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-amber-700 disabled:opacity-50 transition"
                >
                    Next: Vault Storage <ArrowRight className="w-4 h-4" />
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
        defaultValues: { safe: 'SAFE01', locker: 'L01', shelf: 'S01', position: 'P01' },
    });

    const [safe, locker, shelf, position] = [watch('safe'), watch('locker'), watch('shelf'), watch('position')];
    const preview = safe && locker && shelf && position
        ? `${safe}-${locker}-${shelf}-${position}`
        : '—';

    if (done) {
        return (
            <div className="space-y-6">
                <div className="rounded-2xl bg-emerald-50/80 border border-emerald-200 p-5 space-y-2">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                            <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                        <p className="text-sm font-bold text-emerald-950">Packet Secured in Vault</p>
                    </div>
                    <p className="text-xs text-emerald-800 pl-9.5">
                        Location: <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-200">{locationLabel}</span>
                    </p>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button
                        onClick={onNext}
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-amber-700 transition"
                    >
                        Next: Agreement Documents <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="border-b border-gray-100 pb-4">
                <h2 className="text-lg font-bold text-gray-950">Assign Vault Storage Location</h2>
                <p className="text-xs text-gray-500 mt-0.5">Physical location coordinates for prompt retrieval</p>
            </div>

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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                            Safe *
                        </label>
                        <input type="text" placeholder="SAFE01" className={inputCls} {...register('safe')} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                            Locker *
                        </label>
                        <input type="text" placeholder="L03" className={inputCls} {...register('locker')} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                            Shelf *
                        </label>
                        <input type="text" placeholder="S12" className={inputCls} {...register('shelf')} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                            Position *
                        </label>
                        <input type="text" placeholder="P07" className={inputCls} {...register('position')} />
                    </div>
                </div>

                <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600">Vault Location Label Preview:</span>
                    <span className="font-mono font-bold text-sm text-gray-900 bg-white px-3 py-1 rounded-lg border border-gray-200">
                        {preview}
                    </span>
                </div>

                {error && (
                    <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="flex justify-between pt-4 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onBack}
                        className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition"
                    >
                        ← Back
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition"
                    >
                        {isSubmitting ? 'Assigning Storage...' : 'Confirm Vault Storage'}
                    </button>
                </div>
            </form>
        </div>
    );
}

// Step 8: Document Generation & Physical Signing Station
function DocumentStep({ loanId }: { loanId: string }) {
    const router = useRouter();
    const qc = useQueryClient();
    const [signedConfirmed, setSignedConfirmed] = useState(false);
    const [sealingConfirmed, setSealingConfirmed] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const { data: documents, refetch: refetchDocs } = useQuery({
        queryKey: ['loan-documents', loanId],
        queryFn: () => getLoanDocuments(loanId),
    });

    async function handleComplete() {
        setSubmitting(true);
        try {
            const agreementDoc = documents?.find(d => d.type === 'PLEDGE_AGREEMENT');
            if (agreementDoc) {
                await markDocumentSigned(agreementDoc.id);
            }
        } catch (e) {
            console.error('Document sign record error:', e);
        } finally {
            if (typeof window !== 'undefined') localStorage.removeItem(WIZARD_KEY);
            qc.invalidateQueries({ queryKey: ['loan', loanId] });
            router.push(`/loans/${loanId}`);
            setSubmitting(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        Physical Counter Protocol
                    </span>
                </div>
                <h2 className="text-xl font-bold text-gray-950 mt-1">Print Pledge Documents & Obtain Wet-Ink Signature</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                    Generate the official Pawn Ticket and Jewellery Schedule for physical customer signing and safe custody packet sealing.
                </p>
            </div>

            {/* Document Action Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Pledge Agreement Card */}
                <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/40 p-5 flex flex-col justify-between space-y-4 hover:border-amber-300 transition-all">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded">
                                Legal Contract
                            </span>
                            <FileText className="w-4 h-4 text-amber-700" />
                        </div>
                        <h3 className="text-base font-bold text-gray-950 mt-2">Pledge Agreement (गिरवी पावती)</h3>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                            Official Pawn Ticket containing statutory lending disclosures, interest rate calculation, default notice rules, and dual signature lines.
                        </p>
                    </div>

                    <div className="pt-3 border-t border-amber-200/60 flex items-center gap-2">
                        <a
                            href={getPledgeAgreementPdfUrl(loanId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            Print Agreement PDF
                        </a>
                        <a
                            href={getPledgeAgreementPdfUrl(loanId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                        >
                            <ExternalLink className="w-3 h-3 text-gray-400" />
                            Preview
                        </a>
                    </div>
                </div>

                {/* Jewellery Annexure Card */}
                <div className="rounded-2xl border-2 border-gray-200 bg-gray-50/50 p-5 flex flex-col justify-between space-y-4 hover:border-gray-300 transition-all">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-700 bg-gray-200/80 px-2 py-0.5 rounded">
                                Schedule A
                            </span>
                            <Gem className="w-4 h-4 text-amber-600" />
                        </div>
                        <h3 className="text-base font-bold text-gray-950 mt-2">Jewellery Annexure (आभूषण अनुसूची)</h3>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                            Itemized ornament schedule detailing gross weight, stone deductions, net gold weight, purity karat, hallmark stamps, and valuation.
                        </p>
                    </div>

                    <div className="pt-3 border-t border-gray-200 flex items-center gap-2">
                        <a
                            href={getJewelleryAnnexurePdfUrl(loanId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-black transition"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            Print Annexure PDF
                        </a>
                        <a
                            href={getJewelleryAnnexurePdfUrl(loanId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                        >
                            <ExternalLink className="w-3 h-3 text-gray-400" />
                            Preview
                        </a>
                    </div>
                </div>
            </div>

            {/* Mandatory Physical Signing Checklist */}
            <div className="rounded-2xl border border-amber-200 bg-white p-5 space-y-3.5">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    Physical Dual-Custody Handover Verification
                </p>

                <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer p-2.5 rounded-xl border border-gray-100 hover:bg-gray-50/80 transition-colors">
                        <input
                            type="checkbox"
                            checked={signedConfirmed}
                            onChange={(e) => setSignedConfirmed(e.target.checked)}
                            className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <div className="text-xs text-gray-700">
                            <span className="font-bold text-gray-900 block">Borrower Physical Wet-Ink Signature Obtained</span>
                            Customer has signed both copies of the Pledge Agreement and Jewellery Schedule in person at the branch counter.
                        </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer p-2.5 rounded-xl border border-gray-100 hover:bg-gray-50/80 transition-colors">
                        <input
                            type="checkbox"
                            checked={sealingConfirmed}
                            onChange={(e) => setSealingConfirmed(e.target.checked)}
                            className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <div className="text-xs text-gray-700">
                            <span className="font-bold text-gray-900 block">Ornaments Sealed & Deposited in Allocated Vault Locker</span>
                            Gold ornaments verified against schedule, sealed in tamper-evident pouch, and placed in the registered vault safe position.
                        </div>
                    </label>
                </div>
            </div>

            {/* Completion Button */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <Link
                    href={`/loans/${loanId}`}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition"
                >
                    Skip & Review in Profile →
                </Link>

                <button
                    onClick={handleComplete}
                    disabled={!signedConfirmed || !sealingConfirmed || submitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-2.5 text-sm font-bold text-white shadow-xs hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                >
                    {submitting ? 'Finalizing Loan...' : 'Mark Signed & Finalize Loan'}
                    <CheckCircle2 className="w-4 h-4" />
                </button>
            </div>
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
        <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-6">
            {/* Top Bar with Navigation & Reset */}
            <div className="flex items-center justify-between">
                <Link
                    href="/loans"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 group transition"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    All Loans
                </Link>

                {state.step > 0 && (
                    <button
                        onClick={() => { clearWizard(); setState({ step: 0 }); }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-red-600 transition"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restart Wizard
                    </button>
                )}
            </div>

            {/* Page Title */}
            <div>
                <h1 className="text-2xl font-bold text-gray-950 tracking-tight">Create Gold Loan</h1>
                <p className="text-xs text-gray-500 mt-1">
                    Origination flow • Borrower onboarding, jewellery appraisal & dual-custody vault registration
                </p>
            </div>

            {/* Stepper with Progress Bar */}
            <StepHeader step={state.step} total={STEP_CONFIG.length} />

            {/* Main Form Container */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-6 sm:p-8">
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

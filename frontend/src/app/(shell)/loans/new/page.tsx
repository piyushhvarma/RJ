'use client';

import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Search,
    UserPlus,
    X,
    Check,
    AlertCircle,
    Plus,
    Trash2,
    Camera,
    Printer,
    RotateCcw,
    Scale,
    Coins,
    Calendar,
    Percent,
    CheckCircle2,
    FileText,
    Package,
    Lock,
    Unlock,
    User,
    AlertTriangle,
    Info,
    Sparkles,
} from 'lucide-react';
import Link from 'next/link';

import { hasRole } from '@/lib/auth/session';
import { getCustomers, createCustomer } from '@/lib/api/customers';
import { counterOriginateLoan, type CounterJewelleryItemDto, type CounterOriginationResponse } from '@/lib/api/loans';
import { getPledgeAgreementPdfUrl } from '@/lib/api/documents';
import { SignaturePad } from '@/components/shared/SignaturePad';
import { PhotoCaptureModal } from '@/components/shared/PhotoCaptureModal';
import type { Customer } from '@/lib/api/types';

// Standard Karat / Purity options
const PURITY_OPTIONS = [
    { label: '22K (91.6% Hallmark)', karat: '22K', fineness: 91.6, defaultRate: 6500 },
    { label: '24K (99.9% Pure Gold)', karat: '24K', fineness: 99.9, defaultRate: 7100 },
    { label: '20K (83.3% Traditional)', karat: '20K', fineness: 83.3, defaultRate: 5900 },
    { label: '18K (75.0% Studded)', karat: '18K', fineness: 75.0, defaultRate: 5300 },
    { label: '14K (58.5% Low Karat)', karat: '14K', fineness: 58.5, defaultRate: 4100 },
    { label: 'Silver 92.5% (Fine Chandi)', karat: '92.5%', fineness: 92.5, defaultRate: 85 },
    { label: 'Silver 70.0% (Payal / Bichhiya)', karat: '70%', fineness: 70.0, defaultRate: 64 },
    { label: 'Silver 50.0% (Utensils / Kada)', karat: '50%', fineness: 50.0, defaultRate: 45 },
];

const ITEM_PRESETS = [
    '42 Mani, 1 Pendal Pot',
    'Gold Chain',
    'Gold Kangan / Bangles',
    'Gold Ring / Anguthi',
    'Gold Jhumka / Earrings',
    'Gold Mangalsutra',
    'Gold Necklace / Haar',
    'Gold Coin / Ginni',
    'Silver Payal / Anklet',
    'Silver Bichhiya / Toe Ring',
    'Silver Kada',
];

interface CollateralRowState {
    id: string;
    metalType: 'GOLD' | 'SILVER';
    category: string;
    description: string;
    quantity: number;
    grossWeight: number | '';
    stoneWeight: number | '';
    netWeight: number | '';
    purityKarat: string;
    fineness: number;
    valuationRate: number | '';
    valuation: number | '';
    photos: string[];
}

interface ToastMessage {
    id: string;
    message: string;
    title?: string;
    type: 'error' | 'success' | 'warning' | 'info';
}

function createDefaultRow(idNum: number): CollateralRowState {
    return {
        id: `row-${idNum}-${Date.now()}`,
        metalType: 'GOLD',
        category: 'Pot / Mani',
        description: '42 Mani, 1 Pendal Pot',
        quantity: 1,
        grossWeight: '',
        stoneWeight: 0,
        netWeight: '',
        purityKarat: '22K',
        fineness: 91.6,
        valuationRate: 6500,
        valuation: '',
        photos: [],
    };
}

function fmtINR(val: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(val);
}

/**
 * Derives the safe box number (1 to 100) from Customer ID using the traditional
 * jeweller pigeonhole modulo logic (e.g., CUS-2026-000003 -> 3, CUS-2026-000103 -> 3,
 * CUS-2026-000987 -> 87, CUS-2026-000100 -> 100, CUS-2026-000000 -> 100).
 */
export function deriveBoxNumber(customerCode?: string | null): string {
    if (!customerCode) return '';
    const match = customerCode.match(/\d+$/);
    if (!match) return '';
    const num = parseInt(match[0], 10);
    if (isNaN(num)) return '';
    const remainder = num % 100;
    const boxNum = remainder === 0 ? 100 : remainder;
    return `Box ${boxNum}`;
}

export default function CounterOriginationPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const isOwner = hasRole(['OWNER']);

    // ─── Toasts State (Floating on Right Side) ───────────────────
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const showToast = (message: string, type: 'error' | 'success' | 'warning' | 'info' = 'error', title?: string) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        setToasts((prev) => [...prev, { id, message, title, type }]);
        setTimeout(() => {
            setToasts((current) => current.filter((t) => t.id !== id));
        }, 3600);
    };

    const removeToast = (id: string) => {
        setToasts((current) => current.filter((t) => t.id !== id));
    };

    // ─── Customer Selection State ───────────────────────────────
    const [customerQuery, setCustomerQuery] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
    const [customerPhotoUrl, setCustomerPhotoUrl] = useState<string | null>(null);
    const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);

    // ─── Loan Terms State ───────────────────────────────────────
    const [principalAmount, setPrincipalAmount] = useState<number | ''>(50000);
    const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
    const [interestOption, setInterestOption] = useState<'MONTHLY_SIMPLE' | 'DAILY_SIMPLE' | 'ANNUAL_SIMPLE'>('MONTHLY_SIMPLE');
    const [interestRatePm, setInterestRatePm] = useState<number | ''>(2.5); // 2.5% per month (30% p.a.)
    const [firmName, setFirmName] = useState<string>('Radhika Jewellers');
    const [packetBoxNo, setPacketBoxNo] = useState<string>('');
    const [isBoxUnlocked, setIsBoxUnlocked] = useState<boolean>(false);
    const [deductFirstMonthInterest, setDeductFirstMonthInterest] = useState<boolean>(false);
    const [tenureMonths, setTenureMonths] = useState<number>(12);

    // ─── Collateral Grid State ──────────────────────────────────
    const [collateralRows, setCollateralRows] = useState<CollateralRowState[]>([createDefaultRow(1)]);

    // ─── Payment & Storage State ────────────────────────────────
    const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER'>('CASH');
    const [paymentRemarks, setPaymentRemarks] = useState<string>('');
    const [storageLocation, setStorageLocation] = useState<string>('');
    const [notes, setNotes] = useState<string>('Counter verified.');
    const [customerSignatureUrl, setCustomerSignatureUrl] = useState<string | null>(null);

    // ─── Modal / Dialog Controls ────────────────────────────────
    const [photoModalTarget, setPhotoModalTarget] = useState<{ type: 'customer' } | { type: 'item'; rowIndex: number } | null>(null);
    const [submissionResult, setSubmissionResult] = useState<CounterOriginationResponse | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Auto-sync storage location with box number
    useEffect(() => {
        if (packetBoxNo) {
            setStorageLocation(`Safe 1, ${packetBoxNo.trim()}`);
        }
    }, [packetBoxNo]);

    // Update customer photo and auto-derive safe box when customer changes
    useEffect(() => {
        if (selectedCustomer) {
            setCustomerPhotoUrl(selectedCustomer.photoUrl || null);
            if (selectedCustomer.signatureUrl) {
                setCustomerSignatureUrl(selectedCustomer.signatureUrl);
            }
            if (!isBoxUnlocked) {
                setPacketBoxNo(deriveBoxNumber(selectedCustomer.customerCode));
            }
        } else {
            if (!isBoxUnlocked) {
                setPacketBoxNo('');
            }
        }
    }, [selectedCustomer, isBoxUnlocked]);

    // Query Customers
    const { data: customerResults, isLoading: isSearchingCustomers } = useQuery({
        queryKey: ['counter-customers', customerQuery],
        queryFn: () => getCustomers(customerQuery || undefined),
        enabled: customerSearchOpen || customerQuery.length > 0,
    });
    const customerList: Customer[] = (customerResults as any)?.items ?? (Array.isArray(customerResults) ? customerResults : []);

    // Computed Collateral Totals
    const totals = useMemo(() => {
        let totalGross = 0;
        let totalStone = 0;
        let totalNet = 0;
        let totalFine = 0;
        let totalValuation = 0;
        let totalQty = 0;

        for (const row of collateralRows) {
            const qty = Number(row.quantity) || 1;
            const gross = Number(row.grossWeight) || 0;
            const stone = Number(row.stoneWeight) || 0;
            const net = Number(row.netWeight) || 0;
            const fine = net * ((Number(row.fineness) || 91.6) / 100);
            const val = Number(row.valuation) || 0;

            totalQty += qty;
            totalGross += gross;
            totalStone += stone;
            totalNet += net;
            totalFine += fine;
            totalValuation += val;
        }

        const ltvRatio = totalValuation > 0 && principalAmount ? (Number(principalAmount) / totalValuation) * 100 : 0;

        return {
            totalQty,
            totalGross: Math.round(totalGross * 1000) / 1000,
            totalStone: Math.round(totalStone * 1000) / 1000,
            totalNet: Math.round(totalNet * 1000) / 1000,
            totalFine: Math.round(totalFine * 1000) / 1000,
            totalValuation: Math.round(totalValuation),
            ltvRatio: Math.round(ltvRatio * 10) / 10,
        };
    }, [collateralRows, principalAmount]);

    // Row updates
    const handleUpdateRow = (index: number, patch: Partial<CollateralRowState>) => {
        setCollateralRows((prev) => {
            const next = [...prev];
            const current = { ...next[index], ...patch };

            if ('grossWeight' in patch || 'stoneWeight' in patch) {
                const g = Number(current.grossWeight) || 0;
                const s = Number(current.stoneWeight) || 0;
                current.netWeight = Math.max(0, Math.round((g - s) * 1000) / 1000);
            }

            if ('grossWeight' in patch || 'stoneWeight' in patch || 'netWeight' in patch || 'valuationRate' in patch) {
                const net = Number(current.netWeight) || 0;
                const rate = Number(current.valuationRate) || 0;
                current.valuation = Math.round(net * rate);
            }

            if ('purityKarat' in patch) {
                const matched = PURITY_OPTIONS.find((p) => p.karat === patch.purityKarat);
                if (matched) {
                    current.fineness = matched.fineness;
                    if (!current.valuationRate || current.valuationRate === 6500 || current.valuationRate === 85) {
                        current.valuationRate = matched.defaultRate;
                    }
                    const net = Number(current.netWeight) || 0;
                    current.valuation = Math.round(net * (Number(current.valuationRate) || matched.defaultRate));
                }
            }

            next[index] = current;
            return next;
        });
    };

    const handleAddRow = () => {
        setCollateralRows((prev) => [...prev, createDefaultRow(prev.length + 1)]);
    };

    const handleRemoveRow = (index: number) => {
        if (collateralRows.length <= 1) return;
        setCollateralRows((prev) => prev.filter((_, i) => i !== index));
    };

    // Calculate upfront interest deduction
    const calculatedAdvanceInterest = useMemo(() => {
        if (!deductFirstMonthInterest || !principalAmount || !interestRatePm) return 0;
        return Math.round((Number(principalAmount) * Number(interestRatePm)) / 100);
    }, [deductFirstMonthInterest, principalAmount, interestRatePm]);

    const netCashToDisburse = useMemo(() => {
        const p = Number(principalAmount) || 0;
        return Math.max(0, p - calculatedAdvanceInterest);
    }, [principalAmount, calculatedAdvanceInterest]);

    // Handle photo captured from modal
    const handlePhotoCaptured = (url: string) => {
        if (!photoModalTarget) return;

        if (photoModalTarget.type === 'customer') {
            setCustomerPhotoUrl(url);
        } else if (photoModalTarget.type === 'item') {
            const idx = photoModalTarget.rowIndex;
            setCollateralRows((prev) => {
                const next = [...prev];
                next[idx] = {
                    ...next[idx],
                    photos: [...next[idx].photos, url],
                };
                return next;
            });
        }
        setPhotoModalTarget(null);
    };

    // Reset Form
    const handleResetForm = () => {
        setSelectedCustomer(null);
        setCustomerQuery('');
        setCustomerPhotoUrl(null);
        setCustomerSignatureUrl(null);
        setPrincipalAmount(50000);
        setInterestRatePm(2.5);
        setDeductFirstMonthInterest(false);
        setCollateralRows([createDefaultRow(1)]);
        setPacketBoxNo('');
        setIsBoxUnlocked(false);
        setNotes('Counter verified.');
        setSubmissionResult(null);
        showToast('Form reset to default counter state', 'info', 'Form Cleared');
    };

    // Submit Loan with Live Multi-Trigger Toast Validation
    const handleSubmitLoan = async () => {
        // 1. Borrower Validation
        if (!selectedCustomer) {
            showToast('Please search or register a borrower customer first!', 'warning', 'Borrower Required');
            return;
        }

        // 2. Principal Validation
        if (!principalAmount || Number(principalAmount) <= 0) {
            showToast('Please enter a valid loan sanction amount greater than ₹0.', 'warning', 'Invalid Loan Amount');
            return;
        }

        // 3. Collateral Item Validations
        if (!collateralRows.length) {
            showToast('At least one pledged gold/silver ornament item is required.', 'warning', 'No Collateral Items');
            return;
        }

        for (let i = 0; i < collateralRows.length; i++) {
            const r = collateralRows[i];
            const itemLabel = r.description.trim() || `Item #${i + 1}`;

            if (!r.description.trim()) {
                showToast(`Item #${i + 1}: Please enter ornament description or select a preset.`, 'error', 'Missing Description');
                return;
            }

            if (r.grossWeight === '' || r.grossWeight === null || Number(r.grossWeight) <= 0) {
                showToast(`Item #${i + 1} (${itemLabel}): Gross weight is empty or 0! Please enter gross grams.`, 'error', 'Gross Weight Required');
                return;
            }

            if (r.netWeight === '' || r.netWeight === null || Number(r.netWeight) <= 0) {
                showToast(`Item #${i + 1} (${itemLabel}): Net weight must be greater than 0g.`, 'error', 'Invalid Net Weight');
                return;
            }

            if (!r.valuation || Number(r.valuation) <= 0) {
                showToast(`Item #${i + 1} (${itemLabel}): Valuation must be greater than ₹0.`, 'error', 'Valuation Required');
                return;
            }
        }

        try {
            setIsSubmitting(true);

            const itemsDto: CounterJewelleryItemDto[] = collateralRows.map((r) => ({
                metalType: r.metalType,
                category: r.category || 'Gold Ornament',
                description: r.description.trim(),
                quantity: Number(r.quantity) || 1,
                grossWeight: Number(r.grossWeight),
                stoneWeight: Number(r.stoneWeight) || 0,
                netWeight: Number(r.netWeight),
                purityKarat: r.purityKarat,
                fineness: Number(r.fineness) || 91.6,
                valuationRate: Number(r.valuationRate) || 6500,
                valuation: Number(r.valuation) || 0,
                photos: r.photos && r.photos.length > 0 ? r.photos : undefined,
            }));

            const annualRate = (Number(interestRatePm) || 2.5) * 12;

            const res = await counterOriginateLoan({
                customerId: selectedCustomer.id,
                customerPhotoUrl: customerPhotoUrl || undefined,
                customerSignatureUrl: customerSignatureUrl || undefined,
                principalAmount: Number(principalAmount),
                interestRate: annualRate,
                interestType: interestOption,
                sanctionedDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
                tenureMonths: Number(tenureMonths) || 12,
                deductFirstMonthInterest,
                storageLocationLabel: storageLocation || packetBoxNo,
                paymentMode,
                transactionRef: paymentRemarks || undefined,
                notes: notes ? `${notes} (Box: ${packetBoxNo})` : `Box: ${packetBoxNo}`,
                jewelleryItems: itemsDto,
            });

            setSubmissionResult(res);
            queryClient.invalidateQueries({ queryKey: ['loans'] });
            showToast(`Loan ${res.loanCode} created successfully! Safe Box: ${res.storageLocation}`, 'success', 'Disbursed');
        } catch (err: any) {
            showToast(err?.message || 'Failed to complete loan origination. Please verify details.', 'error', 'Submission Failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/70 pb-20 font-sans text-gray-900">
            {/* ─────────────────────────────────────────────────────────────
                RIGHT-SIDE FLOATING TOAST STACK (Auto-dismissing)
            ───────────────────────────────────────────────────────────── */}
            <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-2xl border backdrop-blur-md transition-all duration-300 animate-in slide-in-from-right-8 fade-in ${
                            t.type === 'error'
                                ? 'bg-red-950/90 border-red-500/60 text-white'
                                : t.type === 'warning'
                                ? 'bg-amber-950/90 border-amber-500/60 text-white'
                                : t.type === 'success'
                                ? 'bg-emerald-950/90 border-emerald-500/60 text-white'
                                : 'bg-slate-900/90 border-slate-700 text-white'
                        }`}
                    >
                        <div className="shrink-0 mt-0.5">
                            {t.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
                            {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                            {t.type === 'info' && <Info className="w-5 h-5 text-sky-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            {t.title && <p className="text-xs font-bold uppercase tracking-wider mb-0.5 opacity-90">{t.title}</p>}
                            <p className="text-xs font-medium leading-relaxed">{t.message}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => removeToast(t.id)}
                            className="text-white/60 hover:text-white p-1 rounded-md transition"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>

            {/* ─────────────────────────────────────────────────────────────
                CLEAN TOP HEADER
            ───────────────────────────────────────────────────────────── */}
            <div className="bg-white border-b border-gray-200 px-6 py-3.5 sticky top-0 z-20 shadow-xs">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                            <Coins className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-bold text-gray-950 tracking-tight">New Loan Counter</h1>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    Single-Window Counter
                                </span>
                            </div>
                            <p className="text-xs text-gray-500">Radhika Jewellers • Rapid pledge, valuation &amp; pouch chitthi</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleResetForm}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 text-xs font-semibold transition shadow-xs"
                    >
                        <RotateCcw className="w-3.5 h-3.5 text-gray-400" /> Reset Form
                    </button>
                </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                MAIN CONTENT: 2-COLUMN AIRY WORKSPACE
            ───────────────────────────────────────────────────────────── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

                {/* 1. TOP BORROWER SELECTION BAR */}
                <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-4 sm:p-5">
                    {!selectedCustomer ? (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Search borrower by name (e.g. Piyush Varma), mobile number, or customer ID..."
                                    value={customerQuery}
                                    onFocus={() => setCustomerSearchOpen(true)}
                                    onChange={(e) => {
                                        setCustomerQuery(e.target.value);
                                        setCustomerSearchOpen(true);
                                    }}
                                    className="w-full pl-10 pr-10 py-2.5 bg-gray-50/60 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-xs"
                                />
                                {customerQuery && (
                                    <button
                                        onClick={() => {
                                            setCustomerQuery('');
                                            setCustomerSearchOpen(false);
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}

                                {/* Autocomplete Dropdown */}
                                {customerSearchOpen && (
                                    <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-40 max-h-72 overflow-y-auto divide-y divide-gray-100">
                                        {isSearchingCustomers ? (
                                            <div className="p-4 text-center text-xs text-gray-400">Searching borrowers…</div>
                                        ) : customerList.length > 0 ? (
                                            customerList.map((c) => (
                                                <div
                                                    key={c.id}
                                                    onClick={() => {
                                                        setSelectedCustomer(c);
                                                        setCustomerSearchOpen(false);
                                                        setCustomerQuery('');
                                                    }}
                                                    className="p-3 hover:bg-amber-50/50 cursor-pointer flex items-center justify-between transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                                                            {c.fullName.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-900">{c.fullName}</p>
                                                            <p className="text-[11px] text-gray-500 mt-0.5">
                                                                S/o: {c.guardianName || '—'} • City: {c.city || '—'} • Mobile: {c.mobile}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] font-mono font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200">
                                                        {c.customerCode}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center">
                                                <p className="text-xs text-gray-500">No customers found matching &quot;{customerQuery}&quot;</p>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setCustomerSearchOpen(false);
                                                        setIsNewCustomerModalOpen(true);
                                                    }}
                                                    className="mt-2 inline-flex items-center gap-1.5 text-xs text-amber-600 font-semibold hover:underline"
                                                >
                                                    <UserPlus className="w-3.5 h-3.5" /> Register &quot;{customerQuery}&quot; Now
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsNewCustomerModalOpen(true)}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs shrink-0"
                            >
                                <UserPlus className="w-4 h-4" /> New Customer
                            </button>
                        </div>
                    ) : (
                        /* Selected Borrower Compact Banner */
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-amber-50/40 rounded-xl p-3 sm:p-4 border border-amber-200">
                            <div className="flex items-center gap-3.5">
                                <div className="relative w-14 h-14 rounded-xl border border-amber-300 bg-white overflow-hidden shadow-xs flex items-center justify-center shrink-0 group">
                                    {customerPhotoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={customerPhotoUrl} alt="Borrower" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-7 h-7 text-amber-700" />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setPhotoModalTarget({ type: 'customer' })}
                                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity"
                                    >
                                        <Camera className="w-4 h-4 text-amber-300" />
                                    </button>
                                </div>

                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-base font-bold text-gray-950">{selectedCustomer.fullName}</h3>
                                        <span className="font-mono text-xs font-semibold bg-white text-gray-700 px-2 py-0.5 rounded border border-gray-200">
                                            {selectedCustomer.customerCode}
                                        </span>
                                        <span className="font-mono text-xs font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1">
                                            <Package className="w-3 h-3 text-amber-700" /> {packetBoxNo || deriveBoxNumber(selectedCustomer.customerCode)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-1">
                                        S/o: <span className="font-semibold text-gray-800">{selectedCustomer.guardianName || '—'}</span> • Mobile: <span className="font-mono font-semibold text-gray-800">{selectedCustomer.mobile}</span> • City: <span className="font-semibold text-gray-800">{selectedCustomer.city || '—'}</span>
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedCustomer(null)}
                                className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 text-xs font-semibold transition shadow-xs self-end sm:self-center"
                            >
                                Switch Borrower
                            </button>
                        </div>
                    )}
                </div>

                {/* 2. MAIN 2-COLUMN WORKSPACE */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                    {/* ──── LEFT COLUMN (8 COLS): COLLATERAL & LOAN TERMS ──── */}
                    <div className="lg:col-span-8 space-y-6">

                        {/* SECTION A: COLLATERAL ORNAMENTS GRID */}
                        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-5 space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                                        <Scale className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-gray-900">Pledged Ornaments &amp; Valuation</h2>
                                        <p className="text-[11px] text-gray-400">Add gold/silver items, karats, gross weight, and stone deductions</p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleAddRow}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition shadow-xs"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add Item
                                </button>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto rounded-xl border border-gray-200">
                                <table className="w-full text-left text-xs divide-y divide-gray-200">
                                    <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                                        <tr>
                                            <th className="px-2.5 py-2.5 text-center w-8">#</th>
                                            <th className="px-2.5 py-2.5 w-24">Metal</th>
                                            <th className="px-2.5 py-2.5 min-w-[200px]">Ornament Description</th>
                                            <th className="px-2.5 py-2.5 w-32">Purity</th>
                                            <th className="px-2.5 py-2.5 text-right w-24">Gross (g) *</th>
                                            <th className="px-2.5 py-2.5 text-right w-20">Stone (g)</th>
                                            <th className="px-2.5 py-2.5 text-right w-24">Net (g)</th>
                                            <th className="px-2.5 py-2.5 text-right w-24">Rate (₹/g)</th>
                                            <th className="px-2.5 py-2.5 text-right w-28">Valuation</th>
                                            <th className="px-2.5 py-2.5 text-center w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {collateralRows.map((row, idx) => {
                                            const net = Number(row.netWeight) || 0;
                                            const isGrossEmpty = row.grossWeight === '' || row.grossWeight === null || Number(row.grossWeight) <= 0;

                                            return (
                                                <tr key={row.id} className="hover:bg-amber-50/20 transition-colors">
                                                    <td className="px-2.5 py-2 text-center font-bold text-gray-400">{idx + 1}</td>

                                                    {/* Metal */}
                                                    <td className="px-2.5 py-2">
                                                        <select
                                                            value={row.metalType}
                                                            onChange={(e) =>
                                                                handleUpdateRow(idx, {
                                                                    metalType: e.target.value as 'GOLD' | 'SILVER',
                                                                    valuationRate: e.target.value === 'GOLD' ? 6500 : 85,
                                                                    purityKarat: e.target.value === 'GOLD' ? '22K' : '70%',
                                                                    fineness: e.target.value === 'GOLD' ? 91.6 : 70.0,
                                                                })
                                                            }
                                                            className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-bold text-amber-800 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                                                        >
                                                            <option value="GOLD">GOLD</option>
                                                            <option value="SILVER">SILVER</option>
                                                        </select>
                                                    </td>

                                                    {/* Description with Presets */}
                                                    <td className="px-2.5 py-2">
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                value={row.description}
                                                                onChange={(e) => handleUpdateRow(idx, { description: e.target.value })}
                                                                placeholder="e.g. Gold Chain"
                                                                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                                                            />
                                                            <select
                                                                onChange={(e) => {
                                                                    if (e.target.value) {
                                                                        handleUpdateRow(idx, { description: e.target.value });
                                                                    }
                                                                }}
                                                                value=""
                                                                className="absolute right-1 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 bg-transparent text-[10px] cursor-pointer"
                                                                title="Choose ornament preset"
                                                            >
                                                                <option value="" disabled>Presets ▾</option>
                                                                {ITEM_PRESETS.map((p) => (
                                                                    <option key={p} value={p}>{p}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </td>

                                                    {/* Purity */}
                                                    <td className="px-2.5 py-2">
                                                        <select
                                                            value={row.purityKarat}
                                                            onChange={(e) => handleUpdateRow(idx, { purityKarat: e.target.value })}
                                                            className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                                                        >
                                                            {PURITY_OPTIONS.filter((p) => (row.metalType === 'GOLD' ? !p.label.includes('Silver') : p.label.includes('Silver'))).map((p) => (
                                                                <option key={p.karat} value={p.karat}>{p.label}</option>
                                                            ))}
                                                        </select>
                                                    </td>

                                                    {/* Gross Weight */}
                                                    <td className="px-2.5 py-2">
                                                        <input
                                                            type="number"
                                                            step="0.001"
                                                            value={row.grossWeight}
                                                            onChange={(e) => handleUpdateRow(idx, { grossWeight: e.target.value === '' ? '' : Number(e.target.value) })}
                                                            placeholder="0.000"
                                                            className={`w-full text-right font-mono font-bold rounded-lg px-2.5 py-1.5 text-xs focus:outline-none transition-colors shadow-xs ${
                                                                isGrossEmpty
                                                                    ? 'bg-red-50/60 border border-red-300 text-red-900 focus:ring-1 focus:ring-red-500'
                                                                    : 'bg-white border border-gray-300 text-gray-900 focus:ring-1 focus:ring-amber-500'
                                                            }`}
                                                        />
                                                    </td>

                                                    {/* Stone Weight */}
                                                    <td className="px-2.5 py-2">
                                                        <input
                                                            type="number"
                                                            step="0.001"
                                                            value={row.stoneWeight}
                                                            onChange={(e) => handleUpdateRow(idx, { stoneWeight: e.target.value === '' ? '' : Number(e.target.value) })}
                                                            placeholder="0.000"
                                                            className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-right font-mono text-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                                                        />
                                                    </td>

                                                    {/* Net Weight (Readonly) */}
                                                    <td className="px-2.5 py-2 text-right font-mono font-bold text-emerald-700 bg-emerald-50/30">
                                                        {net > 0 ? `${net.toFixed(3)}g` : '—'}
                                                    </td>

                                                    {/* Rate */}
                                                    <td className="px-2.5 py-2">
                                                        <input
                                                            type="number"
                                                            step="50"
                                                            value={row.valuationRate}
                                                            onChange={(e) => handleUpdateRow(idx, { valuationRate: e.target.value === '' ? '' : Number(e.target.value) })}
                                                            className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-right font-mono text-gray-800 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                                                        />
                                                    </td>

                                                    {/* Valuation */}
                                                    <td className="px-2.5 py-2 text-right font-mono font-bold text-gray-950">
                                                        {row.valuation ? fmtINR(Number(row.valuation)) : '₹0'}
                                                    </td>

                                                    {/* Delete */}
                                                    <td className="px-2.5 py-2 text-center">
                                                        <button
                                                            type="button"
                                                            disabled={collateralRows.length <= 1}
                                                            onClick={() => handleRemoveRow(idx)}
                                                            className="p-1 text-gray-300 hover:text-red-600 disabled:opacity-20 transition"
                                                            title="Delete Item"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Weight Totals Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs font-mono">
                                <div className="flex flex-wrap items-center gap-4">
                                    <div>
                                        <span className="text-[10px] text-gray-400 uppercase block font-sans">Gross Weight:</span>
                                        <span className="font-bold text-gray-800">{totals.totalGross.toFixed(3)} g</span>
                                    </div>
                                    <div className="h-6 w-px bg-gray-200" />
                                    <div>
                                        <span className="text-[10px] text-gray-400 uppercase block font-sans">Stone Weight:</span>
                                        <span className="font-bold text-gray-500">{totals.totalStone.toFixed(3)} g</span>
                                    </div>
                                    <div className="h-6 w-px bg-gray-200" />
                                    <div>
                                        <span className="text-[10px] text-emerald-700 uppercase font-bold block font-sans">Net Pledged Gold:</span>
                                        <span className="font-extrabold text-emerald-700 text-sm">{totals.totalNet.toFixed(3)} g</span>
                                    </div>
                                    <div className="h-6 w-px bg-gray-200" />
                                    <div>
                                        <span className="text-[10px] text-gray-400 uppercase block font-sans">Fine Gold (24K Equiv):</span>
                                        <span className="font-bold text-gray-800">{totals.totalFine.toFixed(3)} g</span>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <span className="text-[10px] text-gray-400 uppercase block font-sans">Total Collateral Valuation:</span>
                                    <span className="font-extrabold text-gray-950 text-sm">{fmtINR(totals.totalValuation)}</span>
                                </div>
                            </div>
                        </div>

                        {/* SECTION B: LOAN SANCTION & RATE TERMS */}
                        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-5 space-y-4">
                            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                                    <Percent className="w-4 h-4" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-gray-900">Loan Sanction Terms</h2>
                                    <p className="text-[11px] text-gray-400">Principal disbursement amount, interest rate and tenure</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* Principal Sanction */}
                                <div className="space-y-1.5 bg-amber-50/40 p-3.5 rounded-xl border border-amber-200">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-amber-900">
                                        Principal Sanction (₹) *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-bold text-amber-700">₹</span>
                                        <input
                                            type="number"
                                            step="500"
                                            value={principalAmount}
                                            onChange={(e) => setPrincipalAmount(e.target.value === '' ? '' : Number(e.target.value))}
                                            placeholder="50000"
                                            className="w-full pl-7 pr-3 py-2 bg-white border border-amber-300 rounded-lg text-base font-bold font-mono text-gray-950 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-xs"
                                        />
                                    </div>
                                    {/* Preset Pills */}
                                    <div className="flex gap-1 pt-1">
                                        {[25000, 50000, 100000].map((amt) => (
                                            <button
                                                key={amt}
                                                type="button"
                                                onClick={() => setPrincipalAmount(amt)}
                                                className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white border border-amber-200 text-amber-800 hover:bg-amber-100 transition shadow-xs"
                                            >
                                                ₹{(amt / 1000).toFixed(0)}k
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Monthly Interest Rate */}
                                <div className="space-y-1.5 p-3.5 rounded-xl border border-gray-200 bg-gray-50/50">
                                    <label className="block text-xs font-semibold text-gray-700">Monthly Interest Rate</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={interestRatePm}
                                            onChange={(e) => setInterestRatePm(e.target.value === '' ? '' : Number(e.target.value))}
                                            className="w-24 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold font-mono text-gray-900 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                                            placeholder="2.5"
                                        />
                                        <span className="text-xs font-bold text-gray-600">% p.m.</span>
                                    </div>
                                    <span className="text-[10px] text-gray-400 block font-mono">
                                        ({((Number(interestRatePm) || 0) * 12).toFixed(1)}% per annum)
                                    </span>
                                </div>

                                {/* Payment Mode */}
                                <div className="space-y-1.5 p-3.5 rounded-xl border border-gray-200 bg-gray-50/50">
                                    <label className="block text-xs font-semibold text-gray-700">Disbursement Mode</label>
                                    <div className="grid grid-cols-3 gap-1 pt-1">
                                        {(['CASH', 'UPI', 'BANK_TRANSFER'] as const).map((m) => (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() => setPaymentMode(m)}
                                                className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                                                    paymentMode === m
                                                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                                                }`}
                                            >
                                                {m === 'CASH' ? 'Cash' : m === 'UPI' ? 'UPI' : 'Bank'}
                                            </button>
                                        ))}
                                    </div>
                                    <span className="text-[10px] text-gray-400 block pt-1">Immediate cash receipt</span>
                                </div>
                            </div>

                            {/* Upfront 1st Month Interest Deduction */}
                            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={deductFirstMonthInterest}
                                        onChange={(e) => setDeductFirstMonthInterest(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-gray-900 block">Deduct 1st Month Interest Upfront</span>
                                        <span className="text-[11px] text-gray-500">Deduct 1st month interest from cash in hand and issue immediate voucher</span>
                                    </div>
                                </label>

                                <div className="text-right font-mono text-xs">
                                    <span className="text-[10px] text-gray-400 block uppercase font-sans">Advance Deduction:</span>
                                    <span className="font-bold text-red-600">
                                        {deductFirstMonthInterest ? `-${fmtINR(calculatedAdvanceInterest)}` : '₹0'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* SECTION C: SIGNATURE & NOTES */}
                        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-5 space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-gray-900">Borrower Signature &amp; Notes</h2>
                                        <p className="text-[11px] text-gray-400">Signature will be embedded on the printed pledge chitthi</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <SignaturePad
                                        value={customerSignatureUrl}
                                        onChange={setCustomerSignatureUrl}
                                        label="Borrower Digital Signature"
                                        height={110}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Remarks / Loan Note</label>
                                    <textarea
                                        rows={4}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="e.g. Counter verified. 42 mani intact."
                                        className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ──── RIGHT COLUMN (4 COLS): STICKY DISBURSE & APPRAISAL CARD ──── */}
                    <div className="lg:col-span-4 sticky top-20 space-y-4">
                        <div className="bg-white rounded-2xl border border-amber-200/80 shadow-lg p-5 space-y-5">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-amber-600" />
                                    <h3 className="text-sm font-bold text-gray-950">Appraisal &amp; Disburse</h3>
                                </div>
                                <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
                                    LIVE SUMMARY
                                </span>
                            </div>

                            {/* Key Stats Stack */}
                            <div className="space-y-3 divide-y divide-gray-100 text-xs">
                                <div className="flex justify-between items-center pt-1">
                                    <span className="text-gray-500">Pledged Net Gold:</span>
                                    <span className="font-mono font-bold text-gray-950 text-sm">{totals.totalNet.toFixed(3)} g</span>
                                </div>
                                <div className="flex justify-between items-center pt-3">
                                    <span className="text-gray-500">Total Gold Valuation:</span>
                                    <span className="font-mono font-bold text-gray-950 text-sm">{fmtINR(totals.totalValuation)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-3">
                                    <span className="text-gray-500">Loan Sanction Amount:</span>
                                    <span className="font-mono font-bold text-amber-900 text-sm">{fmtINR(Number(principalAmount) || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-3">
                                    <span className="text-gray-500">LTV Margin (RBI Cap 75%):</span>
                                    <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                                        totals.ltvRatio <= 75 ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                                    }`}>
                                        {totals.ltvRatio}% {totals.ltvRatio <= 75 ? '✓ Safe' : '⚠️ High'}
                                    </span>
                                </div>
                            </div>

                            {/* Safe Box / Pigeonhole Slot Pill */}
                            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                                        <Package className="w-3.5 h-3.5 text-amber-600" /> Vault Safe Box
                                    </span>
                                    {isOwner && (
                                        <button
                                            type="button"
                                            onClick={() => setIsBoxUnlocked(!isBoxUnlocked)}
                                            className="text-[10px] text-amber-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                        >
                                            {isBoxUnlocked ? <Unlock className="w-3 h-3 text-amber-600" /> : <Lock className="w-3 h-3 text-gray-400" />}
                                            {isBoxUnlocked ? 'Override' : 'Owner Edit'}
                                        </button>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    value={packetBoxNo}
                                    readOnly={!isBoxUnlocked}
                                    onChange={(e) => setPacketBoxNo(e.target.value)}
                                    placeholder={selectedCustomer ? deriveBoxNumber(selectedCustomer.customerCode) || 'Box 100' : 'Select Customer First'}
                                    className={`w-full px-3 py-1.5 rounded-lg text-xs font-bold font-mono shadow-xs focus:outline-none transition-colors ${
                                        isBoxUnlocked
                                            ? 'bg-amber-50 border border-amber-400 text-gray-950'
                                            : 'bg-white border border-gray-300 text-gray-800 cursor-not-allowed select-none'
                                    }`}
                                />
                                <span className="text-[10px] text-gray-500 block">
                                    {selectedCustomer ? `Auto-assigned 1–100 slot for ${selectedCustomer.customerCode}` : 'Auto-maps once borrower is chosen'}
                                </span>
                            </div>

                            {/* Net Cash Callout */}
                            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md space-y-1">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-100 block">
                                    Net Cash Handover to Customer:
                                </span>
                                <div className="text-2xl font-extrabold font-mono tracking-tight">
                                    {fmtINR(netCashToDisburse)}
                                </div>
                                <p className="text-[11px] text-emerald-100">
                                    {deductFirstMonthInterest ? 'Includes 1st month advance interest voucher' : 'Full principal handover'}
                                </p>
                            </div>

                            {/* Big Primary Disburse Button */}
                            <button
                                type="button"
                                onClick={handleSubmitLoan}
                                disabled={isSubmitting}
                                className="w-full py-3.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Sanctioning &amp; Printing…</span>
                                    </>
                                ) : (
                                    <>
                                        <Printer className="w-4 h-4" />
                                        <span>Disburse &amp; Print Chitthi</span>
                                    </>
                                )}
                            </button>

                            <p className="text-[10px] text-center text-gray-400">
                                Single click originates loan, writes ledger entry, locks packet, and generates foldable Chitthi
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                POPUP 1: POST-ORIGINATION CONFIRMATION & 1-CLICK PRINT MODAL
            ───────────────────────────────────────────────────────────── */}
            {submissionResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full overflow-hidden text-gray-900">
                        <div className="bg-emerald-600 p-6 text-center text-white">
                            <div className="w-12 h-12 rounded-full bg-white/20 mx-auto flex items-center justify-center mb-2">
                                <CheckCircle2 className="w-7 h-7 text-white" />
                            </div>
                            <h3 className="text-lg font-bold">Loan Originated Successfully</h3>
                            <p className="text-xs text-emerald-100 mt-0.5">
                                Pledged ornaments securely locked in vault &amp; disbursement ledger recorded
                            </p>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Loan Serial Code:</span>
                                    <span className="font-mono font-bold text-gray-900">{submissionResult.loanCode}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Pouch / Packet Code:</span>
                                    <span className="font-mono font-bold text-gray-900">{submissionResult.packetCode}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Vault Location:</span>
                                    <span className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                                        {submissionResult.storageLocation}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Net Cash Disbursed:</span>
                                    <span className="font-mono font-bold text-emerald-700 text-sm">
                                        {fmtINR(submissionResult.netCashDisbursed)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Total Net Gold:</span>
                                    <span className="font-mono font-bold text-gray-900">
                                        {submissionResult.totalNetWeight.toFixed(3)} g
                                    </span>
                                </div>
                            </div>

                            {/* 1-Click Print Button */}
                            <button
                                type="button"
                                onClick={() => {
                                    window.open(getPledgeAgreementPdfUrl(submissionResult.loanId), '_blank');
                                }}
                                className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition"
                            >
                                <Printer className="w-4 h-4" />
                                <span>Print 2-Sided Pledge Document (with Pouch Chitthi)</span>
                            </button>

                            <p className="text-[11px] text-center text-gray-500">
                                Page 1: Full legal pledge agreement | Page 2: Foldable 5cm×8.5cm pouch chitthi
                            </p>

                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <Link
                                    href={`/loans/${submissionResult.loanId}`}
                                    className="py-2 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 text-center transition flex items-center justify-center gap-1.5 shadow-xs"
                                >
                                    <FileText className="w-3.5 h-3.5 text-gray-500" /> View Loan File
                                </Link>
                                <button
                                    type="button"
                                    onClick={handleResetForm}
                                    className="py-2 px-3 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-xs font-bold text-amber-800 text-center transition flex items-center justify-center gap-1.5 shadow-xs"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Next Customer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                POPUP 2: LIVE PHOTO CAPTURE MODAL
            ───────────────────────────────────────────────────────────── */}
            {photoModalTarget && (
                <PhotoCaptureModal
                    isOpen={true}
                    onClose={() => setPhotoModalTarget(null)}
                    onConfirm={handlePhotoCaptured}
                    captureTarget={photoModalTarget.type === 'customer' ? 'customer' : 'jewellery'}
                    title={
                        photoModalTarget.type === 'customer'
                            ? 'Capture Borrower Photo'
                            : `Capture Ornament Photo (Item #${photoModalTarget.rowIndex + 1})`
                    }
                    subtitle={
                        photoModalTarget.type === 'customer'
                            ? 'Take a live webcam portrait of the customer or upload an image'
                            : 'Capture clear ornament details, hallmark stamp, or packaging'
                    }
                />
            )}

            {/* ─────────────────────────────────────────────────────────────
                POPUP 3: QUICK REGISTER NEW CUSTOMER MODAL
            ───────────────────────────────────────────────────────────── */}
            {isNewCustomerModalOpen && (
                <QuickRegisterCustomerModal
                    onClose={() => setIsNewCustomerModalOpen(false)}
                    onCustomerCreated={(customer) => {
                        setSelectedCustomer(customer);
                        setIsNewCustomerModalOpen(false);
                        showToast(`Borrower ${customer.fullName} registered successfully!`, 'success', 'Customer Added');
                    }}
                />
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// QUICK REGISTER CUSTOMER MODAL
// ─────────────────────────────────────────────────────────────────────────
function QuickRegisterCustomerModal({
    onClose,
    onCustomerCreated,
}: {
    onClose: () => void;
    onCustomerCreated: (customer: Customer) => void;
}) {
    const [fullName, setFullName] = useState('');
    const [guardianName, setGuardianName] = useState('');
    const [mobile, setMobile] = useState('');
    const [city, setCity] = useState('');
    const [address, setAddress] = useState('');
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!fullName.trim()) {
            setError('Borrower full name is required');
            return;
        }

        if (!mobile.trim() || mobile.trim().length < 10) {
            setError('Valid 10-digit mobile number is required');
            return;
        }

        try {
            setIsSaving(true);
            const customer = await createCustomer({
                fullName: fullName.trim(),
                guardianName: guardianName.trim() || undefined,
                mobile: mobile.trim(),
                city: city.trim() || undefined,
                address: address.trim() || undefined,
                photoUrl: photoUrl || undefined,
            });

            onCustomerCreated(customer);
        } catch (err: any) {
            setError(err?.message || 'Failed to register customer. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full overflow-hidden text-gray-900">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/70">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                            <UserPlus className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">Quick Register Borrower</h3>
                            <p className="text-[11px] text-gray-500">Add customer profile and proceed to loan counter</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-5 space-y-3.5 text-xs">
                    {error && (
                        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
                            {error}
                        </div>
                    )}

                    {/* Photo Capture */}
                    <div className="flex items-center gap-4 py-1">
                        <div className="w-16 h-16 rounded-xl border border-gray-200 bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                            {photoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={photoUrl} alt="New customer" className="w-full h-full object-cover" />
                            ) : (
                                <Camera className="w-6 h-6 text-gray-400" />
                            )}
                        </div>
                        <div>
                            <button
                                type="button"
                                onClick={() => setIsCapturingPhoto(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold shadow-xs"
                            >
                                <Camera className="w-3.5 h-3.5 text-amber-600" />
                                {photoUrl ? 'Change Photo' : 'Capture Photo'}
                            </button>
                            <p className="text-[10px] text-gray-400 mt-1">Live webcam snapshot or upload</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Full Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="e.g. Piyush Gopal Varma"
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Guardian / S/o
                            </label>
                            <input
                                type="text"
                                value={guardianName}
                                onChange={(e) => setGuardianName(e.target.value)}
                                placeholder="Gopal Varma"
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Mobile Number *
                            </label>
                            <input
                                type="tel"
                                required
                                value={mobile}
                                onChange={(e) => setMobile(e.target.value)}
                                placeholder="9876543210"
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 font-mono font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                City / Village
                            </label>
                            <input
                                type="text"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                placeholder="Shegaon"
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Full Address
                            </label>
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Main Market Road"
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                            />
                        </div>
                    </div>

                    <div className="pt-2 flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 font-semibold hover:bg-gray-50 transition shadow-xs"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition shadow-xs disabled:opacity-50"
                        >
                            {isSaving ? 'Saving…' : 'Register & Select'}
                        </button>
                    </div>
                </form>
            </div>

            {isCapturingPhoto && (
                <PhotoCaptureModal
                    isOpen={true}
                    onClose={() => setIsCapturingPhoto(false)}
                    onConfirm={(url) => {
                        setPhotoUrl(url);
                        setIsCapturingPhoto(false);
                    }}
                    captureTarget="customer"
                    title="Capture Borrower Portrait"
                    subtitle="Take webcam snapshot or upload photo file"
                />
            )}
        </div>
    );
}

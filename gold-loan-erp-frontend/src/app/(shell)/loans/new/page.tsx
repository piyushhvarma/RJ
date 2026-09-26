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
    Building2,
    Calendar,
    Percent,
    ShieldCheck,
    CheckCircle2,
    FileText,
    Package,
    Lock,
    ExternalLink,
    ChevronDown,
    ArrowRight,
    User,
    Phone,
    MapPin,
} from 'lucide-react';
import Link from 'next/link';

import { getCustomers, createCustomer, updateCustomerPhoto } from '@/lib/api/customers';
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

function fmtINR(val: number | null | undefined): string {
    if (val == null || isNaN(val)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(val);
}

export default function CounterOriginationPage() {
    const router = useRouter();
    const queryClient = useQueryClient();

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
    const [packetBoxNo, setPacketBoxNo] = useState<string>('Box 14');
    const [deductFirstMonthInterest, setDeductFirstMonthInterest] = useState<boolean>(false);
    const [tenureMonths, setTenureMonths] = useState<number>(12);

    // ─── Collateral Grid State ──────────────────────────────────
    const [collateralRows, setCollateralRows] = useState<CollateralRowState[]>([createDefaultRow(1)]);

    // ─── Payment & Storage State ────────────────────────────────
    const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER'>('CASH');
    const [paymentRemarks, setPaymentRemarks] = useState<string>('');
    const [storageLocation, setStorageLocation] = useState<string>('Safe 1, Box 14');
    const [notes, setNotes] = useState<string>('Counter verified. 42 mani & 1 pendal intact.');
    const [customerSignatureUrl, setCustomerSignatureUrl] = useState<string | null>(null);

    // ─── Modal / Dialog Controls ────────────────────────────────
    const [photoModalTarget, setPhotoModalTarget] = useState<{ type: 'customer' } | { type: 'item'; rowIndex: number } | null>(null);
    const [submissionResult, setSubmissionResult] = useState<CounterOriginationResponse | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Auto-sync storage location with box number
    useEffect(() => {
        if (packetBoxNo) {
            setStorageLocation(`Safe 1, ${packetBoxNo.trim()}`);
        }
    }, [packetBoxNo]);

    // Update customer photo when customer changes
    useEffect(() => {
        if (selectedCustomer) {
            setCustomerPhotoUrl(selectedCustomer.photoUrl || null);
            if (selectedCustomer.signatureUrl) {
                setCustomerSignatureUrl(selectedCustomer.signatureUrl);
            }
        }
    }, [selectedCustomer]);

    // Query Customers
    const { data: customerResults, isLoading: isSearchingCustomers } = useQuery({
        queryKey: ['counter-customers', customerQuery],
        queryFn: () => getCustomers(customerQuery || undefined),
        enabled: customerSearchOpen || customerQuery.length > 0,
    });

    // Calculations
    const calculatedAdvanceInterest = useMemo(() => {
        if (!principalAmount || !interestRatePm) return 0;
        return Math.round(Number(principalAmount) * (Number(interestRatePm) / 100));
    }, [principalAmount, interestRatePm]);

    const netCashToDisburse = useMemo(() => {
        const p = Number(principalAmount) || 0;
        return deductFirstMonthInterest ? Math.max(0, p - calculatedAdvanceInterest) : p;
    }, [principalAmount, deductFirstMonthInterest, calculatedAdvanceInterest]);

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

    // Photo capture
    const handlePhotoCaptured = (photoDataUrl: string) => {
        if (!photoModalTarget) return;

        if (photoModalTarget.type === 'customer') {
            setCustomerPhotoUrl(photoDataUrl);
            if (selectedCustomer?.id) {
                updateCustomerPhoto(selectedCustomer.id, photoDataUrl).catch(() => {});
            }
        } else if (photoModalTarget.type === 'item') {
            const rowIndex = photoModalTarget.rowIndex;
            setCollateralRows((prev) => {
                const next = [...prev];
                next[rowIndex] = {
                    ...next[rowIndex],
                    photos: [photoDataUrl],
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
        setPacketBoxNo('Box 14');
        setNotes('Counter verified. 42 mani & 1 pendal intact.');
        setErrorMessage(null);
        setSubmissionResult(null);
    };

    // Submit Loan
    const handleSubmitLoan = async () => {
        setErrorMessage(null);

        if (!selectedCustomer) {
            setErrorMessage('Please select or register a borrower customer.');
            return;
        }

        if (!principalAmount || Number(principalAmount) <= 0) {
            setErrorMessage('Please enter a valid loan principal amount.');
            return;
        }

        if (!collateralRows.length) {
            setErrorMessage('At least one collateral ornament item is required.');
            return;
        }

        for (let i = 0; i < collateralRows.length; i++) {
            const r = collateralRows[i];
            if (!r.description.trim()) {
                setErrorMessage(`Item #${i + 1} requires a description.`);
                return;
            }
            if (!r.grossWeight || Number(r.grossWeight) <= 0) {
                setErrorMessage(`Item #${i + 1} requires a valid gross weight.`);
                return;
            }
            if (!r.netWeight || Number(r.netWeight) <= 0) {
                setErrorMessage(`Item #${i + 1} requires a valid net weight.`);
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
        } catch (err: any) {
            setErrorMessage(err?.message || 'Failed to complete counter origination. Please verify details.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/60 pb-28 font-sans">
            {/* Top Clean Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20 shadow-xs">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold shadow-xs">
                            <Coins className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-gray-950 tracking-tight">New Loan Counter</h1>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Single-Window
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Radhika Jewellers • Rapid pledge origination, appraisal &amp; pledge agreement generator
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={handleResetForm}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-medium hover:bg-gray-50 transition shadow-xs"
                        >
                            <RotateCcw className="w-3.5 h-3.5 text-gray-400" /> Reset Form
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                {/* Error Banner */}
                {errorMessage && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-center justify-between shadow-xs animate-in fade-in">
                        <div className="flex items-center gap-2.5">
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                            <p className="text-xs font-semibold">{errorMessage}</p>
                        </div>
                        <button
                            onClick={() => setErrorMessage(null)}
                            className="p-1 text-red-500 hover:text-red-700 rounded-md"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* ─────────────────────────────────────────────────────────────
                    CARD 1: BORROWER IDENTIFICATION & PHOTO
                ───────────────────────────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-5 sm:p-6 transition-all">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                                <User className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-gray-900 tracking-tight">Borrower Information</h2>
                                <p className="text-xs text-gray-400">Search existing customer profile or register a new borrower</p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsNewCustomerModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition shadow-xs"
                        >
                            <UserPlus className="w-3.5 h-3.5" /> Register Customer
                        </button>
                    </div>

                    {!selectedCustomer ? (
                        /* Customer Search Bar */
                        <div className="relative">
                            <div className="relative">
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
                                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-xs"
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
                            </div>

                            {/* Autocomplete Dropdown */}
                            {customerSearchOpen && (
                                <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-40 max-h-72 overflow-y-auto divide-y divide-gray-100">
                                    {isSearchingCustomers ? (
                                        <div className="p-4 text-center text-xs text-gray-400">Searching borrowers…</div>
                                    ) : customerResults && customerResults.length > 0 ? (
                                        customerResults.map((c) => (
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
                                                            S/o: {c.guardianName || '—'} • City: {c.city || '—'} • Phone: {c.mobile}
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
                    ) : (
                        /* Selected Borrower Profile Card */
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 bg-gradient-to-br from-amber-50/60 via-white to-gray-50/40 rounded-xl p-4 border border-amber-200/70">
                            <div className="flex items-center gap-4">
                                {/* Portrait Photo Thumbnail */}
                                <div className="relative w-20 h-20 rounded-xl border border-amber-300 bg-gray-100 overflow-hidden shadow-xs flex items-center justify-center group shrink-0">
                                    {customerPhotoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={customerPhotoUrl}
                                            alt="Customer"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center text-gray-400 text-[10px]">
                                            <Camera className="w-5 h-5 mb-0.5 text-gray-400" />
                                            <span>No Photo</span>
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setPhotoModalTarget({ type: 'customer' })}
                                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold transition-opacity"
                                    >
                                        <Camera className="w-4 h-4 mb-0.5 text-amber-300" />
                                        <span>Change</span>
                                    </button>
                                </div>

                                {/* Information Details */}
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-bold text-gray-950">{selectedCustomer.fullName}</h3>
                                        <span className="font-mono text-[11px] font-semibold bg-white text-gray-700 px-2 py-0.5 rounded border border-gray-200 shadow-xs">
                                            {selectedCustomer.customerCode}
                                        </span>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            KYC Verified
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-gray-600 pt-0.5">
                                        <div>
                                            <span className="text-gray-400 font-medium">S/o:</span>{' '}
                                            <span className="font-semibold text-gray-800">{selectedCustomer.guardianName || '—'}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 font-medium">City:</span>{' '}
                                            <span className="font-semibold text-gray-800">{selectedCustomer.city || '—'}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 font-medium">Mobile:</span>{' '}
                                            <span className="font-mono font-semibold text-gray-800">{selectedCustomer.mobile}</span>
                                        </div>
                                        <div className="col-span-2 sm:col-span-3 truncate">
                                            <span className="text-gray-400 font-medium">Address:</span>{' '}
                                            <span className="text-gray-700">{selectedCustomer.address || '—'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions on customer */}
                            <div className="flex items-center gap-2 self-end md:self-center">
                                <button
                                    type="button"
                                    onClick={() => setPhotoModalTarget({ type: 'customer' })}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium transition shadow-xs"
                                >
                                    <Camera className="w-3.5 h-3.5 text-amber-600" />
                                    {customerPhotoUrl ? 'Update Photo' : 'Capture Photo'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedCustomer(null)}
                                    className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-700 text-xs font-medium transition shadow-xs"
                                >
                                    Change
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ─────────────────────────────────────────────────────────────
                    CARD 2: LOAN TERMS & STORAGE ALLOCATION
                ───────────────────────────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-5 sm:p-6 space-y-4">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                        <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                            <Percent className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-gray-900 tracking-tight">Loan Terms &amp; Custody Allocation</h2>
                            <p className="text-xs text-gray-400">Specify principal sanction, monthly interest rate, and security box</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {/* Principal Amount */}
                        <div className="sm:col-span-2 lg:col-span-2 space-y-1.5 bg-amber-50/30 p-3.5 rounded-xl border border-amber-200/80">
                            <div className="flex items-center justify-between">
                                <label className="block text-xs font-bold uppercase tracking-wider text-amber-900">
                                    Principal Sanction Amount *
                                </label>
                                <span className="text-[11px] text-amber-700 font-semibold">INR (₹)</span>
                            </div>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-amber-700">
                                    ₹
                                </span>
                                <input
                                    type="number"
                                    step="500"
                                    value={principalAmount}
                                    onChange={(e) => setPrincipalAmount(e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="50000"
                                    className="w-full pl-8 pr-3 py-2 bg-white border border-amber-300 rounded-lg text-lg font-bold font-mono text-gray-950 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-xs"
                                />
                            </div>
                            {/* Preset Pills */}
                            <div className="flex gap-1.5 pt-1">
                                {[10000, 25000, 50000, 100000].map((amt) => (
                                    <button
                                        key={amt}
                                        type="button"
                                        onClick={() => setPrincipalAmount(amt)}
                                        className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white border border-amber-200 text-amber-800 hover:bg-amber-100 transition shadow-xs"
                                    >
                                        ₹{(amt / 1000).toFixed(0)}k
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Start Date */}
                        <div className="space-y-1.5 p-3.5 rounded-xl border border-gray-200 bg-gray-50/40">
                            <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" /> Start Date
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-mono font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-xs"
                            />
                            <span className="text-[10px] text-gray-400 block">Sanction agreement date</span>
                        </div>

                        {/* Monthly Interest Rate */}
                        <div className="space-y-1.5 p-3.5 rounded-xl border border-gray-200 bg-gray-50/40">
                            <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                                <Percent className="w-3.5 h-3.5 text-gray-400" /> Interest Rate
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    step="0.1"
                                    value={interestRatePm}
                                    onChange={(e) => setInterestRatePm(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-20 px-2.5 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold font-mono text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-xs"
                                    placeholder="2.5"
                                />
                                <span className="text-xs font-semibold text-gray-600">% p.m.</span>
                            </div>
                            <span className="text-[10px] text-gray-500 block font-mono">
                                ({((Number(interestRatePm) || 0) * 12).toFixed(1)}% per annum)
                            </span>
                        </div>

                        {/* Packet / Safe Box No. */}
                        <div className="space-y-1.5 p-3.5 rounded-xl border border-gray-200 bg-gray-50/40">
                            <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                                <Package className="w-3.5 h-3.5 text-amber-600" /> Safe Box No. *
                            </label>
                            <input
                                type="text"
                                value={packetBoxNo}
                                onChange={(e) => setPacketBoxNo(e.target.value)}
                                placeholder="Box 14"
                                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-bold font-mono text-gray-950 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-xs"
                            />
                            <span className="text-[10px] text-amber-700 font-medium block">
                                Printed bold on Pouch Chitthi
                            </span>
                        </div>
                    </div>

                    {/* Upfront Interest Deduction Banner */}
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <label className="flex items-start sm:items-center gap-3 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={deductFirstMonthInterest}
                                onChange={(e) => setDeductFirstMonthInterest(e.target.checked)}
                                className="w-4 h-4 mt-0.5 sm:mt-0 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                                <span className="text-xs font-bold text-gray-900 block">
                                    Deduct 1st Month Interest Upfront
                                </span>
                                <span className="text-[11px] text-gray-500">
                                    Deducts first month interest from cash in hand and issues an immediate interest payment voucher.
                                </span>
                            </div>
                        </label>

                        <div className="flex items-center gap-4 text-xs font-mono self-end sm:self-center bg-white px-3.5 py-1.5 rounded-lg border border-gray-200 shadow-xs">
                            <div>
                                <span className="text-[10px] text-gray-400 uppercase block">1st Mo Interest:</span>
                                <span className="font-bold text-red-600">
                                    {deductFirstMonthInterest ? `-${fmtINR(calculatedAdvanceInterest)}` : '₹0'}
                                </span>
                            </div>
                            <div className="h-6 w-px bg-gray-200" />
                            <div>
                                <span className="text-[10px] text-emerald-700 uppercase font-bold block">
                                    Net Cash to Hand:
                                </span>
                                <span className="text-sm font-extrabold text-emerald-700">
                                    {fmtINR(netCashToDisburse)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─────────────────────────────────────────────────────────────
                    CARD 3: COLLATERAL ORNAMENTS TABLE
                ───────────────────────────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                                <Scale className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-gray-900 tracking-tight">Collateral Ornaments Grid</h2>
                                <p className="text-xs text-gray-400">Add ornaments, purity karats, weights, and live camera snapshots</p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleAddRow}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold transition shadow-xs"
                        >
                            <Plus className="w-3.5 h-3.5 text-amber-600" /> Add Ornament Item
                        </button>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="w-full text-left text-xs divide-y divide-gray-200">
                            <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                                <tr>
                                    <th className="px-2.5 py-3 text-center w-8">#</th>
                                    <th className="px-2.5 py-3 w-24">Metal</th>
                                    <th className="px-2.5 py-3 min-w-[220px]">Item Description</th>
                                    <th className="px-2.5 py-3 text-center w-14">Qty</th>
                                    <th className="px-2.5 py-3 text-right w-24">Gross (g)</th>
                                    <th className="px-2.5 py-3 text-right w-20">Stone (g)</th>
                                    <th className="px-2.5 py-3 text-right w-24">Net (g)</th>
                                    <th className="px-2.5 py-3 w-32">Purity</th>
                                    <th className="px-2.5 py-3 text-right w-24">Fine (g)</th>
                                    <th className="px-2.5 py-3 text-right w-24">Rate (₹/g)</th>
                                    <th className="px-2.5 py-3 text-right w-28">Valuation (₹)</th>
                                    <th className="px-2.5 py-3 text-center w-16">Photo</th>
                                    <th className="px-2.5 py-3 text-center w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {collateralRows.map((row, idx) => {
                                    const net = Number(row.netWeight) || 0;
                                    const fine = net * ((Number(row.fineness) || 91.6) / 100);

                                    return (
                                        <tr key={row.id} className="hover:bg-amber-50/30 transition-colors">
                                            {/* Row # */}
                                            <td className="px-2.5 py-2.5 text-center font-bold text-gray-400">{idx + 1}</td>

                                            {/* Metal */}
                                            <td className="px-2.5 py-2.5">
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
                                            <td className="px-2.5 py-2.5">
                                                <input
                                                    type="text"
                                                    list={`presets-${idx}`}
                                                    value={row.description}
                                                    onChange={(e) => handleUpdateRow(idx, { description: e.target.value })}
                                                    placeholder="e.g. 42 Mani, 1 Pendal Pot"
                                                    className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                                                />
                                                <datalist id={`presets-${idx}`}>
                                                    {ITEM_PRESETS.map((p) => (
                                                        <option key={p} value={p} />
                                                    ))}
                                                </datalist>
                                            </td>

                                            {/* Qty */}
                                            <td className="px-2.5 py-2.5">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={row.quantity}
                                                    onChange={(e) =>
                                                        handleUpdateRow(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })
                                                    }
                                                    className="w-full bg-white border border-gray-300 rounded-lg px-1.5 py-1.5 text-xs font-bold text-center text-gray-900 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                                                />
                                            </td>

                                            {/* Gross Wt */}
                                            <td className="px-2.5 py-2.5">
                                                <input
                                                    type="number"
                                                    step="0.001"
                                                    value={row.grossWeight}
                                                    onChange={(e) =>
                                                        handleUpdateRow(idx, {
                                                            grossWeight: e.target.value === '' ? '' : Number(e.target.value),
                                                        })
                                                    }
                                                    placeholder="0.000"
                                                    className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-right text-gray-900 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                                                />
                                            </td>

                                            {/* Stone Wt */}
                                            <td className="px-2.5 py-2.5">
                                                <input
                                                    type="number"
                                                    step="0.001"
                                                    value={row.stoneWeight}
                                                    onChange={(e) =>
                                                        handleUpdateRow(idx, {
                                                            stoneWeight: e.target.value === '' ? '' : Number(e.target.value),
                                                        })
                                                    }
                                                    placeholder="0.000"
                                                    className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono text-right text-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                                                />
                                            </td>

                                            {/* Net Wt */}
                                            <td className="px-2.5 py-2.5">
                                                <input
                                                    type="number"
                                                    step="0.001"
                                                    value={row.netWeight}
                                                    onChange={(e) =>
                                                        handleUpdateRow(idx, {
                                                            netWeight: e.target.value === '' ? '' : Number(e.target.value),
                                                        })
                                                    }
                                                    placeholder="0.000"
                                                    className="w-full bg-amber-50/40 border border-amber-300 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-right text-emerald-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs"
                                                />
                                            </td>

                                            {/* Purity */}
                                            <td className="px-2.5 py-2.5">
                                                <select
                                                    value={row.purityKarat}
                                                    onChange={(e) => handleUpdateRow(idx, { purityKarat: e.target.value })}
                                                    className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                                                >
                                                    {PURITY_OPTIONS.map((p) => (
                                                        <option key={p.label} value={p.karat}>
                                                            {p.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>

                                            {/* Fine Wt */}
                                            <td className="px-2.5 py-2.5 text-right font-mono font-bold text-gray-900">
                                                {fine.toFixed(3)}
                                            </td>

                                            {/* Valuation Rate */}
                                            <td className="px-2.5 py-2.5">
                                                <input
                                                    type="number"
                                                    step="50"
                                                    value={row.valuationRate}
                                                    onChange={(e) =>
                                                        handleUpdateRow(idx, {
                                                            valuationRate: e.target.value === '' ? '' : Number(e.target.value),
                                                        })
                                                    }
                                                    placeholder="6500"
                                                    className="w-full bg-white border border-gray-300 rounded-lg px-1.5 py-1.5 text-xs font-mono text-right text-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                                                />
                                            </td>

                                            {/* Valuation (₹) */}
                                            <td className="px-2.5 py-2.5 text-right font-mono font-bold text-gray-950">
                                                {fmtINR(Number(row.valuation) || 0)}
                                            </td>

                                            {/* Photo */}
                                            <td className="px-2.5 py-2.5 text-center">
                                                {row.photos && row.photos.length > 0 ? (
                                                    <div
                                                        onClick={() => setPhotoModalTarget({ type: 'item', rowIndex: idx })}
                                                        className="w-7 h-7 mx-auto rounded-lg border border-amber-400 overflow-hidden cursor-pointer shadow-xs hover:opacity-80 transition"
                                                    >
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={row.photos[0]}
                                                            alt="Ornament"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setPhotoModalTarget({ type: 'item', rowIndex: idx })}
                                                        title="Snap ornament snapshot"
                                                        className="w-7 h-7 mx-auto rounded-lg bg-gray-100 hover:bg-amber-50 text-gray-400 hover:text-amber-700 flex items-center justify-center border border-gray-200 transition shadow-xs"
                                                    >
                                                        <Camera className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </td>

                                            {/* Delete */}
                                            <td className="px-2.5 py-2.5 text-center">
                                                <button
                                                    type="button"
                                                    disabled={collateralRows.length <= 1}
                                                    onClick={() => handleRemoveRow(idx)}
                                                    className="p-1 text-gray-300 hover:text-red-600 disabled:opacity-20 transition"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>

                            {/* Totals */}
                            <tfoot className="bg-gray-50/90 font-mono font-bold text-xs text-gray-900 border-t border-gray-200">
                                <tr>
                                    <td colSpan={3} className="px-3 py-3 text-right font-sans uppercase text-gray-500">
                                        Total Collateral:
                                    </td>
                                    <td className="px-2.5 py-3 text-center">{totals.totalQty}</td>
                                    <td className="px-2.5 py-3 text-right">{totals.totalGross.toFixed(3)}</td>
                                    <td className="px-2.5 py-3 text-right text-gray-400">{totals.totalStone.toFixed(3)}</td>
                                    <td className="px-2.5 py-3 text-right text-emerald-800 text-sm font-extrabold">
                                        {totals.totalNet.toFixed(3)} g
                                    </td>
                                    <td className="px-2.5 py-3"></td>
                                    <td className="px-2.5 py-3 text-right">{totals.totalFine.toFixed(3)} g</td>
                                    <td className="px-2.5 py-3"></td>
                                    <td className="px-2.5 py-3 text-right text-gray-950 text-sm font-extrabold">
                                        {fmtINR(totals.totalValuation)}
                                    </td>
                                    <td colSpan={2} className="px-2.5 py-3"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Safety LTV Badge */}
                    <div className="flex items-center justify-between text-xs pt-1">
                        <div className="flex items-center gap-2">
                            <span
                                className={`px-2.5 py-1 rounded-lg font-bold border ${
                                    totals.ltvRatio <= 75
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                        : 'bg-red-50 border-red-200 text-red-800'
                                }`}
                            >
                                LTV Ratio: {totals.ltvRatio}% {totals.ltvRatio <= 75 ? '(Safe Margin ✅)' : '(High LTV ⚠️)'}
                            </span>
                            <span className="text-gray-500">
                                Standard RBI regulatory cap: 75% LTV
                            </span>
                        </div>
                    </div>
                </div>

                {/* ─────────────────────────────────────────────────────────────
                    CARD 4: PAYMENT, STORAGE & BORROWER SIGNATURE
                ───────────────────────────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Custody & Payment Details (7 Cols) */}
                    <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200/90 shadow-xs p-5 sm:p-6 space-y-4">
                        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                                <Lock className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-gray-900 tracking-tight">Disbursement &amp; Custody</h2>
                                <p className="text-xs text-gray-400">Payment instrument and physical locker allocation</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Payment Mode */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                    Disbursement Payment Mode
                                </label>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {(['CASH', 'UPI', 'BANK_TRANSFER'] as const).map((mode) => (
                                        <button
                                            key={mode}
                                            type="button"
                                            onClick={() => setPaymentMode(mode)}
                                            className={`py-2 px-2 rounded-lg text-xs font-semibold transition border ${
                                                paymentMode === mode
                                                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                            }`}
                                        >
                                            {mode === 'CASH' ? 'Cash' : mode === 'UPI' ? 'UPI' : 'Bank NEFT'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tenure */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                    Loan Tenure Period
                                </label>
                                <select
                                    value={tenureMonths}
                                    onChange={(e) => setTenureMonths(Number(e.target.value))}
                                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                                >
                                    <option value={3}>3 Months</option>
                                    <option value={6}>6 Months</option>
                                    <option value={12}>12 Months (1 Year)</option>
                                    <option value={24}>24 Months (2 Years)</option>
                                </select>
                            </div>

                            {/* Vault / Storage Location */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                    Vault Storage Location
                                </label>
                                <input
                                    type="text"
                                    value={storageLocation}
                                    onChange={(e) => setStorageLocation(e.target.value)}
                                    placeholder="Safe 1, Box 14"
                                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                                />
                            </div>

                            {/* Payment Remarks */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                    Transaction Ref / Note
                                </label>
                                <input
                                    type="text"
                                    value={paymentRemarks}
                                    onChange={(e) => setPaymentRemarks(e.target.value)}
                                    placeholder="e.g. Counter Cash Release / UTR"
                                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                                />
                            </div>
                        </div>

                        {/* General Notes */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                Remarks &amp; Identification Notes
                            </label>
                            <input
                                type="text"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Counter verified. 42 mani & 1 pendal intact."
                                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                            />
                        </div>
                    </div>

                    {/* Right: Borrower Signature Pad (5 Cols) */}
                    <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200/90 shadow-xs p-5 sm:p-6 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-gray-900 tracking-tight">Borrower Digital Signature</h2>
                                        <p className="text-xs text-gray-400">Stylus, touchscreen, or mouse</p>
                                    </div>
                                </div>
                                <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    Pledge Agreement
                                </span>
                            </div>

                            <SignaturePad
                                value={customerSignatureUrl}
                                onChange={setCustomerSignatureUrl}
                                label="Borrower Pledge Signature"
                                height={130}
                            />
                        </div>

                        <p className="text-[11px] text-gray-400 mt-2">
                            This signature is embedded directly onto Page 1 of the official A4 Pledge Agreement Document.
                        </p>
                    </div>
                </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                STICKY BOTTOM ACTION BAR (MODERN FLOATING DOCK)
            ───────────────────────────────────────────────────────────── */}
            <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-200 py-3.5 px-6 shadow-xl">
                <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-5 text-xs font-mono">
                        <div>
                            <span className="text-[10px] text-gray-400 block uppercase font-sans">Borrower:</span>
                            <span className="font-bold text-gray-900">
                                {selectedCustomer ? selectedCustomer.fullName : 'None Selected'}
                            </span>
                        </div>
                        <div className="h-7 w-px bg-gray-200 hidden sm:block" />
                        <div>
                            <span className="text-[10px] text-gray-400 block uppercase font-sans">Total Net Gold:</span>
                            <span className="font-bold text-gray-900">{totals.totalNet.toFixed(3)} g</span>
                        </div>
                        <div className="h-7 w-px bg-gray-200 hidden sm:block" />
                        <div>
                            <span className="text-[10px] text-gray-400 block uppercase font-sans">Valuation:</span>
                            <span className="font-bold text-gray-900">{fmtINR(totals.totalValuation)}</span>
                        </div>
                        <div className="h-7 w-px bg-gray-200 hidden sm:block" />
                        <div>
                            <span className="text-[10px] text-emerald-700 block uppercase font-sans font-bold">Net Cash Disbursed:</span>
                            <span className="text-base font-extrabold text-emerald-700">
                                {fmtINR(netCashToDisburse)}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleResetForm}
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition shadow-xs disabled:opacity-50"
                        >
                            Reset
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmitLoan}
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold transition shadow-sm disabled:opacity-50 active:scale-98"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Processing Loan Disburse…</span>
                                </>
                            ) : (
                                <>
                                    <Printer className="w-4 h-4" />
                                    <span>Disburse Loan &amp; Print Pledge Document</span>
                                </>
                            )}
                        </button>
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
                    title="Capture Borrower Portrait"
                    subtitle="Take webcam snapshot or upload photo file"
                />
            )}
        </div>
    );
}

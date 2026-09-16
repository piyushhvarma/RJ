'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Coins,
    RefreshCw,
    Camera,
    CheckCircle2,
    Printer,
    ArrowRight,
    ShieldCheck,
    AlertTriangle,
    X,
    FileText,
    Sparkles,
    Calendar,
    User,
    ChevronRight,
} from 'lucide-react';
import { getSettlementQuote } from '@/lib/api/interest';
import { topupLoan, type TopUpMode, type TopUpResponse } from '@/lib/api/loans';
import { getRenewalReceiptPdfUrl } from '@/lib/api/documents';
import { PhotoCaptureModal } from '@/components/shared/PhotoCaptureModal';
import { SignaturePad } from '@/components/shared/SignaturePad';

interface TopUpRenewalModalProps {
    isOpen: boolean;
    onClose: () => void;
    loan: any;
    onSuccess?: () => void;
}

function fmt(n?: number | null) {
    if (n == null) return '—';
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export function TopUpRenewalModal({
    isOpen,
    onClose,
    loan,
    onSuccess,
}: TopUpRenewalModalProps) {
    const qc = useQueryClient();

    // 1. Fetch live settlement quote for exact accrued interest
    const { data: quote, isLoading: isQuoteLoading } = useQuery({
        queryKey: ['settlement-quote', loan?.id],
        queryFn: () => getSettlementQuote(loan.id),
        enabled: isOpen && !!loan?.id,
    });

    // Core Form States
    const [mode, setMode] = useState<TopUpMode>('RENEW_WITH_INTEREST_DEDUCTED');
    const [topupAmount, setTopupAmount] = useState<number>(2000);
    const [netInHand, setNetInHand] = useState<number>(1100);
    const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER'>('CASH');
    const [notes, setNotes] = useState<string>('');

    // Verification States
    const [customerPhoto, setCustomerPhoto] = useState<string | null>(loan?.customer?.photoUrl || null);
    const [customerSignature, setCustomerSignature] = useState<string | null>(null);
    const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

    // Completed Transaction Result
    const [completedResult, setCompletedResult] = useState<TopUpResponse | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Current Financials
    const currentPrincipal = loan?.principalAmount || 0;
    const interestAccrued = quote?.interestDue ?? Math.round(currentPrincipal * 0.03 * 3); // fallback 3 months @ 3%
    const monthlyRate = quote?.monthlyInterestRate ?? (loan?.interestRate ? loan.interestRate / 12 : 3);

    // Collateral Valuation & LTV Headroom Check
    const totalValuation = useMemo(() => {
        return (loan?.jewelleryItems || []).reduce((acc: number, item: any) => acc + (item.valuation || 0), 0);
    }, [loan]);

    const maxLtvAmount = totalValuation > 0 ? Math.round(totalValuation * 0.75) : currentPrincipal * 1.5;
    const newPrincipal = currentPrincipal + (topupAmount || 0);
    const isLtvExceeded = totalValuation > 0 && newPrincipal > maxLtvAmount;

    // Synchronize Topup and Net in Hand based on mode
    const handleTopupChange = (val: number) => {
        setTopupAmount(val);
        if (mode === 'RENEW_WITH_INTEREST_DEDUCTED') {
            setNetInHand(Math.max(0, val - interestAccrued));
        } else {
            setNetInHand(val);
        }
    };

    const handleNetInHandChange = (val: number) => {
        setNetInHand(val);
        if (mode === 'RENEW_WITH_INTEREST_DEDUCTED') {
            setTopupAmount(val + interestAccrued);
        } else {
            setTopupAmount(val);
        }
    };

    const handleModeSwitch = (newMode: TopUpMode) => {
        setMode(newMode);
        if (newMode === 'RENEW_WITH_INTEREST_DEDUCTED') {
            setNetInHand(Math.max(0, topupAmount - interestAccrued));
        } else {
            setNetInHand(topupAmount);
        }
    };

    // Auto-align when quote loads
    useEffect(() => {
        if (quote?.interestDue != null) {
            if (mode === 'RENEW_WITH_INTEREST_DEDUCTED') {
                setNetInHand(Math.max(0, topupAmount - quote.interestDue));
            }
        }
    }, [quote?.interestDue, mode]);

    // Mutation
    const mutation = useMutation({
        mutationFn: () =>
            topupLoan(loan.id, {
                mode,
                topupAmount,
                interestDeducted: mode === 'RENEW_WITH_INTEREST_DEDUCTED' ? interestAccrued : 0,
                netDisbursed: netInHand,
                paymentMode,
                notes,
                customerPhotoUrl: customerPhoto || undefined,
                customerSignatureUrl: customerSignature || undefined,
            }),
        onSuccess: (res) => {
            setCompletedResult(res);
            qc.invalidateQueries({ queryKey: ['loan', loan.id] });
            qc.invalidateQueries({ queryKey: ['loans'] });
            qc.invalidateQueries({ queryKey: ['settlement-quote', loan.id] });
            onSuccess?.();
        },
        onError: (err: any) => {
            setErrorMsg(err.message || 'Failed to process top-up / renewal');
        },
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
            <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden my-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 px-6 py-4 text-white">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
                            <Coins className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Top-Up & Loan Renewal Counter</h2>
                            <p className="text-xs text-amber-100">
                                {loan?.loanCode} · {loan?.customer?.fullName} ({loan?.customer?.mobile || 'No Mobile'})
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 max-h-[82vh] overflow-y-auto space-y-6">
                    {completedResult ? (
                        /* SUCCESS STATE */
                        <div className="py-6 text-center space-y-5">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                                <CheckCircle2 className="h-10 w-10" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">
                                    {completedResult.summary.mode === 'RENEW_WITH_INTEREST_DEDUCTED'
                                        ? 'Loan Successfully Renewed with Top-Up!'
                                        : 'Direct Top-Up Disbursed Successfully!'}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Disbursement and ledger entries recorded. Collateral remains pledged in vault.
                                </p>
                            </div>

                            {/* Summary Receipt Box */}
                            <div className="mx-auto max-w-lg rounded-xl border border-gray-200 bg-gray-50 p-4 text-left space-y-2.5 text-sm">
                                <div className="flex justify-between text-gray-600">
                                    <span>Previous Principal:</span>
                                    <span className="font-semibold text-gray-900">{fmt(completedResult.summary.previousPrincipal)}</span>
                                </div>
                                <div className="flex justify-between text-green-700">
                                    <span>Top-Up Added:</span>
                                    <span className="font-semibold">+{fmt(completedResult.summary.topupAmount)}</span>
                                </div>
                                {completedResult.summary.interestDeducted > 0 && (
                                    <div className="flex justify-between text-amber-700">
                                        <span>Interest Deducted (Cleared):</span>
                                        <span className="font-semibold">-{fmt(completedResult.summary.interestDeducted)}</span>
                                    </div>
                                )}
                                <div className="border-t border-gray-200 pt-2 flex justify-between text-blue-700 font-bold">
                                    <span>Net Cash Handed to Customer:</span>
                                    <span className="text-base">{fmt(completedResult.summary.netDisbursed)}</span>
                                </div>
                                <div className="flex justify-between text-gray-900 font-bold">
                                    <span>New Principal Balance:</span>
                                    <span className="text-base">{fmt(completedResult.summary.newPrincipal)}</span>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500 pt-1 border-t border-gray-200">
                                    <span>Effective Loan Date:</span>
                                    <span>{new Date(completedResult.summary.sanctionedDate).toLocaleDateString('en-IN')}</span>
                                </div>
                            </div>

                            <div className="flex justify-center gap-3 pt-2">
                                <a
                                    href={getRenewalReceiptPdfUrl(loan.id)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 shadow-md transition-all"
                                >
                                    <Printer className="h-4 w-4" />
                                    Print Renewal Voucher (PDF)
                                </a>
                                <button
                                    onClick={onClose}
                                    className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Close & Return
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* INTERACTIVE FORM */
                        <>
                            {/* Top Collateral & Headroom Status */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                                <div>
                                    <span className="text-slate-500 block">Current Principal</span>
                                    <span className="text-sm font-bold text-slate-900">{fmt(currentPrincipal)}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">Accrued Interest</span>
                                    <span className="text-sm font-bold text-amber-700">
                                        {isQuoteLoading ? 'Calculating...' : fmt(interestAccrued)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">Gold Valuation</span>
                                    <span className="text-sm font-bold text-slate-900">{fmt(totalValuation)}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">Max Headroom (75% LTV)</span>
                                    <span className={`text-sm font-bold ${isLtvExceeded ? 'text-red-600' : 'text-emerald-700'}`}>
                                        {fmt(maxLtvAmount)}
                                    </span>
                                </div>
                            </div>

                            {/* Mode Selection Cards */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                    Select Proposal Mode
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Option 1: Renew with Top-Up */}
                                    <div
                                        onClick={() => handleModeSwitch('RENEW_WITH_INTEREST_DEDUCTED')}
                                        className={`cursor-pointer rounded-xl border-2 p-4 transition-all relative ${
                                            mode === 'RENEW_WITH_INTEREST_DEDUCTED'
                                                ? 'border-emerald-500 bg-emerald-50/60 shadow-md ring-2 ring-emerald-500/20'
                                                : 'border-gray-200 bg-white hover:border-emerald-300'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                                    <Sparkles className="w-3 h-3" />
                                                    Recommended
                                                </span>
                                                <h4 className="font-bold text-gray-900 mt-1">Option 1: Renew with Top-Up</h4>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    Deduct interest from top-up cash & reset loan date to Today.
                                                </p>
                                            </div>
                                            <div
                                                className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                                                    mode === 'RENEW_WITH_INTEREST_DEDUCTED'
                                                        ? 'border-emerald-600 bg-emerald-600 text-white'
                                                        : 'border-gray-300'
                                                }`}
                                            >
                                                {mode === 'RENEW_WITH_INTEREST_DEDUCTED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                            </div>
                                        </div>

                                        <div className="mt-3 pt-3 border-t border-emerald-200/60 grid grid-cols-3 gap-2 text-xs">
                                            <div>
                                                <span className="text-gray-500 block">Deduct Int.</span>
                                                <span className="font-bold text-red-600">-{fmt(interestAccrued)}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 block">Hand Over</span>
                                                <span className="font-bold text-emerald-700">
                                                    {fmt(Math.max(0, topupAmount - interestAccrued))}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 block">New Date</span>
                                                <span className="font-bold text-gray-900">TODAY</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Option 2: Direct Top-Up */}
                                    <div
                                        onClick={() => handleModeSwitch('DIRECT_TOPUP')}
                                        className={`cursor-pointer rounded-xl border-2 p-4 transition-all relative ${
                                            mode === 'DIRECT_TOPUP'
                                                ? 'border-amber-500 bg-amber-50/60 shadow-md ring-2 ring-amber-500/20'
                                                : 'border-gray-200 bg-white hover:border-amber-300'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                                    Urgent / Known Customer
                                                </span>
                                                <h4 className="font-bold text-gray-900 mt-1">Option 2: Direct Top-Up</h4>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    Hand over full cash & retain the original pledge start date.
                                                </p>
                                            </div>
                                            <div
                                                className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                                                    mode === 'DIRECT_TOPUP'
                                                        ? 'border-amber-600 bg-amber-600 text-white'
                                                        : 'border-gray-300'
                                                }`}
                                            >
                                                {mode === 'DIRECT_TOPUP' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                            </div>
                                        </div>

                                        <div className="mt-3 pt-3 border-t border-amber-200/60 grid grid-cols-3 gap-2 text-xs">
                                            <div>
                                                <span className="text-gray-500 block">Deduct Int.</span>
                                                <span className="font-bold text-gray-500">₹0 (None)</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 block">Hand Over</span>
                                                <span className="font-bold text-amber-700">{fmt(topupAmount)}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 block">Loan Date</span>
                                                <span className="font-bold text-gray-900">ORIGINAL</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Dual Smart Calculator Inputs */}
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                    <Coins className="w-4 h-4 text-amber-600" />
                                    Interactive Counter Calculator
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Input 1: Top-Up Amount */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Top-Up Amount to Add (₹)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-2.5 text-gray-400 font-semibold">₹</span>
                                            <input
                                                type="number"
                                                min={100}
                                                step={100}
                                                value={topupAmount || ''}
                                                onChange={(e) => handleTopupChange(Number(e.target.value))}
                                                className="w-full rounded-lg border border-gray-300 pl-8 pr-3.5 py-2 text-base font-bold text-gray-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                                placeholder="e.g. 2000"
                                            />
                                        </div>
                                        <span className="text-[11px] text-gray-500 mt-1 block">
                                            Principal increases to {fmt(newPrincipal)}
                                        </span>
                                    </div>

                                    {/* Input 2: Net Cash Customer Receives */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Customer Wants in Hand (Net Cash ₹)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-2.5 text-gray-400 font-semibold">₹</span>
                                            <input
                                                type="number"
                                                min={100}
                                                step={100}
                                                value={netInHand || ''}
                                                onChange={(e) => handleNetInHandChange(Number(e.target.value))}
                                                className="w-full rounded-lg border border-gray-300 pl-8 pr-3.5 py-2 text-base font-bold text-emerald-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                                placeholder="e.g. 1100 or 2100"
                                            />
                                        </div>
                                        <span className="text-[11px] text-gray-500 mt-1 block">
                                            {mode === 'RENEW_WITH_INTEREST_DEDUCTED'
                                                ? `Auto-adds ${fmt(interestAccrued)} interest to compute required top-up`
                                                : 'Equal to full top-up disbursement'}
                                        </span>
                                    </div>
                                </div>

                                {isLtvExceeded && (
                                    <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800">
                                        <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                                        <span>
                                            <strong>LTV Warning:</strong> New principal ({fmt(newPrincipal)}) exceeds 75%
                                            collateral valuation limit ({fmt(maxLtvAmount)}). Manager authorization will be logged.
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Customer Verification: Photo & Signature */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Photo Box */}
                                <div className="rounded-xl border border-gray-200 p-4 space-y-2.5 bg-white">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                                            <Camera className="w-3.5 h-3.5 text-amber-600" />
                                            Live Customer Photo
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setIsPhotoModalOpen(true)}
                                            className="text-xs font-medium text-amber-600 hover:text-amber-700 underline"
                                        >
                                            {customerPhoto ? 'Retake Photo' : 'Capture Webcam'}
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {customerPhoto ? (
                                            <div className="relative h-20 w-20 rounded-lg overflow-hidden border border-gray-200 shadow-sm flex-shrink-0">
                                                <img
                                                    src={customerPhoto}
                                                    alt="Customer"
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div
                                                onClick={() => setIsPhotoModalOpen(true)}
                                                className="h-20 w-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-amber-400 hover:bg-amber-50/50 transition-colors flex-shrink-0"
                                            >
                                                <Camera className="w-5 h-5 text-gray-400" />
                                                <span className="text-[10px] text-gray-400 mt-1">Capture</span>
                                            </div>
                                        )}
                                        <div className="text-xs text-gray-500">
                                            <p className="font-medium text-gray-800">{loan?.customer?.fullName}</p>
                                            <p className="text-[11px]">Webcam snapshot verified at counter for loan renewal.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Signature Pad */}
                                <div className="rounded-xl border border-gray-200 p-4 bg-white">
                                    <SignaturePad
                                        value={customerSignature}
                                        onChange={setCustomerSignature}
                                        label="Customer Digital Signature"
                                        height={90}
                                    />
                                </div>
                            </div>

                            {/* Payment Mode & Notes */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Disbursement Payment Mode
                                    </label>
                                    <select
                                        value={paymentMode}
                                        onChange={(e: any) => setPaymentMode(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-amber-500 focus:outline-none"
                                    >
                                        <option value="CASH">Cash (Hand-to-Hand)</option>
                                        <option value="UPI">UPI / Instant Transfer</option>
                                        <option value="BANK_TRANSFER">Bank NEFT/RTGS</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Counter Notes / Reason (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="e.g. Urgent customer requirement, known to owner"
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-amber-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {errorMsg && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                                    {errorMsg}
                                </div>
                            )}

                            {/* Action Footer */}
                            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                                <div className="text-xs text-gray-600">
                                    Total to Disburse:{' '}
                                    <strong className="text-base text-emerald-700 ml-1">{fmt(netInHand)}</strong>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        disabled={mutation.isPending || topupAmount <= 0}
                                        onClick={() => mutation.mutate()}
                                        className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-amber-700 disabled:opacity-50 transition-all"
                                    >
                                        {mutation.isPending ? (
                                            <>
                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <Coins className="h-4 w-4" />
                                                Confirm & Disburse {fmt(netInHand)}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Live Camera Modal */}
            <PhotoCaptureModal
                isOpen={isPhotoModalOpen}
                onClose={() => setIsPhotoModalOpen(false)}
                onConfirm={(dataUrl) => {
                    setCustomerPhoto(dataUrl);
                    setIsPhotoModalOpen(false);
                }}
                title="Capture Customer Photo for Renewal"
                subtitle="Position the customer in front of the camera and click capture."
            />
        </div>
    );
}

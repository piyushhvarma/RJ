'use client';

/**
 * 9-step loan closure wizard.
 * Each step gates on the previous completing successfully.
 * Distinct amber/red visual treatment per FRONTEND_PRD.md §82.
 *
 * NOTE: This is provisional — the backend has no single closure-orchestration
 * endpoint yet. Each step calls individual existing endpoints. This wizard's
 * step-gating enforces the sequence client-side only and will need rework
 * once the backend closure orchestration module is built.
 */

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLoan, getClosureChecklist, closeLoan } from '@/lib/api/loans';
import { verifyBiometric, biometricFallback } from '@/lib/api/biometric';
import { createPayment } from '@/lib/api/payments';
import { retrievePacket, releasePacket } from '@/lib/api/packets';
import { createPaymentSchema, type CreatePaymentDto } from '@/lib/schemas';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RoleGate } from '@/components/shared/RoleGate';
import { ArrowLeft, Shield, AlertTriangle, Check, Printer, FileCheck2, Calculator, Sparkles, Lock, ShieldCheck, CheckCircle2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { getClosureReceiptPdfUrl } from '@/lib/api/documents';
import { getSettlementQuote } from '@/lib/api/interest';

type Step =
    | 'identify'
    | 'verify_customer'
    | 'fingerprint'
    | 'payment'
    | 'retrieve'
    | 'jewellery'
    | 'release'
    | 'acknowledgement'
    | 'closed';

const STEP_LABELS: Record<Step, string> = {
    identify: '1. Loan Identification',
    verify_customer: '2. Customer Verification',
    fingerprint: '3. Fingerprint Verification',
    payment: '4. Final Settlement',
    retrieve: '5. Packet Retrieval',
    jewellery: '6. Jewellery Verification',
    release: '7. Gold Release',
    acknowledgement: '8. Customer Acknowledgement',
    closed: '9. Loan Closed',
};

const STEP_ORDER: Step[] = [
    'identify', 'verify_customer', 'fingerprint', 'payment',
    'retrieve', 'jewellery', 'release', 'acknowledgement', 'closed',
];

const inputCls = 'w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-50';

function fmt(n?: number | null) {
    if (n == null) return '—';
    return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function StepSidebar({ current }: { current: Step }) {
    const currentIdx = STEP_ORDER.indexOf(current);
    return (
        <div className="w-56 flex-shrink-0">
            <div className="space-y-1">
                {STEP_ORDER.map((step, i) => {
                    const done = i < currentIdx;
                    const active = step === current;
                    return (
                        <div key={step} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs ${active ? 'bg-amber-100 text-amber-800 font-semibold'
                                : done ? 'text-green-700'
                                    : 'text-gray-400'
                            }`}>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${active ? 'bg-amber-500 text-white'
                                    : done ? 'bg-green-500 text-white'
                                        : 'bg-gray-200 text-gray-400'
                                }`}>
                                {done ? <Check className="w-2.5 h-2.5" /> : <span className="text-[10px]">{i + 1}</span>}
                            </div>
                            {STEP_LABELS[step].replace(/^\d+\. /, '')}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function ClosureWizardPage({ params }: { params: Promise<{ loanId: string }> }) {
    const { loanId } = use(params);
    const qc = useQueryClient();
    const [step, setStep] = useState<Step>('identify');
    const [bioResult, setBioResult] = useState<string | null>(null);
    const [bioFallback, setBioFallback] = useState(false);
    const [closureNotes, setClosureNotes] = useState('');
    const [isClosing, setIsClosing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { data: loan, isLoading } = useQuery({
        queryKey: ['loan', loanId],
        queryFn: () => getLoan(loanId),
    });

    const { data: checklist, refetch: refetchChecklist } = useQuery({
        queryKey: ['closure-checklist', loanId],
        queryFn: () => getClosureChecklist(loanId),
        enabled: !!loanId,
    });

    const outstanding = loan?.ledgerEntries?.length
        ? loan.ledgerEntries[loan.ledgerEntries.length - 1].balanceAfter
        : loan?.principalAmount ?? 0;

    const {
        register, handleSubmit, control, setValue,
        formState: { isSubmitting: paymentSubmitting },
    } = useForm<CreatePaymentDto>({
        resolver: zodResolver(createPaymentSchema),
        defaultValues: { loanId, principalComponent: 0, interestComponent: 0, penaltyComponent: 0, otherCharges: 0 },
    });

    const { data: quote } = useQuery({
        queryKey: ['settlement-quote', loanId],
        queryFn: () => getSettlementQuote(loanId),
        enabled: !!loanId,
    });

    const fillSettlementValues = () => {
        if (!quote) return;
        setValue('amount', quote.totalDue, { shouldValidate: true });
        setValue('principalComponent', quote.principalOutstanding, { shouldValidate: true });
        setValue('interestComponent', quote.interestDue, { shouldValidate: true });
        setValue('penaltyComponent', quote.penaltyDue, { shouldValidate: true });
        setValue('otherCharges', quote.otherChargesDue, { shouldValidate: true });
    };

    const [payAmt, payPrincipal, payInterest, payPenalty, payOther] = useWatch({
        control,
        name: ['amount', 'principalComponent', 'interestComponent', 'penaltyComponent', 'otherCharges'],
    });
    const componentSum = (payPrincipal ?? 0) + (payInterest ?? 0) + (payPenalty ?? 0) + (payOther ?? 0);
    const sumOk = payAmt ? Math.abs(componentSum - payAmt) < 0.01 : false;

    async function advance() {
        refetchChecklist();
        setStep(s => STEP_ORDER[STEP_ORDER.indexOf(s) + 1] as Step);
    }
    async function doVerify() {
        setError(null);
        if (!loan?.customer?.id) return;
        try {
            const r = await verifyBiometric(loan.customer.id, loanId);
            setBioResult(r.result);
            refetchChecklist();
            if (r.result === 'MATCH') { setTimeout(advance, 1000); }
        } catch (e: any) { setError(e.message); }
    }

    async function doRetrieve() {
        setError(null);
        if (!loan?.packet?.id) return;
        try {
            await retrievePacket(loan.packet.id, 'Loan closure — packet retrieved for release');
            await Promise.all([
                qc.invalidateQueries({ queryKey: ['loan', loanId] }),
                qc.invalidateQueries({ queryKey: ['closure-checklist', loanId] }),
            ]);
            advance();
        } catch (e: any) { setError(e.message); }
    }

    async function doRelease() {
        setError(null);
        setIsClosing(true);
        try {
            await closeLoan(loanId, {
                verifiedJewelleryCount: true,
                notes: closureNotes || 'Full loan closure and physical gold handover to borrower',
                biometricOverrideReason: bioFallback ? 'Authorized manager manual override' : undefined,
            });
            await Promise.all([
                qc.invalidateQueries({ queryKey: ['loan', loanId] }),
                qc.invalidateQueries({ queryKey: ['closure-checklist', loanId] }),
            ]);
            advance();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsClosing(false);
        }
    }

    if (isLoading) {
        return <div className="p-8"><div className="h-64 bg-gray-100 rounded-xl animate-pulse" /></div>;
    }

    if (!loan) {
        return <div className="p-8 text-sm text-red-700">Loan not found.</div>;
    }

    return (
        <div className="p-8 max-w-5xl mx-auto">
            {/* Warning header */}
            <div className="rounded-xl bg-amber-600 text-white px-6 py-4 mb-6 flex items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6 flex-shrink-0 text-amber-200" />
                    <div>
                        <p className="font-bold flex items-center gap-2">
                            <span>LOAN CLOSURE & GOLD RELEASE WORKFLOW</span>
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-700/80 text-amber-100 uppercase tracking-wider">
                                High Risk
                            </span>
                        </p>
                        <p className="text-xs text-amber-100 mt-0.5">
                            Server-enforced closure transaction: validates zero financial debt, vault packet retrieval, customer biometric verification, and physical jewellery verification.
                        </p>
                    </div>
                </div>
                {checklist && (
                    <div className="hidden sm:flex items-center gap-2 text-xs">
                        <span className={`px-2.5 py-1 rounded-full font-semibold border ${
                            checklist.isSettled ? 'bg-emerald-500/20 border-emerald-300 text-emerald-100' : 'bg-rose-500/20 border-rose-300 text-rose-100'
                        }`}>
                            {checklist.isSettled ? '✓ Zero Balance' : `Debt: ₹${checklist.outstandingPrincipal.toLocaleString('en-IN')}`}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full font-semibold border ${
                            checklist.packetRetrieved ? 'bg-emerald-500/20 border-emerald-300 text-emerald-100' : 'bg-amber-500/20 border-amber-300 text-amber-100'
                        }`}>
                            {checklist.packetRetrieved ? '✓ Retrieved from Safe' : checklist.packetStatus}
                        </span>
                    </div>
                )}
            </div>

            <Link href={`/loans/${loanId}`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                Back to Loan
            </Link>

            <div className="flex gap-8">
                <StepSidebar current={step} />

                <div className="flex-1 bg-white rounded-xl border border-amber-200 p-6 space-y-5">
                    {/* Step content */}

                    {/* Step 1: Identify */}
                    {step === 'identify' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-gray-900">Loan Identification</h2>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    ['Loan Code', loan.loanCode],
                                    ['Customer', loan.customer?.fullName],
                                    ['Mobile', loan.customer?.mobile],
                                    ['Status', loan.status],
                                    ['Original Principal', fmt(loan.principalAmount)],
                                    ['Outstanding', fmt(outstanding)],
                                    ['Maturity Date', loan.maturityDate ? format(new Date(loan.maturityDate), 'd MMM yyyy') : '—'],
                                    ['Packet', loan.packet?.packetCode ?? 'No packet'],
                                ].map(([label, value]) => (
                                    <div key={label} className="rounded-lg bg-gray-50 px-4 py-3">
                                        <p className="text-xs text-gray-500">{label}</p>
                                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
                                    </div>
                                ))}
                            </div>
                            {loan.status !== 'ACTIVE' && loan.status !== 'OVERDUE' && (
                                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-700">This loan is in status {loan.status} — it may not be eligible for closure. Verify before proceeding.</p>
                                </div>
                            )}
                            <button onClick={advance} className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors">
                                Confirm Loan Identified →
                            </button>
                        </div>
                    )}

                    {/* Step 2: Customer verification */}
                    {step === 'verify_customer' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-gray-900">Customer Verification</h2>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    ['Name', loan.customer?.fullName],
                                    ['Mobile', loan.customer?.mobile],
                                    ['Customer Code', loan.customer?.customerCode],
                                    ['KYC Status', loan.customer?.kycStatus],
                                    ['Biometric', loan.customer?.biometricStatus],
                                ].map(([label, value]) => (
                                    <div key={label} className="rounded-lg bg-gray-50 px-4 py-3">
                                        <p className="text-xs text-gray-500">{label}</p>
                                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{value ?? '—'}</p>
                                    </div>
                                ))}
                            </div>
                            <p className="text-sm text-gray-600">
                                Verify that the person standing in front of you matches the details above. Check a valid photo ID.
                            </p>
                            <button onClick={advance} className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors">
                                Customer Identity Confirmed →
                            </button>
                        </div>
                    )}

                    {/* Step 3: Fingerprint */}
                    {step === 'fingerprint' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-gray-900">Fingerprint Verification</h2>
                            {bioResult && (
                                <div className={`rounded-xl border px-5 py-4 ${bioResult === 'MATCH' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                                    }`}>
                                    <p className={`text-sm font-bold ${bioResult === 'MATCH' ? 'text-green-800' : 'text-red-800'}`}>
                                        {bioResult === 'MATCH' ? '✓ Fingerprint Match — proceeding' : `✗ Result: ${bioResult}`}
                                    </p>
                                </div>
                            )}
                            {error && !bioFallback && (
                                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            )}
                            {loan.customer?.biometricStatus !== 'ENROLLED' && (
                                <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
                                    ⚠ Customer is not enrolled for biometric. Use authorized fallback.
                                </div>
                            )}

                            {!bioFallback && (
                                <div className="flex gap-3">
                                    <button
                                        onClick={doVerify}
                                        disabled={loan.customer?.biometricStatus !== 'ENROLLED'}
                                        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                    >
                                        Scan Fingerprint
                                    </button>
                                    <RoleGate roles={['OWNER', 'MANAGER']}>
                                        <button onClick={() => setBioFallback(true)}
                                            className="rounded-lg border border-amber-400 px-4 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-50 transition-colors">
                                            Use Authorized Fallback
                                        </button>
                                    </RoleGate>
                                </div>
                            )}

                            {bioFallback && (
                                <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-5">
                                    <p className="text-sm font-semibold text-amber-800">Authorized Manual Override</p>
                                    <p className="text-xs text-amber-700">
                                        Fingerprint verification failed 3 times or device unavailable. A second authorized person must approve this override.
                                        This will be recorded in the audit log.
                                    </p>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason for override *</label>
                                        <input type="text" id="fallback-reason" className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Authorizing Manager User ID *</label>
                                        <input type="text" id="fallback-approver" className={inputCls} />
                                    </div>
                                    <button
                                        onClick={async () => {
                                            const reason = (document.getElementById('fallback-reason') as HTMLInputElement)?.value;
                                            const approvedById = (document.getElementById('fallback-approver') as HTMLInputElement)?.value;
                                            if (!reason || !approvedById || !loan.customer?.id) return;
                                            setError(null);
                                            try {
                                                await biometricFallback(loan.customer.id, { reason, approvedById, loanId });
                                                advance();
                                            } catch (e: any) { setError(e.message); }
                                        }}
                                        className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 transition-colors"
                                    >
                                        Submit Override & Continue
                                    </button>
                                    {error && <p className="text-sm text-red-700">{error}</p>}
                                </div>
                            )}

                            {bioResult === 'MATCH' && (
                                <button onClick={advance} className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors">
                                    Continue →
                                </button>
                            )}
                        </div>
                    )}

                    {/* Step 4: Payment */}
                    {step === 'payment' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-gray-900">Final Settlement</h2>
                                {quote && (
                                    <button
                                        type="button"
                                        onClick={fillSettlementValues}
                                        className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 shadow-2xs transition-colors inline-flex items-center gap-1.5"
                                    >
                                        <Sparkles className="w-3.5 h-3.5" />
                                        Auto-Fill Full Payoff ({fmt(quote.totalDue)})
                                    </button>
                                )}
                            </div>

                            <div className="rounded-xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white border border-amber-200 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Calculator className="w-4 h-4 text-amber-700" />
                                    <span className="text-xs font-bold text-gray-900">Calculated Payoff Quote (Reducing Balance)</span>
                                    {quote && (
                                        <span className="text-[11px] text-gray-500">
                                            · {quote.daysElapsed} days active · {quote.interestRate}% p.a.
                                            {quote.isOverdue && <span className="text-red-600 font-bold ml-1">({quote.overdueDays}d overdue)</span>}
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                    <div className="bg-white rounded-lg p-2.5 border border-amber-100 shadow-2xs">
                                        <p className="text-gray-500 text-[11px]">Principal</p>
                                        <p className="font-bold text-gray-900 mt-0.5">{fmt(quote?.principalOutstanding ?? outstanding)}</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-2.5 border border-amber-100 shadow-2xs">
                                        <p className="text-gray-500 text-[11px]">Accrued Interest</p>
                                        <p className="font-bold text-amber-700 mt-0.5">{fmt(quote?.interestDue ?? 0)}</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-2.5 border border-amber-100 shadow-2xs">
                                        <p className="text-gray-500 text-[11px]">Overdue Penalty</p>
                                        <p className={`font-bold mt-0.5 ${(quote?.penaltyDue ?? 0) > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                            {fmt(quote?.penaltyDue ?? 0)}
                                        </p>
                                    </div>
                                    <div className="bg-amber-600 text-white rounded-lg p-2.5 shadow-xs">
                                        <p className="text-amber-100 text-[11px] font-medium">Total Settlement</p>
                                        <p className="font-extrabold text-sm mt-0.5">{fmt(quote?.totalDue ?? outstanding)}</p>
                                    </div>
                                </div>
                            </div>

                            <form
                                onSubmit={handleSubmit(async (data) => {
                                    setError(null);
                                    try {
                                        await createPayment(data as Record<string, unknown>);
                                        qc.invalidateQueries({ queryKey: ['loan', loanId] });
                                        advance();
                                    } catch (e: any) { setError(e.message); }
                                })}
                                className="space-y-4"
                            >
                                <input type="hidden" {...register('loanId')} value={loanId} />
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (₹) *</label>
                                        <input type="number" step="0.01" className={inputCls} {...register('amount', { valueAsNumber: true })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Mode *</label>
                                        <select className={inputCls} {...register('mode')}>
                                            <option value="">Select…</option>
                                            <option value="CASH">Cash</option>
                                            <option value="UPI">UPI</option>
                                            <option value="BANK_TRANSFER">Bank Transfer</option>
                                            <option value="OTHER">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Principal Component (₹)</label>
                                        <input type="number" step="0.01" defaultValue={0} className={inputCls} {...register('principalComponent', { valueAsNumber: true })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Interest Component (₹)</label>
                                        <input type="number" step="0.01" defaultValue={0} className={inputCls} {...register('interestComponent', { valueAsNumber: true })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Penalty Component (₹)</label>
                                        <input type="number" step="0.01" defaultValue={0} className={inputCls} {...register('penaltyComponent', { valueAsNumber: true })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Other Charges (₹)</label>
                                        <input type="number" step="0.01" defaultValue={0} className={inputCls} {...register('otherCharges', { valueAsNumber: true })} />
                                    </div>
                                </div>

                                <div className={`rounded-lg px-4 py-2 border text-sm ${!payAmt ? 'bg-gray-50 border-gray-200'
                                        : sumOk ? 'bg-green-50 border-green-200 text-green-700'
                                            : 'bg-red-50 border-red-200 text-red-700'
                                    }`}>
                                    Component total: {fmt(componentSum)}
                                    {payAmt && !sumOk && ` — must equal ${fmt(payAmt)}`}
                                    {payAmt && sumOk && ' ✓'}
                                </div>

                                {error && <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

                                <button type="submit" disabled={paymentSubmitting || (!!payAmt && !sumOk)}
                                    className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
                                    {paymentSubmitting ? 'Recording…' : 'Record Payment & Continue →'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Step 5: Retrieve packet */}
                    {step === 'retrieve' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-gray-900">Packet Retrieval</h2>
                            {loan.packet ? (
                                <>
                                    <div className="rounded-lg bg-gray-50 border border-gray-200 px-5 py-4 space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500">Packet</span>
                                            <span className="text-sm font-semibold">{loan.packet.packetCode}</span>
                                        </div>
                                        {loan.packet.storageLocation && (
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">Location</span>
                                                <span className="text-sm font-mono font-semibold">{loan.packet.storageLocation.label}</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-700">
                                        Physically retrieve the packet from the storage location above before clicking below.
                                    </p>
                                    <RoleGate roles={['OWNER', 'MANAGER']} fallback={
                                        <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">Only Manager or Owner can retrieve a packet.</p>
                                    }>
                                        <button onClick={doRetrieve}
                                            className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 transition-colors">
                                            Confirm Packet Retrieved →
                                        </button>
                                    </RoleGate>
                                </>
                            ) : (
                                <p className="text-sm text-red-700">No packet found for this loan. Cannot proceed with retrieval.</p>
                            )}
                            {error && <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
                        </div>
                    )}

                    {/* Step 6: Jewellery verification */}
                    {step === 'jewellery' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-gray-900">Jewellery Verification</h2>
                            <p className="text-sm text-gray-700 font-medium">
                                Compare the items listed below against what is physically inside the packet:
                            </p>
                            {loan.jewelleryItems?.map((item, i) => (
                                <div key={item.id} className="rounded-xl border border-gray-200 px-5 py-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{i + 1}. {item.category}</p>
                                            <p className="text-sm text-gray-600 mt-0.5">{item.description}</p>
                                            <p className="text-xs text-gray-500 mt-1">{item.itemCode}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-gray-900">{item.netWeight}g net</p>
                                            <p className="text-xs text-gray-500">{item.purityKarat} · {item.grossWeight}g gross</p>
                                        </div>
                                    </div>
                                    {item.identifyingMarks && (
                                        <p className="text-xs text-gray-600 mt-2 italic">Marks: {item.identifyingMarks}</p>
                                    )}
                                </div>
                            ))}
                            <div className="rounded-xl bg-amber-50 border-2 border-amber-300 p-4">
                                <p className="text-sm font-bold text-amber-900">
                                    ⚠ Physical check required before proceeding
                                </p>
                                <p className="text-sm text-amber-800 mt-1">
                                    Count: {loan.jewelleryItems?.length ?? 0} item(s) ·
                                    Total net weight: {loan.jewelleryItems?.reduce((s, i) => s + i.netWeight, 0).toFixed(2) ?? '0'}g
                                </p>
                            </div>
                            <button onClick={advance}
                                className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors">
                                All Items Verified — Match Confirmed →
                            </button>
                        </div>
                    )}

                    {/* Step 7: Gold release */}
                    {step === 'release' && (
                        <div className="space-y-5">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-amber-600" />
                                    <span>Gold Release & Permanent Loan Closure</span>
                                </h2>
                                <span className="text-xs font-mono bg-red-100 text-red-800 font-semibold px-2.5 py-1 rounded-full">
                                    Manager Sign-Off Required
                                </span>
                            </div>

                            {/* Pre-flight Audit Summary */}
                            <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 space-y-3">
                                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                    Pre-Flight Release Verification Checklist
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div className={`p-3 rounded-lg border flex items-center gap-2.5 ${
                                        checklist?.isSettled
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                            : 'bg-rose-50 border-rose-200 text-rose-900 font-semibold'
                                    }`}>
                                        <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${checklist?.isSettled ? 'text-emerald-600' : 'text-rose-600'}`} />
                                        <span>
                                            {checklist?.isSettled ? 'Zero Balance Confirmed (₹0 Debt)' : `Debt Outstanding: ₹${checklist?.outstandingPrincipal}`}
                                        </span>
                                    </div>

                                    <div className={`p-3 rounded-lg border flex items-center gap-2.5 ${
                                        checklist?.packetRetrieved
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                            : 'bg-amber-50 border-amber-200 text-amber-900 font-semibold'
                                    }`}>
                                        <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${checklist?.packetRetrieved ? 'text-emerald-600' : 'text-amber-600'}`} />
                                        <span>
                                            {checklist?.packetRetrieved ? 'Pouch Retrieved from Safe Vault' : `Pouch Status: ${checklist?.packetStatus}`}
                                        </span>
                                    </div>

                                    <div className={`p-3 rounded-lg border flex items-center gap-2.5 ${
                                        checklist?.biometricVerified || bioFallback
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                            : 'bg-rose-50 border-rose-200 text-rose-900 font-semibold'
                                    }`}>
                                        <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${checklist?.biometricVerified || bioFallback ? 'text-emerald-600' : 'text-rose-600'}`} />
                                        <span>
                                            {checklist?.biometricVerified ? 'Customer Biometric Matched' : bioFallback ? 'Manager Override Authorized' : 'Biometric Not Verified'}
                                        </span>
                                    </div>

                                    <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 flex items-center gap-2.5">
                                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                                        <span>
                                            Jewellery Verified ({loan.jewelleryItems?.length ?? 0} items · {loan.jewelleryItems?.reduce((s, i) => s + i.netWeight, 0).toFixed(2) ?? '0'}g net)
                                        </span>
                                    </div>
                                </div>

                                {checklist?.blockers && checklist.blockers.length > 0 && !checklist.isSettled && (
                                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                                        <p className="font-bold">Closure Blockers Detected:</p>
                                        <ul className="list-disc pl-4 space-y-0.5">
                                            {checklist.blockers.map((b, i) => (
                                                <li key={i}>{b}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            <div className="rounded-xl bg-amber-50 border-2 border-amber-300 p-4">
                                <p className="text-sm font-bold text-amber-900">⚠ Irreversible Production Action</p>
                                <p className="text-xs text-amber-800 mt-1">
                                    Clicking below permanently updates the database: <strong>Loan Status $\rightarrow$ CLOSED</strong>, <strong>Packet Status $\rightarrow$ RELEASED</strong>, and all pledged collateral items are marked released. Immutable audit log records will be posted.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                    Handover & Closure Notes (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={closureNotes}
                                    onChange={(e) => setClosureNotes(e.target.value)}
                                    placeholder="e.g. Pledged ornaments verified on scale, handed over in good condition"
                                    className={inputCls}
                                />
                            </div>

                            <RoleGate roles={['OWNER', 'MANAGER']} fallback={
                                <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
                                    Only Manager or Owner can authorize gold release and close the loan.
                                </p>
                            }>
                                <button
                                    onClick={doRelease}
                                    disabled={isClosing || (checklist ? !checklist.isSettled : false)}
                                    className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                                >
                                    {isClosing && <RefreshCw className="w-4 h-4 animate-spin" />}
                                    <span>{isClosing ? 'Closing Loan in DB...' : 'Authorize Gold Handover & Formally Close Loan'}</span>
                                </button>
                            </RoleGate>
                            {error && <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
                        </div>
                    )}

                    {/* Step 8: Acknowledgement */}
                    {step === 'acknowledgement' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-gray-900">Customer Acknowledgement & Release Voucher</h2>
                            <p className="text-sm text-gray-700">
                                Generate the official Gold Release & Settlement Voucher. The customer must inspect their ornaments and physically sign this voucher before completing closure.
                            </p>

                            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileCheck2 className="w-5 h-5 text-emerald-600" />
                                        <span className="text-sm font-bold text-emerald-950">Official Gold Release Voucher</span>
                                    </div>
                                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                                        Ready to Print
                                    </span>
                                </div>
                                <p className="text-xs text-emerald-800">
                                    Contains full loan settlement confirmation, itemized list of released jewellery, and physical wet-ink signature blocks for borrower, appraiser, and manager.
                                </p>
                                <div className="pt-1">
                                    <a
                                        href={getClosureReceiptPdfUrl(loanId)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors"
                                    >
                                        <Printer className="w-4 h-4" />
                                        Print Gold Release Voucher (PDF)
                                    </a>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    onClick={advance}
                                    className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors cursor-pointer"
                                >
                                    Customer has verified jewellery & physically signed the release voucher →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 9: Done */}
                    {step === 'closed' && (
                        <div className="space-y-4 text-center py-4">
                            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                                <Check className="w-8 h-8 text-green-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">Closure Process Complete</h2>
                            <p className="text-sm text-gray-600">
                                All closure steps have been completed. The gold ornaments have been safely handed back to the customer.
                            </p>
                            <div className="flex items-center justify-center gap-3 pt-2">
                                <a
                                    href={getClosureReceiptPdfUrl(loanId)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-xs transition-colors"
                                >
                                    <Printer className="w-4 h-4 text-amber-600" />
                                    Print Release Voucher Again
                                </a>
                                <Link
                                    href={`/loans/${loanId}`}
                                    className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700 shadow-xs transition-colors"
                                >
                                    Go to Loan Profile
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

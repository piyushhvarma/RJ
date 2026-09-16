'use client';

/**
 * Payment receipt form.
 * Client-side validation: the four components must sum to `amount` before submit is allowed.
 */

import { useSearchParams, useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPaymentSchema, type CreatePaymentDto } from '@/lib/schemas';
import { createPayment } from '@/lib/api/payments';
import { getSettlementQuote } from '@/lib/api/interest';
import { ArrowLeft, AlertTriangle, Calculator, Sparkles, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { useState } from 'react';

const inputCls = 'w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-50';

function fmt(n: number) {
    return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export default function NewPaymentPage() {
    return (
        <React.Suspense fallback={<div className="p-8 text-gray-500">Loading form...</div>}>
            <NewPaymentPageContent />
        </React.Suspense>
    );
}

function NewPaymentPageContent() {
    const searchParams = useSearchParams();
    const initialLoanId = searchParams.get('loanId') ?? '';
    const router = useRouter();
    const qc = useQueryClient();
    const [serverError, setServerError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        control,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<CreatePaymentDto>({
        resolver: zodResolver(createPaymentSchema),
        defaultValues: {
            loanId: initialLoanId,
            principalComponent: 0,
            interestComponent: 0,
            penaltyComponent: 0,
            otherCharges: 0,
        },
    });

    const loanId = useWatch({ control, name: 'loanId' });

    // Fetch real-time settlement quote whenever loanId is present
    const { data: quote, isLoading: quoteLoading } = useQuery({
        queryKey: ['settlement-quote', loanId],
        queryFn: () => getSettlementQuote(loanId),
        enabled: !!loanId && loanId.length > 5,
    });

    // Watch all component fields for live total
    const [amount, principal, interest, penalty, other] = useWatch({
        control,
        name: ['amount', 'principalComponent', 'interestComponent', 'penaltyComponent', 'otherCharges'],
    });

    const componentSum = (principal ?? 0) + (interest ?? 0) + (penalty ?? 0) + (other ?? 0);
    const sumMatchesTotal = amount ? Math.abs(componentSum - amount) < 0.01 : false;

    const handlePayInterestOnly = () => {
        if (!quote) return;
        const interestAmt = quote.interestDue;
        const penaltyAmt = quote.penaltyDue;
        const otherAmt = quote.otherChargesDue;
        const total = Math.round((interestAmt + penaltyAmt + otherAmt) * 100) / 100;

        setValue('amount', total, { shouldValidate: true });
        setValue('principalComponent', 0, { shouldValidate: true });
        setValue('interestComponent', interestAmt, { shouldValidate: true });
        setValue('penaltyComponent', penaltyAmt, { shouldValidate: true });
        setValue('otherCharges', otherAmt, { shouldValidate: true });
    };

    const handleFullSettlement = () => {
        if (!quote) return;
        setValue('amount', quote.totalDue, { shouldValidate: true });
        setValue('principalComponent', quote.principalOutstanding, { shouldValidate: true });
        setValue('interestComponent', quote.interestDue, { shouldValidate: true });
        setValue('penaltyComponent', quote.penaltyDue, { shouldValidate: true });
        setValue('otherCharges', quote.otherChargesDue, { shouldValidate: true });
    };

    const handleAutoAllocate = () => {
        if (!quote || !amount || amount <= 0) return;
        let rem = amount;

        const otherAlloc = Math.min(rem, quote.otherChargesDue);
        rem -= otherAlloc;

        const penaltyAlloc = Math.min(rem, quote.penaltyDue);
        rem -= penaltyAlloc;

        const interestAlloc = Math.min(rem, quote.interestDue);
        rem -= interestAlloc;

        const principalAlloc = Math.min(rem, quote.principalOutstanding);
        rem -= principalAlloc;

        setValue('otherCharges', Math.round(otherAlloc * 100) / 100, { shouldValidate: true });
        setValue('penaltyComponent', Math.round(penaltyAlloc * 100) / 100, { shouldValidate: true });
        setValue('interestComponent', Math.round(interestAlloc * 100) / 100, { shouldValidate: true });
        setValue('principalComponent', Math.round(principalAlloc * 100) / 100, { shouldValidate: true });
    };

    const mutation = useMutation({
        mutationFn: (data: CreatePaymentDto) => createPayment(data as Record<string, unknown>),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['loan', loanId] });
            qc.invalidateQueries({ queryKey: ['payments', loanId] });
            qc.invalidateQueries({ queryKey: ['settlement-quote', loanId] });
            router.push(`/loans/${loanId}`);
        },
        onError: (err: Error) => setServerError(err.message),
    });

    return (
        <div className="p-8 max-w-xl mx-auto">
            <Link href={loanId ? `/loans/${loanId}` : '/loans'}
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                Back to Loan
            </Link>

            <h1 className="text-2xl font-bold text-gray-900 mb-8">Receive Payment</h1>

            <form
                onSubmit={handleSubmit((data) => {
                    setServerError(null);
                    mutation.mutate(data);
                })}
                className="space-y-6"
            >
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                    <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">Loan & Amount</h2>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Loan ID *</label>
                        <input type="text" className={inputCls} {...register('loanId')}
                            placeholder="Enter loan UUID (visible on loan profile page)" />
                        {errors.loanId && <p className="mt-1 text-xs text-red-600">{errors.loanId.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Amount (₹) *</label>
                            <input type="number" step="0.01" className={inputCls} disabled={isSubmitting}
                                {...register('amount', { valueAsNumber: true })} />
                            {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Mode *</label>
                            <select className={inputCls} disabled={isSubmitting} {...register('mode')}>
                                <option value="">Select…</option>
                                <option value="CASH">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="BANK_TRANSFER">Bank Transfer</option>
                                <option value="OTHER">Other</option>
                            </select>
                            {errors.mode && <p className="mt-1 text-xs text-red-600">{errors.mode.message}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Transaction Ref / UPI ID</label>
                        <input type="text" className={inputCls} disabled={isSubmitting} {...register('transactionRef')} />
                    </div>
                </div>

                {/* Real-time Settlement Status & Auto-Allocation Bar */}
                {loanId && quote && (
                    <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white rounded-xl border border-amber-200 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-2xs">
                                    <Calculator className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Current Loan Payoff / Due Summary</p>
                                    <p className="text-[11px] text-gray-500 font-medium">
                                        {quote.daysElapsed} days active · {quote.interestRate}% p.a.
                                        {quote.isOverdue && <span className="text-red-600 font-bold ml-1.5">({quote.overdueDays}d overdue)</span>}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-500 font-medium">Total Settlement Payoff</p>
                                <p className="text-base font-extrabold text-amber-700">{fmt(quote.totalDue)}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                            <div className="bg-white/80 rounded-lg p-2 border border-amber-100/80">
                                <p className="text-[11px] text-gray-500">Principal Bal</p>
                                <p className="font-bold text-gray-900 mt-0.5">{fmt(quote.principalOutstanding)}</p>
                            </div>
                            <div className="bg-white/80 rounded-lg p-2 border border-amber-100/80">
                                <p className="text-[11px] text-gray-500">Net Interest Due</p>
                                <p className="font-bold text-amber-700 mt-0.5">{fmt(quote.interestDue)}</p>
                            </div>
                            <div className="bg-white/80 rounded-lg p-2 border border-amber-100/80">
                                <p className="text-[11px] text-gray-500">Penalty Due</p>
                                <p className={`font-bold mt-0.5 ${quote.penaltyDue > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                    {fmt(quote.penaltyDue)}
                                </p>
                            </div>
                        </div>

                        {/* Quick Allocation Action Buttons */}
                        <div className="pt-2 border-t border-amber-200/60 flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={handlePayInterestOnly}
                                className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-800 text-xs font-semibold hover:bg-amber-50 transition-colors shadow-2xs"
                            >
                                Pay Interest Only ({fmt(quote.interestDue + quote.penaltyDue + quote.otherChargesDue)})
                            </button>
                            <button
                                type="button"
                                onClick={handleFullSettlement}
                                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors shadow-2xs"
                            >
                                Full Settlement ({fmt(quote.totalDue)})
                            </button>
                            {amount && amount > 0 && (
                                <button
                                    type="button"
                                    onClick={handleAutoAllocate}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-2xs inline-flex items-center gap-1"
                                >
                                    <Sparkles className="w-3 h-3" />
                                    Auto-Allocate {fmt(amount)}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Component breakdown */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
                        Breakdown
                        <span className="ml-2 text-xs font-normal text-gray-500">(must sum to total amount)</span>
                    </h2>

                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { label: 'Principal Component (₹)', field: 'principalComponent' as const },
                            { label: 'Interest Component (₹)', field: 'interestComponent' as const },
                            { label: 'Penalty Component (₹)', field: 'penaltyComponent' as const },
                            { label: 'Other Charges (₹)', field: 'otherCharges' as const },
                        ].map(({ label, field }) => (
                            <div key={field}>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                                <input type="number" step="0.01" defaultValue={0} className={inputCls} disabled={isSubmitting}
                                    {...register(field, { valueAsNumber: true })} />
                            </div>
                        ))}
                    </div>

                    {/* Live sum indicator */}
                    <div className={`rounded-lg px-4 py-3 border ${!amount ? 'bg-gray-50 border-gray-200'
                        : sumMatchesTotal ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                        }`}>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Component total:</span>
                            <span className={`font-semibold ${!amount ? 'text-gray-700' : sumMatchesTotal ? 'text-green-700' : 'text-red-700'}`}>
                                {fmt(componentSum)}
                            </span>
                        </div>
                        {amount && !sumMatchesTotal && (
                            <div className="flex items-start gap-2 mt-2">
                                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-red-700">
                                    Components sum to {fmt(componentSum)} but total is {fmt(amount)}.
                                    Difference: {fmt(Math.abs(componentSum - amount))}.
                                    Adjust the fields above before submitting.
                                </p>
                            </div>
                        )}
                        {amount && sumMatchesTotal && (
                            <p className="text-xs text-green-700 mt-1">✓ Components match total amount</p>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">Notes</h2>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
                        <input type="text" className={inputCls} disabled={isSubmitting} {...register('notes')} />
                    </div>
                </div>

                {serverError && (
                    <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{serverError}</p>
                    </div>
                )}

                <div className="flex gap-3 justify-end">
                    <Link href={loanId ? `/loans/${loanId}` : '/loans'}
                        className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={isSubmitting || (!!amount && !sumMatchesTotal)}
                        className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white
                       hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSubmitting ? 'Recording…' : 'Record Payment'}
                    </button>
                </div>
            </form>
        </div>
    );
}

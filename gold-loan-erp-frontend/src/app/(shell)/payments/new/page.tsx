'use client';

/**
 * Payment receipt form.
 * Client-side validation: the four components must sum to `amount` before submit is allowed.
 */

import { useSearchParams, useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPaymentSchema, type CreatePaymentDto } from '@/lib/schemas';
import { createPayment } from '@/lib/api/payments';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
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

    // Watch all component fields for live total
    const [amount, principal, interest, penalty, other] = useWatch({
        control,
        name: ['amount', 'principalComponent', 'interestComponent', 'penaltyComponent', 'otherCharges'],
    });

    const componentSum = (principal ?? 0) + (interest ?? 0) + (penalty ?? 0) + (other ?? 0);
    const sumMatchesTotal = amount ? Math.abs(componentSum - amount) < 0.01 : false;
    const loanId = useWatch({ control, name: 'loanId' });

    const mutation = useMutation({
        mutationFn: (data: CreatePaymentDto) => createPayment(data as Record<string, unknown>),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['loan', loanId] });
            qc.invalidateQueries({ queryKey: ['payments', loanId] });
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

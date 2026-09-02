'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCustomerSchema, type CreateCustomerDto } from '@/lib/schemas';
import { createCustomer } from '@/lib/api/customers';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

function Field({
    label, required, error, children,
}: {
    label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {children}
            {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
        </div>
    );
}

const inputCls =
    'w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-50';

export default function NewCustomerPage() {
    const router = useRouter();
    const qc = useQueryClient();
    const [serverError, setServerError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<CreateCustomerDto>({ resolver: zodResolver(createCustomerSchema) });

    const mutation = useMutation({
        mutationFn: (data: CreateCustomerDto) => createCustomer(data as Record<string, unknown>),
        onSuccess: (customer) => {
            qc.invalidateQueries({ queryKey: ['customers'] });
            router.push(`/customers/${customer.id}`);
        },
        onError: (err: Error) => setServerError(err.message),
    });

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <Link
                href="/customers"
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                All Customers
            </Link>

            <h1 className="text-2xl font-bold text-gray-900 mb-8">Register New Customer</h1>

            <form
                onSubmit={handleSubmit((data) => {
                    setServerError(null);
                    mutation.mutate(data);
                })}
                className="space-y-6"
            >
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                    <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
                        Personal Details
                    </h2>

                    <Field label="Full Name" required error={errors.fullName?.message}>
                        <input type="text" className={inputCls} disabled={isSubmitting} {...register('fullName')} />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Guardian / Father's Name" error={errors.guardianName?.message}>
                            <input type="text" className={inputCls} disabled={isSubmitting} {...register('guardianName')} />
                        </Field>
                        <Field label="Date of Birth" error={errors.dateOfBirth?.message}>
                            <input type="date" className={inputCls} disabled={isSubmitting} {...register('dateOfBirth')} />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Mobile Number" required error={errors.mobile?.message}>
                            <input type="tel" className={inputCls} disabled={isSubmitting} {...register('mobile')} />
                        </Field>
                        <Field label="Alternate Mobile" error={errors.alternateMobile?.message}>
                            <input type="tel" className={inputCls} disabled={isSubmitting} {...register('alternateMobile')} />
                        </Field>
                    </div>

                    <Field label="Occupation" error={errors.occupation?.message}>
                        <input type="text" className={inputCls} disabled={isSubmitting} {...register('occupation')} />
                    </Field>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                    <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
                        Address
                    </h2>

                    <Field label="Address" error={errors.address?.message}>
                        <input type="text" className={inputCls} disabled={isSubmitting} {...register('address')} />
                    </Field>

                    <div className="grid grid-cols-3 gap-4">
                        <Field label="City" error={errors.city?.message}>
                            <input type="text" className={inputCls} disabled={isSubmitting} {...register('city')} />
                        </Field>
                        <Field label="State" error={errors.state?.message}>
                            <input type="text" className={inputCls} disabled={isSubmitting} {...register('state')} />
                        </Field>
                        <Field label="Pincode" error={errors.pincode?.message}>
                            <input type="text" className={inputCls} disabled={isSubmitting} {...register('pincode')} />
                        </Field>
                    </div>
                </div>

                {serverError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                        <p className="text-sm text-red-700">{serverError}</p>
                    </div>
                )}

                <div className="flex gap-3 justify-end">
                    <Link
                        href="/customers"
                        className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white
                       hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSubmitting ? 'Registering…' : 'Register Customer'}
                    </button>
                </div>
            </form>
        </div>
    );
}

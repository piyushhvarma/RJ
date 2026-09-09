'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCustomerSchema, type CreateCustomerDto } from '@/lib/schemas';
import { createCustomer } from '@/lib/api/customers';
import { enrollBiometric } from '@/lib/api/biometric';
import { PhotoCaptureModal } from '@/components/shared/PhotoCaptureModal';
import {
    ArrowLeft,
    Camera,
    User,
    FileText,
    Fingerprint,
    ShieldCheck,
    Upload,
    Check,
} from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';

function Field({
    label,
    required,
    error,
    children,
}: {
    label: string;
    required?: boolean;
    error?: string;
    children: React.ReactNode;
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

    // Photo & Biometric states
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
    const [enrollBiometricsDirectly, setEnrollBiometricsDirectly] = useState(true);
    const [aadhaarInput, setAadhaarInput] = useState('');

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<CreateCustomerDto>({ resolver: zodResolver(createCustomerSchema) });

    const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '').slice(0, 12);
        val = val.replace(/(\d{4})(?=\d)/g, '$1 ');
        setAadhaarInput(val);
        setValue('aadhaarNumber', val.replace(/\s+/g, ''));
    };

    const mutation = useMutation({
        mutationFn: async (data: CreateCustomerDto) => {
            const customer = await createCustomer({
                ...data,
                photoUrl: photoUrl ?? undefined,
            } as Record<string, unknown>);

            // If immediate biometric enrollment requested, enroll with default scanner
            if (enrollBiometricsDirectly) {
                try {
                    await enrollBiometric(customer.id);
                } catch {
                    // Ignore biometric error if device is unavailable
                }
            }

            return customer;
        },
        onSuccess: (customer) => {
            qc.invalidateQueries({ queryKey: ['customers'] });
            router.push(`/customers/${customer.id}`);
        },
        onError: (err: Error) => setServerError(err.message),
    });

    const cleanAadhaar = aadhaarInput.replace(/\s+/g, '');
    const maskedAadhaar =
        cleanAadhaar.length >= 4
            ? `XXXX-XXXX-${cleanAadhaar.slice(-4)}`
            : 'XXXX-XXXX-____';

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
                {/* Photo & Biometric Quick Setup */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
                    <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                        <Camera className="w-4 h-4 text-amber-600" /> Customer Photo & Biometrics
                    </h2>

                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        {/* Avatar / Camera Trigger */}
                        <div className="relative group cursor-pointer" onClick={() => setIsPhotoModalOpen(true)}>
                            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-amber-50 border-2 border-dashed border-amber-300 flex items-center justify-center shadow-inner hover:border-amber-500 transition-colors">
                                {photoUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={photoUrl} alt="Customer Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-10 h-10 text-amber-400" />
                                )}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md">
                                <Camera className="w-3.5 h-3.5" />
                            </div>
                        </div>

                        <div className="flex-1 space-y-2 text-center sm:text-left">
                            <p className="text-sm font-semibold text-gray-900">
                                {photoUrl ? 'Photo Captured' : 'Take Customer Photo'}
                            </p>
                            <p className="text-xs text-gray-500">
                                Use your live webcam or upload a clear portrait photo for the pledge record.
                            </p>
                            <button
                                type="button"
                                onClick={() => setIsPhotoModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold transition-colors"
                            >
                                <Camera className="w-3.5 h-3.5" />
                                {photoUrl ? 'Retake Photo' : 'Capture via Camera / Upload'}
                            </button>
                        </div>
                    </div>

                    {/* Biometric Toggle */}
                    <div className="pt-3 border-t border-gray-100">
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={enrollBiometricsDirectly}
                                onChange={(e) => setEnrollBiometricsDirectly(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <div className="text-xs">
                                <span className="font-semibold text-gray-900 flex items-center gap-1.5">
                                    <Fingerprint className="w-3.5 h-3.5 text-blue-600" />
                                    Automatically register fingerprint biometric (MOCK-BIO-01)
                                </span>
                                <span className="text-gray-500 block mt-0.5">
                                    Creates biometric template reference immediately upon registration
                                </span>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Aadhaar & KYC Details */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
                    <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-600" /> Aadhaar KYC Details
                    </h2>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Aadhaar Number (12 Digits)
                        </label>
                        <input
                            type="text"
                            value={aadhaarInput}
                            onChange={handleAadhaarChange}
                            placeholder="1234 5678 9012"
                            className={`${inputCls} font-mono`}
                        />
                        {cleanAadhaar.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                                Secured masked display: <span className="font-mono font-semibold">{maskedAadhaar}</span>
                            </p>
                        )}
                    </div>
                </div>

                {/* Personal Details */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-5">
                    <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
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

                {/* Address */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-5">
                    <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
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
                    <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                        <p className="text-sm text-red-700 font-medium">{serverError}</p>
                    </div>
                )}

                <div className="flex gap-3 justify-end">
                    <Link
                        href="/customers"
                        className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-60 shadow-sm transition-all"
                    >
                        <Check className="w-4 h-4" />
                        {isSubmitting ? 'Registering Customer…' : 'Register Customer'}
                    </button>
                </div>
            </form>

            {/* Photo Capture Modal */}
            <PhotoCaptureModal
                isOpen={isPhotoModalOpen}
                onClose={() => setIsPhotoModalOpen(false)}
                title="Capture Customer Photo"
                subtitle="Position customer in front of webcam or upload image file."
                onConfirm={(capturedDataUrl) => {
                    setPhotoUrl(capturedDataUrl);
                }}
            />
        </div>
    );
}

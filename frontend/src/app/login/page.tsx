'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginDto } from '@/lib/schemas';
import { login } from '@/lib/api/customers';
import { setSession } from '@/lib/auth/session';

export default function LoginPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginDto>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: 'owner@radhikajewellers.example', password: 'ChangeMe123!' },
    });

    async function onSubmit(data: LoginDto) {
        setError(null);
        try {
            const res = await login(data.email, data.password);
            setSession({
                accessToken: res.accessToken,
                user: res.user as any,
            });
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.message ?? 'Login failed');
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500 mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Radhika Jewellers</h1>
                    <p className="text-sm text-gray-500 mt-1">Gold Loan Management — Enterprise Portal</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6">Sign in to your account</h2>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Email address
                            </label>
                            <input
                                id="email"
                                type="email"
                                autoComplete="email"
                                autoFocus
                                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent
                           disabled:bg-gray-50 disabled:cursor-not-allowed"
                                disabled={isSubmitting}
                                {...register('email')}
                            />
                            {errors.email && (
                                <p className="mt-1.5 text-xs text-red-600">{errors.email.message}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                autoComplete="current-password"
                                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent
                           disabled:bg-gray-50 disabled:cursor-not-allowed"
                                disabled={isSubmitting}
                                {...register('password')}
                            />
                            {errors.password && (
                                <p className="mt-1.5 text-xs text-red-600">{errors.password.message}</p>
                            )}
                        </div>

                        {error && (
                            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white
                         hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2
                         disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                        >
                            {isSubmitting ? 'Signing in…' : 'Sign in'}
                        </button>
                    </form>
                </div>

                <p className="text-center text-xs text-gray-400 mt-6">
                    For staff use only. Contact your manager if you need access.
                </p>
            </div>
        </div>
    );
}

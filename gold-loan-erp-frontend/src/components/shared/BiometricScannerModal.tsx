'use client';

import React, { useState } from 'react';
import { Fingerprint, X, CheckCircle, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { enrollBiometric, verifyBiometric, type BiometricVerifyResult } from '@/lib/api/biometric';

interface BiometricScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerId: string;
    customerName: string;
    mode?: 'enroll' | 'verify';
    loanId?: string;
    onSuccess?: () => void;
}

export function BiometricScannerModal({
    isOpen,
    onClose,
    customerId,
    customerName,
    mode = 'enroll',
    loanId,
    onSuccess,
}: BiometricScannerModalProps) {
    const [state, setState] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
    const [statusMessage, setStatusMessage] = useState<string>('Ready for scan');
    const [enrollmentCode, setEnrollmentCode] = useState<string | null>(null);
    const [verifyResult, setVerifyResult] = useState<BiometricVerifyResult | null>(null);

    if (!isOpen) return null;

    const handleClose = () => {
        setState('idle');
        setStatusMessage('Ready for scan');
        setEnrollmentCode(null);
        setVerifyResult(null);
        onClose();
    };

    const handleStartScan = async () => {
        setState('scanning');
        setStatusMessage('Scanning fingerprint sensor... Hold finger steady.');

        // Slight natural delay for scanner simulation effect
        await new Promise((resolve) => setTimeout(resolve, 900));

        try {
            if (mode === 'enroll') {
                const res: any = await enrollBiometric(customerId);
                setEnrollmentCode(res?.enrollmentCode ?? 'BIO-ENROLLED');
                setState('success');
                setStatusMessage('Biometric enrollment successful! Template linked to Aadhaar/Customer profile.');
                if (onSuccess) onSuccess();
            } else {
                const res = await verifyBiometric(customerId, loanId);
                setVerifyResult(res);
                if (res.result === 'MATCH') {
                    setState('success');
                    setStatusMessage('Biometric identity verified! Fingerprint matches registered template.');
                    if (onSuccess) onSuccess();
                } else {
                    setState('failed');
                    setStatusMessage(
                        `Fingerprint mismatch (${res.result}). Attempts remaining: ${res.attemptsRemaining}`
                    );
                }
            }
        } catch (err: any) {
            setState('failed');
            setStatusMessage(err?.message ?? 'Scanner communication error');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                            <Fingerprint className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">
                                {mode === 'enroll' ? 'Aadhaar Biometric Enrollment' : 'Biometric Identity Verification'}
                            </h3>
                            <p className="text-xs text-gray-500">{customerName}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 text-center">
                    {/* Device Status Banner */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Device: MOCK-BIO-01 (Optical Scanner Online)
                    </div>

                    {/* Scanner Interactive Graphic */}
                    <div className="flex justify-center">
                        <div
                            onClick={state !== 'scanning' && state !== 'success' ? handleStartScan : undefined}
                            className={`relative w-36 h-36 rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-300 border-2 ${
                                state === 'scanning'
                                    ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-100'
                                    : state === 'success'
                                    ? 'border-green-500 bg-green-50 shadow-lg shadow-green-100'
                                    : state === 'failed'
                                    ? 'border-red-400 bg-red-50'
                                    : 'border-dashed border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/30'
                            }`}
                        >
                            {/* Scanning animated laser bar */}
                            {state === 'scanning' && (
                                <div className="absolute inset-x-2 h-1 bg-blue-500 rounded-full animate-bounce shadow-sm shadow-blue-400" />
                            )}

                            {state === 'success' ? (
                                <CheckCircle className="w-16 h-16 text-green-500 animate-in zoom-in" />
                            ) : state === 'failed' ? (
                                <AlertTriangle className="w-16 h-16 text-red-500 animate-in zoom-in" />
                            ) : (
                                <Fingerprint
                                    className={`w-20 h-20 transition-all ${
                                        state === 'scanning'
                                            ? 'text-blue-600 scale-110'
                                            : 'text-gray-400 group-hover:text-blue-500'
                                    }`}
                                />
                            )}
                        </div>
                    </div>

                    {/* Status Message */}
                    <div className="space-y-1.5">
                        <p
                            className={`text-sm font-semibold ${
                                state === 'success'
                                    ? 'text-green-700'
                                    : state === 'failed'
                                    ? 'text-red-700'
                                    : state === 'scanning'
                                    ? 'text-blue-700'
                                    : 'text-gray-800'
                            }`}
                        >
                            {statusMessage}
                        </p>
                        {state === 'idle' && (
                            <p className="text-xs text-gray-500">
                                Tap scanner or click button below to capture customer biometric fingerprint template.
                            </p>
                        )}
                        {enrollmentCode && (
                            <div className="pt-2">
                                <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-mono font-bold rounded-lg">
                                    Ref: {enrollmentCode}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 flex gap-3">
                        {state === 'idle' && (
                            <button
                                type="button"
                                onClick={handleStartScan}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 shadow-sm transition-all"
                            >
                                <Fingerprint className="w-4 h-4" /> Start Fingerprint Scan
                            </button>
                        )}
                        {state === 'scanning' && (
                            <button
                                disabled
                                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-400 py-3 text-sm font-bold text-white cursor-wait"
                            >
                                <RefreshCw className="w-4 h-4 animate-spin" /> Capturing & Analyzing...
                            </button>
                        )}
                        {state === 'failed' && (
                            <button
                                type="button"
                                onClick={handleStartScan}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 py-3 text-sm font-bold text-white hover:bg-amber-700 transition-all"
                            >
                                <RefreshCw className="w-4 h-4" /> Retry Scan
                            </button>
                        )}
                        {state === 'success' && (
                            <button
                                type="button"
                                onClick={handleClose}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 shadow-sm transition-all"
                            >
                                <ShieldCheck className="w-4 h-4" /> Complete & Close
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

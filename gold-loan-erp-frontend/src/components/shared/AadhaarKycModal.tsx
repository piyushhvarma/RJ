'use client';

import React, { useState, useRef } from 'react';
import { FileText, X, Check, Upload, Camera, ShieldCheck } from 'lucide-react';
import { addCustomerDocument } from '@/lib/api/customers';

interface AadhaarKycModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerId: string;
    customerName: string;
    onSuccess: () => void;
}

export function AadhaarKycModal({
    isOpen,
    onClose,
    customerId,
    customerName,
    onSuccess,
}: AadhaarKycModalProps) {
    const [docType, setDocType] = useState<string>('AADHAAR');
    const [docNumber, setDocNumber] = useState<string>('');
    const [docPhotoUrl, setDocPhotoUrl] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '');
        if (docType === 'AADHAAR') {
            val = val.slice(0, 12);
            // Format into 4-4-4
            val = val.replace(/(\d{4})(?=\d)/g, '$1 ');
        }
        setDocNumber(val);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxDim = 1200;
                let width = img.width;
                let height = img.height;

                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    setDocPhotoUrl(canvas.toDataURL('image/jpeg', 0.85));
                }
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const clean = docNumber.replace(/\s+/g, '');
        if (docType === 'AADHAAR' && clean.length !== 12) {
            setError('Please enter a valid 12-digit Aadhaar number');
            return;
        }

        try {
            setIsSubmitting(true);
            await addCustomerDocument(customerId, {
                docType,
                docNumber: clean,
                fileUrl: docPhotoUrl || 'placeholder://aadhaar-card-verified',
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err?.message ?? 'Failed to submit document');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Masked preview
    const cleanNum = docNumber.replace(/\s+/g, '');
    const maskedPreview =
        cleanNum.length >= 4
            ? `XXXX-XXXX-${cleanNum.slice(-4)}`
            : 'XXXX-XXXX-____';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">Add Aadhaar / KYC Document</h3>
                            <p className="text-xs text-gray-500">{customerName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
                    {/* Document Type Selector */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                            Document Type
                        </label>
                        <select
                            value={docType}
                            onChange={(e) => {
                                setDocType(e.target.value);
                                setDocNumber('');
                            }}
                            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                        >
                            <option value="AADHAAR">Aadhaar Card (12 Digits)</option>
                            <option value="PAN">PAN Card (10 Characters)</option>
                            <option value="VOTER_ID">Voter ID Card</option>
                            <option value="DRIVING_LICENCE">Driving Licence</option>
                            <option value="OTHER">Other Govt ID</option>
                        </select>
                    </div>

                    {/* Document Number */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                            {docType === 'AADHAAR' ? 'Aadhaar Number (12 Digits)' : 'Document ID Number'} *
                        </label>
                        <input
                            type="text"
                            value={docNumber}
                            onChange={handleNumberChange}
                            placeholder={docType === 'AADHAAR' ? '1234 5678 9012' : 'Enter document number'}
                            required
                            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        {docType === 'AADHAAR' && (
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                                Secured display masked as: <span className="font-mono font-semibold">{maskedPreview}</span>
                            </p>
                        )}
                    </div>

                    {/* Document Attachment Photo / Scan */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                            Aadhaar Card Scan or Photo
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        {docPhotoUrl ? (
                            <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-video flex items-center justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={docPhotoUrl} alt="Aadhaar Scan Preview" className="max-h-full max-w-full object-contain" />
                                <button
                                    type="button"
                                    onClick={() => setDocPhotoUrl('')}
                                    className="absolute top-2 right-2 px-2.5 py-1 bg-black/60 text-white rounded text-xs hover:bg-black/80 transition-colors"
                                >
                                    Change File
                                </button>
                            </div>
                        ) : (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-300 hover:border-amber-400 hover:bg-amber-50/40 rounded-xl p-5 text-center cursor-pointer transition-colors"
                            >
                                <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1.5" />
                                <p className="text-xs font-semibold text-gray-700">Click to upload Aadhaar front/back photo</p>
                                <p className="text-[11px] text-gray-400">JPG, PNG or WEBP format</p>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !docNumber}
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 disabled:opacity-50 transition-colors shadow-sm"
                        >
                            <Check className="w-4 h-4" />
                            {isSubmitting ? 'Verifying & Saving…' : 'Save & Verify KYC'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

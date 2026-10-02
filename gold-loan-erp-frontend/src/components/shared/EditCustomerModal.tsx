'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateCustomer } from '@/lib/api/customers';
import type { Customer } from '@/lib/api/types';
import { X, User, Phone, MapPin, Briefcase, Calendar, Check, AlertCircle, Loader2 } from 'lucide-react';

interface EditCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: Customer | null;
    onSuccess?: (updated: Customer) => void;
}

export function EditCustomerModal({
    isOpen,
    onClose,
    customer,
    onSuccess,
}: EditCustomerModalProps) {
    const qc = useQueryClient();

    const [fullName, setFullName] = useState('');
    const [guardianName, setGuardianName] = useState('');
    const [mobile, setMobile] = useState('');
    const [alternateMobile, setAlternateMobile] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('Maharashtra');
    const [pincode, setPincode] = useState('');
    const [occupation, setOccupation] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Sync form state when customer changes
    useEffect(() => {
        if (customer) {
            setFullName(customer.fullName || '');
            setGuardianName(customer.guardianName || '');
            setMobile(customer.mobile || '');
            setAlternateMobile(customer.alternateMobile || '');
            setAddress(customer.address || '');
            setCity(customer.city || '');
            setState(customer.state || 'Maharashtra');
            setPincode(customer.pincode || '');
            setOccupation(customer.occupation || '');
            setDateOfBirth(customer.dateOfBirth ? customer.dateOfBirth.split('T')[0] : '');
            setError(null);
        }
    }, [customer, isOpen]);

    const mutation = useMutation({
        mutationFn: async (data: Record<string, string>) => {
            if (!customer) throw new Error('No customer selected');
            return updateCustomer(customer.id, data);
        },
        onSuccess: (updated) => {
            qc.invalidateQueries({ queryKey: ['customer', customer?.id] });
            qc.invalidateQueries({ queryKey: ['customers'] });
            qc.invalidateQueries({ queryKey: ['counter-customers'] });
            if (onSuccess) onSuccess(updated);
            onClose();
        },
        onError: (err: Error) => {
            setError(err.message || 'Failed to update customer details.');
        },
    });

    if (!isOpen || !customer) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!fullName.trim()) {
            setError('Customer full name is required.');
            return;
        }

        // Clean mobile number
        const cleanMobile = mobile.trim().replace(/\D/g, '');
        if (cleanMobile && cleanMobile.length !== 10) {
            setError('Mobile number must be a valid 10-digit phone number.');
            return;
        }

        const cleanAlt = alternateMobile.trim().replace(/\D/g, '');
        if (cleanAlt && cleanAlt.length !== 10) {
            setError('Alternate mobile must be a valid 10-digit number if provided.');
            return;
        }

        const payload: Record<string, string> = {
            fullName: fullName.trim(),
            guardianName: guardianName.trim(),
            mobile: cleanMobile,
            alternateMobile: cleanAlt,
            address: address.trim(),
            city: city.trim(),
            state: state.trim(),
            pincode: pincode.trim(),
            occupation: occupation.trim(),
        };

        if (dateOfBirth) {
            payload.dateOfBirth = new Date(dateOfBirth).toISOString();
        }

        mutation.mutate(payload);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-gray-100 my-8">
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-amber-50/50 to-orange-50/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-base">Edit Customer Profile</h3>
                            <p className="text-xs text-gray-500 font-mono">
                                {customer.customerCode} • {customer.fullName}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={mutation.isPending}
                        className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                    {error && (
                        <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-700 flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Full Name */}
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="e.g. Ramesh Shankar Rao"
                                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            />
                        </div>

                        {/* Guardian Name */}
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Guardian / Father / Husband Name (S/o, W/o)
                            </label>
                            <input
                                type="text"
                                value={guardianName}
                                onChange={(e) => setGuardianName(e.target.value)}
                                placeholder="e.g. Shankar Rao"
                                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            />
                        </div>

                        {/* Mobile Number */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Primary Mobile <span className="text-gray-400 font-normal">(10 digits)</span>
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="tel"
                                    maxLength={10}
                                    value={mobile}
                                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                                    placeholder="98XXXXXXXX"
                                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                />
                            </div>
                        </div>

                        {/* Alternate Mobile */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Alternate Mobile <span className="text-gray-400 font-normal">(Optional)</span>
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="tel"
                                    maxLength={10}
                                    value={alternateMobile}
                                    onChange={(e) => setAlternateMobile(e.target.value.replace(/\D/g, ''))}
                                    placeholder="Alternate number"
                                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                />
                            </div>
                        </div>

                        {/* Address */}
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Street Address / Mohalla / Village
                            </label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <textarea
                                    rows={2}
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="House number, landmark, lane, or village..."
                                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                />
                            </div>
                        </div>

                        {/* City */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">City / Town</label>
                            <input
                                type="text"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                placeholder="e.g. Amravati, Achalpur"
                                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            />
                        </div>

                        {/* Pincode */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Pincode</label>
                            <input
                                type="text"
                                maxLength={6}
                                value={pincode}
                                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                                placeholder="444601"
                                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            />
                        </div>

                        {/* State */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">State</label>
                            <input
                                type="text"
                                value={state}
                                onChange={(e) => setState(e.target.value)}
                                placeholder="Maharashtra"
                                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            />
                        </div>

                        {/* Occupation */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Occupation</label>
                            <div className="relative">
                                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={occupation}
                                    onChange={(e) => setOccupation(e.target.value)}
                                    placeholder="e.g. Agriculture, Business"
                                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                />
                            </div>
                        </div>

                        {/* Date of Birth */}
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Date of Birth</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="date"
                                    value={dateOfBirth}
                                    onChange={(e) => setDateOfBirth(e.target.value)}
                                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={mutation.isPending}
                            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold shadow-xs transition-colors disabled:opacity-50"
                        >
                            {mutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving…
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

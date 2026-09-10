'use client';

import React, { useState } from 'react';
import {
    Settings,
    Building2,
    Coins,
    Gem,
    Shield,
    Users,
    Sliders,
    Save,
    CheckCircle2,
    Sparkles,
    Scale,
    FileCheck2,
    RefreshCw,
    Fingerprint,
    Bell,
    Smartphone
} from 'lucide-react';

export default function SettingsPage() {
    const [rate24K, setRate24K] = useState(7250);
    const [rate22K, setRate22K] = useState(6645);
    const [rate20K, setRate20K] = useState(6040);
    const [rate18K, setRate18K] = useState(5435);
    const [rateSilver, setRateSilver] = useState(92);
    const [savedNotice, setSavedNotice] = useState(false);

    const handleSaveRates = (e: React.FormEvent) => {
        e.preventDefault();
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 3000);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-sm">
                        <Settings className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                            Store & System Settings
                        </h1>
                        <p className="text-sm text-gray-500">
                            Radhika Jewellers branch configuration, spot gold rates master, loan schemes, and role permissions
                        </p>
                    </div>
                </div>

                {savedNotice && (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold animate-fade-in">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Settings saved successfully!
                    </div>
                )}
            </div>

            {/* Grid of Settings Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Branch Profile & Hardware (2 cols on desktop) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Branch Master Profile */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <Building2 className="w-5 h-5 text-amber-600" />
                                <div>
                                    <h3 className="text-base font-bold text-gray-900">Branch & Business Profile</h3>
                                    <p className="text-xs text-gray-500">Official legal entity details displayed on pawn tickets and receipts</p>
                                </div>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Active Store
                            </span>
                        </div>

                        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                    Trading Name
                                </label>
                                <input
                                    type="text"
                                    readOnly
                                    value="Radhika Jewellers — Gold Loan Division"
                                    className="w-full px-3.5 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 font-medium focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                    Branch Identifier
                                </label>
                                <input
                                    type="text"
                                    readOnly
                                    value="RJ-MAIN-VAULT-01"
                                    className="w-full px-3.5 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 font-mono font-medium focus:outline-none"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                    Registered Store Address
                                </label>
                                <input
                                    type="text"
                                    readOnly
                                    value="Shop 4-5, Sarafa Bazar, Main Market, Maharashtra 414001"
                                    className="w-full px-3.5 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                    GSTIN / Trade Reg
                                </label>
                                <input
                                    type="text"
                                    readOnly
                                    value="27AAAAA0000A1Z5"
                                    className="w-full px-3.5 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 font-mono focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                    BIS Hallmarking License
                                </label>
                                <input
                                    type="text"
                                    readOnly
                                    value="HM/RJ-88921-A"
                                    className="w-full px-3.5 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 font-mono focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Active Lending Schemes */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <Gem className="w-5 h-5 text-amber-600" />
                                <div>
                                    <h3 className="text-base font-bold text-gray-900">Configured Loan Schemes</h3>
                                    <p className="text-xs text-gray-500">Interest calculations, LTV limits, and tenure terms</p>
                                </div>
                            </div>
                            <span className="text-xs text-gray-500">3 Active Schemes</span>
                        </div>

                        <div className="divide-y divide-gray-100">
                            <div className="p-5 flex items-start justify-between hover:bg-gray-50/60 transition-colors">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-gray-900 text-sm">Regular Gold Loan (Monthly Simple)</h4>
                                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                                            Default
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Standard gold pledge with monthly interest servicing and 12-month renewal tenure.
                                    </p>
                                    <div className="flex items-center gap-4 text-xs font-medium text-gray-700 pt-1">
                                        <span>Interest: <strong className="text-amber-700">12.0% p.a. (1.0% / mo)</strong></span>
                                        <span>Max LTV: <strong>75.0%</strong></span>
                                        <span>Grace Period: <strong>7 Days</strong></span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 flex items-start justify-between hover:bg-gray-50/60 transition-colors">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-gray-900 text-sm">Super Saver Short Term</h4>
                                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800">
                                            90-Day Bullet
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Low-rate bridge financing with full principal and interest bullet payment at maturity.
                                    </p>
                                    <div className="flex items-center gap-4 text-xs font-medium text-gray-700 pt-1">
                                        <span>Interest: <strong className="text-amber-700">10.0% p.a.</strong></span>
                                        <span>Max LTV: <strong>70.0%</strong></span>
                                        <span>Tenure: <strong>90 Days</strong></span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 flex items-start justify-between hover:bg-gray-50/60 transition-colors">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-gray-900 text-sm">HNI Premium Portfolio Scheme</h4>
                                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800">
                                            ₹5L+ Ticket
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Special concessions for large gold bullion and heavy ornament deposits.
                                    </p>
                                    <div className="flex items-center gap-4 text-xs font-medium text-gray-700 pt-1">
                                        <span>Interest: <strong className="text-amber-700">9.0% p.a.</strong></span>
                                        <span>Max LTV: <strong>75.0%</strong></span>
                                        <span>Dedicated Locker: <strong>Yes</strong></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Spot Rates Master & System Hardware */}
                <div className="space-y-6">
                    {/* Live Spot Gold Rates Form */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Coins className="w-5 h-5 text-amber-600" />
                                <h3 className="text-base font-bold text-gray-900">Daily Gold Rate Master</h3>
                            </div>
                            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                MCX Spot Base
                            </span>
                        </div>

                        <form onSubmit={handleSaveRates} className="p-5 space-y-4 text-sm">
                            <p className="text-xs text-gray-500">
                                Applied across new loan appraisals to calculate statutory maximum loan amounts (75% LTV).
                            </p>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                                    <span>24K Pure Gold (99.9%)</span>
                                    <span className="text-gray-400 font-normal">Per gram</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                                    <input
                                        type="number"
                                        value={rate24K}
                                        onChange={(e) => setRate24K(Number(e.target.value))}
                                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                                    <span>22K Standard Gold (91.6%)</span>
                                    <span className="text-gray-400 font-normal">Per gram</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                                    <input
                                        type="number"
                                        value={rate22K}
                                        onChange={(e) => setRate22K(Number(e.target.value))}
                                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                                    <span>20K Gold (83.3%)</span>
                                    <span className="text-gray-400 font-normal">Per gram</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                                    <input
                                        type="number"
                                        value={rate20K}
                                        onChange={(e) => setRate20K(Number(e.target.value))}
                                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                                    <span>18K Jewellery Gold (75.0%)</span>
                                    <span className="text-gray-400 font-normal">Per gram</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                                    <input
                                        type="number"
                                        value={rate18K}
                                        onChange={(e) => setRate18K(Number(e.target.value))}
                                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 border-t border-gray-100">
                                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                                    <span className="flex items-center gap-1">
                                        <Coins className="w-3.5 h-3.5 text-slate-500" />
                                        Silver / Chandi (Payal, Kada, Bracelet, etc.)
                                    </span>
                                    <span className="text-gray-400 font-normal">Per gram</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                                    <input
                                        type="number"
                                        value={rateSilver}
                                        onChange={(e) => setRateSilver(Number(e.target.value))}
                                        className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg text-slate-900 font-bold focus:ring-2 focus:ring-slate-500 focus:outline-none bg-slate-50/50"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm shadow-xs transition-colors"
                            >
                                <Save className="w-4 h-4" />
                                Save & Broadcast Rates
                            </button>
                        </form>
                    </div>

                    {/* Hardware & Peripherals */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-3">
                        <div className="flex items-center gap-2">
                            <Fingerprint className="w-5 h-5 text-gray-700" />
                            <h4 className="font-bold text-gray-900 text-sm">Connected Hardware</h4>
                        </div>

                        <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200/60">
                                <div>
                                    <div className="font-semibold text-gray-800">Mantra MFS100 Scanner</div>
                                    <div className="text-gray-400 text-[11px]">Optical Fingerprint RD Service</div>
                                </div>
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                    <CheckCircle2 className="w-3 h-3" /> Ready
                                </span>
                            </div>

                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200/60">
                                <div>
                                    <div className="font-semibold text-gray-800">Precision Gold Scale (RS-232)</div>
                                    <div className="text-gray-400 text-[11px]">0.01g Certified Calibration</div>
                                </div>
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                    <CheckCircle2 className="w-3 h-3" /> Linked
                                </span>
                            </div>

                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200/60">
                                <div>
                                    <div className="font-semibold text-gray-800">Thermal Receipt & Barcode Printer</div>
                                    <div className="text-gray-400 text-[11px]">Epson TM-T82III & TSC Barcode</div>
                                </div>
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                    <CheckCircle2 className="w-3 h-3" /> Online
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

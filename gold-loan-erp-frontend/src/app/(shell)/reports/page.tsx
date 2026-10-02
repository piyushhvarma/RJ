'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getDailyOperationsReport,
    recordDailyCashReconciliation,
    recordPhysicalInventoryReconciliation,
    getFinancialPortfolioReport,
    getPeriodicTrendsReport,
    getCustodyReport,
    getCustomerReport,
    getStaffAccountabilityReport,
    getReportExportUrl,
} from '@/lib/api/reports';
import {
    FileText,
    TrendingUp,
    ShieldCheck,
    Coins,
    Users,
    CreditCard,
    Printer,
    Download,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Scale,
    Gem,
    PieChart,
    BarChart3,
    Sparkles,
    ArrowUpRight,
    Vault,
    AlertTriangle,
    Clock,
    DollarSign,
    Box,
    Layers,
    UserCheck,
    ShieldAlert,
    Check,
    CalendarRange,
    Calendar,
} from 'lucide-react';
import { format } from 'date-fns';

type TierTab = 'tier1_daily' | 'tier_trends' | 'tier2_financial' | 'tier3_custody' | 'tier4_customers' | 'tier5_staff';

function fmtINR(n?: number | null) {
    if (n == null) return '—';
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function fmtINRDec(n?: number | null) {
    if (n == null) return '—';
    return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtCr(n?: number | null) {
    if (n == null) return '—';
    if (n >= 10000000) {
        return `₹${(n / 10000000).toFixed(2)} Cr`;
    }
    if (n >= 100000) {
        return `₹${(n / 100000).toFixed(2)} L`;
    }
    return fmtINR(n);
}

function fmtWeight(grams?: number | null) {
    if (grams == null) return '—';
    if (grams >= 1000) {
        return `${(grams / 1000).toFixed(2)} kg`;
    }
    return `${grams.toFixed(2)} g`;
}

export default function ReportsPage() {
    const qc = useQueryClient();
    const [activeTab, setActiveTab] = useState<TierTab>('tier1_daily');

    // Cash reconciliation local form state
    const [openingCashInput, setOpeningCashInput] = useState<number>(100000);
    const [physicalCashInput, setPhysicalCashInput] = useState<string>('');
    const [cashReconNotes, setCashReconNotes] = useState<string>('');
    const [reconSuccessMsg, setReconSuccessMsg] = useState<string | null>(null);

    // Vault inventory reconciliation local form state
    const [physicalPacketsInput, setPhysicalPacketsInput] = useState<string>('');
    const [vaultAuditSuccessMsg, setVaultAuditSuccessMsg] = useState<string | null>(null);

    // Periodic Trends Filter State
    const [trendGroupBy, setTrendGroupBy] = useState<'day' | 'month' | 'year'>('month');
    const [trendStartDate, setTrendStartDate] = useState<string>('');
    const [trendEndDate, setTrendEndDate] = useState<string>('');
    const [trendPreset, setTrendPreset] = useState<string>('last12m');

    const applyDatePreset = (preset: string) => {
        setTrendPreset(preset);
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        if (preset === 'last7d') {
            setTrendGroupBy('day');
            const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            setTrendStartDate(format(d, 'yyyy-MM-dd'));
            setTrendEndDate(todayStr);
        } else if (preset === 'last30d') {
            setTrendGroupBy('day');
            const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            setTrendStartDate(format(d, 'yyyy-MM-dd'));
            setTrendEndDate(todayStr);
        } else if (preset === 'thisMonth') {
            setTrendGroupBy('day');
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            setTrendStartDate(format(start, 'yyyy-MM-dd'));
            setTrendEndDate(todayStr);
        } else if (preset === 'last6m') {
            setTrendGroupBy('month');
            const d = new Date(now.getFullYear(), now.getMonth() - 5, 1);
            setTrendStartDate(format(d, 'yyyy-MM-dd'));
            setTrendEndDate(todayStr);
        } else if (preset === 'last12m') {
            setTrendGroupBy('month');
            const d = new Date(now.getFullYear() - 1, now.getMonth() + 1, 1);
            setTrendStartDate(format(d, 'yyyy-MM-dd'));
            setTrendEndDate(todayStr);
        } else if (preset === 'thisYear') {
            setTrendGroupBy('month');
            const start = new Date(now.getFullYear(), 0, 1);
            setTrendStartDate(format(start, 'yyyy-MM-dd'));
            setTrendEndDate(todayStr);
        } else if (preset === 'allYears') {
            setTrendGroupBy('year');
            setTrendStartDate('');
            setTrendEndDate('');
        } else if (preset === 'all') {
            setTrendStartDate('');
            setTrendEndDate('');
        }
    };

    // ── Queries for all Tiers ──
    const dailyQ = useQuery({
        queryKey: ['report-daily'],
        queryFn: () => getDailyOperationsReport(),
        staleTime: 30000,
    });

    const periodicTrendsQ = useQuery({
        queryKey: ['report-periodic-trends', trendGroupBy, trendStartDate, trendEndDate],
        queryFn: () =>
            getPeriodicTrendsReport({
                groupBy: trendGroupBy,
                startDate: trendStartDate || undefined,
                endDate: trendEndDate || undefined,
            }),
        staleTime: 60000,
        enabled: activeTab === 'tier_trends' || activeTab === 'tier2_financial',
    });

    const financialQ = useQuery({
        queryKey: ['report-financial'],
        queryFn: () => getFinancialPortfolioReport(),
        staleTime: 60000,
        enabled: activeTab === 'tier2_financial',
    });

    const custodyQ = useQuery({
        queryKey: ['report-custody'],
        queryFn: () => getCustodyReport(),
        staleTime: 60000,
        enabled: activeTab === 'tier3_custody',
    });

    const customerQ = useQuery({
        queryKey: ['report-customers'],
        queryFn: () => getCustomerReport(),
        staleTime: 60000,
        enabled: activeTab === 'tier4_customers',
    });

    const staffQ = useQuery({
        queryKey: ['report-staff'],
        queryFn: () => getStaffAccountabilityReport(),
        staleTime: 60000,
        enabled: activeTab === 'tier5_staff',
    });

    // ── Mutations ──
    const cashReconMutation = useMutation({
        mutationFn: (data: { openingCash: number; actualPhysicalCash: number; notes?: string }) =>
            recordDailyCashReconciliation(data),
        onSuccess: (res: any) => {
            qc.invalidateQueries({ queryKey: ['report-daily'] });
            setReconSuccessMsg(
                res.result === 'MATCH'
                    ? '✓ Cash reconciled: Physical till matches system closing balance exactly!'
                    : `⚠️ Variance logged: ₹${Math.abs(res.variance)} difference flagged for audit!`
            );
            setTimeout(() => setReconSuccessMsg(null), 6000);
        },
    });

    const vaultReconMutation = useMutation({
        mutationFn: (data: { actualPhysicalPackets: number; notes?: string }) =>
            recordPhysicalInventoryReconciliation(data),
        onSuccess: (res: any) => {
            qc.invalidateQueries({ queryKey: ['report-daily'] });
            qc.invalidateQueries({ queryKey: ['report-custody'] });
            setVaultAuditSuccessMsg(
                res.result === 'MATCH'
                    ? '✓ Vault physical audit verified with database records!'
                    : `🚨 Variance logged: ${Math.abs(res.variance)} packet discrepancy flagged as critical exception!`
            );
            setTimeout(() => setVaultAuditSuccessMsg(null), 6000);
        },
    });

    const isRefreshing =
        dailyQ.isFetching ||
        periodicTrendsQ.isFetching ||
        financialQ.isFetching ||
        custodyQ.isFetching ||
        customerQ.isFetching ||
        staffQ.isFetching;

    const handleRefreshCurrent = () => {
        if (activeTab === 'tier1_daily') dailyQ.refetch();
        if (activeTab === 'tier_trends') periodicTrendsQ.refetch();
        if (activeTab === 'tier2_financial') financialQ.refetch();
        if (activeTab === 'tier3_custody') custodyQ.refetch();
        if (activeTab === 'tier4_customers') customerQ.refetch();
        if (activeTab === 'tier5_staff') staffQ.refetch();
    };

    const handleExport = (key: string) => {
        const url =
            key === 'periodic-trends'
                ? getReportExportUrl(key, {
                      groupBy: trendGroupBy,
                      startDate: trendStartDate || undefined,
                      endDate: trendEndDate || undefined,
                  })
                : getReportExportUrl(key);
        window.open(url, '_blank');
    };

    const currentExportKey =
        activeTab === 'tier1_daily'
            ? 'daily-operations'
            : activeTab === 'tier_trends'
            ? 'periodic-trends'
            : activeTab === 'tier2_financial'
            ? 'financial-portfolio'
            : activeTab === 'tier3_custody'
            ? 'custody'
            : activeTab === 'tier4_customers'
            ? 'customers'
            : 'staff';

    return (
        <div className="space-y-6 max-w-7xl mx-auto print:p-0 print:space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
                        <BarChart3 className="w-7 h-7 text-amber-600" />
                        <span>Executive & Operational Reports</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                        <span>Audited ledger reporting suite</span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <Clock className="w-3 h-3" />
                            Live As-Of: {format(new Date(), 'dd MMM yyyy, HH:mm')}
                        </span>
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        onClick={handleRefreshCurrent}
                        disabled={isRefreshing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-2xs"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`} />
                        <span>{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
                    </button>

                    <button
                        onClick={() => handleExport(currentExportKey)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 shadow-2xs transition-colors"
                        title="Download CSV export with audit headers"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export CSV</span>
                    </button>

                    <button
                        onClick={() => typeof window !== 'undefined' && window.print()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-2xs"
                    >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                    </button>
                </div>
            </div>

            {/* Tier Tabs */}
            <div className="flex border-b border-gray-200 gap-1 overflow-x-auto print:hidden">
                <button
                    onClick={() => setActiveTab('tier1_daily')}
                    className={`pb-3 px-4 text-xs font-semibold whitespace-nowrap border-b-2 transition-all flex items-center gap-2 ${
                        activeTab === 'tier1_daily'
                            ? 'border-amber-600 text-amber-700 font-bold'
                            : 'border-transparent text-gray-500 hover:text-gray-900'
                    }`}
                >
                    <Clock className="w-4 h-4" />
                    <span>Tier 1: Daily Operations</span>
                </button>
                <button
                    onClick={() => setActiveTab('tier_trends')}
                    className={`pb-3 px-4 text-xs font-semibold whitespace-nowrap border-b-2 transition-all flex items-center gap-2 ${
                        activeTab === 'tier_trends'
                            ? 'border-amber-600 text-amber-700 font-bold'
                            : 'border-transparent text-gray-500 hover:text-gray-900'
                    }`}
                >
                    <CalendarRange className="w-4 h-4" />
                    <span>Lending & Releases (Day/Month/Year)</span>
                </button>
                <button
                    onClick={() => setActiveTab('tier2_financial')}
                    className={`pb-3 px-4 text-xs font-semibold whitespace-nowrap border-b-2 transition-all flex items-center gap-2 ${
                        activeTab === 'tier2_financial'
                            ? 'border-amber-600 text-amber-700 font-bold'
                            : 'border-transparent text-gray-500 hover:text-gray-900'
                    }`}
                >
                    <TrendingUp className="w-4 h-4" />
                    <span>Tier 2: Financial & Portfolio</span>
                </button>
                <button
                    onClick={() => setActiveTab('tier3_custody')}
                    className={`pb-3 px-4 text-xs font-semibold whitespace-nowrap border-b-2 transition-all flex items-center gap-2 ${
                        activeTab === 'tier3_custody'
                            ? 'border-amber-600 text-amber-700 font-bold'
                            : 'border-transparent text-gray-500 hover:text-gray-900'
                    }`}
                >
                    <Vault className="w-4 h-4" />
                    <span>Tier 3: Gold/Silver & Custody</span>
                </button>
                <button
                    onClick={() => setActiveTab('tier4_customers')}
                    className={`pb-3 px-4 text-xs font-semibold whitespace-nowrap border-b-2 transition-all flex items-center gap-2 ${
                        activeTab === 'tier4_customers'
                            ? 'border-amber-600 text-amber-700 font-bold'
                            : 'border-transparent text-gray-500 hover:text-gray-900'
                    }`}
                >
                    <Users className="w-4 h-4" />
                    <span>Tier 4: Customers & Risk</span>
                </button>
                <button
                    onClick={() => setActiveTab('tier5_staff')}
                    className={`pb-3 px-4 text-xs font-semibold whitespace-nowrap border-b-2 transition-all flex items-center gap-2 ${
                        activeTab === 'tier5_staff'
                            ? 'border-amber-600 text-amber-700 font-bold'
                            : 'border-transparent text-gray-500 hover:text-gray-900'
                    }`}
                >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Tier 5: Staff Accountability</span>
                </button>
            </div>

            {/* ════════════════════════════════════════════════════════════════════════════════
                TIER 1: DAILY OPERATIONS
               ════════════════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'tier1_daily' && (
                <div className="space-y-6">
                    {/* Top Operational Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
                            <p className="text-[11px] font-medium text-gray-500">Disbursed Today</p>
                            <p className="text-xl font-bold text-gray-900 mt-1">
                                {fmtINR(dailyQ.data?.summary.newLoans.amount)}
                            </p>
                            <span className="text-[11px] text-gray-500">
                                {dailyQ.data?.summary.newLoans.count ?? 0} new loan{dailyQ.data?.summary.newLoans.count === 1 ? '' : 's'}
                            </span>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
                            <p className="text-[11px] font-medium text-gray-500">Collections Today</p>
                            <p className="text-xl font-bold text-emerald-700 mt-1">
                                {fmtINR(dailyQ.data?.summary.paymentsReceived.totalAmount)}
                            </p>
                            <span className="text-[11px] text-gray-500">
                                {dailyQ.data?.summary.paymentsReceived.count ?? 0} payment{dailyQ.data?.summary.paymentsReceived.count === 1 ? '' : 's'}
                            </span>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
                            <p className="text-[11px] font-medium text-gray-500">Loans Closed Today</p>
                            <p className="text-xl font-bold text-gray-900 mt-1">
                                {fmtINR(dailyQ.data?.summary.loansClosed.principalAmount)}
                            </p>
                            <span className="text-[11px] text-gray-500">
                                {dailyQ.data?.summary.loansClosed.count ?? 0} closed & settled
                            </span>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
                            <p className="text-[11px] font-medium text-gray-500">Packets Vaulted</p>
                            <p className="text-xl font-bold text-amber-700 mt-1">
                                {dailyQ.data?.summary.packetsStored ?? 0}
                            </p>
                            <span className="text-[11px] text-gray-500">Stored into safe boxes</span>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
                            <p className="text-[11px] font-medium text-gray-500">Packets Handed Over</p>
                            <p className="text-xl font-bold text-indigo-700 mt-1">
                                {dailyQ.data?.summary.packetsReleased ?? 0}
                            </p>
                            <span className="text-[11px] text-gray-500">Gold released to borrower</span>
                        </div>
                    </div>

                    {/* Interest Earned Today: Realized vs Unrealized STRICT SEPARATION */}
                    <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50/70 via-white to-emerald-50/50 p-5 shadow-2xs">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Coins className="w-5 h-5 text-amber-700" />
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                                    Today's Interest Metrics (Realized vs Unrealized)
                                </h3>
                            </div>
                            <span className="text-[11px] font-medium bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200">
                                Never Blended
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-lg border border-emerald-200 shadow-2xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                                        Realized Interest Collected Today
                                    </span>
                                    <span className="text-[11px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded">
                                        Cash in Till
                                    </span>
                                </div>
                                <p className="text-2xl font-extrabold text-emerald-700 mt-2">
                                    {fmtINRDec(dailyQ.data?.interestToday.realized)}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Actual interest collected via completed payments today. Fully realized profit in hand.
                                </p>
                            </div>

                            <div className="bg-white p-4 rounded-lg border border-indigo-200 shadow-2xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">
                                        Unrealized Accrued Today (Active Book)
                                    </span>
                                    <span className="text-[11px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded">
                                        Book Accrual
                                    </span>
                                </div>
                                <p className="text-2xl font-extrabold text-indigo-700 mt-2">
                                    {fmtINRDec(dailyQ.data?.interestToday.unrealizedEstimated)}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Estimated 1-day interest accrued across the active live book today. Owed by borrowers, not yet collected.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Daily Cash Reconciliation Section */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-emerald-600" />
                                    <span>Daily Cash Drawer Reconciliation</span>
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Formula: Opening Float + Cash Collections − Cash Disbursements = Expected Closing Cash
                                </p>
                            </div>
                            {dailyQ.data?.cashReconciliation.lastVariance != null && (
                                <span
                                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                        Math.abs(dailyQ.data.cashReconciliation.lastVariance) < 1.0
                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                            : 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
                                    }`}
                                >
                                    {Math.abs(dailyQ.data.cashReconciliation.lastVariance) < 1.0
                                        ? '✓ Till Balanced'
                                        : `⚠️ Variance: ${fmtINR(dailyQ.data.cashReconciliation.lastVariance)}`}
                                </span>
                            )}
                        </div>

                        {reconSuccessMsg && (
                            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                                {reconSuccessMsg}
                            </div>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-3.5 rounded-lg border border-gray-200/70 mb-4 text-xs">
                            <div>
                                <p className="text-gray-500">Opening Cash Float</p>
                                <p className="font-bold text-gray-900 mt-0.5">
                                    {fmtINR(dailyQ.data?.cashReconciliation.openingCash)}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-500">Cash Collections In (+)</p>
                                <p className="font-bold text-emerald-700 mt-0.5">
                                    +{fmtINR(dailyQ.data?.cashReconciliation.cashCollections)}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-500">Cash Disbursements Out (−)</p>
                                <p className="font-bold text-rose-700 mt-0.5">
                                    −{fmtINR(dailyQ.data?.cashReconciliation.cashDisbursements)}
                                </p>
                            </div>
                            <div className="border-l border-gray-300 pl-3">
                                <p className="text-gray-700 font-semibold">Expected Closing Cash</p>
                                <p className="font-extrabold text-base text-gray-900 mt-0.5">
                                    {fmtINR(dailyQ.data?.cashReconciliation.expectedClosingCash)}
                                </p>
                            </div>
                        </div>

                        {/* Physical Count Entry Box */}
                        <div className="border border-dashed border-amber-300 rounded-lg p-4 bg-amber-50/40">
                            <p className="text-xs font-bold text-amber-900 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <span>End of Day Counter Cash Count</span>
                                <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-medium">Counter Staff Audit</span>
                            </p>
                            <div className="flex flex-col sm:flex-row items-center gap-3">
                                <div className="w-full sm:w-64">
                                    <label className="block text-[11px] text-gray-600 mb-1">Physical Cash Count (₹) *</label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 102500"
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        value={physicalCashInput}
                                        onChange={(e) => setPhysicalCashInput(e.target.value)}
                                    />
                                </div>
                                <div className="w-full sm:flex-1">
                                    <label className="block text-[11px] text-gray-600 mb-1">Counter Audit Notes (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="Drawer denomination count verified by counter staff..."
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        value={cashReconNotes}
                                        onChange={(e) => setCashReconNotes(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        const count = parseFloat(physicalCashInput);
                                        if (isNaN(count)) return;
                                        cashReconMutation.mutate({
                                            openingCash: dailyQ.data?.cashReconciliation.openingCash ?? 100000,
                                            actualPhysicalCash: count,
                                            notes: cashReconNotes,
                                        });
                                    }}
                                    disabled={!physicalCashInput || cashReconMutation.isPending}
                                    className="w-full sm:w-auto mt-4 sm:mt-0 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-2xs disabled:opacity-50 transition-colors whitespace-nowrap"
                                >
                                    {cashReconMutation.isPending ? 'Verifying…' : 'Record & Reconcile'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Overdue Buckets Aging & Due Soon */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Overdue Aging Matrix */}
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
                                <AlertTriangle className="w-4 h-4 text-rose-600" />
                                <span>Overdue Portfolio Aging Buckets</span>
                            </h3>
                            <div className="space-y-2.5">
                                {[
                                    { key: 'b1_7', data: dailyQ.data?.overdueBuckets.b1_7, color: 'text-amber-700 bg-amber-50 border-amber-200' },
                                    { key: 'b8_30', data: dailyQ.data?.overdueBuckets.b8_30, color: 'text-orange-700 bg-orange-50 border-orange-200' },
                                    { key: 'b31_90', data: dailyQ.data?.overdueBuckets.b31_90, color: 'text-red-700 bg-red-50 border-red-200' },
                                    { key: 'b90Plus', data: dailyQ.data?.overdueBuckets.b90Plus, color: 'text-purple-700 bg-purple-50 border-purple-200' },
                                ].map((b) => (
                                    <div key={b.key} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                                        <div className="flex items-center gap-2.5">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${b.color}`}>
                                                {b.data?.label}
                                            </span>
                                            <span className="text-xs text-gray-600">
                                                {b.data?.count ?? 0} overdue loan{(b.data?.count ?? 0) === 1 ? '' : 's'}
                                            </span>
                                        </div>
                                        <span className="text-xs font-bold text-gray-900">
                                            {fmtINR(b.data?.exposure)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Due Today / Due Soon */}
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs flex flex-col justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
                                    <Clock className="w-4 h-4 text-blue-600" />
                                    <span>Loans Maturing & Due Soon</span>
                                </h3>
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 text-center">
                                        <p className="text-[11px] font-semibold text-blue-800">Due Today</p>
                                        <p className="text-lg font-bold text-blue-900 mt-0.5">
                                            {dailyQ.data?.dueLoans.dueToday.length ?? 0}
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-indigo-50/70 border border-indigo-200 text-center">
                                        <p className="text-[11px] font-semibold text-indigo-800">In 3 Days</p>
                                        <p className="text-lg font-bold text-indigo-900 mt-0.5">
                                            {dailyQ.data?.dueLoans.due3Days.length ?? 0}
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-center">
                                        <p className="text-[11px] font-semibold text-amber-800">In 7 Days</p>
                                        <p className="text-lg font-bold text-amber-900 mt-0.5">
                                            {dailyQ.data?.dueLoans.due7Days.length ?? 0}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                                Automated SMS reminders are queued for all loans maturing within 7 days.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════════════════
                PERIODIC CASH FLOW & RELEASES (BY DAY / MONTH / YEAR)
               ════════════════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'tier_trends' && (
                <div className="space-y-6">
                    {/* Controls & Filters Card */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-4">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <CalendarRange className="w-5 h-5 text-amber-600" />
                                    <span>Capital Movement & Cash Flow Breakdown</span>
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Granular calculation of capital disbursed (lent), repayments collected, interest realized, and collateral released.
                                </p>
                            </div>

                            {/* Granularity Toggle Buttons (Day / Month / Year) */}
                            <div className="inline-flex items-center rounded-lg border border-gray-300 bg-gray-50 p-1 shadow-2xs">
                                <button
                                    onClick={() => setTrendGroupBy('day')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                                        trendGroupBy === 'day'
                                            ? 'bg-amber-600 text-white shadow-xs'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    By Day (Daily)
                                </button>
                                <button
                                    onClick={() => setTrendGroupBy('month')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                                        trendGroupBy === 'month'
                                            ? 'bg-amber-600 text-white shadow-xs'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    By Month (Monthly)
                                </button>
                                <button
                                    onClick={() => setTrendGroupBy('year')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                                        trendGroupBy === 'year'
                                            ? 'bg-amber-600 text-white shadow-xs'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    By Year (Annual)
                                </button>
                            </div>
                        </div>

                        {/* Quick Presets & Custom Date Range */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
                            {/* Preset Buttons */}
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                <span className="text-gray-400 font-medium mr-1 text-[11px]">Presets:</span>
                                {[
                                    { id: 'last7d', label: 'Last 7 Days' },
                                    { id: 'last30d', label: 'Last 30 Days' },
                                    { id: 'thisMonth', label: 'This Month' },
                                    { id: 'last6m', label: 'Last 6 Months' },
                                    { id: 'last12m', label: 'Last 12 Months' },
                                    { id: 'thisYear', label: 'This Year' },
                                    { id: 'allYears', label: 'All Years' },
                                ].map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => applyDatePreset(p.id)}
                                        className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                                            trendPreset === p.id
                                                ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>

                            {/* Custom Date Pickers */}
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                    <span>From:</span>
                                    <input
                                        type="date"
                                        className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                        value={trendStartDate}
                                        onChange={(e) => {
                                            setTrendStartDate(e.target.value);
                                            setTrendPreset('custom');
                                        }}
                                    />
                                    <span>To:</span>
                                    <input
                                        type="date"
                                        className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                        value={trendEndDate}
                                        onChange={(e) => {
                                            setTrendEndDate(e.target.value);
                                            setTrendPreset('custom');
                                        }}
                                    />
                                </div>
                                {(trendStartDate || trendEndDate) && (
                                    <button
                                        onClick={() => {
                                            setTrendStartDate('');
                                            setTrendEndDate('');
                                            setTrendPreset('all');
                                        }}
                                        className="text-xs text-gray-500 hover:text-gray-800 underline px-1"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Summary KPI Cards for Selected View */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                        {/* Capital Lent (Disbursed) */}
                        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs">
                            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                                <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
                                <span>Capital Lent (Disbursed)</span>
                            </span>
                            <p className="text-xl font-black text-amber-900 mt-1.5">
                                {fmtCr(periodicTrendsQ.data?.summary.totalCapitalLent)}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                                {periodicTrendsQ.data?.summary.totalLoansDisbursed.toLocaleString('en-IN') ?? 0} loans disbursed
                            </p>
                        </div>

                        {/* Capital Repaid (Principal Recovered) */}
                        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs">
                            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Capital Repaid (Principal)</span>
                            </span>
                            <p className="text-xl font-black text-emerald-700 mt-1.5">
                                +{fmtCr(periodicTrendsQ.data?.summary.totalPrincipalRepaid)}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                                {periodicTrendsQ.data?.summary.totalPaymentsCount.toLocaleString('en-IN') ?? 0} repayments
                            </p>
                        </div>

                        {/* Realized Interest Collected */}
                        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-2xs">
                            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1">
                                <Coins className="w-3.5 h-3.5 text-blue-600" />
                                <span>Interest Realized</span>
                            </span>
                            <p className="text-xl font-black text-blue-700 mt-1.5">
                                +{fmtCr(periodicTrendsQ.data?.summary.totalInterestCollected)}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                                +{fmtINR(periodicTrendsQ.data?.summary.totalPenaltiesAndFees)} fees & penalties
                            </p>
                        </div>

                        {/* Amount Released / Loans Closed */}
                        <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-2xs">
                            <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider flex items-center gap-1">
                                <Gem className="w-3.5 h-3.5 text-purple-600" />
                                <span>Collateral Released</span>
                            </span>
                            <p className="text-xl font-black text-purple-800 mt-1.5">
                                {fmtCr(periodicTrendsQ.data?.summary.totalReleasedPrincipal)}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                                {periodicTrendsQ.data?.summary.totalLoansClosed.toLocaleString('en-IN') ?? 0} loans closed • {fmtWeight(periodicTrendsQ.data?.summary.totalNetWeightReleased)}
                            </p>
                        </div>

                        {/* Net Cash Flow */}
                        <div
                            className={`p-4 rounded-xl border shadow-2xs ${
                                (periodicTrendsQ.data?.summary.totalNetCashFlow ?? 0) >= 0
                                    ? 'bg-emerald-50/50 border-emerald-300'
                                    : 'bg-rose-50/50 border-rose-300'
                            }`}
                        >
                            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 text-gray-700">
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Net Cash Flow</span>
                            </span>
                            <p
                                className={`text-xl font-black mt-1.5 ${
                                    (periodicTrendsQ.data?.summary.totalNetCashFlow ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
                                }`}
                            >
                                {(periodicTrendsQ.data?.summary.totalNetCashFlow ?? 0) >= 0 ? '+' : ''}
                                {fmtCr(periodicTrendsQ.data?.summary.totalNetCashFlow)}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                                Total Inflow minus Capital Lent
                            </p>
                        </div>
                    </div>

                    {/* Comparative Visual Timeline Chart (Top periods) */}
                    {periodicTrendsQ.data && periodicTrendsQ.data.rows.length > 0 && (
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <BarChart3 className="w-4 h-4 text-amber-600" />
                                    <span>Lending Outflow vs Cash Inflow vs Released Capital ({trendGroupBy.toUpperCase()})</span>
                                </h3>
                                <div className="flex items-center gap-3 text-[11px]">
                                    <span className="flex items-center gap-1 text-amber-800">
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                                        <span>Capital Lent</span>
                                    </span>
                                    <span className="flex items-center gap-1 text-emerald-800">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                                        <span>Cash Inflow</span>
                                    </span>
                                    <span className="flex items-center gap-1 text-purple-800">
                                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span>
                                        <span>Released Collateral</span>
                                    </span>
                                </div>
                            </div>

                            {/* Bar list */}
                            <div className="space-y-3 pt-2">
                                {periodicTrendsQ.data.rows.slice(0, 10).map((r) => {
                                    const maxVal = Math.max(
                                        ...periodicTrendsQ.data!.rows.slice(0, 10).map((x) =>
                                            Math.max(x.capitalLent, x.totalCashReceived, x.releasedPrincipal, 1)
                                        )
                                    );
                                    const lentPct = Math.min(100, Math.round((r.capitalLent / maxVal) * 100));
                                    const inPct = Math.min(100, Math.round((r.totalCashReceived / maxVal) * 100));
                                    const relPct = Math.min(100, Math.round((r.releasedPrincipal / maxVal) * 100));

                                    return (
                                        <div key={r.period} className="space-y-1 text-xs">
                                            <div className="flex justify-between items-center text-[11px] font-semibold text-gray-700">
                                                <span className="font-bold text-gray-900">{r.period}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-amber-700">Lent: {fmtCr(r.capitalLent)}</span>
                                                    <span className="text-emerald-700">In: {fmtCr(r.totalCashReceived)}</span>
                                                    <span className="text-purple-700">Released: {fmtCr(r.releasedPrincipal)}</span>
                                                    <span className={r.netCashFlow >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                                                        Net: {r.netCashFlow >= 0 ? '+' : ''}{fmtCr(r.netCashFlow)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 gap-1">
                                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden flex gap-0.5">
                                                    <div
                                                        style={{ width: `${lentPct}%` }}
                                                        className="bg-amber-500 h-full rounded-full transition-all"
                                                        title={`Capital Lent: ${fmtINR(r.capitalLent)}`}
                                                    />
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden flex gap-0.5">
                                                    <div
                                                        style={{ width: `${inPct}%` }}
                                                        className="bg-emerald-500 h-full rounded-full transition-all"
                                                        title={`Total Inflow: ${fmtINR(r.totalCashReceived)}`}
                                                    />
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden flex gap-0.5">
                                                    <div
                                                        style={{ width: `${relPct}%` }}
                                                        className="bg-purple-500 h-full rounded-full transition-all"
                                                        title={`Principal Released: ${fmtINR(r.releasedPrincipal)}`}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Detailed Data Table */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">
                                    Granular Period Ledger ({periodicTrendsQ.data?.rows.length ?? 0} {trendGroupBy} intervals)
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Exact calculation of loans disbursed, repayments, interest realized, and collateral released
                                </p>
                            </div>
                            <button
                                onClick={() => handleExport('periodic-trends')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Export Filtered Table to CSV</span>
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-200">
                                    <tr>
                                        <th className="py-3 px-3.5">Period / Date</th>
                                        <th className="py-3 px-3.5 text-right text-amber-900">Capital Lent (₹)</th>
                                        <th className="py-3 px-3.5 text-right text-emerald-900">Principal Repaid (₹)</th>
                                        <th className="py-3 px-3.5 text-right text-blue-900">Interest Collected (₹)</th>
                                        <th className="py-3 px-3.5 text-right text-gray-700">Fees / Penalties (₹)</th>
                                        <th className="py-3 px-3.5 text-right font-bold text-gray-900">Total Inflow (₹)</th>
                                        <th className="py-3 px-3.5 text-right text-purple-900">Loans Closed / Released</th>
                                        <th className="py-3 px-3.5 text-right font-bold">Net Cash Flow (₹)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-gray-800">
                                    {periodicTrendsQ.isLoading ? (
                                        <tr>
                                            <td colSpan={8} className="py-12 text-center text-gray-400">
                                                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
                                                <span>Calculating periodic breakdown from ledger…</span>
                                            </td>
                                        </tr>
                                    ) : !periodicTrendsQ.data || periodicTrendsQ.data.rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-12 text-center text-gray-400">
                                                No transaction activity recorded in the selected period.
                                            </td>
                                        </tr>
                                    ) : (
                                        periodicTrendsQ.data.rows.map((r, idx) => (
                                            <tr key={r.period} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40 hover:bg-gray-50'}>
                                                <td className="py-3 px-3.5 font-bold text-gray-900 whitespace-nowrap">
                                                    {r.period}
                                                </td>
                                                <td className="py-3 px-3.5 text-right">
                                                    <span className="font-bold text-amber-900">{fmtINR(r.capitalLent)}</span>
                                                    <span className="block text-[10px] text-gray-500">{r.loansDisbursedCount} loans</span>
                                                </td>
                                                <td className="py-3 px-3.5 text-right">
                                                    <span className="font-semibold text-emerald-700">+{fmtINR(r.principalRepaid)}</span>
                                                    <span className="block text-[10px] text-gray-500">{r.paymentsCount} pymts</span>
                                                </td>
                                                <td className="py-3 px-3.5 text-right">
                                                    <span className="font-semibold text-blue-700">+{fmtINR(r.interestCollected)}</span>
                                                </td>
                                                <td className="py-3 px-3.5 text-right text-gray-600">
                                                    {r.penaltiesAndFees > 0 ? `+${fmtINR(r.penaltiesAndFees)}` : '—'}
                                                </td>
                                                <td className="py-3 px-3.5 text-right font-bold text-gray-900">
                                                    +{fmtINR(r.totalCashReceived)}
                                                </td>
                                                <td className="py-3 px-3.5 text-right">
                                                    <span className="font-bold text-purple-900">{fmtINR(r.releasedPrincipal)}</span>
                                                    <span className="block text-[10px] text-gray-500">
                                                        {r.loansClosedCount} closed • {fmtWeight(r.netWeightReleased)} ({r.itemsReleasedCount} pcs)
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3.5 text-right font-extrabold whitespace-nowrap">
                                                    <span
                                                        className={`inline-block px-2 py-0.5 rounded text-xs ${
                                                            r.netCashFlow >= 0
                                                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                                                        }`}
                                                    >
                                                        {r.netCashFlow >= 0 ? '+' : ''}{fmtINR(r.netCashFlow)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                {periodicTrendsQ.data && periodicTrendsQ.data.rows.length > 0 && (
                                    <tfoot className="bg-gray-100/90 font-bold border-t-2 border-gray-300 text-gray-900">
                                        <tr>
                                            <td className="py-3.5 px-3.5 uppercase tracking-wide">
                                                TOTAL ({periodicTrendsQ.data.rows.length} {trendGroupBy}s)
                                            </td>
                                            <td className="py-3.5 px-3.5 text-right text-amber-900">
                                                <div>{fmtINR(periodicTrendsQ.data.summary.totalCapitalLent)}</div>
                                                <div className="text-[10px] font-normal text-gray-600">{periodicTrendsQ.data.summary.totalLoansDisbursed} loans</div>
                                            </td>
                                            <td className="py-3.5 px-3.5 text-right text-emerald-900">
                                                <div>+{fmtINR(periodicTrendsQ.data.summary.totalPrincipalRepaid)}</div>
                                                <div className="text-[10px] font-normal text-gray-600">{periodicTrendsQ.data.summary.totalPaymentsCount} pymts</div>
                                            </td>
                                            <td className="py-3.5 px-3.5 text-right text-blue-900">
                                                +{fmtINR(periodicTrendsQ.data.summary.totalInterestCollected)}
                                            </td>
                                            <td className="py-3.5 px-3.5 text-right text-gray-800">
                                                +{fmtINR(periodicTrendsQ.data.summary.totalPenaltiesAndFees)}
                                            </td>
                                            <td className="py-3.5 px-3.5 text-right text-gray-950 font-black">
                                                +{fmtINR(periodicTrendsQ.data.summary.totalCashReceived)}
                                            </td>
                                            <td className="py-3.5 px-3.5 text-right text-purple-950">
                                                <div>{fmtINR(periodicTrendsQ.data.summary.totalReleasedPrincipal)}</div>
                                                <div className="text-[10px] font-normal text-gray-600">
                                                    {periodicTrendsQ.data.summary.totalLoansClosed} closed • {fmtWeight(periodicTrendsQ.data.summary.totalNetWeightReleased)}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-3.5 text-right font-black">
                                                <span
                                                    className={`inline-block px-2.5 py-1 rounded text-xs ${
                                                        periodicTrendsQ.data.summary.totalNetCashFlow >= 0
                                                            ? 'bg-emerald-200 text-emerald-900'
                                                            : 'bg-rose-200 text-rose-900'
                                                    }`}
                                                >
                                                    {periodicTrendsQ.data.summary.totalNetCashFlow >= 0 ? '+' : ''}{fmtINR(periodicTrendsQ.data.summary.totalNetCashFlow)}
                                                </span>
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════════════════
                TIER 2: FINANCIAL & PORTFOLIO
               ════════════════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'tier2_financial' && (
                <div className="space-y-6">
                    {/* Granular Breakdown Quick Navigation Banner */}
                    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white p-4 rounded-xl border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                        <div>
                            <p className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                                <CalendarRange className="w-4 h-4 text-amber-700" />
                                <span>Day-by-Day, Month-by-Month, or Year-by-Year Calculations</span>
                            </p>
                            <p className="text-xs text-gray-600 mt-0.5">
                                Calculate how much money was disbursed (lent), repaid, and released with date filters and CSV export.
                            </p>
                        </div>
                        <button
                            onClick={() => setActiveTab('tier_trends')}
                            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-2xs whitespace-nowrap transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                        >
                            <span>Open Day / Month / Year Breakdown</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Realized vs Unrealized Interest Banner */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-xl border-2 border-emerald-500/40 shadow-xs">
                            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                                <span>Realized Interest Collected</span>
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">Cash In</span>
                            </span>
                            <p className="text-2xl font-black text-emerald-700 mt-2">
                                {fmtCr(financialQ.data?.interest.totalRealizedCollected)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                Exact collected interest from ledger receipts. True cash realized.
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-xl border-2 border-indigo-500/40 shadow-xs">
                            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
                                <span>Unrealized Interest Accrued</span>
                                <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">Book Value</span>
                            </span>
                            <p className="text-2xl font-black text-indigo-700 mt-2">
                                {fmtCr(financialQ.data?.interest.totalUnrealizedAccruedActiveBook)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                Total uncollected interest accrued across the live active book as of today.
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
                            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Live Active Loan Book
                            </span>
                            <p className="text-2xl font-black text-gray-900 mt-2">
                                {fmtCr(financialQ.data?.interest.activePrincipalBook)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                Total outstanding principal currently lent out across active pledges.
                            </p>
                        </div>
                    </div>

                    {/* Capital Flow & Liquidity */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-3">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-amber-600" />
                                <span>Capital Flow & Liquidity Summary</span>
                            </h3>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between py-1.5 border-b border-gray-100">
                                    <span className="text-gray-500">Total Capital Disbursed (Lent)</span>
                                    <span className="font-bold text-gray-900">{fmtCr(financialQ.data?.capitalSummary.capitalLent.amount)}</span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-gray-100">
                                    <span className="text-gray-500">Total Capital Recovered (Repaid Principal)</span>
                                    <span className="font-bold text-emerald-700">+{fmtCr(financialQ.data?.capitalSummary.capitalReceived.amount)}</span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-gray-100">
                                    <span className="text-gray-500">Realized Interest Collected</span>
                                    <span className="font-bold text-emerald-700">+{fmtCr(financialQ.data?.interest.totalRealizedCollected)}</span>
                                </div>
                                <div className="flex justify-between py-2 font-bold text-sm bg-gray-50 px-2 rounded">
                                    <span>Net Operational Cash Flow</span>
                                    <span className={(financialQ.data?.capitalSummary.netCashFlow ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                                        {fmtCr(financialQ.data?.capitalSummary.netCashFlow)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Lending Profit & Loss */}
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                                    <span>Lending-Side Profit & Loss</span>
                                </h3>
                                <span className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">
                                    Operating Margin
                                </span>
                            </div>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between py-1.5 border-b border-gray-100">
                                    <span className="text-gray-500">Realized Interest Income</span>
                                    <span className="font-bold text-emerald-700">+{fmtCr(financialQ.data?.profitAndLoss.realizedInterestIncome)}</span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-gray-100">
                                    <span className="text-gray-500">Overdue Penalties & Processing Fees</span>
                                    <span className="font-bold text-emerald-700">+{fmtCr(financialQ.data?.profitAndLoss.feesAndPenalties)}</span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-gray-100">
                                    <span className="text-gray-500">Bad Debt Write-Offs (Auction Shortfall)</span>
                                    <span className="font-bold text-rose-700">−{fmtINR(financialQ.data?.profitAndLoss.badDebtWriteOffs)}</span>
                                </div>
                                <div className="flex justify-between py-2 font-bold text-sm bg-emerald-50 text-emerald-900 px-2 rounded border border-emerald-200">
                                    <span>Net Lending Profit</span>
                                    <span>{fmtCr(financialQ.data?.profitAndLoss.netLendingProfit)}</span>
                                </div>
                            </div>
                            <p className="text-[11px] text-gray-400 italic">
                                * {financialQ.data?.profitAndLoss.disclaimer}
                            </p>
                        </div>
                    </div>

                    {/* Loan-to-Value (LTV) Risk Distribution */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                                    <span>Loan-to-Value (LTV) Risk Distribution</span>
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Regulatory risk bands based on pledged gold collateral valuation
                                </p>
                            </div>
                            <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-semibold">
                                RBI Guideline Threshold: 75%
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                            <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/50">
                                <span className="font-bold text-emerald-800">{financialQ.data?.ltvDistribution.under50.label}</span>
                                <p className="text-lg font-bold text-emerald-900 mt-1">
                                    {financialQ.data?.ltvDistribution.under50.count ?? 0} loans
                                </p>
                                <p className="text-gray-500 mt-0.5">{fmtCr(financialQ.data?.ltvDistribution.under50.principal)}</p>
                            </div>

                            <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/50">
                                <span className="font-bold text-blue-800">{financialQ.data?.ltvDistribution.b50_75.label}</span>
                                <p className="text-lg font-bold text-blue-900 mt-1">
                                    {financialQ.data?.ltvDistribution.b50_75.count ?? 0} loans
                                </p>
                                <p className="text-gray-500 mt-0.5">{fmtCr(financialQ.data?.ltvDistribution.b50_75.principal)}</p>
                            </div>

                            <div className="p-3.5 rounded-lg border border-amber-300 bg-amber-50">
                                <span className="font-bold text-amber-800">{financialQ.data?.ltvDistribution.b75_85.label}</span>
                                <p className="text-lg font-bold text-amber-900 mt-1">
                                    {financialQ.data?.ltvDistribution.b75_85.count ?? 0} loans
                                </p>
                                <p className="text-gray-500 mt-0.5">{fmtCr(financialQ.data?.ltvDistribution.b75_85.principal)}</p>
                            </div>

                            <div className="p-3.5 rounded-lg border border-rose-300 bg-rose-50">
                                <span className="font-bold text-rose-800">{financialQ.data?.ltvDistribution.above85.label}</span>
                                <p className="text-lg font-bold text-rose-900 mt-1">
                                    {financialQ.data?.ltvDistribution.above85.count ?? 0} loans
                                </p>
                                <p className="text-gray-500 mt-0.5">{fmtCr(financialQ.data?.ltvDistribution.above85.principal)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Monthly Trends & Cash Flow Table */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-amber-600" />
                                    <span>Trailing 12-Month Performance & Capital Trends</span>
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Historical breakdown of capital lent, principal repaid, collected interest, and closed loans
                                </p>
                            </div>
                            <button
                                onClick={() => setActiveTab('tier_trends')}
                                className="text-xs text-amber-700 hover:text-amber-800 font-bold underline flex items-center gap-1"
                            >
                                <span>Switch to Granular Day / Month / Year View →</span>
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                                    <tr>
                                        <th className="py-2.5 px-3.5">Month</th>
                                        <th className="py-2.5 px-3.5 text-right text-amber-900">Capital Lent (₹)</th>
                                        <th className="py-2.5 px-3.5 text-right text-emerald-900">Principal Repaid (₹)</th>
                                        <th className="py-2.5 px-3.5 text-right text-blue-900">Collected Interest (₹)</th>
                                        <th className="py-2.5 px-3.5 text-right text-purple-900">Released Capital (₹)</th>
                                        <th className="py-2.5 px-3.5 text-right font-bold">Net Cash Flow (₹)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-gray-800">
                                    {financialQ.data?.monthlyTrends?.map((m) => (
                                        <tr key={m.month} className="hover:bg-gray-50/60">
                                            <td className="py-2.5 px-3.5 font-bold text-gray-900">{m.month}</td>
                                            <td className="py-2.5 px-3.5 text-right text-amber-900 font-semibold">{fmtINR(m.capitalDisbursed)}</td>
                                            <td className="py-2.5 px-3.5 text-right text-emerald-700 font-semibold">+{fmtINR(m.principalReceived)}</td>
                                            <td className="py-2.5 px-3.5 text-right text-blue-700 font-semibold">+{fmtINR(m.collectedInterest)}</td>
                                            <td className="py-2.5 px-3.5 text-right text-purple-900 font-semibold">{fmtINR(m.releasedPrincipal)}</td>
                                            <td className="py-2.5 px-3.5 text-right font-bold">
                                                <span className={`px-2 py-0.5 rounded text-xs ${(m.netCashFlow ?? 0) >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                                    {(m.netCashFlow ?? 0) >= 0 ? '+' : ''}{fmtINR(m.netCashFlow)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════════════════
                TIER 3: GOLD/SILVER & CUSTODY
               ════════════════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'tier3_custody' && (
                <div className="space-y-6">
                    {/* Collateral Market Value vs Loan Exposure (Margin of Safety) */}
                    <div className="rounded-xl border border-amber-300 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white p-5 shadow-2xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <Scale className="w-5 h-5 text-amber-700" />
                                    <span>Collateral Value vs Total Book Exposure</span>
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Live spot rate benchmark: Gold ₹{custodyQ.data?.marginOfSafety.goldSpotRateUsed}/g, Silver ₹{custodyQ.data?.marginOfSafety.silverSpotRateUsed}/g
                                </p>
                            </div>
                            <div className="px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-sm border border-emerald-300 shadow-2xs flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                                <span>Portfolio Margin of Safety: {custodyQ.data?.marginOfSafety.safetyMarginPercent}%</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div className="bg-white p-3.5 rounded-lg border border-amber-200">
                                <p className="text-gray-500">Gold Pledged (Net)</p>
                                <p className="font-extrabold text-lg text-amber-900 mt-0.5">
                                    {fmtWeight(custodyQ.data?.goldPledged.netWeight)}
                                </p>
                                <p className="text-gray-400 text-[11px] mt-0.5">{custodyQ.data?.goldPledged.count} items</p>
                            </div>

                            <div className="bg-white p-3.5 rounded-lg border border-slate-200">
                                <p className="text-gray-500">Silver Pledged (Net)</p>
                                <p className="font-extrabold text-lg text-slate-800 mt-0.5">
                                    {fmtWeight(custodyQ.data?.silverPledged.netWeight)}
                                </p>
                                <p className="text-gray-400 text-[11px] mt-0.5">{custodyQ.data?.silverPledged.count} items</p>
                            </div>

                            <div className="bg-white p-3.5 rounded-lg border border-emerald-200">
                                <p className="text-gray-500">Total Collateral Market Value</p>
                                <p className="font-extrabold text-lg text-emerald-700 mt-0.5">
                                    {fmtCr(custodyQ.data?.marginOfSafety.totalCollateralMarketValue)}
                                </p>
                                <p className="text-gray-400 text-[11px] mt-0.5">Market liquid value</p>
                            </div>

                            <div className="bg-white p-3.5 rounded-lg border border-rose-200">
                                <p className="text-gray-500">Total Outstanding Principal</p>
                                <p className="font-extrabold text-lg text-rose-700 mt-0.5">
                                    {fmtCr(custodyQ.data?.marginOfSafety.totalExposurePrincipal)}
                                </p>
                                <p className="text-gray-400 text-[11px] mt-0.5">Active book debt</p>
                            </div>
                        </div>
                    </div>

                    {/* Physical Inventory Vault Walk Reconciliation */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <Vault className="w-4 h-4 text-amber-700" />
                                    <span>Physical Vault Inventory Reconciliation</span>
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Compare database expected packets against staff physical vault walk audit. Mismatches flag critical exceptions.
                                </p>
                            </div>
                            {custodyQ.data?.physicalReconciliation.variance !== 0 ? (
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 border border-rose-300 text-rose-700 animate-pulse">
                                    🚨 Packet Variance: {custodyQ.data?.physicalReconciliation.variance}
                                </span>
                            ) : (
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-300 text-emerald-700">
                                    ✓ Vault Packets Verified
                                </span>
                            )}
                        </div>

                        {vaultAuditSuccessMsg && (
                            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                                {vaultAuditSuccessMsg}
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-center gap-3 bg-gray-50 p-3.5 rounded-lg border border-gray-200">
                            <div className="text-xs sm:w-60">
                                <p className="text-gray-500">Expected Packets (In DB)</p>
                                <p className="text-lg font-extrabold text-gray-900 mt-0.5">
                                    {custodyQ.data?.boxes.totalPacketsInVault ?? 0} packets
                                </p>
                            </div>
                            <div className="w-full sm:w-64">
                                <input
                                    type="number"
                                    placeholder="Enter physical packet count..."
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    value={physicalPacketsInput}
                                    onChange={(e) => setPhysicalPacketsInput(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => {
                                    const count = parseInt(physicalPacketsInput, 10);
                                    if (isNaN(count)) return;
                                    vaultReconMutation.mutate({ actualPhysicalPackets: count });
                                }}
                                disabled={!physicalPacketsInput || vaultReconMutation.isPending}
                                className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-2xs disabled:opacity-50 transition-colors whitespace-nowrap"
                            >
                                {vaultReconMutation.isPending ? 'Verifying…' : 'Verify Vault Inventory'}
                            </button>
                        </div>
                    </div>

                    {/* 100-Box Occupancy Matrix */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <Box className="w-4 h-4 text-amber-600" />
                                    <span>Vault 100-Box Occupancy Matrix</span>
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Real-time custody density across all 100 physical boxes (RefDocNo % 100 storage rule)
                                </p>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> 1–20 (Normal)</span>
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> 21–30 (Busy)</span>
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> &gt;30 (Overloaded)</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 max-h-96 overflow-y-auto p-1 border rounded-lg border-gray-100 bg-gray-50/50">
                            {custodyQ.data?.boxes.occupancy.map((b) => (
                                <div
                                    key={b.box}
                                    className={`p-2 rounded text-center border transition-all hover:scale-105 ${
                                        b.status === 'OVERLOADED'
                                            ? 'bg-rose-100 border-rose-300 text-rose-900 font-extrabold shadow-2xs'
                                            : b.status === 'BUSY'
                                            ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                                            : b.packetCount > 0
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-medium'
                                            : 'bg-white border-gray-200 text-gray-400'
                                    }`}
                                >
                                    <p className="text-[10px] font-mono leading-none">Box {b.box}</p>
                                    <p className="text-xs font-bold mt-1">{b.packetCount}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════════════════
                TIER 4: CUSTOMERS
               ════════════════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'tier4_customers' && (
                <div className="space-y-6">
                    {/* Top Customer KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
                            <span className="text-xs font-medium text-gray-500">Total Borrowers Acquired</span>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {customerQ.data?.acquisition.totalCustomers.toLocaleString('en-IN') ?? 0}
                            </p>
                            <span className="text-xs text-emerald-700 font-semibold mt-1 inline-block">
                                {customerQ.data?.acquisition.kycVerifiedRate}% KYC Verified
                            </span>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
                            <span className="text-xs font-medium text-gray-500">Missing Mobile Numbers</span>
                            <p className="text-2xl font-bold text-amber-700 mt-1">
                                {customerQ.data?.kycMissingTracker.missingMobileCount ?? 0}
                            </p>
                            <span className="text-xs text-gray-500 mt-1 inline-block">
                                {customerQ.data?.kycMissingTracker.missingMobilePercent}% of customer base
                            </span>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
                            <span className="text-xs font-medium text-gray-500">Missing KYC Documents</span>
                            <p className="text-2xl font-bold text-rose-700 mt-1">
                                {customerQ.data?.kycMissingTracker.missingKycDocsCount ?? 0}
                            </p>
                            <span className="text-xs text-gray-500 mt-1 inline-block">
                                {customerQ.data?.kycMissingTracker.missingKycDocsPercent}% pending document upload
                            </span>
                        </div>
                    </div>

                    {/* Top 10 Borrowers (Concentration Risk) */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-amber-600" />
                                    <span>Top Borrowers (Concentration Risk)</span>
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Highest outstanding debt exposure across active pledge loans
                                </p>
                            </div>
                            <span className="text-xs text-gray-500">Ranked by Outstanding Principal</span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-gray-50 text-gray-600 uppercase border-y border-gray-200 font-semibold">
                                    <tr>
                                        <th className="py-2.5 px-3">Rank</th>
                                        <th className="py-2.5 px-3">Customer</th>
                                        <th className="py-2.5 px-3">Mobile</th>
                                        <th className="py-2.5 px-3">KYC</th>
                                        <th className="py-2.5 px-3 text-center">Active Loans</th>
                                        <th className="py-2.5 px-3 text-right">Outstanding Principal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {customerQ.data?.topBorrowers.map((b, idx) => (
                                        <tr key={b.id} className="hover:bg-amber-50/40">
                                            <td className="py-2.5 px-3 font-bold text-gray-500">#{idx + 1}</td>
                                            <td className="py-2.5 px-3">
                                                <p className="font-bold text-gray-900">{b.fullName}</p>
                                                <p className="text-[10px] text-gray-400 font-mono">{b.customerCode}</p>
                                            </td>
                                            <td className="py-2.5 px-3 font-mono text-gray-600">{b.mobile || '—'}</td>
                                            <td className="py-2.5 px-3">
                                                <span
                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        b.kycStatus === 'VERIFIED'
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : 'bg-amber-100 text-amber-800'
                                                    }`}
                                                >
                                                    {b.kycStatus}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-center font-bold">{b.activeLoansCount}</td>
                                            <td className="py-2.5 px-3 text-right font-extrabold text-amber-900">
                                                {fmtINR(b.activeExposure)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════════════════
                TIER 5: STAFF ACCOUNTABILITY
               ════════════════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'tier5_staff' && (
                <div className="space-y-6">
                    {/* Cashier Collections Breakdown */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-emerald-600" />
                                    <span>Cashier Collection Summary</span>
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Total receipts and mode breakdown attributed per counter staff account
                                </p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-gray-50 text-gray-600 uppercase border-y border-gray-200 font-semibold">
                                    <tr>
                                        <th className="py-2.5 px-3">Cashier</th>
                                        <th className="py-2.5 px-3">Role</th>
                                        <th className="py-2.5 px-3 text-center">Receipts</th>
                                        <th className="py-2.5 px-3 text-right">Cash (₹)</th>
                                        <th className="py-2.5 px-3 text-right">UPI (₹)</th>
                                        <th className="py-2.5 px-3 text-right">Bank Transfer (₹)</th>
                                        <th className="py-2.5 px-3 text-right font-bold">Total Collected (₹)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {staffQ.data?.cashierCollections.map((c) => (
                                        <tr key={c.cashierId} className="hover:bg-gray-50">
                                            <td className="py-2.5 px-3 font-bold text-gray-900">{c.cashierName}</td>
                                            <td className="py-2.5 px-3">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700">
                                                    {c.role}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-center font-semibold">{c.receiptsCount}</td>
                                            <td className="py-2.5 px-3 text-right text-emerald-700">{fmtINR(c.modes.CASH)}</td>
                                            <td className="py-2.5 px-3 text-right text-blue-700">{fmtINR(c.modes.UPI)}</td>
                                            <td className="py-2.5 px-3 text-right text-indigo-700">{fmtINR(c.modes.BANK_TRANSFER)}</td>
                                            <td className="py-2.5 px-3 text-right font-extrabold text-gray-900">{fmtINR(c.totalCollected)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Exceptions & Sensitive Overrides Report */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                                    <span>Exceptions & Sensitive Overrides Audit</span>
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Biometric fallbacks, manager overrides, and authorized concessions
                                </p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-gray-50 text-gray-600 uppercase border-y border-gray-200 font-semibold">
                                    <tr>
                                        <th className="py-2.5 px-3">Date & Time</th>
                                        <th className="py-2.5 px-3">Type</th>
                                        <th className="py-2.5 px-3">Borrower</th>
                                        <th className="py-2.5 px-3">Authorized By</th>
                                        <th className="py-2.5 px-3">Reason / Audit Trail</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {staffQ.data?.exceptionsAndOverrides.map((e) => (
                                        <tr key={e.id} className="hover:bg-amber-50/30">
                                            <td className="py-2.5 px-3 text-gray-500 font-mono">
                                                {format(new Date(e.timestamp), 'dd MMM yyyy, HH:mm')}
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                                                    {e.type}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <span className="font-semibold text-gray-900">{e.customerName}</span>
                                                <span className="text-[10px] text-gray-400 font-mono ml-1.5">({e.customerCode})</span>
                                            </td>
                                            <td className="py-2.5 px-3 text-gray-600 font-mono">{e.authorizedById}</td>
                                            <td className="py-2.5 px-3 text-gray-700 italic">{e.reason}</td>
                                        </tr>
                                    ))}
                                    {(!staffQ.data?.exceptionsAndOverrides || staffQ.data.exceptionsAndOverrides.length === 0) && (
                                        <tr>
                                            <td colSpan={5} className="py-6 text-center text-gray-400 italic">
                                                No manual overrides recorded in this period.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

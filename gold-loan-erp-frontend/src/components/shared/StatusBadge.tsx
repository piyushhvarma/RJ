import { cn } from '@/lib/utils';
import type { LoanStatus, PacketStatus, AppraisalStatus } from '@/lib/api/types';

// ─── Loan status ──────────────────────────────────────────────────────────────

const LOAN_STATUS_CONFIG: Record<LoanStatus, { label: string; className: string }> = {
    DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
    APPRAISAL_PENDING: { label: 'Appraisal Pending', className: 'bg-yellow-100 text-yellow-800' },
    APPRAISED: { label: 'Appraised', className: 'bg-blue-100 text-blue-700' },
    APPROVAL_PENDING: { label: 'Approval Pending', className: 'bg-yellow-100 text-yellow-800' },
    APPROVED: { label: 'Approved', className: 'bg-green-100 text-green-700' },
    DOCUMENT_PENDING: { label: 'Docs Pending', className: 'bg-orange-100 text-orange-700' },
    DISBURSED: { label: 'Disbursed', className: 'bg-green-100 text-green-700' },
    ACTIVE: { label: 'Active', className: 'bg-green-600 text-white' },
    OVERDUE: { label: 'Overdue', className: 'bg-red-100 text-red-700' },
    NOTICE: { label: 'Notice', className: 'bg-red-200 text-red-800' },
    AUCTION_ELIGIBLE: { label: 'Auction Eligible', className: 'bg-red-600 text-white' },
    AUCTIONED: { label: 'Auctioned', className: 'bg-red-800 text-white' },
    HOLD: { label: 'Hold', className: 'bg-yellow-200 text-yellow-900' },
    CLOSED: { label: 'Closed', className: 'bg-slate-100 text-slate-600' },
};

// ─── Packet status ────────────────────────────────────────────────────────────

const PACKET_STATUS_CONFIG: Record<PacketStatus, { label: string; className: string }> = {
    CREATED: { label: 'Created', className: 'bg-gray-100 text-gray-700' },
    SEALED: { label: 'Sealed', className: 'bg-blue-100 text-blue-700' },
    STORED: { label: 'Stored', className: 'bg-green-600 text-white' },
    IN_CLOSURE_PROCESS: { label: 'Closure in Progress', className: 'bg-amber-100 text-amber-800' },
    RETRIEVED: { label: 'Retrieved', className: 'bg-orange-100 text-orange-700' },
    RELEASED: { label: 'Released', className: 'bg-slate-100 text-slate-600' },
};

// ─── Appraisal status ─────────────────────────────────────────────────────────

const APPRAISAL_STATUS_CONFIG: Record<AppraisalStatus, { label: string; className: string }> = {
    DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
    APPRAISER_CONFIRMED: { label: 'Appraiser Confirmed', className: 'bg-blue-100 text-blue-700' },
    MANAGER_APPROVED: { label: 'Manager Approved', className: 'bg-green-100 text-green-700' },
    LOCKED: { label: 'Locked', className: 'bg-green-600 text-white' },
};

interface LoanStatusBadgeProps { status: LoanStatus }
interface PacketStatusBadgeProps { status: PacketStatus }
interface AppraisalStatusBadgeProps { status: AppraisalStatus }

function Badge({ label, className }: { label: string; className: string }) {
    return (
        <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', className)}>
            {label}
        </span>
    );
}

export function LoanStatusBadge({ status }: LoanStatusBadgeProps) {
    const cfg = LOAN_STATUS_CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-700' };
    return <Badge label={cfg.label} className={cfg.className} />;
}

export function PacketStatusBadge({ status }: PacketStatusBadgeProps) {
    const cfg = PACKET_STATUS_CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-700' };
    return <Badge label={cfg.label} className={cfg.className} />;
}

export function AppraisalStatusBadge({ status }: AppraisalStatusBadgeProps) {
    const cfg = APPRAISAL_STATUS_CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-700' };
    return <Badge label={cfg.label} className={cfg.className} />;
}

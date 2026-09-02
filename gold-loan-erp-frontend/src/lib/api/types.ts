/**
 * Backend API types + typed fetch functions.
 * One file per backend resource, matching API_REFERENCE.md exactly.
 */
import { apiFetch } from './client';

// ─── Shared backend types ────────────────────────────────────────────────────

export type UserRole = 'OWNER' | 'MANAGER' | 'APPRAISER' | 'CASHIER' | 'STAFF';
export type LoanStatus =
    | 'DRAFT' | 'APPRAISAL_PENDING' | 'APPRAISED' | 'APPROVAL_PENDING'
    | 'APPROVED' | 'DOCUMENT_PENDING' | 'DISBURSED' | 'ACTIVE'
    | 'OVERDUE' | 'NOTICE' | 'AUCTION_ELIGIBLE' | 'AUCTIONED' | 'HOLD' | 'CLOSED';
export type PacketStatus =
    | 'CREATED' | 'SEALED' | 'STORED' | 'IN_CLOSURE_PROCESS' | 'RETRIEVED' | 'RELEASED';
export type AppraisalStatus =
    | 'DRAFT' | 'APPRAISER_CONFIRMED' | 'MANAGER_APPROVED' | 'LOCKED';
export type JewelleryStatus = 'PLEDGED' | 'PART_RELEASE_PENDING' | 'RELEASED';
export type BiometricStatus = 'NOT_ENROLLED' | 'ENROLLED' | 'ENROLLMENT_FAILED';
export type BiometricResult = 'MATCH' | 'NO_MATCH' | 'DEVICE_ERROR';
export type RecordLifecycle = 'ACTIVE' | 'VOIDED' | 'CANCELLED' | 'REVERSED' | 'ARCHIVED';
export type InterestType = 'MONTHLY_SIMPLE' | 'DAILY_SIMPLE' | 'ANNUAL_SIMPLE' | 'CUSTOM';
export type PaymentMode = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER';
export type KycDocType = 'AADHAAR' | 'PAN' | 'DRIVING_LICENCE' | 'VOTER_ID' | 'OTHER';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

// ─── Entity shapes ───────────────────────────────────────────────────────────

export interface CustomerDocument {
    id: string;
    documentCode: string;
    docType: KycDocType;
    docNumberMasked: string;
    fileUrl: string;
    verificationStatus: VerificationStatus;
    verifiedAt?: string;
}

export interface BiometricEnrollment {
    id: string;
    enrollmentCode: string;
    status: BiometricStatus;
    enrolledAt: string;
}

export interface Customer {
    id: string;
    customerCode: string;
    fullName: string;
    guardianName?: string;
    dateOfBirth?: string;
    mobile: string;
    alternateMobile?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    occupation?: string;
    photoUrl?: string;
    signatureUrl?: string;
    kycStatus: VerificationStatus;
    biometricStatus: BiometricStatus;
    status: RecordLifecycle;
    createdAt: string;
    documents?: CustomerDocument[];
    biometric?: BiometricEnrollment;
    loans?: Loan[];
}

export interface JewelleryPhoto {
    id: string;
    angle: string;
    fileUrl: string;
    capturedAt: string;
}

export interface JewelleryItem {
    id: string;
    itemCode: string;
    category: string;
    description: string;
    grossWeight: number;
    stoneWeight: number;
    netWeight: number;
    purityKarat: string;
    fineness?: number;
    valuationRate: number;
    valuation: number;
    hallmarkDetails?: string;
    identifyingMarks?: string;
    condition?: string;
    ownershipDeclaration: boolean;
    status: JewelleryStatus;
    photos: JewelleryPhoto[];
    createdAt: string;
}

export interface Appraisal {
    id: string;
    loanId: string;
    appraiserId: string;
    status: AppraisalStatus;
    notes?: string;
    approvedById?: string;
    approvedAt?: string;
    goldRateSource?: string;
    goldRateValue?: number;
    goldRateAt?: string;
    createdAt: string;
}

export interface LedgerEntry {
    id: string;
    type: string;
    amount: number;
    balanceAfter: number;
    reason?: string;
    createdAt: string;
}

export interface StorageLocation {
    id: string;
    branch: string;
    safe: string;
    locker: string;
    shelf: string;
    position: string;
    label: string;
}

export interface PacketMovement {
    id: string;
    reason: string;
    timestamp: string;
    fromLocation?: StorageLocation;
    toLocation?: StorageLocation;
}

export interface Packet {
    id: string;
    packetCode: string;
    loanId: string;
    status: PacketStatus;
    storageLocation?: StorageLocation;
    storageLocationId?: string;
    sealedAt?: string;
    storedAt?: string;
    releasedAt?: string;
    createdAt: string;
    movements?: PacketMovement[];
}

export interface Payment {
    id: string;
    paymentCode: string;
    amount: number;
    paymentDate: string;
    mode: PaymentMode;
    principalComponent: number;
    interestComponent: number;
    penaltyComponent: number;
    otherCharges: number;
    receiptNumber: string;
    transactionRef?: string;
    notes?: string;
    lifecycle: RecordLifecycle;
    createdAt: string;
}

export interface Loan {
    id: string;
    loanCode: string;
    customerId: string;
    customer?: Customer;
    schemeId?: string;
    status: LoanStatus;
    principalAmount?: number;
    interestRate?: number;
    interestType?: InterestType;
    processingCharges?: number;
    otherCharges?: number;
    sanctionedDate?: string;
    maturityDate?: string;
    createdAt: string;
    updatedAt: string;
    jewelleryItems?: JewelleryItem[];
    appraisals?: Appraisal[];
    payments?: Payment[];
    ledgerEntries?: LedgerEntry[];
    packet?: Packet;
    documents?: unknown[];
}

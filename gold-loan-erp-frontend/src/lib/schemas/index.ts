/**
 * Zod schemas mirroring every backend DTO in API_REFERENCE.md exactly.
 * Field names, optionality and enums must stay in sync with the backend.
 */
import { z } from 'zod';

// ─── Auth ───────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});
export type LoginDto = z.infer<typeof loginSchema>;

// ─── Customers ──────────────────────────────────────────────────────────────

export const createCustomerSchema = z.object({
    fullName: z.string().min(1, 'Full name is required'),
    guardianName: z.string().optional(),
    dateOfBirth: z.string().optional(), // ISO date string
    mobile: z.string().min(10, 'Enter a valid mobile number'),
    alternateMobile: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    occupation: z.string().optional(),
    photoUrl: z.string().optional(),
    aadhaarNumber: z.string().optional(),
    aadhaarFileUrl: z.string().optional(),
});
export type CreateCustomerDto = z.infer<typeof createCustomerSchema>;

// ─── Loans ──────────────────────────────────────────────────────────────────

export const createLoanSchema = z.object({
    customerId: z.string().min(1, 'Customer is required'),
    schemeId: z.string().optional(),
    principalAmount: z.number().positive().optional(),
});
export type CreateLoanDto = z.infer<typeof createLoanSchema>;

export const InterestTypeEnum = z.enum([
    'MONTHLY_SIMPLE',
    'DAILY_SIMPLE',
    'ANNUAL_SIMPLE',
    'CUSTOM',
]);

export const disburseLoanSchema = z.object({
    principalAmount: z.number().positive('Principal must be positive'),
    interestRate: z.number().min(0, 'Interest rate must be ≥ 0'),
    interestType: InterestTypeEnum,
    processingCharges: z.number().min(0).optional(),
    maturityDate: z.string().min(1, 'Maturity date is required'),
});
export type DisburseLoanDto = z.infer<typeof disburseLoanSchema>;

// ─── Jewellery ───────────────────────────────────────────────────────────────

export const createJewelleryItemSchema = z.object({
    loanId: z.string().min(1),
    category: z.string().min(1, 'Category is required'),
    description: z.string().min(1, 'Description is required'),
    grossWeight: z.number().positive('Gross weight must be positive'),
    stoneWeight: z.number().min(0).optional(),
    purityKarat: z.string().min(1, 'Purity is required (e.g. 22K)'),
    fineness: z.number().int().optional(),
    valuationRate: z.number().positive('Valuation rate must be positive'),
    hallmarkDetails: z.string().optional(),
    identifyingMarks: z.string().optional(),
    condition: z.string().optional(),
    ownershipDeclaration: z.boolean().optional(),
    appraisalRemarks: z.string().optional(),
});
export type CreateJewelleryItemDto = z.infer<typeof createJewelleryItemSchema>;

export const addJewelleryPhotoSchema = z.object({
    angle: z.string().min(1, 'Angle is required (e.g. front, back, close_up)'),
    fileUrl: z.string().url('Enter a valid URL'),
});
export type AddJewelleryPhotoDto = z.infer<typeof addJewelleryPhotoSchema>;

// ─── Appraisal ──────────────────────────────────────────────────────────────

export const createAppraisalSchema = z.object({
    loanId: z.string().min(1),
    goldRateSource: z.string().optional(),
    goldRateValue: z.number().positive().optional(),
    notes: z.string().optional(),
});
export type CreateAppraisalDto = z.infer<typeof createAppraisalSchema>;

export const approveAppraisalSchema = z.object({
    notes: z.string().optional(),
});
export type ApproveAppraisalDto = z.infer<typeof approveAppraisalSchema>;

// ─── Packets ─────────────────────────────────────────────────────────────────

export const createPacketSchema = z.object({
    loanId: z.string().min(1, 'Loan is required'),
});
export type CreatePacketDto = z.infer<typeof createPacketSchema>;

export const storePacketSchema = z.object({
    branch: z.string().optional(),
    safe: z.string().min(1, 'Safe is required'),
    locker: z.string().min(1, 'Locker is required'),
    shelf: z.string().min(1, 'Shelf is required'),
    position: z.string().min(1, 'Position is required'),
});
export type StorePacketDto = z.infer<typeof storePacketSchema>;

export const retrievePacketSchema = z.object({
    reason: z.string().min(1, 'Reason is required'),
});
export type RetrievePacketDto = z.infer<typeof retrievePacketSchema>;

// ─── Payments ────────────────────────────────────────────────────────────────

export const PaymentModeEnum = z.enum([
    'CASH',
    'UPI',
    'BANK_TRANSFER',
    'OTHER',
]);

export const createPaymentSchema = z
    .object({
        loanId: z.string().min(1),
        amount: z.number().positive('Amount must be positive'),
        mode: PaymentModeEnum,
        principalComponent: z.number().min(0),
        interestComponent: z.number().min(0),
        penaltyComponent: z.number().min(0),
        otherCharges: z.number().min(0),
        transactionRef: z.string().optional(),
        notes: z.string().optional(),
    })
    .refine(
        (d) => {
            const sum =
                (d.principalComponent ?? 0) +
                (d.interestComponent ?? 0) +
                (d.penaltyComponent ?? 0) +
                (d.otherCharges ?? 0);
            return Math.abs(sum - d.amount) < 0.01;
        },
        {
            message:
                'Components (principal + interest + penalty + other) must sum exactly to total amount',
            path: ['amount'],
        },
    );
export type CreatePaymentDto = z.infer<typeof createPaymentSchema>;

// ─── Biometric ───────────────────────────────────────────────────────────────

export const biometricVerifySchema = z.object({
    loanId: z.string().optional(),
});
export type BiometricVerifyDto = z.infer<typeof biometricVerifySchema>;

export const biometricFallbackSchema = z.object({
    reason: z.string().min(1, 'Reason for manual override is required'),
    approvedById: z.string().min(1, 'Authorizing manager ID is required'),
    loanId: z.string().optional(),
});
export type BiometricFallbackDto = z.infer<typeof biometricFallbackSchema>;

import type { Response } from 'express';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { DocumentsService } from './documents.service.js';
export declare class DocumentsController {
    private readonly documentsService;
    constructor(documentsService: DocumentsService);
    findByLoan(loanId: string): Promise<({
        versions: {
            id: string;
            createdAt: Date;
            reason: string | null;
            fileUrl: string;
            createdById: string;
            versionNumber: number;
            scannedSignedCopyUrl: string | null;
            documentId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.DocumentStatus;
        documentCode: string;
        loanId: string;
        type: import("@prisma/client").$Enums.DocumentType;
        currentVersion: number;
        verificationCode: string;
    })[]>;
    findById(id: string): Promise<{
        loan: {
            customer: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                fullName: string;
                guardianName: string | null;
                dateOfBirth: Date | null;
                mobile: string | null;
                alternateMobile: string | null;
                address: string | null;
                city: string | null;
                state: string | null;
                pincode: string | null;
                occupation: string | null;
                photoUrl: string | null;
                customerCode: string;
                signatureUrl: string | null;
                kycStatus: import("@prisma/client").$Enums.VerificationStatus;
                biometricStatus: import("@prisma/client").$Enums.BiometricStatus;
                status: import("@prisma/client").$Enums.RecordLifecycle;
                createdById: string;
                legacySourceRef: string | null;
            };
            packet: ({
                storageLocation: {
                    id: string;
                    branch: string;
                    safe: string;
                    locker: string;
                    shelf: string;
                    position: string;
                    label: string;
                } | null;
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                status: import("@prisma/client").$Enums.PacketStatus;
                createdById: string;
                loanId: string;
                releasedAt: Date | null;
                packetCode: string;
                storageLocationId: string | null;
                sealedAt: Date | null;
                storedAt: Date | null;
            }) | null;
            scheme: {
                id: string;
                name: string;
                active: boolean;
                interestRate: number;
                interestType: import("@prisma/client").$Enums.InterestType;
                ltvThreshold: number | null;
                config: import("@prisma/client/runtime/library").JsonValue | null;
            } | null;
            jewelleryItems: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                status: import("@prisma/client").$Enums.JewelleryStatus;
                loanId: string;
                itemCode: string;
                category: string;
                metalType: import("@prisma/client").$Enums.MetalType;
                description: string;
                grossWeight: number;
                stoneWeight: number;
                netWeight: number;
                purityKarat: string;
                fineness: number | null;
                valuationRate: number;
                valuation: number;
                hallmarkDetails: string | null;
                identifyingMarks: string | null;
                condition: string | null;
                ownershipDeclaration: boolean;
                appraisalRemarks: string | null;
                releasedAt: Date | null;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            approvedById: string | null;
            status: import("@prisma/client").$Enums.LoanStatus;
            createdById: string;
            customerId: string;
            loanCode: string;
            schemeId: string | null;
            principalAmount: number | null;
            interestRate: number | null;
            interestType: import("@prisma/client").$Enums.InterestType | null;
            processingCharges: number | null;
            otherCharges: number | null;
            sanctionedDate: Date | null;
            maturityDate: Date | null;
            holdReason: import("@prisma/client").$Enums.HoldReason | null;
            holdNotes: string | null;
            legacyPledgeNo: string | null;
        };
        versions: {
            id: string;
            createdAt: Date;
            reason: string | null;
            fileUrl: string;
            createdById: string;
            versionNumber: number;
            scannedSignedCopyUrl: string | null;
            documentId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.DocumentStatus;
        documentCode: string;
        loanId: string;
        type: import("@prisma/client").$Enums.DocumentType;
        currentVersion: number;
        verificationCode: string;
    }>;
    getPledgeAgreementPdf(loanId: string, res: Response, user?: AuthenticatedUser): Promise<void>;
    getJewelleryAnnexurePdf(loanId: string, res: Response, user?: AuthenticatedUser): Promise<void>;
    getPaymentReceiptPdf(paymentId: string, res: Response, user?: AuthenticatedUser): Promise<void>;
    getClosureReceiptPdf(loanId: string, res: Response, user?: AuthenticatedUser): Promise<void>;
    markPrinted(id: string, user: AuthenticatedUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.DocumentStatus;
        documentCode: string;
        loanId: string;
        type: import("@prisma/client").$Enums.DocumentType;
        currentVersion: number;
        verificationCode: string;
    }>;
    markSigned(id: string, user: AuthenticatedUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.DocumentStatus;
        documentCode: string;
        loanId: string;
        type: import("@prisma/client").$Enums.DocumentType;
        currentVersion: number;
        verificationCode: string;
    }>;
}

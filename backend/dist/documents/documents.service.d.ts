import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { IdGeneratorService } from '../common/services/id-generator.service.js';
import { PdfGeneratorService } from './pdf-generator.service.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
export declare class DocumentsService {
    private readonly prisma;
    private readonly pdfGenerator;
    private readonly audit;
    private readonly idGenerator;
    constructor(prisma: PrismaService, pdfGenerator: PdfGeneratorService, audit: AuditService, idGenerator: IdGeneratorService);
    private generateVerificationCode;
    getLoanFullDetails(loanId: string): Promise<{
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
        documents: ({
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
        })[];
        scheme: {
            id: string;
            name: string;
            active: boolean;
            interestRate: number;
            interestType: import("@prisma/client").$Enums.InterestType;
            ltvThreshold: number | null;
            config: import("@prisma/client/runtime/library").JsonValue | null;
        } | null;
        jewelleryItems: ({
            photos: {
                id: string;
                fileUrl: string;
                angle: string;
                capturedById: string;
                capturedAt: Date;
                jewelleryItemId: string;
            }[];
        } & {
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
        })[];
        appraisals: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            approvedById: string | null;
            status: import("@prisma/client").$Enums.AppraisalStatus;
            loanId: string;
            appraiserId: string;
            notes: string | null;
            approvedAt: Date | null;
            goldRateSource: string | null;
            goldRateValue: number | null;
            goldRateAt: Date | null;
        }[];
        ledgerEntries: {
            id: string;
            createdAt: Date;
            reason: string | null;
            createdById: string;
            loanId: string;
            type: import("@prisma/client").$Enums.LedgerEntryType;
            amount: number;
            balanceAfter: number;
            relatedPaymentId: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        approvedById: string | null;
        status: import("@prisma/client").$Enums.LoanStatus;
        createdById: string;
        customerId: string;
        schemeId: string | null;
        principalAmount: number | null;
        interestRate: number | null;
        interestType: import("@prisma/client").$Enums.InterestType | null;
        processingCharges: number | null;
        maturityDate: Date | null;
        loanCode: string;
        otherCharges: number | null;
        sanctionedDate: Date | null;
        holdReason: import("@prisma/client").$Enums.HoldReason | null;
        holdNotes: string | null;
        legacyPledgeNo: string | null;
    }>;
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
    getDocumentById(documentId: string): Promise<{
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
            schemeId: string | null;
            principalAmount: number | null;
            interestRate: number | null;
            interestType: import("@prisma/client").$Enums.InterestType | null;
            processingCharges: number | null;
            maturityDate: Date | null;
            loanCode: string;
            otherCharges: number | null;
            sanctionedDate: Date | null;
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
    getPledgeAgreementPdf(loanId: string, user?: AuthenticatedUser): Promise<{
        buffer: Buffer;
        filename: string;
    }>;
    getJewelleryAnnexurePdf(loanId: string, user?: AuthenticatedUser): Promise<{
        buffer: Buffer;
        filename: string;
    }>;
    getPaymentReceiptPdf(paymentId: string, user?: AuthenticatedUser): Promise<{
        buffer: Buffer;
        filename: string;
    }>;
    getClosureReceiptPdf(loanId: string, user?: AuthenticatedUser): Promise<{
        buffer: Buffer;
        filename: string;
    }>;
    private recordDocumentGeneration;
    markPrinted(documentId: string, user: AuthenticatedUser): Promise<{
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
    markSigned(documentId: string, user: AuthenticatedUser): Promise<{
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

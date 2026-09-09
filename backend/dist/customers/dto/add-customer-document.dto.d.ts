import { KycDocType, VerificationStatus } from '@prisma/client';
export declare class AddCustomerDocumentDto {
    docType: KycDocType;
    docNumber: string;
    fileUrl: string;
    issueDate?: string;
    expiryDate?: string;
    verificationStatus?: VerificationStatus;
}

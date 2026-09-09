import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { KycDocType, VerificationStatus } from '@prisma/client';

export class AddCustomerDocumentDto {
  @IsEnum(KycDocType)
  docType: KycDocType;

  @IsString()
  docNumber: string; // Plain or masked; server will mask if plain Aadhaar/PAN

  @IsString()
  fileUrl: string; // Base64 data URL or uploaded file URL

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsEnum(VerificationStatus)
  verificationStatus?: VerificationStatus;
}

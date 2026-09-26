import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CloseLoanDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  customerSignatureUrl?: string;

  @IsBoolean()
  verifiedJewelleryCount: boolean;

  @IsOptional()
  @IsString()
  biometricOverrideReason?: string;
}

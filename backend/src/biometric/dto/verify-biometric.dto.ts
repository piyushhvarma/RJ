import { IsOptional, IsString } from 'class-validator';

export class VerifyBiometricDto {
  @IsOptional()
  @IsString()
  loanId?: string;
}

export class FallbackBiometricDto {
  @IsString()
  reason: string;

  @IsString()
  approvedById: string; // manager/owner authorizing the fallback

  @IsOptional()
  @IsString()
  loanId?: string;
}

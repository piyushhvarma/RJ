import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { PaymentMode } from '@prisma/client';

export class ReceivePaymentDto {
  @IsString()
  loanId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEnum(PaymentMode)
  mode: PaymentMode;

  // Allocation breakdown — the PRD requires the allocation method to be
  // "configurable and clearly displayed" (§28). Until the interest engine
  // (§24) exists to compute accrued interest automatically, the breakdown
  // is supplied by the caller (cashier UI, driven by whatever policy is
  // configured) rather than derived here.
  @IsOptional()
  @IsNumber()
  @Min(0)
  principalComponent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  interestComponent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  penaltyComponent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  otherCharges?: number;

  @IsOptional()
  @IsString()
  transactionRef?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

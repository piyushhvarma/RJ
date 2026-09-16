import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { PaymentMode } from '@prisma/client';

export enum TopUpMode {
  RENEW_WITH_INTEREST_DEDUCTED = 'RENEW_WITH_INTEREST_DEDUCTED',
  DIRECT_TOPUP = 'DIRECT_TOPUP',
}

export class TopUpLoanDto {
  @IsEnum(TopUpMode)
  mode: TopUpMode;

  @IsNumber()
  @IsPositive()
  topupAmount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  interestDeducted?: number;

  @IsNumber()
  @Min(0)
  netDisbursed: number;

  @IsOptional()
  @IsEnum(PaymentMode)
  paymentMode?: PaymentMode;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  customerPhotoUrl?: string;

  @IsOptional()
  @IsString()
  customerSignatureUrl?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  tenureMonths?: number;
}

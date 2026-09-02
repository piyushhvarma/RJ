import { IsEnum, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { InterestType } from '@prisma/client';

export class DisburseLoanDto {
  @IsNumber()
  @IsPositive()
  principalAmount: number;

  @IsNumber()
  interestRate: number;

  @IsEnum(InterestType)
  interestType: InterestType;

  @IsOptional()
  @IsNumber()
  processingCharges?: number;

  @IsString()
  maturityDate: string; // ISO date
}

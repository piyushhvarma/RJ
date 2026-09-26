import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InterestType, MetalType, PaymentMode } from '@prisma/client';

export class CounterJewelleryItemDto {
  @IsEnum(MetalType)
  metalType: MetalType;

  @IsString()
  category: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @IsPositive()
  grossWeight: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stoneWeight?: number;

  @IsNumber()
  @IsPositive()
  netWeight: number;

  @IsString()
  purityKarat: string;

  @IsOptional()
  @IsNumber()
  fineness?: number;

  @IsNumber()
  @Min(0)
  valuationRate: number;

  @IsNumber()
  @Min(0)
  valuation: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];
}

export class CounterOriginationDto {
  @IsString()
  customerId: string;

  @IsOptional()
  @IsString()
  customerPhotoUrl?: string;

  @IsOptional()
  @IsString()
  customerSignatureUrl?: string;

  @IsNumber()
  @IsPositive()
  principalAmount: number;

  @IsNumber()
  @Min(0)
  interestRate: number; // e.g. 30 (for 30% p.a. or 2.5% p.m.)

  @IsOptional()
  @IsEnum(InterestType)
  interestType?: InterestType;

  @IsOptional()
  @IsDateString()
  sanctionedDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  tenureMonths?: number;

  @IsOptional()
  @IsBoolean()
  deductFirstMonthInterest?: boolean;

  @IsOptional()
  @IsString()
  storageLocationLabel?: string;

  @IsOptional()
  @IsEnum(PaymentMode)
  paymentMode?: PaymentMode;

  @IsOptional()
  @IsString()
  transactionRef?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CounterJewelleryItemDto)
  jewelleryItems: CounterJewelleryItemDto[];
}

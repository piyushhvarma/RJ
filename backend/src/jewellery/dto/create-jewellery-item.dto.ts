import { IsBoolean, IsInt, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class CreateJewelleryItemDto {
  @IsString()
  loanId: string;

  @IsString()
  category: string;

  @IsString()
  description: string;

  @IsNumber()
  @IsPositive()
  grossWeight: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stoneWeight?: number;

  @IsString()
  purityKarat: string;

  @IsOptional()
  @IsInt()
  fineness?: number;

  @IsNumber()
  @IsPositive()
  valuationRate: number; // rate per gram used for this item's valuation

  @IsOptional()
  @IsString()
  hallmarkDetails?: string;

  @IsOptional()
  @IsString()
  identifyingMarks?: string;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsBoolean()
  ownershipDeclaration?: boolean;

  @IsOptional()
  @IsString()
  appraisalRemarks?: string;
}

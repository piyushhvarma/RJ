import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { JewelleryStatus } from '@prisma/client';

export class ListJewelleryDto {
  @IsOptional()
  @IsString()
  loanId?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  purityKarat?: string;

  @IsOptional()
  @IsEnum(JewelleryStatus)
  status?: JewelleryStatus;

  @IsOptional()
  @IsString()
  metalType?: 'ALL' | 'GOLD' | 'SILVER';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

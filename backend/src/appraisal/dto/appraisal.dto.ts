import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateAppraisalDto {
  @IsString()
  loanId: string;

  @IsOptional()
  @IsString()
  goldRateSource?: string;

  @IsOptional()
  @IsNumber()
  goldRateValue?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveAppraisalDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

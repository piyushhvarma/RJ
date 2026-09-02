import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateLoanDto {
  @IsString()
  customerId: string;

  @IsOptional()
  @IsString()
  schemeId?: string;

  // Loan starts in DRAFT (§23) — amount/rate/dates are filled in as the
  // wizard (§80) progresses through appraisal and approval, not required
  // up front at creation time.
  @IsOptional()
  @IsNumber()
  principalAmount?: number;
}

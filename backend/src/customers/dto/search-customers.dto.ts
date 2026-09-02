import { IsOptional, IsString } from 'class-validator';

export class SearchCustomersDto {
  // Matches against name, mobile, or customer code — the "Global search"
  // requirement in §54, scoped to customers for this endpoint.
  @IsOptional()
  @IsString()
  q?: string;
}

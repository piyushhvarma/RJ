import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  fullName: string;

  @IsOptional()
  @IsString()
  guardianName?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsString()
  mobile: string;

  @IsOptional()
  @IsString()
  alternateMobile?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsString()
  occupation?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  aadhaarNumber?: string;

  @IsOptional()
  @IsString()
  aadhaarFileUrl?: string;
}


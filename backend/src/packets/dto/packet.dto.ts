import { IsOptional, IsString } from 'class-validator';

export class CreatePacketDto {
  @IsString()
  loanId: string;
}

export class AssignStorageDto {
  @IsOptional()
  @IsString()
  branch?: string;

  @IsString()
  safe: string;

  @IsString()
  locker: string;

  @IsString()
  shelf: string;

  @IsString()
  position: string;
}

export class RetrievePacketDto {
  @IsString()
  reason: string;
}

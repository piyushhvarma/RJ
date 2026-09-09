import { IsString } from 'class-validator';

export class UpdateCustomerPhotoDto {
  @IsString()
  photoUrl: string;
}

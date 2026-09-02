import { IsString } from 'class-validator';

export class AddJewelleryPhotoDto {
  // front, back, close_up, hallmark, packaging (§18)
  @IsString()
  angle: string;

  @IsString()
  fileUrl: string;
}

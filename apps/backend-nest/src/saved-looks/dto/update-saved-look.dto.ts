import { IsString, IsOptional, IsUrl } from 'class-validator';

export class UpdateSavedLookDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUrl()
  image_url?: string;
}

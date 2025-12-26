import { IsString, IsOptional, IsUrl, IsUUID } from 'class-validator';

export class CreateSavedLookDto {
  @IsUUID()
  user_id: string;

  @IsUrl()
  image_url: string;

  @IsOptional()
  @IsString()
  name?: string;
}

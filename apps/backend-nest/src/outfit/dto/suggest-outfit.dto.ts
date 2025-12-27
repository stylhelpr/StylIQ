import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';

export class SuggestOutfitDto {
  @IsString()
  user_id: string;

  @IsString()
  prompt: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  thumbnail_url?: string;

  @IsOptional()
  @IsString()
  top_id?: string;

  @IsOptional()
  @IsString()
  bottom_id?: string;

  @IsOptional()
  @IsString()
  shoes_id?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accessory_ids?: string[];

  @IsOptional()
  @IsObject()
  weather_data?: any;

  @IsOptional()
  @IsString()
  location?: string;
}

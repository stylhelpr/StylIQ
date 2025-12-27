import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateScheduledOutfitDto {
  @IsOptional()
  @IsString()
  outfit_id?: string;

  @IsOptional()
  @IsIn(['custom', 'ai'])
  outfit_type?: 'custom' | 'ai';

  @IsOptional()
  @IsString()
  scheduled_for?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

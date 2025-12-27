import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateScheduledOutfitDto {
  @IsOptional()
  @IsString()
  outfit_id?: string;

  @IsOptional()
  @IsIn(['custom', 'ai', 'suggestion'])
  outfit_type?: 'custom' | 'ai' | 'suggestion';

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

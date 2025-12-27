import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateScheduledOutfitDto {
  @IsString()
  user_id: string;

  @IsString()
  outfit_id: string;

  @IsIn(['custom', 'ai', 'suggestion'])
  outfit_type: 'custom' | 'ai' | 'suggestion';

  @IsString()
  scheduled_for: string; // ISO string

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

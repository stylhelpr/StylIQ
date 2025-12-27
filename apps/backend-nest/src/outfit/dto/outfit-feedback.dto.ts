import { IsString, IsOptional, IsNumber } from 'class-validator';

export class OutfitFeedbackDto {
  @IsString()
  user_id: string;

  @IsString()
  outfit_id: string;

  @IsNumber()
  rating: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

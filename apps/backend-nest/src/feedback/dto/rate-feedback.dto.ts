// src/feedback/dto/rate-feedback.dto.ts
import { IsString, IsOptional, IsArray, IsIn, IsObject } from 'class-validator';

export class RateFeedbackDto {
  @IsString()
  user_id: string;

  @IsString()
  outfit_id: string;

  @IsIn(['like', 'dislike'])
  rating: 'like' | 'dislike';

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  item_ids?: string[];

  @IsOptional()
  @IsObject()
  outfit?: any;
}

/////////////////////

// // src/feedback/dto/rate-feedback.dto.ts
// export class RateFeedbackDto {
//   user_id: string;
//   outfit_id: string;
//   rating: 'like' | 'dislike';
//   notes?: string;
//   item_ids?: string[];
// }

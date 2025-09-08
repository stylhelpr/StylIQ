// src/feedback/dto/rate-feedback.dto.ts
export class RateFeedbackDto {
  user_id: string;
  outfit_id: string;
  rating: 'like' | 'dislike';
  notes?: string;
  item_ids?: string[];
}

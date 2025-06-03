export class CreateFeedbackDto {
  user_id: string;
  outfit_id: string;
  rating: 'like' | 'dislike';
  notes?: string;
}

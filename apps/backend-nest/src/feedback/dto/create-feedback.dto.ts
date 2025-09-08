export class CreateFeedbackDto {
  user_id: string;
  outfit_id: string;
  rating: 'like' | 'dislike';
  item_ids?: string[]; // ← ADD (the 2–3 item IDs in the outfit)
  notes?: string;
}

///////////////

// export class CreateFeedbackDto {
//   user_id: string;
//   outfit_id: string;
//   rating: 'like' | 'dislike';
//   notes?: string;
// }

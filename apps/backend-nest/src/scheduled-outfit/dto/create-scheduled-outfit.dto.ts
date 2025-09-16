export class CreateScheduledOutfitDto {
  user_id: string;
  outfit_id: string;
  outfit_type: 'custom' | 'ai';
  scheduled_for: string; // ISO string
  location?: string;
  notes?: string;
}

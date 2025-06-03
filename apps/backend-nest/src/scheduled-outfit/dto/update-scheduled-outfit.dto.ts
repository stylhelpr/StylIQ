export class UpdateScheduledOutfitDto {
  outfit_id?: string;
  outfit_type?: 'custom' | 'ai';
  scheduled_for?: string;
  location?: string;
  notes?: string;
}

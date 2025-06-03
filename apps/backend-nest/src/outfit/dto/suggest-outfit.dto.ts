export class SuggestOutfitDto {
  user_id: string;
  prompt: string;
  top_id?: string;
  bottom_id?: string;
  shoes_id?: string;
  accessory_ids?: string[];
  weather_data?: Record<string, any>;
  location?: string;
}

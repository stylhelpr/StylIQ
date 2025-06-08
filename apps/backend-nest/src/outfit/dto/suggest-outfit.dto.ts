export class SuggestOutfitDto {
  user_id: string;
  prompt: string;
  name?: string;
  thumbnail_url?: string;
  top_id?: string;
  bottom_id?: string;
  shoes_id?: string;
  accessory_ids?: string[];
  weather_data?: any;
  location?: string;
}

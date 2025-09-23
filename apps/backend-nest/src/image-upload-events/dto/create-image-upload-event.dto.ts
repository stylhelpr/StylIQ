export class CreateImageUploadEventDto {
  user_id: string;
  wardrobe_item_id?: string;
  file_name: string;
  width: number;
  height: number;
  ai_tags?: Record<string, any>;
  embedding_vector?: number[];
}

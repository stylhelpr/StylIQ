export class CreateCustomOutfitDto {
  user_id!: string;
  name?: string;
  top_id?: string;
  bottom_id?: string;
  shoes_id?: string;
  accessory_ids?: string[];
  notes?: string;
}

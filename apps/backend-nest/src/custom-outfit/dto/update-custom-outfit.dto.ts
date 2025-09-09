// update-custom-outfit.dto.ts
export class UpdateCustomOutfitDto {
  name?: string;
  top_id?: string;
  bottom_id?: string;
  shoes_id?: string;
  accessory_ids?: string[];
  metadata?: Record<string, any>;
  notes?: string;
  rating?: number;
}

////////////

// export class UpdateCustomOutfitDto {
//   name?: string;
//   top_id?: string;
//   bottom_id?: string;
//   shoes_id?: string;
//   accessory_ids?: string[];
//   notes?: string;
// }

// create-custom-outfit.dto.ts
export class CreateCustomOutfitDto {
  user_id: string;
  name?: string;
  top_id?: string;
  bottom_id?: string;
  shoes_id?: string;
  accessory_ids?: string[];
  metadata?: Record<string, any>; // jsonb can hold any JSON object
  notes?: string;
  rating?: number;
}

////////////////

// export class CreateCustomOutfitDto {
//   user_id: string;
//   name?: string;
//   top_id?: string;
//   bottom_id?: string;
//   shoes_id?: string;
//   accessory_ids?: string[];
//   notes?: string;
// }

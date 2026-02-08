// create-custom-outfit.dto.ts
import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsObject,
} from 'class-validator';

export class CreateCustomOutfitDto {
  @IsString()
  user_id: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  top_id?: string;

  @IsOptional()
  @IsString()
  bottom_id?: string;

  @IsOptional()
  @IsString()
  shoes_id?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accessory_ids?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>; // jsonb can hold any JSON object

  @IsOptional()
  @IsObject()
  canvas_data?: {
    version: number;
    placedItems: Array<{
      id: string;
      wardrobeItemId: string;
      x: number;
      y: number;
      scale: number;
      zIndex: number;
    }>;
  };

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  rating?: number;

  @IsOptional()
  @IsString()
  thumbnail_url?: string;
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

import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class TripItemDto {
  @IsString()
  wardrobeItemId: string;

  @IsOptional()
  @IsString()
  role?: string;
}

export class UpdateTripItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TripItemDto)
  items: TripItemDto[];

  @IsOptional()
  capsule?: any;
}

import { IsString } from 'class-validator';

export class FavoriteOutfitDto {
  @IsString()
  user_id: string;

  @IsString()
  outfit_id: string;
}

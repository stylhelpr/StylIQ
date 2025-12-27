import { IsString, IsIn } from 'class-validator';

export class RemoveFavoriteDto {
  @IsString()
  user_id: string;

  @IsString()
  outfit_id: string;

  @IsIn(['suggestion', 'custom'])
  outfit_type: 'suggestion' | 'custom';
}

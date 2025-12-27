import { IsString } from 'class-validator';

export class DeleteItemDto {
  @IsString()
  item_id: string;

  @IsString()
  user_id: string;

  @IsString()
  image_url: string;
}

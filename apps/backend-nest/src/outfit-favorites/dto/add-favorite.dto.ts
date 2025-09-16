export class AddFavoriteDto {
  user_id: string;
  outfit_id: string;
  outfit_type: 'suggestion' | 'custom';
}

export class RemoveFavoriteDto {
  user_id: string;
  outfit_id: string;
  outfit_type: 'suggestion' | 'custom';
}

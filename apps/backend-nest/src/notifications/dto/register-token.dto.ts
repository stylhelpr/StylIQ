export class RegisterTokenDto {
  user_id: string;
  device_token: string;
  platform: 'ios' | 'android';
}

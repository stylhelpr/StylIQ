import { IsString, IsIn } from 'class-validator';

export class RegisterTokenDto {
  @IsString()
  user_id: string;

  @IsString()
  device_token: string;

  @IsIn(['ios', 'android'])
  platform: 'ios' | 'android';
}

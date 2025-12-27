import { IsString, IsOptional, IsEmail } from 'class-validator';

export class ContactDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsString()
  message: string;
}

import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ChatMessage {
  @IsString()
  role: 'system' | 'user' | 'assistant';

  @IsString()
  content: string;
}

export class ChatDto {
  @IsOptional()
  @IsString()
  user_id?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessage)
  messages: ChatMessage[];

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  weather?: Record<string, any>;

  @IsOptional()
  @IsString()
  suggested_outfit_id?: string | null;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lon?: number;
}

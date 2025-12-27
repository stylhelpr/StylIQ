import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateSavedNoteDto {
  @IsString()
  user_id: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

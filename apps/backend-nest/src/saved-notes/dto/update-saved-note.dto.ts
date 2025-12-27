import { IsString, IsOptional, IsArray, ValidateIf } from 'class-validator';

export class UpdateSavedNoteDto {
  @IsOptional()
  @ValidateIf((o, v) => v !== null)
  @IsString()
  url?: string | null;

  @IsOptional()
  @ValidateIf((o, v) => v !== null)
  @IsString()
  title?: string | null;

  @IsOptional()
  @ValidateIf((o, v) => v !== null)
  @IsString()
  content?: string | null;

  @IsOptional()
  @ValidateIf((o, v) => v !== null)
  @IsArray()
  @IsString({ each: true })
  tags?: string[] | null;
}

import { IsString, IsOptional, IsIn, IsObject } from 'class-validator';

export class AnalyzeImageRequestDto {
  @IsString()
  user_id!: string;

  @IsString()
  gsutil_uri!: string;

  @IsOptional()
  @IsIn(['Male', 'Female', 'Unisex'])
  gender?: 'Male' | 'Female' | 'Unisex';

  @IsOptional()
  @IsString()
  dressCode?: string;

  @IsOptional()
  @IsIn(['Spring', 'Summer', 'Fall', 'Winter', 'AllSeason'])
  season?: 'Spring' | 'Summer' | 'Fall' | 'Winter' | 'AllSeason';
}

export class AnalyzeImageResponseDto {
  @IsObject()
  draft!: Record<string, any>;
}

export class AnalyzeImageRequestDto {
  user_id!: string;
  gsutil_uri!: string;
  gender?: 'Male' | 'Female' | 'Unisex';
  dressCode?: string;
  season?: 'Spring' | 'Summer' | 'Fall' | 'Winter' | 'AllSeason';
}

export class AnalyzeImageResponseDto {
  draft!: Record<string, any>;
}

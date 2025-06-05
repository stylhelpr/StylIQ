export class PromptDto {
  user_id!: string;
  prompt!: string;
  ai_response_summary?: string;
  location?: string;
  weather?: Record<string, any>;
  suggested_outfit_id?: string;
}

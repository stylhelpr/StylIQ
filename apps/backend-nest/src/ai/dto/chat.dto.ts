export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export class ChatDto {
  user_id?: string; // optional—send from client if you have it
  messages: ChatMessage[];
  // optional contextual metadata to log along with the prompt
  location?: string;
  weather?: Record<string, any>;
  suggested_outfit_id?: string | null;
}

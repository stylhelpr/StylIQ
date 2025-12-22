export class CreateSavedNoteDto {
  user_id: string;
  url?: string;
  title?: string;
  content?: string;
  tags?: string[];
}

export class SearchDto {
  vector: number[];
  topK: number;
  metadata?: Record<string, any>;
}

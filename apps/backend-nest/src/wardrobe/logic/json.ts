// json.ts — strict JSON extractor (moved from service)
export function extractStrictJson(text: string): any {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in model response');
  }
  const jsonStr = text.slice(start, end + 1);
  return JSON.parse(jsonStr);
}

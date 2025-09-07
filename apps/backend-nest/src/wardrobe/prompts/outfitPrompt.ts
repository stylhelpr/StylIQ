// outfitPrompt.ts — builds the strict JSON outfit prompt (moved from service)
import { parseConstraints } from '../logic/constraints';

export function buildOutfitPrompt(
  catalogLines: string,
  userQuery: string,
): string {
  const constraints = parseConstraints(userQuery);
  const constraintsLine = JSON.stringify(constraints);

  return `
You are a world-class personal stylist.

Catalog (use ONLY these items by index as provided):
${catalogLines}

User request: "${userQuery}"
Parsed constraints (for your guidance): ${constraintsLine}

Rules (must follow):
- Build 2–3 complete outfits ONLY from the catalog by numeric index.
- HONOR explicit constraints in the request:
  • If the user mentions "loafers", at least one outfit must use a catalog item with subcategory "Loafers" or shoe_style "Loafer"; if none exist, note it in "missing".
  • Prefer dress_code ≈ the user's intent (e.g., BusinessCasual for “business casual”) and formality_score around 6–8 for BusinessCasual.
  • Prefer color matches when the user calls them out (e.g., brown loafers when “brown loafers” is requested).
- Keep coherent slots (normally: 1 shoes, 1 bottom, 1 shirt; outerwear optional; accessories optional).
- The "items" array MUST be numeric indices from the catalog (no free text).
- If a crucial piece is unavailable, set "missing" to a short note.

Respond in STRICT JSON only (no markdown, no code fences):
{
  "outfits": [
    {
      "title": "string",
      "items": [1,2,3],
      "why": "one sentence",
      "missing": "optional short note"
    }
  ]
}
`.trim();
}

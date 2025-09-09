// apps/backend-nest/src/wardrobe/prompts/outfitPrompt.ts
// outfitPrompt.ts — builds the strict JSON outfit prompt

import { parseConstraints } from '../logic/constraints';

export function buildOutfitPrompt(
  catalogLines: string,
  userQuery: string,
): string {
  const constraints = parseConstraints(userQuery);
  const constraintsLine = JSON.stringify(constraints);

  const s = (userQuery || '').toLowerCase();
  const gymIntent = /\b(gym|work ?out|workout|training|exercise)\b/.test(s);
  const upscaleIntent =
    /\b(upscale|smart\s*casual|business|formal|dressy|rooftop)\b/.test(s);

  return `
You are a world-class personal stylist.

CATALOG (use ONLY these items by numeric index):
${catalogLines}

USER REQUEST: "${userQuery}"
PARSED_CONSTRAINTS: ${constraintsLine}
CONTEXT_HINTS: ${JSON.stringify({ gymIntent, upscaleIntent })}

SELECTION RULES (strict):
- Build 2–3 complete outfits using ONLY catalog indices.
- Each outfit MUST include:
  • Exactly ONE BOTTOM,
  • Exactly ONE pair of SHOES,
  • At least ONE TOP.
  Outerwear and accessories are optional.
- If a required slot is unavailable in the catalog, omit that slot from "items" and put a short note in "missing" (e.g., "no bottoms found").
- Prefer earlier indices (they are higher-ranked by the app).
- Do NOT invent items. The "items" array MUST contain numeric indices only (no text labels).
- Do not repeat the same index within a single outfit.

SLOT DETECTION (by label keywords; case-insensitive):
- TOPS: shirt, t-shirt, tee, polo, sweater, knit, henley, hoodie (treat as top when no jacket is used).
- BOTTOMS: trouser, pants, jeans, chinos, shorts, jogger, sweatpant.
- SHOES: sneaker, trainer, loafer, boot, oxford, derby, dress shoe, sandal.
- OUTERWEAR: blazer, sport coat, jacket, coat, trench, parka, windbreaker.

INTENT GUARDRAILS:
- If CONTEXT_HINTS.gymIntent === true:
  • Require sneakers in every outfit.
  • Prefer shorts or joggers; avoid trousers/jeans when shorts/joggers exist.
  • Avoid loafers, dress shoes, blazers, and belts unless explicitly requested.
- If CONTEXT_HINTS.upscaleIntent === true:
  • Avoid hoodies, windbreakers, shorts, and casual jeans unless clearly dressy.
  • Prefer footwear aligned to the dress intent (e.g., loafers/dress shoes for Business/SmartCasual; minimalist sneakers only for SmartCasual).

OUTPUT FORMAT (STRICT JSON ONLY — no markdown, no code fences):
{
  "outfits": [
    {
      "title": "string",
      "items": [1,2,3],  // TOP, BOTTOM, SHOES (+ optional outerwear/accessories)
      "why": "one concise sentence",
      "missing": "optional short note"
    }
  ]
}
`.trim();
}

////////////////////

// // outfitPrompt.ts — builds the strict JSON outfit prompt (moved from service)
// import { parseConstraints } from '../logic/constraints';

// export function buildOutfitPrompt(
//   catalogLines: string,
//   userQuery: string,
// ): string {
//   const constraints = parseConstraints(userQuery);
//   const constraintsLine = JSON.stringify(constraints);

//   return `
// You are a world-class personal stylist.

// Catalog (use ONLY these items by index as provided):
// ${catalogLines}

// User request: "${userQuery}"
// Parsed constraints (for your guidance): ${constraintsLine}

// Rules (must follow):
// - Build 2–3 complete outfits ONLY from the catalog by numeric index.
// - HONOR explicit constraints in the request:
//   • If the user mentions "loafers", at least one outfit must use a catalog item with subcategory "Loafers" or shoe_style "Loafer"; if none exist, note it in "missing".
//   • Prefer dress_code ≈ the user's intent (e.g., BusinessCasual for “business casual”) and formality_score around 6–8 for BusinessCasual.
//   • Prefer color matches when the user calls them out (e.g., brown loafers when “brown loafers” is requested).
// - Keep coherent slots (normally: 1 shoes, 1 bottom, 1 shirt; outerwear optional; accessories optional).
// - The "items" array MUST be numeric indices from the catalog (no free text).
// - If a crucial piece is unavailable, set "missing" to a short note.

// Respond in STRICT JSON only (no markdown, no code fences):
// {
//   "outfits": [
//     {
//       "title": "string",
//       "items": [1,2,3],
//       "why": "one sentence",
//       "missing": "optional short note"
//     }
//   ]
// }
// `.trim();
// }

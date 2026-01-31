// apps/backend-nest/src/wardrobe/prompts/outfitPlanPrompt.ts
// STATELESS, DETERMINISTIC outfit planning engine
// NO personal preferences, NO learning, NO bias - pure constraints-based logic

export type OutfitPlanSlot = {
  category: 'Tops' | 'Bottoms' | 'Shoes' | 'Outerwear' | 'Accessories';
  description: string;
  formality?: number;
};

export type OutfitPlan = {
  title: string;
  slots: OutfitPlanSlot[];
};

export type OutfitPlanResponse = {
  outfits: OutfitPlan[];
};

// Derive formality from query keywords
function deriveFormality(query: string): number {
  const q = query.toLowerCase();
  if (/\b(formal|business|interview|wedding|gala|black.?tie)\b/.test(q)) return 9;
  if (/\b(smart.?casual|business.?casual|dinner|date|upscale)\b/.test(q)) return 7;
  if (/\b(casual|everyday|relaxed|weekend|brunch)\b/.test(q)) return 4;
  if (/\b(gym|workout|athletic|exercise|training)\b/.test(q)) return 2;
  if (/\b(lounge|home|sleep|pajama)\b/.test(q)) return 1;
  return 5; // default middle
}

// Derive occasion from query
function deriveOccasion(query: string): string | null {
  const q = query.toLowerCase();
  if (/\b(work|office|meeting|interview)\b/.test(q)) return 'work';
  if (/\b(date|dinner|restaurant)\b/.test(q)) return 'date';
  if (/\b(wedding|formal|gala)\b/.test(q)) return 'formal event';
  if (/\b(gym|workout|exercise|training)\b/.test(q)) return 'athletic';
  if (/\b(weekend|casual|everyday|errand)\b/.test(q)) return 'casual';
  if (/\b(party|club|night.?out)\b/.test(q)) return 'nightlife';
  if (/\b(beach|pool|vacation)\b/.test(q)) return 'vacation';
  return null;
}

// Derive season from query or weather
function deriveSeason(query: string, weather?: { temp_f?: number }): string | null {
  const q = query.toLowerCase();
  if (/\b(winter|cold|freezing|snow)\b/.test(q)) return 'winter';
  if (/\b(summer|hot|warm|beach)\b/.test(q)) return 'summer';
  if (/\b(spring|mild)\b/.test(q)) return 'spring';
  if (/\b(fall|autumn|cool)\b/.test(q)) return 'fall';

  // Derive from temperature if provided
  if (weather?.temp_f !== undefined) {
    if (weather.temp_f < 40) return 'winter';
    if (weather.temp_f < 60) return 'fall';
    if (weather.temp_f < 75) return 'spring';
    return 'summer';
  }
  return null;
}

// Derive weather condition
function deriveWeather(query: string, weather?: { temp_f?: number; condition?: string }): string | null {
  if (weather?.condition) return weather.condition;
  const q = query.toLowerCase();
  if (/\b(rain|rainy|wet)\b/.test(q)) return 'rainy';
  if (/\b(snow|snowy|snowing)\b/.test(q)) return 'snowy';
  if (/\b(hot|sunny|warm)\b/.test(q)) return 'warm';
  if (/\b(cold|freezing|chilly)\b/.test(q)) return 'cold';
  return null;
}

// Refinement action types - slot-level only, NO item names
export type RefinementAction = {
  keep_slots: string[]; // Categories to keep (e.g., ["Tops", "Shoes"])
  change_slots: string[]; // Categories to change (e.g., ["Bottoms"])
};

export function buildOutfitPlanPrompt(
  userQuery: string,
  options?: {
    styleAgent?: string; // ignored - no personalization
    userStyleProfile?: unknown; // ignored - no personalization
    weather?: {
      temp_f?: number;
      condition?: string;
      humidity?: number;
    };
    availableItems?: string[];
    refinementAction?: RefinementAction; // Slot-level only - NO item names ever
  },
): string {
  const { weather, availableItems, refinementAction } = options || {};

  // Derive constraints from query
  const formality = deriveFormality(userQuery);
  const occasion = deriveOccasion(userQuery);
  const season = deriveSeason(userQuery, weather);
  const weatherCondition = deriveWeather(userQuery, weather);

  // Build constraints object
  const constraints: Record<string, unknown> = {
    formality,
  };
  if (occasion) constraints.occasion = occasion;
  if (weatherCondition) constraints.weather = weatherCondition;
  if (season) constraints.season = season;

  // Build available items constraint (for wardrobe filtering)
  let availableItemsConstraint = '';
  if (availableItems?.length) {
    availableItemsConstraint = `
WARDROBE CONSTRAINT (only use item types from this list):
${availableItems.join(', ')}`;
  }

  // Build refinement instruction - SLOT-LEVEL ONLY, NO ITEM NAMES
  let refinementInstruction = '';
  if (refinementAction && refinementAction.change_slots.length > 0) {
    refinementInstruction = `
REFINEMENT MODE:
- SKIP these categories (already selected, do not include in output): ${refinementAction.keep_slots.join(', ')}
- GENERATE NEW descriptions ONLY for: ${refinementAction.change_slots.join(', ')}
- Output ONLY the slots that need to change`;
  }

  return `SYSTEM: Stateless outfit planning engine. Generate exactly 3 ranked outfits. No commentary.

INPUT:
{
  "request": "${userQuery}",
  "constraints": ${JSON.stringify(constraints)}
}
${availableItemsConstraint}${refinementInstruction}

OUTPUT (JSON only):
{
  "outfits": [
    {
      "title": "Pick #1: [Safe/Classic choice]",
      "slots": [
        {"category": "Tops", "description": "generic item", "formality": N},
        {"category": "Bottoms", "description": "generic item", "formality": N},
        {"category": "Shoes", "description": "generic item", "formality": N}
      ]
    },
    {
      "title": "Pick #2: [Different vibe]",
      "slots": [...]
    },
    {
      "title": "Pick #3: [Wildcard/Bold choice]",
      "slots": [...]
    }
  ]
}

RULES:
- Exactly 3 outfits: #1 safe, #2 different vibe, #3 controlled wildcard
- Each outfit: Tops, Bottoms, Shoes required. Outerwear, Accessories optional.
- Description: generic (e.g., "dark jeans", "white sneakers", "navy blazer")
- No brands, no specific items, no images, no item names
- Formality 1-10 per slot
- JSON only, no extra text

QUALITY OVERRIDE (applies to all picks):
- Do NOT introduce changes that reduce overall outfit coherence, appropriateness, or quality
- If a variation would weaken the outfit, keep the stronger original element
- Never force a change just to appear different
- Prioritize contextual fit, balance, and good judgment over variation
- A strong Pick #1 repeated is better than a weak Pick #2 or Pick #3

PICK #2 DIFFERENT VIBE CONSTRAINTS (critical):
- MUST stay in the same formality band as Pick #1 (±1 level max)
- MUST reuse at least 2 core pieces from Pick #1
- MAY change only 1–2 elements (e.g., shoes, outerwear, color palette, OR silhouette)
- MUST respect mood, activity, and comfort signals from the request
- Must feel like "another way to wear this outfit," not a new aesthetic
- Do NOT switch aesthetic category (preppy stays preppy, streetwear stays streetwear)
- Do NOT introduce incompatible pieces (e.g., athletic shoes with tailored pants)
- Do NOT ignore practicality or comfort constraints

VARIATION DISTRIBUTION (critical):
- Avoid concentrating changes in a single category (e.g., only changing shoes)
- Ensure variation is distributed across major garment groups (tops, bottoms, shoes)
- Maintain visual and functional coherence across all picks
- Do not rely on minor pieces (accessories, outerwear) for primary differentiation

PICK #3 WILDCARD CONSTRAINTS (critical):
- MUST remain appropriate for the user's activity and weather
- MUST respect the user's style profile and preferences
- MUST reuse at least 2 pieces from Pick #1 or Pick #2
- MAY introduce only ONE experimental element (color, silhouette, texture, OR accessory)
- MUST be realistically wearable today (no costume, no theme shifts)
- Do NOT change the overall aesthetic category (casual stays casual, formal stays formal)
- Do NOT introduce incompatible formality levels (e.g., sneakers with suit)
- Do NOT ignore comfort or practicality constraints
- Think "edge of comfort zone" not "completely different person"`;
}

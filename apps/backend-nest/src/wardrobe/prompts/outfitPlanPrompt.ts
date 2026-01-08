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
  outfit: OutfitPlan;
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
    currentOutfitContext?: string; // For refinements
  },
): string {
  const { weather, availableItems, currentOutfitContext } = options || {};

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

  // Build current outfit context for refinements
  let refinementContext = '';
  if (currentOutfitContext) {
    refinementContext = `
${currentOutfitContext}`;
  }

  return `SYSTEM: Stateless outfit planning engine. Generate ONE outfit. No commentary.

INPUT:
{
  "request": "${userQuery}",
  "constraints": ${JSON.stringify(constraints)}
}
${availableItemsConstraint}${refinementContext}

OUTPUT (JSON only):
{
  "outfit": {
    "title": "string",
    "slots": [
      {"category": "Tops", "description": "generic item", "formality": N},
      {"category": "Bottoms", "description": "generic item", "formality": N},
      {"category": "Shoes", "description": "generic item", "formality": N}
    ]
  }
}

RULES:
- ONE outfit only
- Slots: Tops, Bottoms, Shoes required. Outerwear, Accessories optional.
- Description: generic (e.g., "dark jeans", "white sneakers", "navy blazer")
- No brands, no specific items, no images
- Formality 1-10 per slot
- JSON only, no extra text`;
}

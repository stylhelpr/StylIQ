// apps/backend-nest/src/wardrobe/prompts/outfitPlanPrompt.ts
// Lightweight plan-only prompt for new architecture
// NO catalog, NO items, NO images - just slot descriptions for backend retrieval

import { STYLE_AGENTS } from '../logic/style-agents';

export type OutfitPlanSlot = {
  category: 'Tops' | 'Bottoms' | 'Shoes' | 'Outerwear' | 'Accessories';
  description: string;
  formality?: number;
};

export type OutfitPlan = {
  title: string;
  slots: OutfitPlanSlot[];
  why: string;
};

export type OutfitPlanResponse = {
  outfits: OutfitPlan[];
};

export function buildOutfitPlanPrompt(
  userQuery: string,
  options?: {
    styleAgent?: string;
    userStyleProfile?: {
      preferredColors?: string[];
      favoriteBrands?: string[];
      styleKeywords?: string[];
      dressBias?: string;
    };
    weather?: {
      temp_f?: number;
      condition?: string;
      humidity?: number;
    };
    availableItems?: string[]; // e.g., ["Tops: t-shirt", "Bottoms: jeans", "Shoes: sneakers"]
  },
): string {
  const { styleAgent, userStyleProfile, weather, availableItems } =
    options || {};

  const s = (userQuery || '').toLowerCase();
  const gymIntent = /\b(gym|work ?out|workout|training|exercise)\b/.test(s);
  const upscaleIntent =
    /\b(upscale|smart\s*casual|business|formal|dressy|rooftop)\b/.test(s);
  const casualIntent = /\b(casual|relaxed|chill|laid\s*back)\b/.test(s);

  let styleContextLine = '';

  if (styleAgent && STYLE_AGENTS[styleAgent]) {
    const a = STYLE_AGENTS[styleAgent];
    styleContextLine = `
STYLE AGENT: "${a.name}"
- Preferred colors: ${a.preferredColors?.join(', ') || 'n/a'}
- Favorite brands: ${a.favoriteBrands?.join(', ') || 'n/a'}
- Dress bias: ${a.dressBias || 'n/a'}
- Style keywords: ${a.styleKeywords?.join(', ') || 'n/a'}
    `.trim();
  } else if (userStyleProfile) {
    styleContextLine = `
USER STYLE PROFILE:
- Preferred colors: ${userStyleProfile.preferredColors?.join(', ') || 'n/a'}
- Favorite brands: ${userStyleProfile.favoriteBrands?.join(', ') || 'n/a'}
- Style keywords: ${userStyleProfile.styleKeywords?.join(', ') || 'n/a'}
- Dress bias: ${userStyleProfile.dressBias || 'n/a'}
    `.trim();
  }

  let weatherLine = '';
  if (weather?.temp_f !== undefined) {
    weatherLine = `WEATHER: ${weather.temp_f}°F, ${weather.condition || 'clear'}${weather.humidity ? `, ${weather.humidity}% humidity` : ''}`;
  }

  // Build available items constraint
  let availableItemsLine = '';
  if (availableItems?.length) {
    availableItemsLine = `
AVAILABLE IN WARDROBE (ONLY suggest items from these types):
${availableItems.join('\n')}

⚠️ CRITICAL: You MUST ONLY suggest items that match the types listed above. Do NOT suggest slides, sandals, swim trunks, or any item type not in the wardrobe.`;
  }

  return `
You are a world-class personal stylist. Generate an outfit PLAN based on the user's request.

USER REQUEST: "${userQuery || 'casual everyday outfit'}"
${styleContextLine}
${weatherLine}
${availableItemsLine}
INTENT: ${JSON.stringify({ gymIntent, upscaleIntent, casualIntent })}

RULES:
1. Generate 2-3 outfit plans
2. Each outfit MUST have slots for: Tops, Bottoms, Shoes
3. Outerwear and Accessories are optional
4. Each slot description should be specific enough to search a wardrobe (e.g., "navy chinos" not just "pants")
5. Include formality score (1-10) for each slot to help matching
6. Reflect user style preferences in your choices
7. ONLY suggest item types that exist in the user's wardrobe (see AVAILABLE IN WARDROBE above)

SLOT CATEGORIES (use exactly these):
- Tops: shirts, t-shirts, polos, sweaters, blouses
- Bottoms: pants, jeans, chinos, shorts, skirts
- Shoes: sneakers, loafers, boots, heels, sandals
- Outerwear: jackets, blazers, coats, cardigans
- Accessories: belts, watches, bags, scarves, hats

INTENT GUARDRAILS:
- gymIntent: athletic wear, sneakers, performance fabrics
- upscaleIntent: dressier items, no hoodies/athletic wear
- casualIntent: relaxed fits, comfortable materials

OUTPUT FORMAT (STRICT - use exactly this structure):
{
  "outfits": [
    {
      "title": "Outfit Name",
      "slots": [
        {"category": "Tops", "description": "specific item description", "formality": 5},
        {"category": "Bottoms", "description": "specific item description", "formality": 5},
        {"category": "Shoes", "description": "specific item description", "formality": 5}
      ],
      "why": "Brief reason for this outfit"
    }
  ]
}

Return ONLY valid JSON. No markdown, no code fences, no explanation.
`.trim();
}

/**
 * Category–Subcategory pair validator.
 *
 * Enforces that every saved wardrobe item has a valid main_category for its
 * subcategory.  The AI suggests; this module enforces.
 *
 * NO changes to: DB schema, AI prompts, Pinecone, embeddings, category names.
 */

type MainCategory =
  | 'Tops'
  | 'Bottoms'
  | 'Outerwear'
  | 'Shoes'
  | 'Accessories'
  | 'Undergarments'
  | 'Activewear'
  | 'Formalwear'
  | 'Loungewear'
  | 'Sleepwear'
  | 'Swimwear'
  | 'Maternity'
  | 'Unisex'
  | 'Costumes'
  | 'TraditionalWear'
  | 'Dresses'
  | 'Skirts'
  | 'Bags'
  | 'Headwear'
  | 'Jewelry'
  | 'Other';

// ── Canonical map (mirrors categories.json exactly) ─────────────────────────

export const CATEGORY_MAP: Record<MainCategory, readonly string[]> = {
  Tops: [
    'T-Shirts', 'Polo Shirts', 'Dress Shirts', 'Henleys', 'Tank Tops',
    'Sweaters', 'Hoodies', 'Blouses', 'Bodysuits', 'Crop Tops',
    'Camisoles', 'Tunics',
  ],
  Bottoms: [
    'Jeans', 'Chinos', 'Trousers', 'Joggers', 'Shorts', 'Cargo Pants',
    'Leggings', 'Skorts', 'Wide-Leg Pants',
  ],
  Outerwear: [
    'Bomber Jackets', 'Blazers', 'Trench Coats', 'Peacoats',
    'Leather Jackets', 'Denim Jackets', 'Parkas', 'Vests', 'Cardigans',
    'Puffer Jackets', 'Raincoats',
  ],
  Shoes: [
    'Athletic Sneakers', 'Lifestyle Sneakers', 'Oxfords', 'Derbies',
    'Monk Straps', 'Loafers', 'Boat Shoes', 'Espadrilles',
    'Chelsea Boots', 'Combat Boots', 'Chukkas', 'Sandals', 'Slides',
    'Heels', 'Flats', 'Ankle Boots', 'Knee-High Boots', 'Mules',
    'Wedges', 'Platforms',
  ],
  Accessories: [
    'Belts', 'Hats', 'Scarves', 'Gloves', 'Sunglasses', 'Watches',
    'Ties', 'Hair Accessories', 'Hosiery/Tights',
  ],
  Undergarments: [
    'Undershirts', 'Briefs', 'Boxers', 'Socks', 'Bras', 'Panties',
    'Shapewear',
  ],
  Activewear: [
    'Athletic Tops', 'Running Shorts', 'Leggings',
    'Performance Jackets', 'Gym Hoodies',
  ],
  Formalwear: ['Suits', 'Dress Shirts', 'Tuxedos', 'Waistcoats'],
  Dresses: [
    'Midi Dresses', 'Maxi Dresses', 'Mini Dresses', 'Wrap Dresses',
    'Shirt Dresses', 'Cocktail Dresses', 'Casual Dresses', 'Gowns',
    'Evening Dresses', 'Slip Dresses', 'Bodycon Dresses',
    'Sweater Dresses', 'Jumpsuits', 'Rompers', 'Overalls',
  ],
  Skirts: [
    'Mini Skirts', 'Midi Skirts', 'Maxi Skirts', 'Pencil Skirts',
    'A-Line Skirts', 'Pleated Skirts', 'Wrap Skirts', 'Denim Skirts',
  ],
  Bags: ['Handbags', 'Tote Bags', 'Crossbody Bags', 'Clutches', 'Backpacks'],
  Headwear: ['Baseball Caps', 'Beanies', 'Fedoras', 'Sun Hats', 'Headbands'],
  Jewelry: ['Necklaces', 'Bracelets', 'Earrings', 'Rings'],
  Loungewear: [
    'Lounge Sets', 'Lounge Tops', 'Lounge Pants', 'Sweatshirts',
    'Sweatpants', 'Co-ords',
  ],
  Sleepwear: [
    'Pajama Sets', 'Pajama Separates', 'Nightgowns', 'Nightshirts', 'Robes',
  ],
  Swimwear: ['One-Piece Swimsuits', 'Bikinis', 'Cover-Ups', 'Rash Guards'],
  Maternity: ['Maternity Tops', 'Maternity Dresses', 'Maternity Leggings'],
  Unisex: ['Gender-Neutral Tees', 'Hoodies', 'Joggers'],
  Costumes: ['Costumes', 'Costume Accessories'],
  TraditionalWear: ['Cultural Attire', 'Saree', 'Kimono', 'Abaya', 'Hanbok'],
  Other: [],
};

// ── Reverse index: lowercase subcategory → MainCategory ─────────────────────

const REVERSE_MAP = new Map<string, MainCategory>();
for (const [main, subs] of Object.entries(CATEGORY_MAP)) {
  for (const sub of subs) {
    REVERSE_MAP.set(sub.toLowerCase(), main as MainCategory);
  }
}

// ── Keyword patterns for AI free-text subcategories ─────────────────────────
// Order matters: more specific patterns first.

const KEYWORD_RULES: Array<[RegExp, MainCategory]> = [
  // Dresses must come before "shirt" to catch "shirt dress"
  [/\bdress(es)?\b/i, 'Dresses'],
  [/\bgown\b/i, 'Dresses'],
  [/\bjumpsuit\b/i, 'Dresses'],
  [/\bromper\b/i, 'Dresses'],
  [/\boverall\b/i, 'Dresses'],

  [/\bskirt\b/i, 'Skirts'],

  [/\b(jacket|blazer|coat|parka|windbreaker|anorak|puffer)\b/i, 'Outerwear'],
  [/\bcardigan\b/i, 'Outerwear'],
  [/\b(vest|gilet)\b/i, 'Outerwear'],

  [/\b(sneaker|trainer|oxford|derby|loafer|boot|heel|flat|sandal|slide|mule|wedge|platform|espadrille|clog|slipper)\b/i, 'Shoes'],

  [/\b(handbag|tote|clutch|crossbody|backpack|purse|satchel)\b/i, 'Bags'],

  [/\b(necklace|bracelet|earring|ring|pendant|anklet|brooch)\b/i, 'Jewelry'],

  [/\b(cap|beanie|fedora|headband|sun\s*hat|bucket\s*hat|visor|beret)\b/i, 'Headwear'],

  [/\b(sports?\s*bra|athletic|gym|running\s*short|performance|track\s*pant)\b/i, 'Activewear'],

  [/\b(bra|panties|briefs|boxers?|undershirt|shapewear|thong)\b/i, 'Undergarments'],

  [/\b(pajama|nightgown|nightshirt|robe|sleepwear)\b/i, 'Sleepwear'],

  [/\b(bikini|swimsuit|swim\s*trunk|rash\s*guard|cover-?up|one-?piece)\b/i, 'Swimwear'],

  [/\b(belt|scarf|tie|sunglasses|watch|glove)\b/i, 'Accessories'],

  [/\b(tuxedo|waistcoat|suit(?!\s*case))\b/i, 'Formalwear'],

  [/\b(lounge|sweatpant|co-?ord)\b/i, 'Loungewear'],

  [/\b(maternity)\b/i, 'Maternity'],
  [/\b(kimono|saree|sari|abaya|hanbok)\b/i, 'TraditionalWear'],
  [/\b(costume)\b/i, 'Costumes'],
];

// ── Cross-field overrides ────────────────────────────────────────────────────
// When the AI assigns a valid subcategory for one category but the item name
// reveals it actually belongs to another, these declarative rules correct it.
// Each rule requires ALL conditions to match: subcategory pattern, name pattern,
// and a confirming signal in the name. This prevents false positives.
//
// Generalizable: no gender, brand, or trend assumptions. Each rule must work
// across demographics and be testable with positive + negative cases.

type CrossFieldOverride = {
  /** Subcategory values that trigger this check (case-insensitive, anchored) */
  subPattern: RegExp;
  /** Required keyword in item name */
  namePattern: RegExp;
  /** Confirming evidence in item name (e.g. dress-length signals) */
  confirmSignal: RegExp;
  /** Target category when all conditions match */
  target: MainCategory;
};

const CROSS_FIELD_OVERRIDES: readonly CrossFieldOverride[] = [
  // Halter-style garments with dress-length signals are dresses, not tops.
  // Applies regardless of gender/brand: "halterneck maxi", "halter midi gown", etc.
  // Negative: "halter crop top", "halter camisole" — no length signal → stays Tops.
  {
    subPattern: /^(camisoles?|halter top|halter|tank tops?)$/i,
    namePattern: /\bhalter(neck)?\b/i,
    confirmSignal:
      /(maxi|midi|mini|floor|full[- ]?length|ankle[- ]?length|gown|evening|column|slip dress|satin slip|bodycon)/i,
    target: 'Dresses',
  },
];

// ── Public API ──────────────────────────────────────────────────────────────

export type ValidatedPair = {
  main_category: MainCategory;
  subcategory: string | undefined;
  corrected: boolean;
};

/**
 * Validates a main_category + subcategory pair.
 *
 * 1. If subcategory is empty/missing → keep main as-is.
 * 2. If subcategory exactly matches a CATEGORY_MAP entry for this main → PASS.
 * 3. If subcategory exactly matches a CATEGORY_MAP entry for a DIFFERENT main → remap.
 * 4. If subcategory matches a keyword pattern → remap main if it disagrees.
 * 5. Also check the item name for keyword signals (catches "Halter Dress" in name).
 * 6. Otherwise → keep as-is (unknown subcategory, trust the main).
 */
export function validateCategoryPair(
  main: string,
  subcategory?: string | null,
  itemName?: string | null,
): ValidatedPair {
  const mainCat = main as MainCategory;
  const sub = (subcategory ?? '').trim();

  // No subcategory → nothing to validate
  if (!sub) {
    // Still check itemName for misclassification signals
    const nameCorrection = inferFromKeywords(itemName);
    if (nameCorrection && nameCorrection !== mainCat) {
      return { main_category: nameCorrection, subcategory: undefined, corrected: true };
    }
    return { main_category: mainCat, subcategory: undefined, corrected: false };
  }

  // 0. Cross-field overrides: declarative rules that use subcategory + item name
  //    together to catch misclassifications the AI makes with valid subcategories.
  const nm = itemName ?? '';
  for (const rule of CROSS_FIELD_OVERRIDES) {
    if (
      rule.subPattern.test(sub) &&
      rule.namePattern.test(nm) &&
      rule.confirmSignal.test(nm) &&
      rule.target !== mainCat
    ) {
      return { main_category: rule.target, subcategory: sub, corrected: true };
    }
  }

  // 1. Check if subcategory belongs to the declared main_category
  const validSubs = CATEGORY_MAP[mainCat];
  if (validSubs) {
    const subLower = sub.toLowerCase();
    if (validSubs.some((s) => s.toLowerCase() === subLower)) {
      return { main_category: mainCat, subcategory: sub, corrected: false };
    }
  }

  // 2. Check if subcategory belongs to a DIFFERENT main_category (exact match)
  const correctMain = REVERSE_MAP.get(sub.toLowerCase());
  if (correctMain && correctMain !== mainCat) {
    return { main_category: correctMain, subcategory: sub, corrected: true };
  }

  // 3. Keyword inference from subcategory text (handles AI free-text like "Halter Dress")
  const keywordMain = inferFromKeywords(sub);
  if (keywordMain && keywordMain !== mainCat) {
    return { main_category: keywordMain, subcategory: sub, corrected: true };
  }

  // 4. Keyword inference from item name (catches "Black Midi Dress" named as Tops)
  const nameMain = inferFromKeywords(itemName);
  if (nameMain && nameMain !== mainCat) {
    // Only override if the subcategory doesn't give us a clear signal
    if (!keywordMain) {
      return { main_category: nameMain, subcategory: sub, corrected: true };
    }
  }

  // 5. No signal → trust the existing main_category
  return { main_category: mainCat, subcategory: sub, corrected: false };
}

function inferFromKeywords(text?: string | null): MainCategory | null {
  if (!text) return null;
  for (const [rx, cat] of KEYWORD_RULES) {
    if (rx.test(text)) return cat;
  }
  return null;
}

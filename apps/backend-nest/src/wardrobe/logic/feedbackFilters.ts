// apps/backend-nest/src/wardrobe/logic/feedbackFilters.ts
//
// Enforce user feedback (dislikes/bans) at CATALOG TIME — before reranking/LLM.
// Example usage in wardrobe.service.ts:
//   import { applyFeedbackFilters, compileFeedbackRulesFromRows } from './logic/feedbackFilters';
//   ...
//   const feedbackRows = await this.getUserFeedbackRows(userId); // <-- your DB fetch
//   const rules = compileFeedbackRulesFromRows(feedbackRows);
//   catalog = applyFeedbackFilters(catalog, rules, { minKeep: 6 });
//
// This is intentionally conservative: if strong filtering would drop the list
// below `minKeep`, we fall back to a soft filter that only blocks explicitly
// banned item_ids (so users never see a blank screen).

export type CatalogItem = {
  index: number;
  id?: string;
  label?: string;
  image_url?: string;

  main_category?: string;
  subcategory?: string;
  shoe_style?: string;
  dress_code?: string;
  formality_score?: number;

  // optional extras that may appear in labels/filters
  color?: string;
  color_family?: string;
  brand?: string;
  material?: string;
};

export type FeedbackFilterOptions = {
  minKeep?: number;
  softenWhenBelow?: boolean;
};

const DEFAULTS: Required<FeedbackFilterOptions> = {
  minKeep: 6,
  softenWhenBelow: true,
};

// ─────────────────────────────────────────────────────────────
// Feedback rule model
// ─────────────────────────────────────────────────────────────

export type FeedbackRule =
  | { kind: 'excludeItemIds'; item_ids: string[] }
  | { kind: 'excludeBrand'; brand: string; category?: NormalizedCategory }
  | {
      kind: 'excludeColorOnCategory';
      color: NormalizedColor;
      category?: NormalizedCategory;
    }
  | { kind: 'excludeColor'; color: NormalizedColor }
  | {
      kind: 'excludeSubstring';
      field: 'label' | 'subcategory';
      value: string;
      category?: NormalizedCategory;
    };

// Your real feedback table schema (NOTE: fields may arrive as numbers/strings)
export type OutfitFeedbackRow = {
  id: string;
  request_id: string;
  user_id: string;
  rating: string | null; // typically "like" | "dislike" but may be 1/-1 in DB
  tags: string[] | null; // may also arrive as a single CSV string
  notes: string | null;
  outfit_json: any | null; // stringified JSON or object or null
  created_at: string;
};

// ─────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────

const lc = (v?: string | null) => (v ?? '').toString().trim().toLowerCase();
function labelOf(it: CatalogItem) {
  return lc(it.label);
}
function subOf(it: CatalogItem) {
  return lc(it.subcategory);
}
function mainOf(it: CatalogItem) {
  return lc(it.main_category);
}

// Tolerant normalizers for mixed CSV/DB shapes
function normalizeRating(raw: unknown): 'like' | 'dislike' | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const s = raw.trim().toLowerCase();
    if (s === 'like' || s === 'dislike') return s;
    if (s === '1') return 'like';
    if (s === '-1') return 'dislike';
    return null;
  }
  if (typeof raw === 'number') {
    if (raw === 1) return 'like';
    if (raw === -1) return 'dislike';
  }
  return null;
}

function normalizeTags(raw: unknown): string[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
  const s = String(raw).trim();
  if (!s) return null;
  return s
    .split(/[;,]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function safeParseOutfitJson(raw: unknown): any | null {
  if (!raw) return null;
  if (typeof raw === 'object') return raw as any;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t || t === 'null' || t === 'undefined') return null;
    try {
      return JSON.parse(t);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * NormalizedCategory - all 21 MainCategories + 'unknown' fallback.
 * Used for feedback rule matching.
 */
type NormalizedCategory =
  | 'tops'
  | 'bottoms'
  | 'shoes'
  | 'outerwear'
  | 'accessories'
  | 'formalwear'
  | 'activewear'
  | 'swimwear'
  | 'dresses'
  | 'skirts'
  | 'bags'
  | 'headwear'
  | 'jewelry'
  | 'undergarments'
  | 'loungewear'
  | 'sleepwear'
  | 'maternity'
  | 'unisex'
  | 'costumes'
  | 'traditionalwear'
  | 'other'
  | 'unknown';

const CATEGORY_ALIASES: Array<[NormalizedCategory, RegExp]> = [
  [
    'shoes',
    /\b(shoes?|sneakers?|trainers?|loafers?|boots?|heels?|sandals?|slides?|espadrilles?)\b/i,
  ],
  [
    'tops',
    /\b(t-?shirts?|tees?|polos?|shirts?|sweaters?|knits?|hoodies?|henleys?)\b/i,
  ],
  [
    'bottoms',
    /\b(pants|trousers|jeans|chinos|shorts|joggers|sweatpants|track\s*pants)\b/i,
  ],
  [
    'outerwear',
    /\b(blazers?|sport\s*coats?|suit\s*jacket|jackets?|coats?|parkas?|trenches|overcoats?|windbreakers?)\b/i,
  ],
  [
    'accessories',
    /\b(belts?|hats?|scarves?|ties?|sunglasses|watches?|bags?|briefcases?)\b/i,
  ],
  ['formalwear', /\b(tux(ed|edo)?|dinner\s*jacket|gown|cocktail\s*dress)\b/i],
  ['activewear', /\b(activewear|athleisure|gym|training|performance)\b/i],
  ['swimwear', /\b(swim|trunks|boardshorts?|bikini|one[-\s]?piece)\b/i],
  ['dresses', /\b(dress(es)?|gown|jumpsuit|romper)\b/i],
  ['skirts', /\b(skirts?)\b/i],
  ['bags', /\b(bags?|handbags?|totes?|clutch(es)?|backpacks?|crossbody)\b/i],
  ['headwear', /\b(caps?|beanies?|fedoras?|headbands?|sun\s*hats?)\b/i],
  ['jewelry', /\b(necklaces?|bracelets?|earrings?|rings?|jewelry)\b/i],
  [
    'undergarments',
    /\b(underwear|briefs?|boxers?|bras?|socks?|panties|shapewear)\b/i,
  ],
  ['loungewear', /\b(lounge|sweatshirts?|co-?ords?)\b/i],
  ['sleepwear', /\b(pajamas?|nightgowns?|nightshirts?|robes?|sleepwear)\b/i],
  ['maternity', /\b(maternity|pregnancy|nursing)\b/i],
  ['unisex', /\b(unisex|gender[-\s]?neutral)\b/i],
  ['costumes', /\b(costumes?|halloween|cosplay)\b/i],
  [
    'traditionalwear',
    /\b(kimonos?|sarees?|saris?|abayas?|hanboks?|traditional)\b/i,
  ],
  ['other', /\b(other|miscellaneous)\b/i],
];

function normalizeCategoryText(s: string): NormalizedCategory {
  for (const [cat, rx] of CATEGORY_ALIASES) if (rx.test(s)) return cat;
  return 'unknown';
}

type NormalizedColor =
  | 'black'
  | 'white'
  | 'gray'
  | 'navy'
  | 'blue'
  | 'light-blue'
  | 'green'
  | 'olive'
  | 'mint'
  | 'lime'
  | 'emerald'
  | 'teal'
  | 'red'
  | 'burgundy'
  | 'pink'
  | 'orange'
  | 'yellow'
  | 'beige'
  | 'tan'
  | 'brown'
  | 'cognac'
  | 'purple'
  | 'multi'
  | 'unknown';

const COLOR_CANON: Record<NormalizedColor, RegExp> = {
  black: /\b(black|charcoal|jet)\b/i,
  white: /\b(white|ivory|off[-\s]?white)\b/i,
  gray: /\b(gray|grey|ash|slate)\b/i,
  navy: /\b(navy)\b/i,
  blue: /\b(blue|cobalt|royal)\b/i,
  'light-blue': /\b(light\s*blue|sky|baby\s*blue|powder\s*blue)\b/i,
  green: /\b(green|forest|kelly|emerald|neon\s*green)\b/i,
  olive: /\b(olive)\b/i,
  mint: /\b(mint)\b/i,
  lime: /\b(lime)\b/i,
  emerald: /\b(emerald)\b/i,
  teal: /\b(teal|aqua|turquoise)\b/i,
  red: /\b(red|crimson|scarlet)\b/i,
  burgundy: /\b(burgundy|maroon|oxblood)\b/i,
  pink: /\b(pink|rose|blush|magenta|fuchsia)\b/i,
  orange: /\b(orange|tangerine)\b/i,
  yellow: /\b(yellow|mustard)\b/i,
  beige: /\b(beige|ecru|oatmeal)\b/i,
  tan: /\b(tan|sand|khaki|camel)\b/i,
  brown: /\b(brown|chocolate|espresso)\b/i,
  cognac: /\b(cognac)\b/i,
  purple: /\b(purple|violet|lavender|lilac)\b/i,
  multi: /\b(multi|multi[-\s]?color|multicolor)\b/i,
  unknown: /$\b/,
};

function detectColorWord(s: string): NormalizedColor | 'unknown' {
  for (const key of Object.keys(COLOR_CANON) as NormalizedColor[])
    if (COLOR_CANON[key].test(s)) return key;
  return 'unknown';
}

function itemIsCategory(it: CatalogItem, cat: NormalizedCategory): boolean {
  const m = mainOf(it),
    s = subOf(it);
  switch (cat) {
    case 'shoes':
      return (
        m === 'shoes' ||
        /\b(sneakers?|trainers?|loafers?|boots?|heels?|sandals?)\b/i.test(s)
      );
    case 'tops':
      return (
        m === 'tops' ||
        /\b(t-?shirt|tee|polo|shirt|sweater|knit|henley|hoodie)\b/i.test(s)
      );
    case 'bottoms':
      return (
        m === 'bottoms' ||
        /\b(trouser|pants|jeans|chinos|shorts|joggers?|sweatpants?)\b/i.test(s)
      );
    case 'outerwear':
      return (
        m === 'outerwear' ||
        /\b(blazer|sport\s*coat|jacket|coat|parka|trench|overcoat)\b/i.test(s)
      );
    case 'accessories':
      return (
        m === 'accessories' ||
        /\b(belt|hat|scarf|tie|sunglasses|watch|bag|briefcase)\b/i.test(s)
      );
    case 'formalwear':
      return m === 'formalwear';
    case 'activewear':
      return m === 'activewear';
    case 'swimwear':
      return m === 'swimwear' || /\b(swim|trunks|boardshorts?)\b/i.test(s);
    case 'dresses':
      return (
        m === 'dresses' || /\b(dress(es)?|gown|jumpsuit|romper)\b/i.test(s)
      );
    case 'skirts':
      return m === 'skirts' || /\bskirts?\b/i.test(s);
    case 'bags':
      return (
        m === 'bags' || /\b(handbag|tote|clutch|backpack|crossbody)\b/i.test(s)
      );
    case 'headwear':
      return m === 'headwear';
    case 'jewelry':
      return m === 'jewelry' || /\b(necklace|bracelet|earring|ring)\b/i.test(s);
    case 'undergarments':
      return m === 'undergarments';
    case 'loungewear':
      return m === 'loungewear';
    case 'sleepwear':
      return m === 'sleepwear';
    default:
      return false;
  }
}

function itemHasColor(it: CatalogItem, color: NormalizedColor): boolean {
  const c = lc(it.color),
    f = lc(it.color_family),
    lbl = labelOf(it),
    rx = COLOR_CANON[color];
  return rx.test(c) || rx.test(f) || rx.test(lbl);
}

function normalizeColor(raw: any): NormalizedColor {
  const s = lc(String(raw || ''));
  for (const key of Object.keys(COLOR_CANON) as NormalizedColor[])
    if (COLOR_CANON[key].test(s)) return key;
  return 'unknown';
}

// ─────────────────────────────────────────────────────────────
// Compile rules from outfit_feedback rows (schema-tolerant)
// ─────────────────────────────────────────────────────────────

export function compileFeedbackRulesFromRows(
  rows: OutfitFeedbackRow[],
): FeedbackRule[] {
  const rules: FeedbackRule[] = [];

  for (const row of rows ?? []) {
    if (!row) continue;

    // Normalize mixed shapes
    const rating = normalizeRating((row as any).rating);
    const tags = normalizeTags((row as any).tags);
    const outfit = safeParseOutfitJson((row as any).outfit_json);
    const notes = typeof row.notes === 'string' ? row.notes : null;

    // tags → rules
    for (const tag of tags ?? []) rules.push(...extractRulesFromText(tag));

    // notes → rules
    if (notes) rules.push(...extractRulesFromText(notes));

    // dislikes → ban items in the disliked outfit (when ids are present)
    if (rating === 'dislike' && outfit?.items?.length) {
      const ids = outfit.items
        .map((it: any) => it?.id)
        .filter((id: unknown) => typeof id === 'string' && id.trim().length);
      if (ids.length) rules.push({ kind: 'excludeItemIds', item_ids: ids });
    }
  }

  // dedup item bans
  const itemBans = new Set<string>();
  for (const r of rules)
    if (r.kind === 'excludeItemIds')
      r.item_ids.forEach((id) => itemBans.add(String(id)));
  const coalesced: FeedbackRule[] = [];
  if (itemBans.size)
    coalesced.push({ kind: 'excludeItemIds', item_ids: Array.from(itemBans) });
  rules
    .filter((r) => r.kind !== 'excludeItemIds')
    .forEach((r) => coalesced.push(r));

  return coalesced;
}

// ─────────────────────────────────────────────────────────────
// Free-text parsing
// ─────────────────────────────────────────────────────────────

function extractRulesFromText(text: string): FeedbackRule[] {
  const out: FeedbackRule[] = [],
    s = text.trim();
  if (!s) return out;
  const S = lc(s);

  const brandMatch = S.match(
    /\b(?:ban|avoid|no)\s+(?:brand[:\s]+)?([a-z0-9 _-]{2,})\b/,
  );
  if (
    brandMatch &&
    !/\b(green|blue|red|yellow|brown|tan|navy|black|white|gray|grey)\b/.test(
      brandMatch[1],
    )
  )
    out.push({ kind: 'excludeBrand', brand: lc(brandMatch[1]) });

  const neg = /\b(no|avoid|without|exclude|ban|don't|do not)\b/.test(S);
  if (neg) {
    let cat: NormalizedCategory | undefined;
    for (const [c, rx] of CATEGORY_ALIASES)
      if (rx.test(S)) {
        cat = c;
        break;
      }
    const color = detectColorWord(S);
    if (cat && color !== 'unknown')
      out.push({ kind: 'excludeColorOnCategory', color, category: cat });
    else if (color !== 'unknown') out.push({ kind: 'excludeColor', color });

    if (/\bloafers?\b/.test(S))
      out.push({
        kind: 'excludeSubstring',
        field: 'subcategory',
        value: 'loafer',
        category: 'shoes',
      });
    if (/\b(sneakers?|trainers?)\b/.test(S))
      out.push({
        kind: 'excludeSubstring',
        field: 'subcategory',
        value: 'sneaker',
        category: 'shoes',
      });
    if (/\bhoodies?\b/.test(S))
      out.push({
        kind: 'excludeSubstring',
        field: 'subcategory',
        value: 'hoodie',
        category: 'tops',
      });
  }

  if (/\blabel:/.test(S)) {
    const m = S.match(/label:\s*["']?([^"']+)["']?/i);
    if (m && m[1])
      out.push({ kind: 'excludeSubstring', field: 'label', value: m[1] });
  }

  return out;
}

// ─────────────────────────────────────────────────────────────
// Filtering
// ─────────────────────────────────────────────────────────────

function itemViolatedRule(it: CatalogItem, rule: FeedbackRule): boolean {
  switch (rule.kind) {
    case 'excludeItemIds':
      return !!(it.id && rule.item_ids.includes(it.id));
    case 'excludeBrand': {
      const brand = lc(it.brand),
        hit = brand && brand.includes(lc(rule.brand));
      return hit
        ? rule.category
          ? itemIsCategory(it, rule.category)
          : true
        : false;
    }
    case 'excludeColorOnCategory':
      return (
        !!rule.category &&
        itemIsCategory(it, rule.category) &&
        itemHasColor(it, rule.color)
      );
    case 'excludeColor':
      return itemHasColor(it, rule.color);
    case 'excludeSubstring': {
      const val = rule.field === 'label' ? labelOf(it) : subOf(it);
      if (!val) return false;
      if (rule.category && !itemIsCategory(it, rule.category)) return false;
      return val.includes(lc(rule.value));
    }
  }
}

function applyRulesStrong<T extends CatalogItem>(
  catalog: T[],
  rules: FeedbackRule[],
): T[] {
  if (!rules.length) return catalog;
  return catalog.filter((it) => !rules.some((r) => itemViolatedRule(it, r)));
}

function applyRulesSoft<T extends CatalogItem>(
  catalog: T[],
  rules: FeedbackRule[],
): T[] {
  const itemRules = rules.filter((r) => r.kind === 'excludeItemIds');
  if (!itemRules.length) return catalog;
  const banned = new Set<string>();
  itemRules.forEach((r) => r.item_ids.forEach((id) => banned.add(String(id))));
  return catalog.filter((it) => !it.id || !banned.has(it.id));
}

export function applyFeedbackFilters<T extends CatalogItem>(
  catalog: T[],
  rules: FeedbackRule[],
  options?: FeedbackFilterOptions,
): T[] {
  if (!rules?.length) return catalog;
  const opts = { ...DEFAULTS, ...(options ?? {}) };
  const strong = applyRulesStrong(catalog, rules);
  if (strong.length >= opts.minKeep) return strong;
  if (!opts.softenWhenBelow) return strong.length ? strong : catalog;
  const soft = applyRulesSoft(catalog, rules);
  return soft.length ? soft : catalog;
}

// ─────────────────────────────────────────────────────────────
// Debugging helper
// ─────────────────────────────────────────────────────────────

export function explainFeedbackBlocks(
  it: CatalogItem,
  rules: FeedbackRule[],
): string[] {
  const reasons: string[] = [];
  for (const r of rules) {
    if (itemViolatedRule(it, r)) {
      switch (r.kind) {
        case 'excludeItemIds':
          reasons.push(`blocked: item_id`);
          break;
        case 'excludeBrand':
          reasons.push(
            `blocked: brand "${r.brand}"${r.category ? ` in ${r.category}` : ''}`,
          );
          break;
        case 'excludeColorOnCategory':
          reasons.push(`blocked: color "${r.color}" in ${r.category}`);
          break;
        case 'excludeColor':
          reasons.push(`blocked: color "${r.color}"`);
          break;
        case 'excludeSubstring':
          reasons.push(
            `blocked: ${r.field} contains "${r.value}"${r.category ? ` in ${r.category}` : ''}`,
          );
          break;
      }
    }
  }
  return reasons;
}

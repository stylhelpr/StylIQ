/**
 * Occasion Appropriateness Filter — Item-level gate.
 *
 * Prevents semantically inappropriate individual garments from entering
 * the outfit construction pool when the query implies a formal context.
 *
 * This is NOT taste or personalization. It blocks garments whose visual
 * signals are universally incompatible with respectful-formal occasions.
 *
 * Pure deterministic. No LLM. No DB. No async. Fail-open on missing data.
 */

export type OccasionItem = {
  id?: string;
  name?: string;
  label?: string;
  subcategory?: string;
  main_category?: string;
  color?: string;
  color_family?: string;
  [key: string]: unknown;
};

export type OccasionContext = {
  query?: string;
};

// ── Formal context detection ──────────────────────────────────────────────

const FORMAL_CONTEXT_RE =
  /\b(church|funeral|wedding|interview|business|formal|ceremony|baptism|christening|communion|black\s?tie|gala|cocktail|executive)\b/i;

export function isFormalOccasion(ctx: OccasionContext): boolean {
  if (!ctx.query) return false;
  return FORMAL_CONTEXT_RE.test(ctx.query);
}

// ── Item text helper ──────────────────────────────────────────────────────

function itemText(item: OccasionItem): string {
  return `${item.subcategory ?? ''} ${item.name ?? item.label ?? ''}`.toLowerCase();
}

function itemSlot(item: OccasionItem): string {
  return (item.main_category ?? '').toLowerCase();
}

function itemColors(item: OccasionItem): string {
  return `${item.color ?? ''} ${item.color_family ?? ''}`.toLowerCase();
}

// ── Rejection rules (only apply in formal context) ────────────────────────

type RejectionCheck = (item: OccasionItem) => string | null;

const LOUD_PATTERN_TOP_RE =
  /\b(hawaiian|aloha|tropical|beach\s?print|loud\s?floral|camp\s?collar\s?(floral|tropical))\b/i;

const checkLoudPatternTop: RejectionCheck = (item) => {
  const slot = itemSlot(item);
  if (slot !== 'tops' && slot !== 'outerwear') return null;
  const text = itemText(item);
  if (LOUD_PATTERN_TOP_RE.test(text)) return 'LOUD_PATTERN_TOP';
  return null;
};

const TAILORING_RE = /\b(blazer|sport\s?coat|suit\s?jacket|tuxedo\s?jacket)\b/i;
const LOUD_TAILORING_COLOR_RE =
  /\b(magenta|fuchsia|neon|electric\s?blue|hot\s?pink|fluorescent|lime\s?green|bright\s?red|bright\s?orange|acid)\b/i;

const checkLoudTailoringColor: RejectionCheck = (item) => {
  const text = itemText(item);
  if (!TAILORING_RE.test(text)) return null;
  const colors = `${itemText(item)} ${itemColors(item)}`;
  if (LOUD_TAILORING_COLOR_RE.test(colors)) return 'LOUD_TAILORING_COLOR';
  return null;
};

const ATHLETIC_CASUAL_TOP_RE =
  /\b(hoodie|hoody|sweatshirt|graphic\s?tee|gym\s?tee|tank\s?top|muscle\s?tee|crop\s?top)\b/i;

const checkAthleticCasualTop: RejectionCheck = (item) => {
  const slot = itemSlot(item);
  if (slot !== 'tops') return null;
  const text = itemText(item);
  if (ATHLETIC_CASUAL_TOP_RE.test(text)) return 'ATHLETIC_CASUAL_TOP';
  return null;
};

const OPEN_CASUAL_FOOTWEAR_RE =
  /\b(slides?|flip[- ]?flops?|sandals?|thongs?|crocs)\b/i;

const checkOpenCasualFootwear: RejectionCheck = (item) => {
  const slot = itemSlot(item);
  if (slot !== 'shoes') return null;
  const text = itemText(item);
  if (OPEN_CASUAL_FOOTWEAR_RE.test(text)) return 'OPEN_CASUAL_FOOTWEAR';
  return null;
};

const CASUAL_OUTERWEAR_RE =
  /\b(puffer|windbreaker|anorak|parka|rain\s?jacket|field\s?jacket)\b/i;

const checkCasualOuterwear: RejectionCheck = (item) => {
  const slot = itemSlot(item);
  if (slot !== 'outerwear') return null;
  const text = itemText(item);
  if (CASUAL_OUTERWEAR_RE.test(text)) return 'CASUAL_OUTERWEAR';
  return null;
};

const LOUD_OUTERWEAR_COLOR_RE =
  /\b(yellow|orange|neon|fluorescent|lime|hot\s?pink|bright\s?red|bright\s?orange)\b/i;

const checkLoudColorOuterwear: RejectionCheck = (item) => {
  const slot = itemSlot(item);
  if (slot !== 'outerwear') return null;
  const colors = `${itemText(item)} ${itemColors(item)}`;
  if (LOUD_OUTERWEAR_COLOR_RE.test(colors)) return 'LOUD_COLOR_OUTERWEAR';
  return null;
};

const CHECKS: RejectionCheck[] = [
  checkLoudPatternTop,
  checkLoudTailoringColor,
  checkAthleticCasualTop,
  checkOpenCasualFootwear,
  checkCasualOuterwear,
  checkLoudColorOuterwear,
];

// ── Public API ────────────────────────────────────────────────────────────

export function isOccasionAppropriate(
  item: OccasionItem,
  context: OccasionContext = {},
): boolean {
  if (!isFormalOccasion(context)) return true;

  for (const check of CHECKS) {
    if (check(item) !== null) return false;
  }

  return true;
}

/** Returns the rejection reason, or null if appropriate. */
export function getOccasionRejectionReason(
  item: OccasionItem,
  context: OccasionContext = {},
): string | null {
  if (!isFormalOccasion(context)) return null;

  for (const check of CHECKS) {
    const reason = check(item);
    if (reason) return reason;
  }

  return null;
}

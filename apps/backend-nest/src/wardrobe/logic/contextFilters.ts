// apps/backend-nest/src/wardrobe/logic/contextFilters.ts

/**
 * Contextual catalog filters applied BEFORE reranking/LLM.
 * These remove obviously-irrelevant items based on the user's intent in the query.
 *
 * Usage from wardrobe.service.ts:
 *   import { applyContextualFilters } from './logic/contextFilters';
 *   ...
 *   let catalog = matches.map(...);
 *   catalog = applyContextualFilters(query, catalog);
 *   const reranked = rerankCatalogWithContext(catalog, constraints, ...);
 */

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
  sleeve_length?: string;
  layering?: string;
  waterproof_rating?: number | string;
  rain_ok?: boolean;
};

export type ContextFilterOptions = {
  /**
   * Minimum items required after each strong allowlist.
   * If we fall below this, we gracefully relax to a softer filter for that context.
   */
  minKeep?: number;
};

const DEFAULTS: Required<ContextFilterOptions> = {
  minKeep: 6,
};

// ─────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────

const lc = (v?: string | null) => (v ?? '').toString().trim().toLowerCase();
const has = (s: string, re: RegExp) => re.test(s);

const word = (lits: string[]) =>
  new RegExp(`\\b(${lits.map(escapeRegex).join('|')})\\b`, 'i');

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function subOf(item: CatalogItem) {
  return lc(item.subcategory);
}
function mainOf(item: CatalogItem) {
  return lc(item.main_category);
}
function labelOf(item: CatalogItem) {
  return lc(item.label);
}

// ─────────────────────────────────────────────────────────────
// Context detectors
// ─────────────────────────────────────────────────────────────

const RX_GYM =
  /\b(gym|work(\s)?out|training|athletic|exercise|run(ning)?|lift(ing)?|cross[-\s]?fit|hiit)\b/i;
const RX_UPSCALE =
  /\b(upscale|smart\s*casual|business\s*casual|business(?!\s*days?)|formal|dressy|rooftop)\b/i;
const RX_BEACH = /\b(beach|pool|swim|swimming|resort|vacation|cruise)\b/i;
const RX_BLACK_TIE = /\b(black\s*tie|tux(ed|edo)?|white\s*tie)\b/i;
const RX_WEDDING = /\b(wedding|ceremony|reception)\b/i;

// ─────────────────────────────────────────────────────────────
// Category helpers
// ─────────────────────────────────────────────────────────────

const RX_SNEAKER = /(sneaker|trainer|running|athletic|gym)/i;
const RX_DRESS_SHOE = /(oxford|derby|monk|dress\s*shoe|loafers?)/i;
const RX_SHORTS = /\bshorts?\b/i;
const RX_JEANS = /\bjeans?\b/i;
const RX_TROUSERS = /\b(trousers?|chinos?)\b/i;
const RX_JOGGERS = /\b(joggers?|sweatpants|track\s*pants)\b/i;
const RX_TSHIRT = /\b(t-?shirt|tee|tank|jersey|performance|compression)\b/i;
const RX_HOODIE = /\bhoodie\b/i;
const RX_WINDBREAKER = /\b(windbreaker|shell|track\s*top)\b/i;
const RX_SWIM = /\b(swim|trunks|boardshorts?|bikini|one(-|\s)?piece)\b/i;
const RX_SANDAL = /\b(sandals?|flip-?flops?|slides?|espadrilles?)\b/i;
const RX_BLAZER = /\b(blazer|sport\s*coat|suit\s*jacket)\b/i;

// ─────────────────────────────────────────────────────────────
// Specific context filters
// ─────────────────────────────────────────────────────────────

/** Remove obviously ultra-casual stuff for upscale intents. */
function isUltraCasualForUpscale(c: CatalogItem): boolean {
  const main = mainOf(c);
  const sub = subOf(c);
  const lbl = labelOf(c);

  // obvious casual tops & loud casual items
  if (
    /(t-?shirt|tee|hoodie|tank|graphic\s*tee|hawaiian)/i.test(sub) ||
    /(t-?shirt|tee|hoodie|tank|graphic\s*tee|hawaiian)/i.test(lbl)
  ) {
    return true;
  }

  // shorts for bottoms
  if (main === 'bottoms' && RX_SHORTS.test(sub)) return true;

  // jeans: allow only if clearly dressy; otherwise screen out for upscale
  if (RX_JEANS.test(sub) && Number(c.formality_score ?? 0) < 6) return true;

  // generic dress code + formality gate
  const dc = c.dress_code;
  if (
    dc &&
    (dc === 'UltraCasual' || dc === 'Casual') &&
    Number(c.formality_score ?? 0) < 6
  ) {
    return true;
  }

  return false;
}

/** Strong allowlist for gym/workout. */
function allowGym(item: CatalogItem): boolean {
  const main = mainOf(item);
  const sub = subOf(item);
  const lbl = labelOf(item);

  // Shoes: sneakers/trainers/running
  if (main === 'shoes' && RX_SNEAKER.test(sub)) return true;

  // Activewear category always OK
  if (main === 'activewear') return true;

  // Tops: tees/tanks/performance/hoodie/windbreaker (common gym warmups)
  if (
    main === 'tops' &&
    (RX_TSHIRT.test(sub) || RX_HOODIE.test(sub) || RX_WINDBREAKER.test(sub))
  ) {
    return true;
  }

  // Outerwear: light windbreakers/shells for warm-up
  if (
    main === 'outerwear' &&
    (RX_WINDBREAKER.test(sub) || RX_HOODIE.test(lbl))
  ) {
    return true;
  }

  // Bottoms: shorts, joggers, sweatpants, track pants
  if (main === 'bottoms' && (RX_SHORTS.test(sub) || RX_JOGGERS.test(sub))) {
    return true;
  }

  return false;
}

/** Hard "no" list for gym, to catch sneaky items. */
function blockGym(item: CatalogItem): boolean {
  const main = mainOf(item);
  const sub = subOf(item);

  // No dress shoes, loafers, boots (work boots are generally poor for gym)
  if (main === 'shoes' && (RX_DRESS_SHOE.test(sub) || /boots?/.test(sub)))
    return true;

  // No trousers/chinos/jeans
  if (main === 'bottoms' && (RX_TROUSERS.test(sub) || RX_JEANS.test(sub)))
    return true;

  // No blazers, dress shirts, belts, suits
  if (main === 'outerwear' && RX_BLAZER.test(sub)) return true;
  if (main === 'tops' && /\b(dress\s*shirt)\b/i.test(sub)) return true;
  if (main === 'accessories' && /\bbelt\b/i.test(sub)) return true;
  if (main === 'formalwear') return true;

  return false;
}

/** Allowlist for beach/pool. (Tuned) */
function allowBeach(item: CatalogItem): boolean {
  const main = mainOf(item);
  const sub = subOf(item);
  const lbl = labelOf(item);

  // Swimwear always OK
  if (main === 'swimwear' || RX_SWIM.test(sub)) return true;

  // Bottoms: shorts, trunks, boardshorts, linen pants
  if (
    main === 'bottoms' &&
    (RX_SHORTS.test(sub) ||
      /\b(trunks|boardshorts?)\b/i.test(sub) ||
      /\blinen\b/i.test(lbl))
  ) {
    return true;
  }

  // Tops: Hawaiian/camp/resort shirts, tanks, linen shirts
  if (
    main === 'tops' &&
    (/\b(hawaiian|camp\s*shirt|resort|tank|linen)\b/i.test(sub) ||
      /\blinen\b/i.test(lbl))
  ) {
    return true;
  }

  // Shoes: sandals/espadrilles/slides
  if (main === 'shoes' && RX_SANDAL.test(sub)) return true;

  // Accessories: sunglasses, hats/caps
  if (main === 'accessories' && /\b(sunglasses|hat|cap)\b/i.test(sub))
    return true;

  // Lightweight linen/unstructured outer layer for breezy evenings
  if (main === 'outerwear' && /\b(linen|unstructured|lightweight)\b/i.test(lbl))
    return true;

  return false;
}

/** Hard "no" list for beach context. (Tuned) */
function blockBeach(item: CatalogItem): boolean {
  const main = mainOf(item);
  const sub = subOf(item);
  const lbl = labelOf(item);

  // Block trousers & jeans (too warm/formal for beach day)
  if (main === 'bottoms' && (RX_TROUSERS.test(sub) || RX_JEANS.test(sub)))
    return true;

  // Block sweaters, hoodies, heavy tops
  if (main === 'tops' && (RX_HOODIE.test(sub) || /\bsweater\b/i.test(sub)))
    return true;

  // Block outerwear unless it's clearly linen/lightweight/unstructured
  if (
    main === 'outerwear' &&
    !/\b(linen|unstructured|lightweight)\b/i.test(lbl)
  )
    return true;

  // Block dress shoes & boots
  if (main === 'shoes' && (RX_DRESS_SHOE.test(sub) || /boots?/i.test(sub)))
    return true;

  // Block belts (not a beach vibe)
  if (main === 'accessories' && /\bbelt\b/i.test(sub)) return true;

  // Formalwear is out
  if (main === 'formalwear') return true;

  return false;
}

/** For black tie, keep only formalwear essentials; block everything casual. */
function allowBlackTie(item: CatalogItem): boolean {
  const main = mainOf(item);
  const sub = subOf(item);
  const lbl = labelOf(item);

  // Formalwear & components
  if (main === 'formalwear') return true;
  if (
    main === 'outerwear' &&
    /\b(tux|dinner\s*jacket|suit\s*jacket)\b/i.test(lbl)
  )
    return true;
  if (main === 'tops' && /\b(dress\s*shirt|tuxedo\s*shirt)\b/i.test(lbl))
    return true;
  if (main === 'accessories' && /\b(bow\s*tie|cummerbund|studs?)\b/i.test(lbl))
    return true;
  if (main === 'shoes' && /\b(oxford|patent|dress\s*shoe)\b/i.test(sub))
    return true;
  if (main === 'bottoms' && /\b(tuxedo|dress)\s*(pants|trousers)\b/i.test(lbl))
    return true;

  return false;
}

function blockBlackTie(item: CatalogItem): boolean {
  const main = mainOf(item);
  const sub = subOf(item);
  if (main === 'shoes' && (RX_SNEAKER.test(sub) || /boots?/.test(sub)))
    return true;
  if (main === 'bottoms' && (RX_JEANS.test(sub) || RX_SHORTS.test(sub)))
    return true;
  if (main === 'tops' && (RX_TSHIRT.test(sub) || RX_HOODIE.test(sub)))
    return true;
  return false;
}

/** Wedding: remove ultra-casual; keep smart-casual→business/formal. */
function allowWedding(item: CatalogItem): boolean {
  const dc = item.dress_code;
  const f = Number(item.formality_score ?? NaN);
  // Prefer items with dress codes in SmartCasual/BusinessCasual/Business or higher formality
  if (dc && /^(SmartCasual|BusinessCasual|Business|BlackTie)$/.test(dc))
    return true;
  if (Number.isFinite(f) && f >= 6) return true;
  // Fallback: blazers/suit components & dress shoes are usually OK
  if (RX_BLAZER.test(subOf(item))) return true;
  if (
    item.main_category &&
    lc(item.main_category) === 'shoes' &&
    RX_DRESS_SHOE.test(subOf(item))
  )
    return true;
  return false;
}

function blockWedding(item: CatalogItem): boolean {
  // No ultra-casual
  if (isUltraCasualForUpscale(item)) return true;
  // Hard bans: shorts, hoodies, sneakers (unless specified casual wedding, which we don't detect here)
  const main = mainOf(item);
  const sub = subOf(item);
  if (main === 'bottoms' && RX_SHORTS.test(sub)) return true;
  if (main === 'tops' && RX_HOODIE.test(sub)) return true;
  if (main === 'shoes' && RX_SNEAKER.test(sub)) return true;
  return false;
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

export function applyContextualFilters<T extends CatalogItem>(
  query: string,
  catalog: T[],
  options?: ContextFilterOptions,
): T[] {
  const opts = { ...DEFAULTS, ...(options ?? {}) };
  const q = query.toLowerCase();

  // Order of precedence: gym > black tie > beach > wedding > upscale
  // (Gym is highly specific; black tie is strict; beach is specific; wedding & upscale are broader.)
  let filtered = [...catalog];

  if (RX_GYM.test(q)) {
    const strong = filtered.filter((it) => allowGym(it));
    if (strong.length >= opts.minKeep) {
      filtered = strong;
    } else {
      // soften: remove hard "no" items but keep comfy basics
      filtered = filtered.filter((it) => !blockGym(it));
    }
  }

  if (RX_BLACK_TIE.test(q)) {
    const strong = filtered.filter((it) => allowBlackTie(it));
    filtered =
      strong.length >= Math.min(opts.minKeep, 8)
        ? strong
        : // if too few tux-specific pieces exist, at least block casual
          filtered.filter((it) => !blockBlackTie(it));
  }

  if (RX_BEACH.test(q)) {
    const strong = filtered.filter((it) => allowBeach(it));
    filtered =
      strong.length >= opts.minKeep
        ? strong
        : filtered.filter((it) => !blockBeach(it));
  }

  if (RX_WEDDING.test(q)) {
    const strong = filtered.filter((it) => allowWedding(it));
    filtered =
      strong.length >= opts.minKeep
        ? strong
        : filtered.filter((it) => !blockWedding(it));
  }

  if (RX_UPSCALE.test(q)) {
    filtered = filtered.filter((it) => !isUltraCasualForUpscale(it));
  }

  // Safety valve: never return empty; if we somehow filtered everything, revert.
  if (filtered.length === 0) return catalog;

  return filtered;
}

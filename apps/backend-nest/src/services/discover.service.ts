import { Injectable, Logger } from '@nestjs/common';
import { pool } from '../db/pool';
import { getSecret, secretExists } from '../config/secrets';
import { LearningEventsService } from '../learning/learning-events.service';
import { LEARNING_FLAGS } from '../config/feature-flags';

interface UserProfile {
  gender: string | null;
  preferred_brands: string[];
  style_keywords: string[];
  color_preferences: string[];
  disliked_styles: string[];
  style_preferences: string[];
  fit_preferences: string[];
  body_type: string | null;
  climate: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
}

interface BrowserSignals {
  brands: string[];
  categories: string[];
  colors: string[];
}

interface LearnedPreferences {
  positive_features: string[];
  negative_features: string[];
}

export interface DiscoverProduct {
  id: string;
  product_id: string;
  title: string;
  brand: string | null;
  price: number | null;
  price_raw: string | null;
  image_url: string;
  link: string;
  source: string | null;
  category: string | null;
  position: number;
  saved?: boolean;
  saved_at?: string | null;
  batch_date?: string;
  is_current?: boolean;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const TARGET_PRODUCTS = 10;
const DEBUG_RECOMMENDED_BUYS = process.env.DEBUG_RECOMMENDED_BUYS === 'true';

/** Strip non-alphanumeric (except spaces), lowercase, collapse whitespace */
function normalize(str?: string | null): string {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferMainCategory(title?: string): string | null {
  if (!title) return null;
  const t = normalize(title);

  if (/(jacket|coat|parka|blazer|overshirt|anorak|windbreaker|gilet|poncho|puffer)/.test(t)) return 'Outerwear';
  if (/(dress|gown|romper|jumpsuit|kaftan)/.test(t)) return 'Dresses';
  if (/(shirt|polo|\btee\b|tshirt|t shirt|sweater|jumper|hoodie|sweatshirt|cardigan|pullover|blouse|tunic|henley|camisole|crop top|tank top)/.test(t)) return 'Tops';
  if (/(jeans|pants|trouser|shorts|legging|jogger|chino|skirt)/.test(t)) return 'Bottoms';
  if (/(sneaker|boot|loafer|shoe|sandal|slipper|mule|oxford|clog)/.test(t)) return 'Shoes';
  if (/(handbag|backpack|tote bag|clutch|purse|crossbody|duffel)/.test(t)) return 'Bags';
  if (/(watch|bracelet|necklace|earring|pendant|anklet|brooch|cufflink)/.test(t)) return 'Jewelry';
  if (/(belt|\btie\b|\bhat\b|\bcap\b|scarf|glove|sunglasses|beanie|headband)/.test(t)) return 'Accessories';
  if (/(swimsuit|bikini|swim trunk|rash guard)/.test(t)) return 'Swimwear';
  if (/(athletic|yoga|workout|activewear)/.test(t)) return 'Activewear';

  return null;
}

/** Clamp a number to the [0, 1] range */
function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Create a Set of normalized strings from an array */
function tokenSet(items: string[]): Set<string> {
  const s = new Set<string>();
  for (const item of items) {
    const n = normalize(item);
    if (n) s.add(n);
  }
  return s;
}

/** Fraction of needles found (substring) in text, normalized to 0..1 */
function overlap01(needles: Set<string>, text: string): number {
  if (needles.size === 0) return 0;
  const normText = normalize(text);
  if (!normText) return 0;
  let hits = 0;
  for (const needle of needles) {
    if (normText.includes(needle)) hits++;
  }
  return clamp01(hits / needles.size);
}

/** Deterministic brand saturation penalty: 8 * (brandFreq01 ^ 1.5) */
function brandSatPenalty(brandFreq01: number): number {
  return 8 * (brandFreq01 ** 1.5);
}

// ==================== STYLE VOCABULARY INTELLIGENCE ====================
// Maps aesthetic concepts (user vocabulary) → retail descriptors (product vocabulary)
// Enables scoring when users say "tailored" but products say "slim fit"
const STYLE_DESCRIPTOR_MAP: Record<string, string[]> = {
  // Fit & Structure
  tailored: ['slim', 'slim fit', 'structured', 'pleated', 'tapered', 'fitted', 'darted', 'shaped'],
  relaxed: ['relaxed', 'loose', 'comfort', 'flowy', 'oversized', 'easy fit', 'wide leg', 'baggy'],
  fitted: ['slim fit', 'skinny', 'bodycon', 'form fitting', 'stretch', 'tapered', 'tight'],
  oversized: ['oversized', 'boxy', 'relaxed fit', 'wide', 'loose fit', 'dropped shoulder'],

  // Aesthetic Families
  minimalist: ['basic', 'clean', 'solid', 'plain', 'simple', 'essential', 'classic fit', 'neutral'],
  classic: ['straight fit', 'oxford', 'double breasted', 'button down', 'traditional', 'heritage', 'timeless', 'polo'],
  modern: ['zip', 'zip up', 'puffer', 'bomber', 'tech', 'contemporary', 'sleek', 'asymmetric'],
  vintage: ['retro', 'washed', 'faded', 'distressed', 'throwback', 'heritage', 'classic', 'old school'],
  bohemian: ['boho', 'floral', 'embroidered', 'fringe', 'paisley', 'crochet', 'flowing', 'peasant'],
  preppy: ['polo', 'button down', 'plaid', 'argyle', 'cable knit', 'oxford', 'khaki', 'chino', 'stripe'],
  edgy: ['leather', 'moto', 'studded', 'distressed', 'ripped', 'chain', 'graphic', 'punk', 'zipper'],
  romantic: ['lace', 'ruffle', 'floral', 'sheer', 'satin', 'delicate', 'soft', 'drape', 'feminine'],

  // Performance & Sport
  athletic: ['performance', 'stretch', 'sport', 'flex', 'moisture wicking', 'active', 'training', 'running', 'gym'],
  sporty: ['athletic', 'jogger', 'track', 'sneaker', 'zip up', 'hoodie', 'sweatshirt', 'workout', 'active'],
  activewear: ['legging', 'sports bra', 'tank', 'performance', 'stretch', 'moisture', 'yoga', 'running'],

  // Luxury & Elevated
  luxury: ['silk', 'cashmere', 'wool', 'leather', 'suede', 'merino', 'linen', 'italian', 'premium'],
  elevated: ['embroidered', 'textured', 'chenille', 'blend', 'detailed', 'refined', 'quality', 'artisan'],
  sophisticated: ['tailored', 'structured', 'wool', 'silk', 'elegant', 'polished', 'refined', 'classic'],
  elegant: ['silk', 'satin', 'chiffon', 'drape', 'maxi', 'midi', 'formal', 'evening', 'gown'],

  // Street & Casual
  streetwear: ['oversized', 'graphic', 'hoodie', 'jogger', 'cargo', 'sneaker', 'logo', 'urban', 'crew neck'],
  casual: ['tee', 't shirt', 'jeans', 'sneaker', 'hoodie', 'sweatshirt', 'relaxed', 'everyday', 'basic'],
  urban: ['cargo', 'utility', 'bomber', 'sneaker', 'graphic', 'jogger', 'street', 'oversized'],

  // Texture & Material
  rugged: ['denim', 'canvas', 'leather', 'flannel', 'corduroy', 'work', 'utility', 'heavy duty', 'boot'],
  cozy: ['fleece', 'sherpa', 'knit', 'sweater', 'cardigan', 'wool', 'soft', 'plush', 'warm'],
  lightweight: ['linen', 'cotton', 'breathable', 'thin', 'sheer', 'mesh', 'light', 'airy'],

  // Pattern & Detail
  bold: ['print', 'pattern', 'graphic', 'bright', 'colorful', 'statement', 'vibrant', 'neon'],
  neutral: ['black', 'white', 'grey', 'gray', 'beige', 'navy', 'cream', 'khaki', 'earth tone'],
  patterned: ['stripe', 'plaid', 'check', 'floral', 'paisley', 'polka dot', 'geometric', 'print'],

  // Season & Occasion
  summer: ['linen', 'cotton', 'shorts', 'tank', 'sandal', 'light', 'breathable', 'floral'],
  winter: ['wool', 'fleece', 'puffer', 'down', 'thermal', 'insulated', 'heavy', 'coat', 'boot'],
  business: ['dress shirt', 'blazer', 'trouser', 'oxford', 'loafer', 'formal', 'professional', 'suit'],
  'smart casual': ['chino', 'polo', 'loafer', 'blazer', 'button down', 'knit', 'leather'],
};

/** Expand style keywords using STYLE_DESCRIPTOR_MAP */
function expandStyleTokens(styleKeywords: string[]): Set<string> {
  const expanded = new Set<string>();
  for (const keyword of styleKeywords) {
    const norm = normalize(keyword);
    if (!norm) continue;
    // Always include the original keyword
    expanded.add(norm);
    // Check each map entry for matches
    for (const [concept, descriptors] of Object.entries(STYLE_DESCRIPTOR_MAP)) {
      if (norm === concept || norm.includes(concept) || concept.includes(norm)) {
        for (const desc of descriptors) {
          expanded.add(normalize(desc));
        }
      }
    }
  }
  return expanded;
}

// ==================== COLOR VOCABULARY (for auto-inference) ====================
const COLOR_VOCAB: string[] = [
  'black', 'white', 'navy', 'blue', 'red', 'green', 'gray', 'grey',
  'brown', 'beige', 'tan', 'cream', 'burgundy', 'olive',
];

/** Category adjacency map — normalized keys and values */
const CATEGORY_ADJACENCY: Record<string, string[]> = {
  outerwear: ['tops'],
  tops: ['outerwear', 'activewear'],
  bottoms: ['activewear'],
  shoes: ['accessories'],
  accessories: ['shoes', 'jewelry', 'bags'],
  dresses: ['tops', 'bottoms'],
  activewear: ['tops', 'bottoms', 'shoes'],
  bags: ['accessories'],
  jewelry: ['accessories'],
  swimwear: ['activewear'],
};

@Injectable()
export class DiscoverService {
  private readonly log = new Logger(DiscoverService.name);

  constructor(private readonly learningEvents: LearningEventsService) {}

  private get serpApiKey(): string | undefined {
    return secretExists('SERPAPI_KEY') ? getSecret('SERPAPI_KEY') : undefined;
  }

  // ==================== MAIN ENTRY POINT ====================

  async getRecommended(userId: string): Promise<DiscoverProduct[]> {
    console.log('🔥🔥🔥 GET RECOMMENDED ENTERED 🔥🔥🔥');
    console.log('DEBUG_RECOMMENDED_BUYS =', process.env.DEBUG_RECOMMENDED_BUYS);
    // this.log.log(`🛒 getRecommended called for userId: ${userId}`);

    // ALWAYS check cache first
    const cached = await this.getCachedProducts(userId);
    const debugMode = process.env.DEBUG_RECOMMENDED_BUYS === 'true';
    const cacheValid = debugMode
      ? false
      : await this.isCacheValid(userId);

    // this.log.log(`🛒 Cache status: valid=${cacheValid}, cached count=${cached.length}`);

    console.log('🔥 Cache validity evaluated 🔥', { cacheValid, cachedCount: cached.length });

    // HARDLOCK: If cache is valid (within 7 days) AND we have products, return them. NO API CALLS.
    // If cache is "valid" but empty, we should still try to fetch.
    if (cacheValid && cached.length > 0) {
      console.log('🔥 Returning from CACHE PATH 🔥');
      // this.log.log(`🛒 Returning ${cached.length} cached products for user ${userId} (weekly lock active - NO API CALLS)`);
      return cached;
    }

    // If cache is valid but empty, log this unusual state
    if (cacheValid && cached.length === 0) {
      this.log.warn(
        `🛒 Cache marked valid but contains 0 products for user ${userId} - will attempt fetch`,
      );
    }

    // Cache expired or never set - ONE fetch attempt, then lock for a week
    this.log.log(
      `Cache expired or empty for user ${userId} - fetching fresh products`,
    );

    let products: DiscoverProduct[] = [];

    try {
      products = await this.fetchPersonalizedProducts(userId);
    } catch (error: any) {
      this.log.error(`fetchPersonalizedProducts failed: ${error?.message}`);
    }

    // Only trigger fallback if candidate pool is completely empty
    if (products.length === 0) {
      console.log('🔥 No candidates available — invoking fallback 🔥');
      try {
        products = await this.getFallbackProducts(userId);
      } catch (fallbackError: any) {
        this.log.error(
          `getFallbackProducts also failed: ${fallbackError?.message}`,
        );
      }
    }

    // ALWAYS set timestamp and save whatever we got - locks for a week regardless
    if (products.length > 0) {
      await this.saveProducts(userId, products);
    }
    await this.updateRefreshTimestamp(userId);

    this.log.log(
      `Locked ${products.length} products for user ${userId} - no more API calls for 7 days`,
    );
    return products;
  }

  // Returns true if cache is still valid (within 7 days), false if expired or never set
  private async isCacheValid(userId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        'SELECT last_discover_refresh FROM users WHERE id = $1',
        [userId],
      );

      const lastRefresh = result.rows[0]?.last_discover_refresh;
      if (!lastRefresh) {
        return false; // Never refreshed
      }

      const lastRefreshTime = new Date(lastRefresh).getTime();
      const age = Date.now() - lastRefreshTime;

      // Cache is valid if less than 7 days old
      return age < SEVEN_DAYS_MS;
    } catch {
      return false;
    }
  }

  // ==================== GET CACHED PRODUCTS ====================

  private async getCachedProducts(userId: string): Promise<DiscoverProduct[]> {
    try {
      // Join with saved_recommendations to get actual saved status
      const result = await pool.query(
        `SELECT
           udp.id, udp.product_id, udp.title, udp.brand, udp.price, udp.price_raw,
           udp.image_url, udp.link, udp.source, udp.category, udp.position,
           (sr.id IS NOT NULL) as saved,
           sr.saved_at,
           udp.batch_date, udp.is_current
         FROM user_discover_products udp
         LEFT JOIN saved_recommendations sr
           ON sr.user_id = udp.user_id AND sr.product_id = udp.product_id
         WHERE udp.user_id = $1 AND udp.is_current = TRUE
         ORDER BY udp.position ASC
         LIMIT $2`,
        [userId, TARGET_PRODUCTS],
      );
      // this.log.log(`🛒 getCachedProducts query returned ${result.rows.length} rows`);
      // if (result.rows.length > 0) {
      //   this.log.log(`🛒 First cached product: ${JSON.stringify(result.rows[0])}`);
      // }
      return result.rows;
    } catch (error) {
      // this.log.error(`🛒 getCachedProducts failed: ${error?.message}`);
      // Table might not exist yet - return empty
      return [];
    }
  }

  // ==================== FETCH PERSONALIZED PRODUCTS ====================

  private async fetchPersonalizedProducts(
    userId: string,
  ): Promise<DiscoverProduct[]> {
    console.log('🔥 ENTERED fetchPersonalizedProducts 🔥');
    this.log.log(`fetchPersonalizedProducts starting for ${userId}`);

    let profile: UserProfile;
    let browserSignals: BrowserSignals;
    let learnedPrefs: LearnedPreferences;
    let ownedCategories: Map<string, number>;
    let shownProductIds: string[];

    try {
      // Gather all personalization signals
      [
        profile,
        browserSignals,
        learnedPrefs,
        ownedCategories,
        shownProductIds,
      ] = await Promise.all([
        this.getUserProfile(userId),
        this.getBrowserSignals(userId),
        this.getLearnedPreferences(userId),
        this.getOwnedCategories(userId),
        this.getShownProductIds(userId),
      ]);
    } catch (err) {
      this.log.error(`Failed to gather profile data: ${err}`);
      throw err;
    }

    this.log.log(
      `Profile for ${userId}: gender=${profile.gender}, brands=${profile.preferred_brands.length}, keywords=${profile.style_keywords.length}`,
    );

    // Must have gender - hard requirement
    if (!profile.gender) {
      this.log.warn(`User ${userId} has no gender set, returning empty for fallback`);
      console.log('🔥 RETURNING FROM fetchPersonalizedProducts (no gender → empty) 🔥');
      return [];
    }

    // Build search queries based on profile
    const queries = this.buildSearchQueries(
      profile,
      browserSignals,
      learnedPrefs,
      ownedCategories,
    );

    // --- Stage 1: Candidate Generation ---
    // Collect a large pool (up to 75) to enable scoring and diversity filtering
    const CANDIDATE_POOL_SIZE = 75;
    const allProducts: any[] = [];
    const usedProductIds = new Set(shownProductIds);

    for (const query of queries) {
      if (allProducts.length >= CANDIDATE_POOL_SIZE) break;

      try {
        const products = await this.searchSerpApi(query, profile.gender);

        for (const p of products) {
          if (allProducts.length >= CANDIDATE_POOL_SIZE) break;

          const productId = this.getProductId(p);
          if (usedProductIds.has(productId)) continue;
          if (this.matchesDisliked(p, profile.disliked_styles)) continue;

          usedProductIds.add(productId);
          allProducts.push(p);
        }
      } catch (error) {
        this.log.warn(`Query failed: ${query} - ${error}`);
      }
    }

    // Broaden search if candidate pool is thin
    if (allProducts.length < CANDIDATE_POOL_SIZE) {
      const broadQuery = `${profile.gender === 'male' ? "men's" : "women's"} fashion clothing`;
      try {
        const products = await this.searchSerpApi(broadQuery, profile.gender);
        for (const p of products) {
          if (allProducts.length >= CANDIDATE_POOL_SIZE) break;
          const productId = this.getProductId(p);
          if (usedProductIds.has(productId)) continue;
          usedProductIds.add(productId);
          allProducts.push(p);
        }
      } catch (error) {
        this.log.warn(`Broad query failed: ${error}`);
      }
    }

    if (DEBUG_RECOMMENDED_BUYS) {
      this.log.debug(`[Discover] Candidate pool size: ${allProducts.length}`);
    }

    // If candidate pool is empty, return [] and let getRecommended() handle fallback
    if (allProducts.length === 0) {
      console.log('🔥 RETURNING FROM fetchPersonalizedProducts (empty candidate pool) 🔥');
      return [];
    }

    console.log('🔥 ENTERING SCORING BLOCK 🔥', { candidateCount: allProducts.length });

    // --- Stage 2: Scoring ---
    // Transform raw products, then score each against profile signals
    const transformed = allProducts.map((p, i) =>
      this.transformProduct(p, i + 1),
    );

    const lowOwnedCategories = [...ownedCategories.entries()]
      .filter(([, count]) => count < 3)
      .map(([cat]) => cat);

    const wardrobeStats = { lowOwnedCategories };
    const behavior = { recentBrands: browserSignals.brands };

    if (DEBUG_RECOMMENDED_BUYS) {
      console.log('🧥 LOW OWNED CATEGORIES', wardrobeStats.lowOwnedCategories);
    }

    // --- Auto-infer color defaults from candidate pool when profile lacks them ---
    if (DEBUG_RECOMMENDED_BUYS) {
      console.log('🔬 RAW color_preferences FROM DB', {
        raw: profile.color_preferences,
        type: typeof profile.color_preferences,
        length: profile.color_preferences?.length,
      });
    }
    let effectiveFavoriteColors = profile.color_preferences.filter(c => {
      const n = normalize(c);
      return n.length > 0 && n !== 'null' && n !== 'undefined' && n !== 'none';
    });
    const hasUsableColors = effectiveFavoriteColors.length > 0;
    if (DEBUG_RECOMMENDED_BUYS) {
      console.log('🔬 COLOR FILTER RESULT', {
        effectiveFavoriteColors,
        hasUsableColors,
        inferenceWillRun: !hasUsableColors,
      });
    }
    if (!hasUsableColors) {
      const colorFreq = new Map<string, number>();
      for (const raw of allProducts) {
        const parts: (string | null | undefined)[] = [
          raw?.title, raw?.color, raw?.variantColor, raw?.snippet, raw?.description,
        ];
        if (raw?.extensions?.color) parts.push(raw.extensions.color);
        if (Array.isArray(raw?.extensions)) parts.push(...raw.extensions.map(String));
        const blob = normalize(parts.filter(Boolean).join(' '));
        for (const color of COLOR_VOCAB) {
          if (blob.includes(color)) {
            colorFreq.set(color, (colorFreq.get(color) || 0) + 1);
          }
        }
      }
      effectiveFavoriteColors = [...colorFreq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([c]) => c);

      if (DEBUG_RECOMMENDED_BUYS) {
        console.log('🎨 INFERRED COLOR DEFAULTS', {
          inferredColors: effectiveFavoriteColors,
          source: 'candidate-frequency',
        });
      }
    }

    // --- Auto-infer budget defaults from candidate pool when profile lacks them ---
    let effectiveBudgetMin = profile.budget_min;
    let effectiveBudgetMax = profile.budget_max;
    if (effectiveBudgetMin == null || effectiveBudgetMax == null) {
      const prices = transformed
        .map(p => p.price)
        .filter((v): v is number => typeof v === 'number' && v > 0)
        .sort((a, b) => a - b);

      if (prices.length >= 4) {
        const p25Idx = Math.floor(prices.length * 0.25);
        const p75Idx = Math.floor(prices.length * 0.75);
        effectiveBudgetMin = prices[p25Idx];
        effectiveBudgetMax = prices[p75Idx];
      } else if (prices.length > 0) {
        effectiveBudgetMin = prices[0];
        effectiveBudgetMax = prices[prices.length - 1];
      }

      if (DEBUG_RECOMMENDED_BUYS) {
        console.log('💰 INFERRED BUDGET DEFAULTS', {
          p25: effectiveBudgetMin,
          p75: effectiveBudgetMax,
          candidatePriceCount: prices.length,
        });
      }
    }

    // Pre-compute normalized profile sets for overlap scoring
    const profileColors = tokenSet(effectiveFavoriteColors);
    const expandedStyles = expandStyleTokens(profile.style_keywords);
    const styleKeywordsNorm = new Set(profile.style_keywords.map(k => normalize(k)));

    if (DEBUG_RECOMMENDED_BUYS) {
      console.log('🎨 STYLE VOCABULARY EXPANSION', {
        rawKeywords: profile.style_keywords,
        expandedCount: expandedStyles.size,
        expandedTokens: [...expandedStyles],
      });
    }

    // Build brand frequency map for saturation penalty
    const brandFreqMap = new Map<string, number>();
    for (const p of transformed) {
      const b = normalize(p.brand);
      if (b) brandFreqMap.set(b, (brandFreqMap.get(b) || 0) + 1);
    }
    const totalCandidates = transformed.length;

    const scored = transformed.map((p, idx) => {
      const breakdown = {
        brand: 0,
        color: 0,
        style: 0,
        gap: 0,
        budget: 0,
        behavior: 0,
        penalty: 0,
      };

      const normBrand = normalize(p.brand);

      // Brand match — 0 or 1 (normalized substring)
      const brandMatch01 = (normBrand && profile.preferred_brands?.some((b) => normBrand.includes(normalize(b)))) ? 1 : 0;

      // Behavior brand match — 0 or 1 (normalized substring)
      const behavior01 = (normBrand && behavior.recentBrands?.some((b) => normBrand.includes(normalize(b)))) ? 1 : 0;

      // --- Infer category early (used by style blob + gap) ---
      const inferredCategory = p.category || inferMainCategory(p.title);

      // --- STYLE UPGRADE: text blob from all available product fields ---
      const raw = allProducts[idx];

      // STEP 1 — Forensic: dump first raw product object
      if (idx === 0 && process.env.DEBUG_RECOMMENDED_BUYS === 'true') {
        console.log('🔬 RAW PRODUCT OBJECT [0]');
        console.dir(raw, { depth: 5 });
        console.log('🔬 PROFILE COLORS (effective)', [...profileColors]);
      }

      const textParts: (string | null | undefined)[] = [
        p.title, p.brand, p.source, p.category, inferredCategory,
      ];
      if (raw?.snippet) textParts.push(raw.snippet);
      if (Array.isArray(raw?.extensions)) textParts.push(...raw.extensions.map(String));
      const productTextBlob = textParts.filter(Boolean).join(' ');
      const normProductText = normalize(productTextBlob);

      // Style scoring uses expanded vocabulary (aesthetic → retail descriptors)
      // Capped normalization: 3 matches = full score (1.0)
      const STYLE_MATCH_CAP = 3;
      let styleHits = 0;
      const matchedStyleTokens: string[] = [];
      for (const token of expandedStyles) {
        if (normProductText.includes(token)) {
          styleHits++;
          matchedStyleTokens.push(token);
        }
      }
      const style01 = expandedStyles.size > 0
        ? clamp01(styleHits / STYLE_MATCH_CAP)
        : 0;

      if (DEBUG_RECOMMENDED_BUYS && idx < 5) {
        console.log('🔍 STYLE DEBUG', {
          title: p.title,
          matches: styleHits,
          cappedStyle01: +style01.toFixed(4),
          weightedStyleContribution: +(16 * style01).toFixed(2),
          matchedTokens: matchedStyleTokens,
        });
      }

      // --- COLOR UPGRADE: structured fields + title + description fallback ---
      // Extract color candidates from all available product fields
      const colorParts: (string | null | undefined)[] = [p.title];
      if (raw?.color) colorParts.push(raw.color);
      if (raw?.extensions?.color) colorParts.push(raw.extensions.color);
      if (raw?.variantColor) colorParts.push(raw.variantColor);
      if (raw?.snippet) colorParts.push(raw.snippet);
      if (raw?.description) colorParts.push(raw.description);
      if (Array.isArray(raw?.extensions)) colorParts.push(...raw.extensions.map(String));
      const productColorBlob = colorParts.filter(Boolean).join(' ');

      // Capped color scaling: 2 matches = full score (1.0)
      const COLOR_MATCH_CAP = 2;
      let colorHits = 0;
      const matchedColors: string[] = [];
      const normColorBlob = normalize(productColorBlob);
      for (const colorToken of profileColors) {
        if (normColorBlob.includes(colorToken)) {
          colorHits++;
          matchedColors.push(colorToken);
        }
      }
      const color01 = profileColors.size > 0
        ? clamp01(colorHits / COLOR_MATCH_CAP)
        : 0;

      // --- BUDGET UPGRADE: soft decay scaling outside preferred range ---
      let budget01 = 0;
      if (typeof p.price === 'number' && effectiveBudgetMin != null && effectiveBudgetMax != null) {
        if (p.price >= effectiveBudgetMin && p.price <= effectiveBudgetMax) {
          budget01 = 1;
        } else {
          const nearestBound = p.price < effectiveBudgetMin ? effectiveBudgetMin : effectiveBudgetMax;
          const distance = Math.abs(p.price - nearestBound);
          const rangeSpan = effectiveBudgetMax - effectiveBudgetMin;
          const denominator = rangeSpan > 0 ? rangeSpan * 2 : (effectiveBudgetMax > 0 ? effectiveBudgetMax : 1);
          budget01 = clamp01(1 - (distance / denominator));
        }
      }

      if (DEBUG_RECOMMENDED_BUYS && idx < 5) {
        console.log('🎨 COLOR DEBUG', {
          title: p.title,
          matchedColors,
          color01: +color01.toFixed(4),
          weightedColorContribution: +(10 * color01).toFixed(2),
        });
        console.log('💰 BUDGET DEBUG', {
          title: p.title,
          price: p.price,
          preferredMin: effectiveBudgetMin,
          preferredMax: effectiveBudgetMax,
          budget01: +budget01.toFixed(4),
          weightedBudgetContribution: +(10 * budget01).toFixed(2),
        });
      }

      // --- GAP UPGRADE: direct match + category adjacency ---
      let gap01 = 0;
      if (inferredCategory) {
        const normInferred = normalize(inferredCategory);
        const directMatch = wardrobeStats.lowOwnedCategories.some(c => normalize(c) === normInferred);
        if (directMatch) {
          const userOwnsCategory = ownedCategories.has(inferredCategory);
          const styleIncludesCategory = styleKeywordsNorm.has(normInferred);
          if (userOwnsCategory || styleIncludesCategory) {
            gap01 = 1;
          }
        }
        if (gap01 === 0) {
          for (const lowCat of wardrobeStats.lowOwnedCategories) {
            const adjacents = CATEGORY_ADJACENCY[normalize(lowCat)];
            if (adjacents && adjacents.includes(normInferred)) {
              gap01 = 0.5;
              break;
            }
          }
        }
      }

      // Brand saturation penalty — only when brand matches
      let penalty = 0;
      if (brandMatch01 === 1 && normBrand) {
        const brandCount = brandFreqMap.get(normBrand) || 0;
        const brandFreq01 = brandCount / totalCandidates;
        penalty = brandSatPenalty(brandFreq01);
      }

      // Weighted score: brand(12) + behavior(8) + gap(18) + style(16) + color(10) + budget(10) - penalty
      const score =
        (12 * brandMatch01) +
        (8  * behavior01) +
        (18 * gap01) +
        (16 * style01) +
        (10 * color01) +
        (10 * budget01) -
        penalty;

      breakdown.brand = +(12 * brandMatch01).toFixed(2);
      breakdown.behavior = +(8 * behavior01).toFixed(2);
      breakdown.gap = +(18 * gap01).toFixed(2);
      breakdown.style = +(16 * style01).toFixed(2);
      breakdown.color = +(10 * color01).toFixed(2);
      breakdown.budget = +(10 * budget01).toFixed(2);
      breakdown.penalty = +penalty.toFixed(2);

      if (DEBUG_RECOMMENDED_BUYS) {
        this.log.debug(
          `[Discover][Score] ${JSON.stringify({ title: p.title, brand: p.brand, price: p.price, totalScore: +score.toFixed(2), breakdown })}`,
        );
      }

      return { product: p, score, breakdown };
    });

    scored.sort((a, b) => b.score - a.score);

    if (DEBUG_RECOMMENDED_BUYS) {
      const scores = scored.map(s => s.score);
      const max = Math.max(...scores);
      const min = Math.min(...scores);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

      console.log('📊 SCORE SUMMARY', {
        candidateCount: scored.length,
        max,
        min,
        avg,
      });

      console.log('🏆 TOP 15 BEFORE DIVERSITY');
      scored.slice(0, 15).forEach((s, i) => {
        console.log(`#${i + 1}`, {
          title: s.product.title,
          brand: s.product.brand,
          score: s.score,
          breakdown: s.breakdown,
        });
      });
    }

    const rankedProducts = scored.map((s) => s.product);

    // --- Stage 3: Diversity Mix ---
    // Cap per-brand and per-category to ensure variety in final set
    const diversified: DiscoverProduct[] = [];
    const brandCount = new Map<string, number>();
    const categoryCount = new Map<string, number>();

    for (const p of rankedProducts) {
      const brand = p.brand || '__unknown__';
      const bc = brandCount.get(brand) || 0;

      if (bc >= 3) continue; // Max 3 per brand

      // Only enforce category cap when category is known
      if (p.category) {
        const cc = categoryCount.get(p.category) || 0;
        if (cc >= 4) continue; // Max 4 per category
      }

      diversified.push(p);
      brandCount.set(brand, bc + 1);
      if (p.category) {
        categoryCount.set(p.category, (categoryCount.get(p.category) || 0) + 1);
      }
    }

    if (DEBUG_RECOMMENDED_BUYS) {
      console.log('🧩 AFTER DIVERSITY', {
        remaining: diversified.length,
      });
    }

    // Final slice to target count, re-assign positions
    const finalProducts = diversified
      .slice(0, TARGET_PRODUCTS)
      .map((p, i) => ({ ...p, position: i + 1 }));

    if (DEBUG_RECOMMENDED_BUYS) {
      console.log('✅ FINAL SELECTED');
      finalProducts.forEach((p, i) => {
        console.log(`#${i + 1}`, {
          title: p.title,
          brand: p.brand,
        });
      });
    }

    // Save to DB
    await this.saveProducts(userId, finalProducts);

    // Update refresh timestamp
    await this.updateRefreshTimestamp(userId);

    // Track shown products
    await this.trackShownProducts(
      userId,
      finalProducts.map((p) => p.product_id),
    );

    console.log('🔥 FINAL PRODUCTS COUNT 🔥', finalProducts.length);
    return finalProducts;
  }

  // ==================== USER PROFILE ====================

  private async getUserProfile(userId: string): Promise<UserProfile> {
    const result = await pool.query(
      `SELECT
        u.gender_presentation,
        sp.preferred_brands,
        sp.color_preferences,
        sp.disliked_styles,
        sp.style_preferences,
        sp.fit_preferences,
        sp.body_type,
        sp.climate
       FROM users u
       LEFT JOIN style_profiles sp ON sp.user_id = u.id
       WHERE u.id = $1`,
      [userId],
    );

    if (result.rowCount === 0) {
      return {
        gender: null,
        preferred_brands: [],
        style_keywords: [],
        color_preferences: [],
        disliked_styles: [],
        style_preferences: [],
        fit_preferences: [],
        body_type: null,
        climate: null,
      };
    }

    const row = result.rows[0];
    return {
      gender: this.normalizeGender(row.gender_presentation),
      preferred_brands: this.ensureArray(row.preferred_brands),
      style_keywords: this.ensureArray(row.style_preferences), // Use style_preferences as style_keywords
      color_preferences: this.ensureArray(row.color_preferences), // DB column is color_preferences
      disliked_styles: this.ensureArray(row.disliked_styles),
      style_preferences: this.ensureArray(row.style_preferences),
      fit_preferences: this.ensureArray(row.fit_preferences),
      body_type: row.body_type,
      climate: row.climate,
    };
  }

  private normalizeGender(gender: string | null): string | null {
    if (!gender) return null;
    const g = gender.toLowerCase().trim();
    if (g.includes('male') || g.includes('man') || g.includes('men'))
      return 'male';
    if (g.includes('female') || g.includes('woman') || g.includes('women'))
      return 'female';
    return null;
  }

  // ==================== BROWSER SIGNALS ====================

  private async getBrowserSignals(userId: string): Promise<BrowserSignals> {
    const result = await pool.query(
      `SELECT brand, category, colors_viewed
       FROM browser_bookmarks
       WHERE user_id = $1
       ORDER BY view_count DESC, updated_at DESC
       LIMIT 50`,
      [userId],
    );

    const brands = new Set<string>();
    const categories = new Set<string>();
    const colors = new Set<string>();

    for (const row of result.rows) {
      if (row.brand) brands.add(row.brand);
      if (row.category) categories.add(row.category);
      if (Array.isArray(row.colors_viewed)) {
        row.colors_viewed.forEach((c: string) => colors.add(c));
      }
    }

    return {
      brands: Array.from(brands).slice(0, 5),
      categories: Array.from(categories).slice(0, 5),
      colors: Array.from(colors).slice(0, 5),
    };
  }

  // ==================== LEARNED PREFERENCES ====================

  private async getLearnedPreferences(
    userId: string,
  ): Promise<LearnedPreferences> {
    const result = await pool.query(
      `SELECT feature, score
       FROM user_pref_feature
       WHERE user_id = $1
       ORDER BY ABS(score) DESC
       LIMIT 20`,
      [userId],
    );

    const positive: string[] = [];
    const negative: string[] = [];

    for (const row of result.rows) {
      const feature = row.feature.replace(/^(color|brand|category|style):/, '');
      if (row.score > 0) {
        positive.push(feature);
      } else if (row.score < -2) {
        negative.push(feature);
      }
    }

    return {
      positive_features: positive.slice(0, 10),
      negative_features: negative.slice(0, 10),
    };
  }

  // ==================== OWNED CATEGORIES ====================

  private async getOwnedCategories(
    userId: string,
  ): Promise<Map<string, number>> {
    const result = await pool.query(
      `SELECT main_category, COUNT(*)::int as count
       FROM wardrobe_items
       WHERE user_id = $1 AND deleted_at IS NULL
       GROUP BY main_category`,
      [userId],
    );

    const map = new Map<string, number>();
    for (const row of result.rows) {
      map.set(row.main_category, row.count);
    }
    return map;
  }

  // ==================== SHOWN PRODUCT TRACKING ====================

  private async getShownProductIds(userId: string): Promise<string[]> {
    try {
      const result = await pool.query(
        `SELECT product_id FROM user_discover_history WHERE user_id = $1`,
        [userId],
      );
      return result.rows.map((r: { product_id: string }) => r.product_id);
    } catch (error) {
      this.log.error(`getShownProductIds failed: ${error?.message}`);
      return [];
    }
  }

  private async trackShownProducts(
    userId: string,
    productIds: string[],
  ): Promise<void> {
    if (productIds.length === 0) return;

    try {
      const values = productIds.map((_, i) => `($1, $${i + 2})`).join(', ');
      const params = [userId, ...productIds];

      await pool.query(
        `INSERT INTO user_discover_history (user_id, product_id)
         VALUES ${values}
         ON CONFLICT (user_id, product_id) DO UPDATE SET shown_at = now()`,
        params,
      );
    } catch (error) {
      this.log.error(`trackShownProducts failed: ${error?.message}`);
      // Non-critical - don't throw
    }
  }

  // ==================== BUILD SEARCH QUERIES ====================

  private buildSearchQueries(
    profile: UserProfile,
    browserSignals: BrowserSignals,
    learnedPrefs: LearnedPreferences,
    ownedCategories: Map<string, number>,
  ): string[] {
    const genderPrefix = profile.gender === 'male' ? "men's" : "women's";
    const queries: string[] = [];

    // Priority 1: Browser signals (real shopping intent)
    for (const brand of browserSignals.brands.slice(0, 2)) {
      queries.push(`${genderPrefix} ${brand} clothing`);
    }

    // Priority 2: Preferred brands + style keywords
    for (const brand of profile.preferred_brands.slice(0, 2)) {
      const style = profile.style_keywords[0] || '';
      queries.push(`${genderPrefix} ${brand} ${style}`.trim());
    }

    // Priority 3: Style keywords + favorite colors
    for (const style of profile.style_keywords.slice(0, 2)) {
      const color = profile.color_preferences[0] || '';
      queries.push(`${genderPrefix} ${style} ${color} clothing`.trim());
    }

    // Priority 4: Learned positive preferences
    for (const feature of learnedPrefs.positive_features.slice(0, 2)) {
      queries.push(`${genderPrefix} ${feature} fashion`);
    }

    // Priority 5: Categories they DON'T own much of (find gaps)
    const categoryPriority = [
      'Shoes',
      'Accessories',
      'Outerwear',
      'Tops',
      'Bottoms',
    ];
    for (const cat of categoryPriority) {
      const count = ownedCategories.get(cat) || 0;
      if (count < 3) {
        queries.push(`${genderPrefix} ${cat.toLowerCase()}`);
        break; // Just add one gap-filler
      }
    }

    // Priority 6: Favorite colors as fallback
    for (const color of profile.color_preferences.slice(0, 2)) {
      queries.push(`${genderPrefix} ${color} outfit`);
    }

    // Dedupe and limit
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const q of queries) {
      const normalized = q.toLowerCase().trim();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        unique.push(q);
      }
    }

    return unique.slice(0, 8);
  }

  // ==================== SERPAPI SEARCH ====================

  private async searchSerpApi(query: string, _gender: string): Promise<any[]> {
    if (!this.serpApiKey) {
      throw new Error('SERPAPI_KEY not configured');
    }

    const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(
      query,
    )}&hl=en&gl=us&api_key=${this.serpApiKey}`;

    this.log.debug(`SerpAPI query: ${query}`);

    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`SerpAPI returned ${resp.status}`);
    }

    const data = await resp.json();
    if (data.error) {
      throw new Error(`SerpAPI error: ${data.error}`);
    }

    const results = data.shopping_results || [];

    // Filter for valid products with images and links
    // Note: SerpAPI uses product_link, not link
    return results.filter((p: any) => {
      if (!p.thumbnail) return false;
      if (!p.product_link) return false;
      if (!p.title) return false;
      return true;
    });
  }

  // ==================== HELPERS ====================

  private getProductId(product: any): string {
    return (
      product.product_id ||
      product.product_link ||
      `${product.title}-${product.price}`
    );
  }

  private matchesDisliked(product: any, dislikedStyles: string[]): boolean {
    if (dislikedStyles.length === 0) return false;
    const title = (product.title || '').toLowerCase();
    return dislikedStyles.some((style) => title.includes(style.toLowerCase()));
  }

  private transformProduct(raw: any, position: number): DiscoverProduct {
    return {
      id: '', // Will be set by DB
      product_id: this.getProductId(raw),
      title: raw.title || 'Untitled',
      brand: raw.source || null,
      price: this.toNumberOrNull(raw.extracted_price),
      price_raw: raw.price || null,
      image_url: raw.thumbnail || '',
      link: raw.product_link || '',
      source: raw.source || null,
      category: null,
      position,
    };
  }

  private async saveProducts(
    userId: string,
    products: DiscoverProduct[],
  ): Promise<void> {
    try {
      // Mark old batch as not current (preserve history, especially saved items)
      await pool.query(
        `UPDATE user_discover_products
         SET is_current = FALSE
         WHERE user_id = $1 AND is_current = TRUE`,
        [userId],
      );

      // Insert new products as current batch
      const batchDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      for (const p of products) {
        await pool.query(
          `INSERT INTO user_discover_products
           (user_id, product_id, title, brand, price, price_raw, image_url, link, source, category, position, batch_date, is_current, saved)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE, FALSE)
           ON CONFLICT (user_id, product_id) DO UPDATE SET
             is_current = TRUE,
             position = EXCLUDED.position,
             batch_date = EXCLUDED.batch_date`,
          [
            userId,
            p.product_id,
            p.title,
            p.brand,
            p.price,
            p.price_raw,
            p.image_url,
            p.link,
            p.source,
            p.category,
            p.position,
            batchDate,
          ],
        );
      }
    } catch (error) {
      this.log.error(`saveProducts failed: ${error?.message}`);
      // Non-critical for returning products - don't throw
    }
  }

  private async updateRefreshTimestamp(userId: string): Promise<void> {
    try {
      await pool.query(
        'UPDATE users SET last_discover_refresh = now() WHERE id = $1',
        [userId],
      );
    } catch (error) {
      this.log.error(`updateRefreshTimestamp failed: ${error?.message}`);
      // Non-critical - don't throw
    }
  }

  // ==================== FALLBACK ====================

  private async getFallbackProducts(
    userId: string,
  ): Promise<DiscoverProduct[]> {
    console.log('🔥 ENTERED getFallbackProducts 🔥');
    this.log.log(`getFallbackProducts called for ${userId}`);

    const apiKey = this.serpApiKey;
    if (!apiKey) {
      this.log.error('SERPAPI_KEY not set');
      return [];
    }

    try {
      // Get user's gender for appropriate fallback query
      const userResult = await pool.query(
        'SELECT gender_presentation FROM users WHERE id = $1',
        [userId],
      );
      const gender = this.normalizeGender(
        userResult.rows[0]?.gender_presentation,
      );
      const genderPrefix = gender === 'male' ? "men's" : "women's";

      const query = `${genderPrefix} fashion clothing trending`;
      const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(query)}&hl=en&gl=us&api_key=${apiKey}`;

      const resp = await fetch(url);
      if (!resp.ok) {
        this.log.error(`SerpAPI HTTP error: ${resp.status}`);
        return [];
      }

      const data = await resp.json();
      if (data.error) {
        this.log.error(`SerpAPI error: ${data.error}`);
        return [];
      }

      const results = data.shopping_results || [];
      if (results.length === 0) {
        this.log.warn('No shopping results from SerpAPI');
        return [];
      }

      // Filter and map to our format
      const products = results
        .filter((p: any) => p.thumbnail && p.product_link && p.title)
        .slice(0, 10)
        .map((p: any, i: number) => ({
          id: '',
          product_id: p.product_id || p.product_link,
          title: p.title,
          brand: p.source || null,
          price: this.toNumberOrNull(p.extracted_price),
          price_raw: p.price || null,
          image_url: p.thumbnail,
          link: p.product_link,
          source: p.source || null,
          category: null,
          position: i + 1,
        }));

      this.log.log(`Returning ${products.length} fallback products`);
      return products;
    } catch (error: any) {
      this.log.error(`getFallbackProducts error: ${error?.message}`);
      return [];
    }
  }

  // ==================== UTILITIES ====================

  private ensureArray(val: unknown): string[] {
    if (Array.isArray(val)) return val.filter(v => v != null).map(String).filter(Boolean);
    if (typeof val === 'string') {
      const s = val.trim();
      const inner = s.startsWith('{') && s.endsWith('}') ? s.slice(1, -1) : s;
      if (!inner) return [];
      return inner
        .split(',')
        .map((x) => x.trim().replace(/^"(.*)"$/, '$1'))
        .filter(Boolean);
    }
    return [];
  }

  private toNumberOrNull(v: unknown): number | null {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(String(v).replace(/[^\d.]/g, ''));
    return Number.isFinite(n) ? n : null;
  }

  // ==================== LEGACY (keep for backward compat) ====================

  async getInternalUserId(auth0Sub: string): Promise<string> {
    const res = await pool.query('SELECT id FROM users WHERE auth0_sub = $1', [
      auth0Sub,
    ]);
    if (res.rowCount === 0) throw new Error('User not found');
    return res.rows[0].id;
  }

  // ==================== SAVED RECOMMENDATIONS (PERMANENT) ====================
  // Uses the saved_recommendations table - products are COPIED here when saved
  // and DELETED when unsaved. This survives weekly discover refreshes.

  /**
   * Get all saved recommendations for a user (permanent history)
   */
  async getSavedProducts(userId: string): Promise<DiscoverProduct[]> {
    try {
      const result = await pool.query(
        `SELECT id, product_id, title, brand, price, price_raw, image_url, link, source, category,
                0 as position, TRUE as saved, saved_at
         FROM saved_recommendations
         WHERE user_id = $1
         ORDER BY saved_at DESC`,
        [userId],
      );
      return result.rows;
    } catch (error) {
      this.log.error(`getSavedProducts failed: ${error?.message}`);
      return [];
    }
  }

  /**
   * Save a product - COPIES it to the permanent saved_recommendations table
   */
  async saveProduct(
    userId: string,
    productId: string,
  ): Promise<{ success: boolean }> {
    try {
      // Get the product details from user_discover_products
      const productResult = await pool.query(
        `SELECT product_id, title, brand, price, price_raw, image_url, link, source, category
         FROM user_discover_products
         WHERE user_id = $1 AND product_id = $2`,
        [userId, productId],
      );

      if (productResult.rowCount === 0) {
        this.log.warn(
          `saveProduct: product not found in discover - userId=${userId}, productId=${productId}`,
        );
        return { success: false };
      }

      const product = productResult.rows[0];

      // Insert into permanent saved_recommendations table
      await pool.query(
        `INSERT INTO saved_recommendations
         (user_id, product_id, title, brand, price, price_raw, image_url, link, source, category, saved_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
         ON CONFLICT (user_id, product_id) DO UPDATE SET saved_at = NOW()`,
        [
          userId,
          product.product_id,
          product.title,
          product.brand,
          product.price,
          product.price_raw,
          product.image_url,
          product.link,
          product.source,
          product.category,
        ],
      );

      // Also mark in discover products for UI consistency
      await pool.query(
        `UPDATE user_discover_products
         SET saved = TRUE, saved_at = NOW()
         WHERE user_id = $1 AND product_id = $2`,
        [userId, productId],
      );

      // Emit PRODUCT_SAVED learning event (shadow mode - no behavior change)
      if (LEARNING_FLAGS.EVENTS_ENABLED) {
        this.learningEvents
          .logEvent({
            userId,
            eventType: 'PRODUCT_SAVED',
            entityType: 'product',
            entityId: productId,
            signalPolarity: 1,
            signalWeight: 0.6,
            extractedFeatures: {
              brands: product.brand ? [product.brand] : [],
              categories: product.category ? [product.category] : [],
            },
            sourceFeature: 'shopping',
            clientEventId: `product_saved:${userId}:${productId}`,
          })
          .catch(() => {});
      }

      this.log.log(
        `Product saved permanently: userId=${userId}, productId=${productId}`,
      );
      return { success: true };
    } catch (error) {
      this.log.error(`saveProduct failed: ${error?.message}`);
      return { success: false };
    }
  }

  /**
   * Unsave a product - DELETES it from saved_recommendations (gone forever)
   */
  async unsaveProduct(
    userId: string,
    productId: string,
  ): Promise<{ success: boolean }> {
    try {
      // DELETE from permanent saved_recommendations table
      const result = await pool.query(
        `DELETE FROM saved_recommendations
         WHERE user_id = $1 AND product_id = $2
         RETURNING id`,
        [userId, productId],
      );

      // Also update discover products if it exists there
      await pool.query(
        `UPDATE user_discover_products
         SET saved = FALSE, saved_at = NULL
         WHERE user_id = $1 AND product_id = $2`,
        [userId, productId],
      );

      if (result.rowCount === 0) {
        this.log.warn(
          `unsaveProduct: product not found in saved_recommendations - userId=${userId}, productId=${productId}`,
        );
        return { success: false };
      }

      // Emit PRODUCT_UNSAVED learning event (shadow mode - no behavior change)
      if (LEARNING_FLAGS.EVENTS_ENABLED) {
        this.learningEvents
          .logEvent({
            userId,
            eventType: 'PRODUCT_UNSAVED',
            entityType: 'product',
            entityId: productId,
            signalPolarity: -1,
            signalWeight: 0.2,
            extractedFeatures: {},
            sourceFeature: 'shopping',
            clientEventId: `product_unsaved:${userId}:${productId}`,
          })
          .catch(() => {});
      }

      this.log.log(
        `Product deleted from saved: userId=${userId}, productId=${productId}`,
      );
      return { success: true };
    } catch (error) {
      this.log.error(`unsaveProduct failed: ${error?.message}`);
      return { success: false };
    }
  }

  /**
   * Toggle saved state for a product
   */
  async toggleSaveProduct(
    userId: string,
    productId: string,
  ): Promise<{ success: boolean; saved: boolean }> {
    try {
      // Check if product is in saved_recommendations
      const current = await pool.query(
        `SELECT id FROM saved_recommendations WHERE user_id = $1 AND product_id = $2`,
        [userId, productId],
      );

      const isSaved = current.rowCount > 0;

      if (isSaved) {
        await this.unsaveProduct(userId, productId);
        return { success: true, saved: false };
      } else {
        await this.saveProduct(userId, productId);
        return { success: true, saved: true };
      }
    } catch (error) {
      this.log.error(`toggleSaveProduct failed: ${error?.message}`);
      return { success: false, saved: false };
    }
  }
}

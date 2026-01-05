import { Injectable, Logger } from '@nestjs/common';
import { pool } from '../db/pool';
import { getSecret, secretExists } from '../config/secrets';
import { LearningEventsService } from '../learning/learning-events.service';
import { LEARNING_FLAGS } from '../config/feature-flags';

interface UserProfile {
  gender: string | null;
  preferred_brands: string[];
  style_keywords: string[];
  favorite_colors: string[];
  disliked_styles: string[];
  style_preferences: string[];
  fit_preferences: string[];
  body_type: string | null;
  climate: string | null;
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

@Injectable()
export class DiscoverService {
  private readonly log = new Logger(DiscoverService.name);

  constructor(private readonly learningEvents: LearningEventsService) {}

  private get serpApiKey(): string | undefined {
    return secretExists('SERPAPI_KEY') ? getSecret('SERPAPI_KEY') : undefined;
  }

  // ==================== MAIN ENTRY POINT ====================

  async getRecommended(userId: string): Promise<DiscoverProduct[]> {
    // this.log.log(`🛒 getRecommended called for userId: ${userId}`);

    // ALWAYS check cache first
    const cached = await this.getCachedProducts(userId);
    const cacheValid = await this.isCacheValid(userId);

    // this.log.log(`🛒 Cache status: valid=${cacheValid}, cached count=${cached.length}`);

    // HARDLOCK: If cache is valid (within 7 days) AND we have products, return them. NO API CALLS.
    // If cache is "valid" but empty, we should still try to fetch.
    if (cacheValid && cached.length > 0) {
      // this.log.log(`🛒 Returning ${cached.length} cached products for user ${userId} (weekly lock active - NO API CALLS)`);
      return cached;
    }

    // If cache is valid but empty, log this unusual state
    if (cacheValid && cached.length === 0) {
      this.log.warn(`🛒 Cache marked valid but contains 0 products for user ${userId} - will attempt fetch`);
    }

    // Cache expired or never set - ONE fetch attempt, then lock for a week
    this.log.log(`Cache expired or empty for user ${userId} - fetching fresh products`);

    let products: DiscoverProduct[] = [];

    try {
      products = await this.fetchPersonalizedProducts(userId);
    } catch (error: any) {
      this.log.error(`fetchPersonalizedProducts failed: ${error?.message}`);
    }

    // If personalized didn't get 10, try fallback
    if (products.length < TARGET_PRODUCTS) {
      try {
        const fallback = await this.getFallbackProducts(userId);
        // Merge: keep what we got, add from fallback to reach 10
        const existingIds = new Set(products.map(p => p.product_id));
        for (const p of fallback) {
          if (products.length >= TARGET_PRODUCTS) break;
          if (!existingIds.has(p.product_id)) {
            products.push(p);
          }
        }
      } catch (fallbackError: any) {
        this.log.error(`getFallbackProducts also failed: ${fallbackError?.message}`);
      }
    }

    // ALWAYS set timestamp and save whatever we got - locks for a week regardless
    if (products.length > 0) {
      await this.saveProducts(userId, products);
    }
    await this.updateRefreshTimestamp(userId);

    this.log.log(`Locked ${products.length} products for user ${userId} - no more API calls for 7 days`);
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

  private async fetchPersonalizedProducts(userId: string): Promise<DiscoverProduct[]> {
    this.log.log(`fetchPersonalizedProducts starting for ${userId}`);

    let profile: UserProfile;
    let browserSignals: BrowserSignals;
    let learnedPrefs: LearnedPreferences;
    let ownedCategories: Map<string, number>;
    let shownProductIds: string[];

    try {
      // Gather all personalization signals
      [profile, browserSignals, learnedPrefs, ownedCategories, shownProductIds] = await Promise.all([
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

    this.log.log(`Profile for ${userId}: gender=${profile.gender}, brands=${profile.preferred_brands.length}, keywords=${profile.style_keywords.length}`);

    // Must have gender - hard requirement
    if (!profile.gender) {
      this.log.warn(`User ${userId} has no gender set, using fallback`);
      return this.getFallbackProducts(userId);
    }

    // Build search queries based on profile
    const queries = this.buildSearchQueries(profile, browserSignals, learnedPrefs, ownedCategories);

    let allProducts: any[] = [];
    const usedProductIds = new Set(shownProductIds);

    // Limit products per query to ensure diversity across brands/styles
    const MAX_PER_QUERY = 3;

    // Execute queries, taking limited products from each to ensure variety
    for (const query of queries) {
      if (allProducts.length >= TARGET_PRODUCTS) break;

      try {
        const products = await this.searchSerpApi(query, profile.gender);
        let addedFromQuery = 0;

        for (const p of products) {
          if (allProducts.length >= TARGET_PRODUCTS) break;
          if (addedFromQuery >= MAX_PER_QUERY) break;

          // Skip duplicates and previously shown
          const productId = this.getProductId(p);
          if (usedProductIds.has(productId)) continue;

          // Skip if matches disliked styles
          if (this.matchesDisliked(p, profile.disliked_styles)) continue;

          usedProductIds.add(productId);
          allProducts.push(p);
          addedFromQuery++;
        }
      } catch (error) {
        this.log.warn(`Query failed: ${query} - ${error}`);
      }
    }

    // If still not enough, broaden search
    if (allProducts.length < TARGET_PRODUCTS) {
      const broadQuery = `${profile.gender === 'male' ? "men's" : "women's"} fashion clothing`;
      try {
        const products = await this.searchSerpApi(broadQuery, profile.gender);
        for (const p of products) {
          if (allProducts.length >= TARGET_PRODUCTS) break;
          const productId = this.getProductId(p);
          if (usedProductIds.has(productId)) continue;
          usedProductIds.add(productId);
          allProducts.push(p);
        }
      } catch (error) {
        this.log.warn(`Broad query failed: ${error}`);
      }
    }

    // Transform and save
    const finalProducts = allProducts.slice(0, TARGET_PRODUCTS).map((p, i) => this.transformProduct(p, i + 1));

    // Save to DB
    await this.saveProducts(userId, finalProducts);

    // Update refresh timestamp
    await this.updateRefreshTimestamp(userId);

    // Track shown products
    await this.trackShownProducts(userId, finalProducts.map(p => p.product_id));

    this.log.log(`Fetched ${finalProducts.length} personalized products for user ${userId}`);
    return finalProducts;
  }

  // ==================== USER PROFILE ====================

  private async getUserProfile(userId: string): Promise<UserProfile> {
    const result = await pool.query(
      `SELECT
        u.gender_presentation,
        sp.preferred_brands,
        sp.style_keywords,
        sp.favorite_colors,
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
        favorite_colors: [],
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
      style_keywords: this.ensureArray(row.style_keywords),
      favorite_colors: this.ensureArray(row.favorite_colors),
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
    if (g.includes('male') || g.includes('man') || g.includes('men')) return 'male';
    if (g.includes('female') || g.includes('woman') || g.includes('women')) return 'female';
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

  private async getLearnedPreferences(userId: string): Promise<LearnedPreferences> {
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

  private async getOwnedCategories(userId: string): Promise<Map<string, number>> {
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

  private async trackShownProducts(userId: string, productIds: string[]): Promise<void> {
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
      const color = profile.favorite_colors[0] || '';
      queries.push(`${genderPrefix} ${style} ${color} clothing`.trim());
    }

    // Priority 4: Learned positive preferences
    for (const feature of learnedPrefs.positive_features.slice(0, 2)) {
      queries.push(`${genderPrefix} ${feature} fashion`);
    }

    // Priority 5: Categories they DON'T own much of (find gaps)
    const categoryPriority = ['Shoes', 'Accessories', 'Outerwear', 'Tops', 'Bottoms'];
    for (const cat of categoryPriority) {
      const count = ownedCategories.get(cat) || 0;
      if (count < 3) {
        queries.push(`${genderPrefix} ${cat.toLowerCase()}`);
        break; // Just add one gap-filler
      }
    }

    // Priority 6: Favorite colors as fallback
    for (const color of profile.favorite_colors.slice(0, 2)) {
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
    return product.product_id || product.product_link || `${product.title}-${product.price}`;
  }

  private matchesDisliked(product: any, dislikedStyles: string[]): boolean {
    if (dislikedStyles.length === 0) return false;
    const title = (product.title || '').toLowerCase();
    return dislikedStyles.some(style => title.includes(style.toLowerCase()));
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

  private async saveProducts(userId: string, products: DiscoverProduct[]): Promise<void> {
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

  private async getFallbackProducts(userId: string): Promise<DiscoverProduct[]> {
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
      const gender = this.normalizeGender(userResult.rows[0]?.gender_presentation);
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
    if (Array.isArray(val)) return val.map(String).filter(Boolean);
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
  async saveProduct(userId: string, productId: string): Promise<{ success: boolean }> {
    try {
      // Get the product details from user_discover_products
      const productResult = await pool.query(
        `SELECT product_id, title, brand, price, price_raw, image_url, link, source, category
         FROM user_discover_products
         WHERE user_id = $1 AND product_id = $2`,
        [userId, productId],
      );

      if (productResult.rowCount === 0) {
        this.log.warn(`saveProduct: product not found in discover - userId=${userId}, productId=${productId}`);
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

      this.log.log(`Product saved permanently: userId=${userId}, productId=${productId}`);
      return { success: true };
    } catch (error) {
      this.log.error(`saveProduct failed: ${error?.message}`);
      return { success: false };
    }
  }

  /**
   * Unsave a product - DELETES it from saved_recommendations (gone forever)
   */
  async unsaveProduct(userId: string, productId: string): Promise<{ success: boolean }> {
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
        this.log.warn(`unsaveProduct: product not found in saved_recommendations - userId=${userId}, productId=${productId}`);
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

      this.log.log(`Product deleted from saved: userId=${userId}, productId=${productId}`);
      return { success: true };
    } catch (error) {
      this.log.error(`unsaveProduct failed: ${error?.message}`);
      return { success: false };
    }
  }

  /**
   * Toggle saved state for a product
   */
  async toggleSaveProduct(userId: string, productId: string): Promise<{ success: boolean; saved: boolean }> {
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

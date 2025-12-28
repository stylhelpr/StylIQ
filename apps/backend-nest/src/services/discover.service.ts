import { Injectable, Logger } from '@nestjs/common';
import { pool } from '../db/pool';

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
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const TARGET_PRODUCTS = 10;

@Injectable()
export class DiscoverService {
  private readonly log = new Logger(DiscoverService.name);

  private get serpApiKey(): string | undefined {
    return process.env.SERPAPI_KEY;
  }

  // ==================== MAIN ENTRY POINT ====================

  async getRecommended(userId: string): Promise<DiscoverProduct[]> {
    this.log.log(`getRecommended called for userId: ${userId}`);

    try {
      // Check if we need to refresh (weekly limit)
      const needsRefresh = await this.needsRefresh(userId);

      if (!needsRefresh) {
        // Return cached products
        const cached = await this.getCachedProducts(userId);
        if (cached.length > 0) {
          this.log.log(`Returning ${cached.length} cached products for user ${userId}`);
          return cached;
        }
        // Cache is empty despite not needing refresh - fetch anyway
        this.log.warn(`No cached products found despite fresh timestamp - fetching new`);
      }

      // Fetch personalized products
      const products = await this.fetchPersonalizedProducts(userId);
      return products;
    } catch (error: any) {
      this.log.error(`getRecommended failed: ${error?.message}`);
      // Fallback to simple search on any error
      return this.getFallbackProducts(userId);
    }
  }

  // ==================== REFRESH CHECK ====================

  private async needsRefresh(userId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        'SELECT last_discover_refresh FROM users WHERE id = $1',
        [userId],
      );

      if (result.rowCount === 0) {
        return true; // User not found, will fail later anyway
      }

      const lastRefresh = result.rows[0].last_discover_refresh;
      if (!lastRefresh) {
        return true; // Never refreshed
      }

      const lastRefreshTime = new Date(lastRefresh).getTime();
      const now = Date.now();
      const age = now - lastRefreshTime;

      return age >= SEVEN_DAYS_MS;
    } catch (error) {
      this.log.error(`needsRefresh query failed: ${error?.message}`);
      // If column doesn't exist or other error, assume needs refresh
      return true;
    }
  }

  // ==================== GET CACHED PRODUCTS ====================

  private async getCachedProducts(userId: string): Promise<DiscoverProduct[]> {
    try {
      const result = await pool.query(
        `SELECT id, product_id, title, brand, price, price_raw, image_url, link, source, category, position
         FROM user_discover_products
         WHERE user_id = $1
         ORDER BY position ASC
         LIMIT $2`,
        [userId, TARGET_PRODUCTS],
      );
      return result.rows;
    } catch (error) {
      this.log.error(`getCachedProducts failed: ${error?.message}`);
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

    // Execute queries until we have 10 unique products
    for (const query of queries) {
      if (allProducts.length >= TARGET_PRODUCTS) break;

      try {
        const products = await this.searchSerpApi(query, profile.gender);

        for (const p of products) {
          if (allProducts.length >= TARGET_PRODUCTS) break;

          // Skip duplicates and previously shown
          const productId = this.getProductId(p);
          if (usedProductIds.has(productId)) continue;

          // Skip if matches disliked styles
          if (this.matchesDisliked(p, profile.disliked_styles)) continue;

          usedProductIds.add(productId);
          allProducts.push(p);
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
      // Clear old products for this user
      await pool.query('DELETE FROM user_discover_products WHERE user_id = $1', [userId]);

      // Insert new products
      for (const p of products) {
        await pool.query(
          `INSERT INTO user_discover_products
           (user_id, product_id, title, brand, price, price_raw, image_url, link, source, category, position)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
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
}

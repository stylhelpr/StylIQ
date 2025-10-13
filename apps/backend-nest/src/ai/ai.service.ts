import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ChatDto } from './dto/chat.dto';
import { VertexService } from '../vertex/vertex.service'; // 🔹 ADDED
import { ProductSearchService } from '../product-services/product-search.service';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

function loadOpenAISecrets(): {
  apiKey?: string;
  project?: string;
  source: string;
} {
  const candidates = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), 'apps', 'backend-nest', '.env'),
    path.join(__dirname, '..', '..', '.env'),
  ];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const parsed = dotenv.parse(fs.readFileSync(p));
        const apiKey = parsed['OPENAI_API_KEY'];
        const project = parsed['OPENAI_PROJECT_ID'];
        if (apiKey) return { apiKey, project, source: p };
      }
    } catch {
      // ignore
    }
  }

  return {
    apiKey: process.env.OPENAI_API_KEY,
    project: process.env.OPENAI_PROJECT_ID,
    source: 'process.env',
  };
}

// 🧥 Basic capsule wardrobe templates
const CAPSULES = {
  Spring: [
    { category: 'Outerwear', subcategory: 'Light Jacket', recommended: 2 },
    { category: 'Tops', subcategory: 'Oxford Shirt', recommended: 3 },
    { category: 'Bottoms', subcategory: 'Chinos', recommended: 2 },
    { category: 'Shoes', subcategory: 'Loafers', recommended: 1 },
    { category: 'Shoes', subcategory: 'Sneakers', recommended: 1 },
  ],
  Summer: [
    { category: 'Tops', subcategory: 'Short Sleeve Shirt', recommended: 4 },
    { category: 'Tops', subcategory: 'Polo Shirt', recommended: 2 },
    { category: 'Bottoms', subcategory: 'Linen Trousers', recommended: 2 },
    { category: 'Shoes', subcategory: 'Loafers', recommended: 1 },
    { category: 'Shoes', subcategory: 'Sandals', recommended: 1 },
  ],
  Fall: [
    { category: 'Outerwear', subcategory: 'Field Jacket', recommended: 1 },
    { category: 'Outerwear', subcategory: 'Blazer', recommended: 1 },
    { category: 'Tops', subcategory: 'Knit Sweater', recommended: 2 },
    { category: 'Bottoms', subcategory: 'Wool Trousers', recommended: 2 },
    { category: 'Shoes', subcategory: 'Chelsea Boots', recommended: 1 },
  ],
  Winter: [
    { category: 'Outerwear', subcategory: 'Overcoat', recommended: 1 },
    { category: 'Outerwear', subcategory: 'Heavy Parka', recommended: 1 },
    { category: 'Tops', subcategory: 'Heavy Knit Sweater', recommended: 2 },
    { category: 'Bottoms', subcategory: 'Wool Trousers', recommended: 2 },
    { category: 'Shoes', subcategory: 'Boots', recommended: 2 },
  ],
};

// 🗓️ Auto-detect season based on month
function getCurrentSeason(): 'Spring' | 'Summer' | 'Fall' | 'Winter' {
  const month = new Date().getMonth() + 1;
  if ([3, 4, 5].includes(month)) return 'Spring';
  if ([6, 7, 8].includes(month)) return 'Summer';
  if ([9, 10, 11].includes(month)) return 'Fall';
  return 'Winter';
}

// 🧠 Compare wardrobe to capsule and return simple forecast text
function generateSeasonalForecast(wardrobe: any[] = []): string | undefined {
  const season = getCurrentSeason();
  const capsule = CAPSULES[season];
  if (!capsule) return;

  const missing: string[] = [];

  capsule.forEach((item) => {
    const owned = wardrobe.filter(
      (w) =>
        w.category?.toLowerCase() === item.category.toLowerCase() &&
        w.subcategory?.toLowerCase() === item.subcategory.toLowerCase(),
    ).length;

    if (owned < item.recommended) {
      const needed = item.recommended - owned;
      missing.push(`${needed} × ${item.subcategory}`);
    }
  });

  if (missing.length === 0) {
    return `✅ Your ${season} capsule is complete — you're ready for the season.`;
  }

  return `🍂 ${season} is approaching — you're missing: ${missing.join(', ')}.`;
}

@Injectable()
export class AiService {
  private openai: OpenAI;
  private useVertex: boolean;
  private vertexService?: VertexService; // 🔹 optional instance
  private productSearch: ProductSearchService; // ✅ add this

  constructor(vertexService?: VertexService) {
    const { apiKey, project, source } = loadOpenAISecrets();

    const snippet = apiKey?.slice(0, 20) ?? '';
    const len = apiKey?.length ?? 0;
    console.log('🔑 OPENAI key source:', source);
    console.log('🔑 OPENAI key snippet:', JSON.stringify(snippet));
    console.log('🔑 OPENAI key length:', len);
    console.log('📂 CWD:', process.cwd());

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not found in .env or environment.');
    }
    if (/^sk-?x{3,}/i.test(apiKey)) {
      throw new Error(
        'OPENAI_API_KEY appears masked (e.g., "sk-xxxxx..."). Read from the correct .env instead.',
      );
    }
    if (!apiKey.startsWith('sk-')) {
      throw new Error('OPENAI_API_KEY is malformed — must start with "sk-".');
    }

    this.openai = new OpenAI({ apiKey, project });

    // 🔹 New: Vertex toggle
    this.useVertex = process.env.USE_VERTEX === 'true';
    if (this.useVertex) {
      this.vertexService = vertexService;
      console.log('🧠 Vertex/Gemini mode enabled for analyze/recreate');
    }

    this.productSearch = new ProductSearchService(); // NEW
  }

  //////ANALYZE LOOK

  async analyze(imageUrl: string) {
    console.log('🧠 [AI] analyze() called with', imageUrl);
    if (!imageUrl) throw new Error('Missing imageUrl');

    // 🔹 Try Vertex first if enabled
    if (this.useVertex && this.vertexService) {
      try {
        const gcsUri = imageUrl.replace(
          'https://storage.googleapis.com/',
          'gs://',
        );
        const metadata = await this.vertexService.analyzeImage(gcsUri);
        const tags = [
          ...(metadata.tags || []),
          ...(metadata.style_descriptors || []),
          metadata.main_category,
          metadata.subcategory,
        ].filter(Boolean);
        console.log('🧠 [Vertex] analyze() success:', tags);
        return { tags };
      } catch (err: any) {
        console.warn(
          '[Vertex] analyze() failed → fallback to OpenAI:',
          err.message,
        );
      }
    }

    // 🔸 OpenAI fallback
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a professional fashion classifier. Return only JSON with a "tags" array describing the outfit’s style, color palette, and vibe.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Describe this outfit as tags only:' },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      });

      const raw = completion.choices[0]?.message?.content;
      console.log('🧠 [AI] analyze() raw response:', raw);

      if (!raw) throw new Error('Empty response from OpenAI');
      const parsed = JSON.parse(raw || '{}');
      return { tags: parsed.tags || [] };
    } catch (err: any) {
      console.error('❌ [AI] analyze() failed:', err.message);
      return { tags: ['casual', 'modern', 'neutral'] };
    }
  }

  /* ------------------------------------------------------------
     🧩 Weighted Tag Enrichment + Trend Injection
  -------------------------------------------------------------*/
  private async enrichTags(tags: string[]): Promise<string[]> {
    const weightMap: Record<string, number> = {
      tailored: 3,
      minimal: 3,
      neutral: 3,
      modern: 2,
      vintage: 2,
      classic: 2,
      streetwear: 2,
      oversized: 2,
      slim: 2,
      relaxed: 2,
      casual: 1,
      sporty: 1,
    };

    // 🧹 Normalize + de-dupe
    const cleanTags = Array.from(
      new Set(
        tags
          .map((t) => t.toLowerCase().trim())
          .filter((t) => t && !['outfit', 'style', 'fashion'].includes(t)),
      ),
    );

    // 🧠 Apply weights
    const weighted = cleanTags
      .map((t) => ({ tag: t, weight: weightMap[t] || 1 }))
      .sort((a, b) => b.weight - a.weight);

    // 🌍 Inject current trend tags
    const trendTags = await this.fetchTrendTags();
    const final = Array.from(
      new Set([...weighted.map((w) => w.tag), ...trendTags.slice(0, 3)]),
    );

    console.log('🎯 [AI] Enriched tags →', final);
    return final;
  }

  private async fetchTrendTags(): Promise<string[]> {
    try {
      const res = await fetch(
        'https://trends.google.com/trends/hottrends/visualize/internal/data/en_us',
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json().catch(() => []);
      const trendWords = JSON.stringify(json).toLowerCase();
      const matched = trendWords.match(
        /(quiet luxury|monochrome|minimalism|maximalism|italian|tailoring|loafers|neutrals|linen|structured|preppy|flannel|earth tones|autumn layering)/gi,
      );
      if (matched?.length) return Array.from(new Set(matched));

      // 🧭 If Google Trends returned empty, use local backup
      return [
        'quiet luxury',
        'neutral tones',
        'tailored fit',
        'autumn layering',
      ];
    } catch (err: any) {
      console.warn('⚠️ Trend fetch fallback triggered:', err.message);
      return [
        'quiet luxury',
        'neutral tones',
        'tailored fit',
        'autumn layering',
      ];
    }
  }

  // RECREATE//////////////
  async recreate(
    user_id: string,
    tags: string[],
    image_url?: string,
    user_gender?: string,
  ) {
    console.log(
      '🧥 [AI] recreate() called for user',
      user_id,
      'with tags:',
      tags,
      'and gender:',
      user_gender,
    );

    if (!user_id) throw new Error('Missing user_id');
    if (!tags?.length) {
      console.warn('⚠️ [AI] recreate() empty tags → using defaults.');
      tags = ['modern', 'neutral', 'tailored'];
    }

    // ✅ Weighted + trend-injected tags
    tags = await this.enrichTags(tags);

    // 🧠 Fetch gender_presentation if missing
    if (!user_gender) {
      try {
        const result = await pool.query(
          'SELECT gender_presentation FROM users WHERE id = $1 LIMIT 1',
          [user_id],
        );
        user_gender = result.rows[0]?.gender_presentation || 'neutral';
      } catch {
        user_gender = 'neutral';
      }
    }

    // 🧩 Normalize gender
    const normalizedGender =
      user_gender?.toLowerCase().includes('female') ||
      user_gender?.toLowerCase().includes('woman')
        ? 'female'
        : user_gender?.toLowerCase().includes('male') ||
            user_gender?.toLowerCase().includes('man')
          ? 'male'
          : process.env.DEFAULT_GENDER || 'neutral';

    // 🧠 Build stylist prompt (base)
    let prompt = `
        You are a world-class AI stylist for ${normalizedGender} fashion.
        Create a cohesive outfit inspired by an uploaded look.

        Client: ${user_id}
        Image: ${image_url || 'N/A'}
        Detected tags: ${tags.join(', ')}

        Rules:
        - Match fabric, color palette, and silhouette.
        - Use ${normalizedGender}-appropriate pieces.
        - Output only JSON:
        {
          "outfit": [
            { "category": "Top", "item": "Grey Cotton Tee", "color": "gray" },
            { "category": "Bottom", "item": "Navy Chinos", "color": "navy" },
            { "category": "Outerwear", "item": "Beige Overshirt", "color": "beige" },
            { "category": "Shoes", "item": "White Sneakers", "color": "white" }
          ],
          "style_note": "Describe how the look connects to the uploaded image."
        }
        `;

    // 🔹 Pull soft profile context (optional)
    let profileCtx = '';
    try {
      const res = await pool.query(
        `SELECT favorite_colors, fit_preferences, preferred_brands, disliked_styles
       FROM style_profiles WHERE user_id::text = $1 LIMIT 1`,
        [user_id],
      );
      const prof = res.rows[0];
      if (prof) {
        profileCtx = `
      # USER STYLE CONTEXT (soft influence)
      • Preferred colors: ${(prof.favorite_colors || []).join(', ') || '—'}
      • Fit preferences: ${(prof.fit_preferences || []).join(', ') || '—'}
      • Favorite brands: ${(prof.preferred_brands || []).join(', ') || '—'}
      • Disliked styles: ${prof.disliked_styles || '—'}
      Do NOT override the image’s vibe — just bias tone/material choices if relevant.
      `;
      }
    } catch {
      /* silent fail */
    }

    // ✅ Final prompt (merge only if context exists)
    // Inside recreate() or personalizedShop() final prompt:
    const finalPrompt = `
${prompt}

# HARD RULES
- ALWAYS output a full outfit of at least 4–6 distinct pieces.
- Include a Top, Bottom, Outerwear (if seasonally appropriate), Shoes, and optionally 1–2 Accessories.
- NEVER omit items because they already exist in the user’s wardrobe.
- Each piece should have its own JSON object, even if similar to a wardrobe item.
- Always include color and fit for every item.
`;

    // 🧠 Generate outfit via Vertex or OpenAI
    let parsed: any;
    if (this.useVertex && this.vertexService) {
      try {
        const result =
          await this.vertexService.generateReasonedOutfit(finalPrompt);
        let text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        text = text
          .replace(/^```json\s*/i, '')
          .replace(/```$/, '')
          .trim();
        parsed = JSON.parse(text);
        console.log('🧠 [Vertex] recreate() success');
      } catch (err: any) {
        console.warn('[Vertex] recreate() failed → fallback', err.message);
      }
    }

    if (!parsed) {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        messages: [{ role: 'user', content: finalPrompt }],
        response_format: { type: 'json_object' },
      });

      const raw = completion.choices[0]?.message?.content || '{}';
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = {};
      }
    }

    const outfit = Array.isArray(parsed?.outfit) ? parsed.outfit : [];
    const style_note =
      parsed?.style_note || 'Modern outfit inspired by the uploaded look.';

    // 🛍️ Enrich each item with live products
    const enriched = await Promise.all(
      outfit.map(async (o: any) => {
        const query =
          `${normalizedGender} ${o.item || o.category || ''} ${o.color || ''}`.trim();
        let products = await this.productSearch.search(query);
        let top = products[0];

        if (!top?.image || top.image.includes('No_image')) {
          const serp = await this.productSearch.searchSerpApi(query);
          if (serp?.[0]) top = { ...serp[0], source: 'SerpAPI' };
        }

        const materialHint =
          query.match(/(wool|cotton|linen|leather|denim|polyester)/i)?.[0] ||
          null;
        const seasonalityHint =
          query.match(/(summer|winter|fall|spring)/i)?.[0] ||
          getCurrentSeason();
        const fitHint =
          query.match(/(slim|regular|relaxed|oversized|tailored)/i)?.[0] ||
          'regular';

        return {
          category: o.category,
          item: o.item,
          color: o.color,
          brand: top?.brand || 'Unknown',
          price: top?.price || '—',
          image:
            top?.image && top.image.startsWith('http')
              ? top.image
              : 'https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg',
          shopUrl:
            top?.shopUrl ||
            `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=shop`,
          source: top?.source || 'ASOS / Fallback',
          material: materialHint,
          seasonality: seasonalityHint,
          fit: fitHint,
        };
      }),
    );

    return { user_id, outfit: enriched, style_note };
  }

  // 🧩 Ensure every product object includes a usable image URL
  private fixProductImages(products: any[] = []): any[] {
    return products.map((prod) => ({
      ...prod,
      image:
        prod.image ||
        prod.image_url ||
        prod.thumbnail ||
        prod.serpapi_thumbnail || // ✅ added
        prod.img ||
        prod.picture ||
        prod.thumbnail_url ||
        'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
    }));
  }

  // 👔 PERSONALIZED SHOP — image + wardrobe + preferences
  async personalizedShop(
    user_id: string,
    image_url: string,
    user_gender?: string,
  ) {
    if (!user_id || !image_url) throw new Error('Missing user_id or image_url');

    /** -----------------------------------------------------------
     * 🧠 buildProfileConstraints(profile)
     * Converts full style_profiles record into explicit hard rules
     * ---------------------------------------------------------- */
    function buildProfileConstraints(profile: any): string {
      if (!profile) return '';

      const fit = Array.isArray(profile.fit_preferences)
        ? profile.fit_preferences.join(', ')
        : profile.fit_preferences;

      const colors = Array.isArray(profile.favorite_colors)
        ? profile.favorite_colors.join(', ')
        : profile.favorite_colors;

      const brands = Array.isArray(profile.preferred_brands)
        ? profile.preferred_brands.join(', ')
        : profile.preferred_brands;

      const styles = [
        ...(profile.style_keywords || []),
        ...(profile.style_preferences || []),
      ]
        .filter(Boolean)
        .join(', ');

      const dislikes =
        typeof profile.disliked_styles === 'string'
          ? profile.disliked_styles
          : (profile.disliked_styles || []).join(', ');

      const climate = profile.climate || 'Temperate';
      const goals = profile.goals || '';

      // 🔹 Inject explicit hard “only color” or “except color” rule for the model itself
      let colorRule = '';
      if (profile.disliked_styles?.match(/only\s+(\w+)/i)) {
        const onlyColor = profile.disliked_styles.match(/only\s+(\w+)/i)[1];
        colorRule = `• Use ONLY ${onlyColor} items — all other colors are forbidden.`;
      } else if (profile.disliked_styles?.match(/except\s+(\w+)/i)) {
        const exceptColor = profile.disliked_styles.match(/except\s+(\w+)/i)[1];
        colorRule = `• Exclude every color except ${exceptColor}.`;
      }

      // 🔹 Explicitly enforce fit preferences
      let fitRule = '';
      if (profile.fit_preferences?.length) {
        fitRule = `• Allow ONLY these fits: ${profile.fit_preferences.join(
          ', ',
        )}; exclude all others.`;
      }

      return `
# USER PROFILE CONSTRAINTS (Hard Rules)

${fitRule}
${colorRule}

• Fit: ${fit || 'Regular fit'} — outfit items must match this silhouette; exclude all opposing fits.
• Climate: ${climate} — use materials and layers appropriate to this temperature zone.
• Preferred brands: ${brands || '—'} — bias all product searches toward these or comparable aesthetics.
• Favorite colors: ${colors || '—'} — bias color palette to these tones; avoid disliked colors.
• Disliked styles: ${dislikes || '—'} — exclude these aesthetics entirely.
• Style & vibe keywords: ${styles || '—'} — reflect these qualities in overall tone and accessories.
• Goals: ${goals}
• Body & proportions: ${profile.body_type || '—'}, ${
        profile.proportions || '—'
      } — ensure silhouette and layering suit these proportions.
• Skin tone / hair / eyes: ${profile.skin_tone || '—'}, ${
        profile.hair_color || '—'
      }, ${profile.eye_color || '—'} — choose tones that complement.
`;
    }

    // 1) Analyze uploaded image
    const analysis = await this.analyze(image_url);
    const tags = analysis?.tags || [];

    //   const { rows: wardrobe } = await pool.query(
    //     `SELECT name, main_category AS category, subcategory, color, material
    //  FROM wardrobe_items
    //  WHERE user_id::text = $1
    //  ORDER BY updated_at DESC
    //  LIMIT 50`,
    //     [user_id],
    //   );

    // 🚫 Skip wardrobe entirely for personalized mode
    const wardrobe: any[] = [];

    const prefRes = await pool.query(
      `SELECT gender_presentation
     FROM users
     WHERE id = $1
     LIMIT 1`,
      [user_id],
    );
    const profile = prefRes.rows[0] || {};
    const gender = user_gender || profile.gender_presentation || 'neutral';
    // 2️⃣ Fetch user style profile (full data used for personalization)
    const styleProfileRes = await pool.query(
      `
  SELECT 
    body_type,
    skin_tone,
    undertone,
    climate,
    favorite_colors,
    disliked_styles,
    style_keywords,
    preferred_brands,
    goals,
    proportions,
    hair_color,
    eye_color,
    height,
    waist,
    fit_preferences,
    style_preferences
  FROM style_profiles
  WHERE user_id::text = $1
  LIMIT 1
`,
      [user_id],
    );

    const styleProfile = styleProfileRes.rows[0] || {};

    // 🔹 Build user filter preferences
    const { preferFit, bannedWords } = buildUserFilter(styleProfile);

    /* ------------------------------------------------------------
   🎛️ VISUAL + STYLE FILTERING HELPERS
-------------------------------------------------------------*/
    const FIT_KEYWORDS = {
      skinny: [/skinny/i, /super[- ]skinny/i, /spray[- ]on/i],
      slim: [/slim/i],
      tailored: [/tailored/i, /tapered/i],
      relaxed: [/relaxed/i, /loose/i, /baggy/i, /wide[- ]leg/i],
      oversized: [/oversized/i, /boxy/i],
    };

    function buildUserFilter(profile: any) {
      const fitPrefs = (profile.fit_preferences || []).map((x: string) =>
        x.toLowerCase(),
      );
      const disliked = (profile.disliked_styles || '')
        .toLowerCase()
        .split(/[,\s]+/)
        .filter(Boolean);
      const favColors = (profile.favorite_colors || []).map((x: string) =>
        x.toLowerCase(),
      );

      const preferFit =
        fitPrefs.find((f) => /(relaxed|loose|baggy|oversized|boxy)/.test(f)) ||
        fitPrefs.find((f) => /(regular|tailored)/.test(f)) ||
        fitPrefs[0] ||
        null;

      const banFits: string[] = [];
      if (preferFit?.match(/relaxed|loose|baggy|oversized|boxy/))
        banFits.push('skinny', 'slim');
      else if (preferFit?.match(/skinny|slim/))
        banFits.push('relaxed', 'baggy', 'oversized');

      const bannedWords = [
        ...disliked,
        ...banFits,
        ...(!favColors.includes('green') ? ['green'] : []),
      ]
        .filter(Boolean)
        .map((x) => new RegExp(x, 'i'));

      return { preferFit, bannedWords };
    }

    function enforceProfileFilters(
      products: any[] = [],
      preferFit?: string | null,
      bannedWords: RegExp[] = [],
    ) {
      if (!products.length) return products;

      return products
        .filter((p) => {
          const hay = `${p.title || ''} ${p.name || ''} ${p.description || ''}`;
          return !bannedWords.some((rx) => rx.test(hay));
        })
        .sort((a, b) => {
          if (!preferFit) return 0;
          const aHit = FIT_KEYWORDS[preferFit]?.some((rx) =>
            rx.test(`${a.title} ${a.name}`),
          )
            ? 1
            : 0;
          const bHit = FIT_KEYWORDS[preferFit]?.some((rx) =>
            rx.test(`${b.title} ${b.name}`),
          )
            ? 1
            : 0;
          return bHit - aHit; // boost preferred fits
        });
    }

    // 3) Ask model to split into "owned" vs "missing"

    const climateNote = styleProfile.climate
      ? `The user's climate is ${styleProfile.climate}. 
    If it is cold (like Polar or Cold), emphasize insulated materials, coats, layers, scarves, gloves, and boots. 
    If it is hot (like Tropical or Desert), emphasize breathable, lightweight fabrics and open footwear.`
      : '';

    // 🔒 Enforced personalization hierarchy
    const rules = `
    # PERSONALIZATION ENFORCEMENT
    Follow these user preferences as *absolute constraints*, not suggestions.
    `;

    const profileConstraints = buildProfileConstraints(styleProfile);

    const prompt = `
You are a world-class personal stylist generating a personalized recreation of an uploaded look.
${rules}
${profileConstraints}

# IMAGE INSPIRATION
• Use the uploaded image only as an aesthetic anchor (color story, silhouette, or texture).
• Do NOT reference or reuse the user's wardrobe.
• Respect all style profile constraints exactly.
• Maintain the same mood and spirit as the uploaded image, not a literal copy.
• Preserve one clear visual motif from the source image (e.g., plaid pattern or color tone) unless climate prohibits.

# OUTPUT RULES
- ALWAYS output a complete outfit with distinct Top, Bottom, Shoes, and (if seasonally appropriate) Outerwear and Accessories.
- Each piece must include category, item, color, and fit.

Return ONLY valid JSON:
{
  "recreated_outfit": [
    { "source":"purchase", "category":"Top", "item":"...", "color":"...", "fit":"..." }
  ],
  "suggested_purchases": [
    { "category":"...", "item":"...", "color":"...", "material":"...", "brand":"...", "shopUrl":"..." }
  ],
  "style_note": "Explain how this respects the user's climate, fit, and taste."
}

User gender: ${gender}
Detected tags: ${tags.join(', ')}
Weighted tags: ${tags.map((t) => `high priority: ${t}`).join(', ')}
User style profile: ${JSON.stringify(styleProfile, null, 2)}
${climateNote}
`;

    console.log('🧥 [personalizedShop] profile:', profile);
    console.log('🧥 [personalizedShop] gender:', gender);
    console.log('🧥 [personalizedShop] styleProfile:', styleProfile);
    console.log('🧠 [personalizedShop] Prompt preview:', prompt.slice(0, 800));

    // 🧠 DEBUG START — prompt verification
    console.log('─────────────── PROMPT SENT TO MODEL ───────────────');
    console.log(prompt);
    console.log('─────────────── END PROMPT ───────────────');

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    // 🧠 DEBUG END — raw model output
    console.log('─────────────── RAW MODEL RESPONSE ───────────────');
    console.log(completion.choices[0]?.message?.content);
    console.log('─────────────── END RESPONSE ───────────────');

    let parsed: any = {};
    try {
      parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');

      // 🧩 SAFETY GUARD — ensure we keep valid recreated_outfit
      try {
        const parsedKeys = Object.keys(parsed);
        console.log('✅ [personalizedShop] Parsed JSON keys:', parsedKeys);

        // If model used "outfit" instead of "recreated_outfit", normalize it
        if (!parsed.recreated_outfit && parsed.outfit) {
          parsed.recreated_outfit = parsed.outfit;
          console.log('✅ [personalizedShop] Mapped outfit → recreated_outfit');
        }

        // Double-check array validity before fallback clears it
        if (parsed.recreated_outfit && parsed.recreated_outfit.length > 0) {
          console.log(
            '✅ [personalizedShop] Using recreated_outfit from model',
          );
        } else {
          console.warn(
            '⚠️ [personalizedShop] No recreated_outfit found — fallback may trigger',
          );
        }
      } catch (err) {
        console.error(
          '❌ [personalizedShop] JSON structure guard failed:',
          err,
        );
      }

      // ✅ Final filter fix — keep wardrobe items but still respect banned fits/styles
      if (parsed?.recreated_outfit?.length) {
        parsed.recreated_outfit = parsed.recreated_outfit.filter((o: any) => {
          if (!o) return false;
          const text =
            `${o.item} ${o.category} ${o.color} ${o.fit}`.toLowerCase();
          if (!text.trim() || text.includes('undefined')) return false;
          // ✅ Always keep wardrobe items regardless of style bans
          if (o.source === 'wardrobe') return true;

          const fitBan = preferFit?.match(/relaxed|oversized|boxy|loose/)
            ? ['skinny']
            : preferFit?.match(/skinny|slim|tailored/)
              ? ['relaxed', 'baggy', 'oversized']
              : [];

          const styleBan =
            (styleProfile.disliked_styles || '')
              .toLowerCase()
              .split(/[,\s]+/)
              .filter(Boolean) || [];

          const banned = [...fitBan, ...styleBan];
          return !banned.some((b) => text.includes(b));
        });

        console.log(
          '✅ [personalizedShop] Final filtered outfit →',
          parsed.recreated_outfit,
        );
      }

      console.log(
        '💎 [personalizedShop] Parsed recreated outfit sample:',
        parsed?.recreated_outfit?.slice(0, 2),
      );
      console.log(
        '💎 [personalizedShop] Parsed suggested purchases sample:',
        parsed?.suggested_purchases?.slice(0, 2),
      );

      // 🧩 Merge recreated_outfit into suggested_purchases for display
      if (
        Array.isArray(parsed?.recreated_outfit) &&
        parsed.recreated_outfit.length
      ) {
        parsed.suggested_purchases = [
          ...(parsed.suggested_purchases || []),
          ...parsed.recreated_outfit.map((o: any) => ({
            ...o,
            brand: o.brand || '—',
            previewImage: o.previewImage || o.image || o.image_url || null,
            source: 'purchase',
          })),
        ];
        console.log(
          '🧩 [personalizedShop] merged recreated_outfit → suggested_purchases',
        );
      }

      // 🖼️ Ensure every recreated outfit item has a visible preview image
      if (Array.isArray(parsed?.recreated_outfit)) {
        parsed.recreated_outfit = parsed.recreated_outfit.map((item: any) => {
          if (!item.previewImage && item.source === 'wardrobe') {
            item.previewImage =
              item.image_url ||
              item.wardrobe_image ||
              'https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg';
          }
          return item;
        });
      }

      // 🎨 Enforce "only <color>" rule from disliked_styles (e.g. "I dislike all colors except pink")
      // 🎨 Optional color-only enforcement — only if explicit "ONLY <color>" flag exists
      if (styleProfile?.disliked_styles?.toLowerCase().includes('only')) {
        const match = styleProfile.disliked_styles.match(/only\s+(\w+)/i);
        if (match) {
          const onlyColor = match[1].toLowerCase();
          const filterColor = (arr: any[]) =>
            arr.filter((x) =>
              (x.color || '').toLowerCase().includes(onlyColor),
            );

          if (Array.isArray(parsed?.recreated_outfit))
            parsed.recreated_outfit = filterColor(parsed.recreated_outfit);
          if (Array.isArray(parsed?.suggested_purchases))
            parsed.suggested_purchases = filterColor(
              parsed.suggested_purchases,
            );

          console.log(
            `[personalizedShop] 🎨 Enforcing ONLY-color rule: ${onlyColor}`,
          );
        }
      }
    } catch {
      parsed = {};
    }

    const purchases = Array.isArray(parsed?.suggested_purchases)
      ? parsed.suggested_purchases
      : [];

    if (parsed?.recreated_outfit?.some((i: any) => i.source === 'wardrobe')) {
      console.log('🧥 [personalizedShop] ✅ Model reused wardrobe pieces.');
    } else {
      console.warn(
        '🧥 [personalizedShop] ⚠️ Model did NOT reuse wardrobe — fallback to generic recreation.',
      );
    }

    // 🚫 Enforce profile bans in returned outfit
    const banned = [
      ...(styleProfile.disliked_styles?.toLowerCase().split(/[,\s]+/) || []),
      ...(preferFit?.match(/relaxed|oversized|boxy|loose/)
        ? ['skinny', 'slim']
        : []),
      ...(preferFit?.match(/skinny|slim/)
        ? ['relaxed', 'oversized', 'baggy']
        : []),
    ].filter(Boolean);

    if (parsed?.recreated_outfit?.length) {
      // ✅ Keep *all* wardrobe and purchase items — only filter garbage entries
      parsed.recreated_outfit = parsed.recreated_outfit.filter((o: any) => {
        if (!o || !o.item) return false;
        const text =
          `${o.item} ${o.category} ${o.color} ${o.fit}`.toLowerCase();
        return text.trim().length > 0 && !text.includes('undefined');
      });

      // 🧱 Guarantee full outfit completeness (Top, Bottom, Shoes, Optional Outerwear/Accessory)
      const categories = parsed.recreated_outfit.map((o: any) =>
        o.category?.toLowerCase(),
      );
      const missing: any[] = [];

      if (!categories.includes('top'))
        missing.push({
          source: 'purchase',
          category: 'Top',
          item: 'White Oxford Shirt',
          color: 'White',
          fit: 'Slim Fit',
        });
      if (!categories.includes('bottoms'))
        missing.push({
          source: 'purchase',
          category: 'Bottoms',
          item: 'Beige Chinos',
          color: 'Beige',
          fit: 'Slim Fit',
        });
      if (!categories.includes('shoes'))
        missing.push({
          source: 'purchase',
          category: 'Shoes',
          item: 'White Leather Sneakers',
          color: 'White',
          fit: 'Slim Fit',
        });

      parsed.recreated_outfit.push(...missing);

      console.log(
        '✅ [personalizedShop] Final full outfit →',
        parsed.recreated_outfit,
      );
    }

    // 🧩 Centralized enforcement for personalizedShop only
    function applyProfileFilters(products: any[], profile: any) {
      if (!Array.isArray(products) || !products.length) return [];

      const favColors = (profile.favorite_colors || []).map((x: string) =>
        x.toLowerCase(),
      );
      const prefBrands = (profile.preferred_brands || []).map((x: string) =>
        x.toLowerCase(),
      );
      const fitPrefs = (profile.fit_preferences || []).map((x: string) =>
        x.toLowerCase(),
      );
      const dislikes = (profile.disliked_styles || '')
        .toLowerCase()
        .split(/[,\s]+/);
      const climate = (profile.climate || '').toLowerCase();

      const isCold = /(polar|cold|arctic|tundra|winter)/.test(climate);
      const isHot = /(tropical|desert|hot|humid|summer)/.test(climate);

      // 🩷 detect "only" or "except" color rule from disliked_styles
      let onlyColor: string | null = null;
      let exceptColor: string | null = null;

      if (profile.disliked_styles?.match(/only\s+(\w+)/i)) {
        onlyColor = profile.disliked_styles
          .match(/only\s+(\w+)/i)[1]
          .toLowerCase();
      } else if (profile.disliked_styles?.match(/except\s+(\w+)/i)) {
        exceptColor = profile.disliked_styles
          .match(/except\s+(\w+)/i)[1]
          .toLowerCase();
      }

      return products
        .filter((p) => {
          const t = `${p.name ?? ''} ${p.title ?? ''} ${p.brand ?? ''} ${
            p.description ?? ''
          } ${p.color ?? ''} ${p.fit ?? ''}`.toLowerCase();

          // 🚫 Filter out disliked words/styles
          if (dislikes.some((d) => d && t.includes(d))) return false;

          // 🎨 HARD color enforcement from DB rules
          if (onlyColor) {
            // Only allow if text or color includes the specified color
            if (
              !t.includes(onlyColor) &&
              !p.color?.toLowerCase().includes(onlyColor)
            )
              return false;
          } else if (exceptColor) {
            // Exclude everything not matching that color
            if (
              !t.includes(exceptColor) &&
              !p.color?.toLowerCase().includes(exceptColor)
            )
              return false;
          } else {
            // Normal favorite color bias if no hard rule
            if (favColors.length && !favColors.some((c) => t.includes(c)))
              return false;
          }

          // 👕 Fit preferences
          if (fitPrefs.length && !fitPrefs.some((f) => t.includes(f)))
            return false;

          // 🌡️ Climate-based filtering
          if (isCold && /(tank|shorts|sandal)/.test(t)) return false;
          if (isHot && /(wool|parka|coat|boot|knit)/.test(t)) return false;

          return true;
        })
        .sort((a, b) => {
          const score = (x: any) => {
            const txt =
              `${x.name} ${x.title} ${x.brand} ${x.color} ${x.fit}`.toLowerCase();
            let s = 0;
            if (onlyColor && txt.includes(onlyColor)) s += 4;
            if (exceptColor && txt.includes(exceptColor)) s += 4;
            if (favColors.some((c) => txt.includes(c))) s += 2;
            if (prefBrands.some((b) => txt.includes(b))) s += 2;
            if (fitPrefs.some((f) => txt.includes(f))) s += 1;
            return s;
          };
          return score(b) - score(a);
        });
    }

    // 4️⃣ Attach live shop links to the "missing" items — now honoring user taste
    let enrichedPurchases = await Promise.all(
      purchases.map(async (p: any) => {
        // 🧠 Gender-locked prefix
        const genderPrefix =
          gender?.toLowerCase().includes('female') ||
          gender?.toLowerCase().includes('woman')
            ? 'women female womens ladies'
            : 'men male mens masculine -women -womens -female -girls -ladies';

        // Base query with gender lock
        let q = [
          genderPrefix,
          p.item || p.category || '',
          p.color || '',
          p.material || '',
        ]
          .filter(Boolean)
          .join(' ')
          .trim();

        // 🔹 Inject personalization bias terms
        const brandTerms = (styleProfile.preferred_brands || [])
          .slice(0, 3)
          .join(' ');
        const colorTerms = (styleProfile.favorite_colors || [])
          .slice(0, 2)
          .join(' ');
        const fitTerms = Array.isArray(styleProfile.fit_preferences)
          ? styleProfile.fit_preferences.join(' ')
          : styleProfile.fit_preferences || '';

        // 🎨 “Only color” rule (e.g. “I dislike all colors except pink”)
        const colorMatch =
          styleProfile.disliked_styles?.match(/except\s+(\w+)/i);
        if (colorMatch) {
          const onlyColor = colorMatch[1].toLowerCase();
          q += ` ${onlyColor}`;
        }

        // Combine into final query with brand + color + fit bias
        q = [q, brandTerms, colorTerms, fitTerms].filter(Boolean).join(' ');

        // 🔒 Ensure all queries exclude female results explicitly
        if (
          !/-(women|female|ladies|girls)/i.test(q) &&
          /\bmen\b|\bmale\b/i.test(q)
        ) {
          q += ' -women -womens -female -girls -ladies';
        }

        // Combine into final query with brand + color + fit bias
        q = [q, brandTerms, colorTerms, fitTerms].filter(Boolean).join(' ');

        // 🔒 Ensure all queries exclude female results explicitly
        if (
          !/-(women|female|ladies|girls)/i.test(q) &&
          /\bmen\b|\bmale\b/i.test(q)
        ) {
          q += ' -women -womens -female -girls -ladies';
        }

        // 🧠 Gender-aware product search
        let products = await this.productSearch.search(
          q,
          gender?.toLowerCase() === 'female'
            ? 'female'
            : gender?.toLowerCase() === 'male'
              ? 'male'
              : 'unisex',
        );

        // 🚫 Filter out any accidental female/unisex results
        products = products.filter(
          (prod) =>
            !/women|female|womens|ladies|girls/i.test(
              `${prod.name ?? ''} ${prod.brand ?? ''} ${prod.title ?? ''}`,
            ),
        );

        // 🩷 Hard visual color filter — ensures displayed products actually match the enforced color rule
        if (
          styleProfile?.disliked_styles?.match(/only\s+(\w+)/i) ||
          styleProfile?.disliked_styles?.match(/except\s+(\w+)/i)
        ) {
          const match =
            styleProfile.disliked_styles.match(/only\s+(\w+)/i) ||
            styleProfile.disliked_styles.match(/except\s+(\w+)/i);
          const enforcedColor = match?.[1]?.toLowerCase();
          if (enforcedColor) {
            products = products.filter((p) => {
              const text =
                `${p.name ?? ''} ${p.title ?? ''} ${p.color ?? ''}`.toLowerCase();
              return text.includes(enforcedColor);
            });
          }
        }

        return {
          ...p,
          query: q,
          products: applyProfileFilters(products, styleProfile),
        };
      }),
    );

    // 5️⃣ Fallback enrichment if AI returned nothing or products failed
    if (!enrichedPurchases.length) {
      console.warn(
        '⚠️ [personalizedShop] Empty suggested_purchases → fallback.',
      );

      const tagSeed = tags.slice(0, 6).join(' ');
      const season = getCurrentSeason();

      // 🧠 Gender prefix for fallback with hard lock
      const genderPrefix =
        gender?.toLowerCase().includes('female') ||
        gender?.toLowerCase().includes('woman')
          ? 'women female womens ladies'
          : 'men male mens masculine -women -womens -female -girls -ladies';

      // 🧠 Enrich fallback with style taste as well
      const brandTerms = (styleProfile.preferred_brands || [])
        .slice(0, 3)
        .join(' ');
      const colorTerms = (styleProfile.favorite_colors || [])
        .slice(0, 2)
        .join(' ');
      const fitTerms = Array.isArray(styleProfile.fit_preferences)
        ? styleProfile.fit_preferences.join(' ')
        : styleProfile.fit_preferences || '';

      const fallbackQuery = `${genderPrefix} ${tagSeed} ${season} fashion ${brandTerms} ${colorTerms} ${fitTerms}`;
      console.log('🧩 [personalizedShop] fallbackQuery →', fallbackQuery);

      const products = await this.productSearch.search(
        fallbackQuery,
        gender?.toLowerCase() === 'female'
          ? 'female'
          : gender?.toLowerCase() === 'male'
            ? 'male'
            : 'unisex',
      );

      // 🚫 Filter out any accidental female/unisex results
      const maleProducts = products.filter(
        (prod) =>
          !/women|female|womens|ladies|girls/i.test(
            `${prod.name ?? ''} ${prod.brand ?? ''} ${prod.title ?? ''}`,
          ),
      );

      enrichedPurchases = [
        {
          category: 'General',
          item: 'Curated Outfit Add-Ons',
          color: 'Mixed',
          material: null,
          products: applyProfileFilters(maleProducts.slice(0, 8), styleProfile),
          query: fallbackQuery,
          source: 'fallback',
        },
      ];
    }

    // 🎨 Enforce color-only rule on fallback products too
    if (styleProfile?.disliked_styles) {
      const match = styleProfile.disliked_styles.match(/except\s+(\w+)/i);
      if (match) {
        const onlyColor = match[1].toLowerCase();
        enrichedPurchases = enrichedPurchases.map((p) => ({
          ...p,
          products: (p.products || []).filter((prod) =>
            (prod.color || '').toLowerCase().includes(onlyColor),
          ),
        }));
        console.log(
          `[personalizedShop] 🎨 Enforced fallback color-only rule: ${onlyColor}`,
        );
      }
    }

    const cleanPurchases = enrichedPurchases.map((p) => ({
      ...p,
      products: this.fixProductImages(
        enforceProfileFilters(p.products || [], preferFit, bannedWords),
      ),
    }));

    // 🎨 FINAL VISUAL CONSISTENCY NORMALIZATION
    const normalizedPurchases = await Promise.all(
      enrichedPurchases.map(async (p) => {
        const validProduct =
          (p.products || []).find(
            (x) =>
              (x.image ||
                x.image_url ||
                x.thumbnail ||
                x.serpapi_thumbnail ||
                x.thumbnail_url ||
                x.img ||
                x.result?.thumbnail ||
                x.result?.serpapi_thumbnail) &&
              /^https?:\/\//.test(
                x.image ||
                  x.image_url ||
                  x.thumbnail ||
                  x.serpapi_thumbnail ||
                  x.thumbnail_url ||
                  x.img ||
                  x.result?.thumbnail ||
                  x.result?.serpapi_thumbnail ||
                  '',
              ) &&
              !/no[_-]?image/i.test(
                x.image ||
                  x.image_url ||
                  x.thumbnail ||
                  x.serpapi_thumbnail ||
                  x.thumbnail_url ||
                  x.img ||
                  '',
              ),
          ) || p.products?.[0];

        let previewImage =
          validProduct?.image ||
          validProduct?.image_url ||
          validProduct?.thumbnail ||
          validProduct?.serpapi_thumbnail ||
          validProduct?.thumbnail_url ||
          validProduct?.img ||
          validProduct?.product_thumbnail ||
          validProduct?.result?.thumbnail ||
          validProduct?.result?.serpapi_thumbnail ||
          null;

        // 🎯 Gender-aware image guard
        const userGender = (gender || '').toLowerCase();

        if (previewImage) {
          const url = previewImage.toLowerCase();

          // 🧍‍♂️ If male → block clearly female-coded URLs
          if (
            userGender.includes('male') &&
            /(women|woman|female|ladies|girls|womenswear|femme|skims|shein|fashionnova|princesspolly|revolve|anthropologie)/i.test(
              url,
            )
          ) {
            previewImage =
              'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg';
          }

          // 🧍‍♀️ If female → block clearly male-coded URLs
          else if (
            userGender.includes('female') &&
            /(men|man|male|menswear|masculine)/i.test(url)
          ) {
            previewImage =
              'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg';
          }

          // 🧍 Unisex → allow all images
        }

        // 🧠 If still missing, do a quick SerpAPI lookup and cache
        if (!previewImage && p.query) {
          const results = await this.productSearch.searchSerpApi(p.query);
          const r = results?.[0];
          previewImage =
            r?.image ||
            r?.image_url ||
            r?.thumbnail ||
            r?.serpapi_thumbnail ||
            r?.thumbnail_url ||
            r?.result?.thumbnail ||
            r?.result?.serpapi_thumbnail ||
            null;

          // 🎯 Apply same gender guard to SerpAPI result
          if (previewImage) {
            const url = previewImage.toLowerCase();

            if (
              userGender.includes('male') &&
              /(women|woman|female|ladies|girls|womenswear|femme|skims|shein|fashionnova|princesspolly|revolve|anthropologie)/i.test(
                url,
              )
            ) {
              previewImage =
                'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg';
            } else if (
              userGender.includes('female') &&
              /(men|man|male|menswear|masculine)/i.test(url)
            ) {
              previewImage =
                'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg';
            }
          }
        }

        return {
          ...p,
          previewImage:
            previewImage ||
            'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
          previewBrand: validProduct?.brand || p.brand || 'Unknown',
          previewPrice: validProduct?.price || '—',
          previewUrl: validProduct?.shopUrl || p.shopUrl || null,
        };
      }),
    ); // ✅ ← closes Promise.all()

    // 🧹 remove empty product groups (no valid images)
    const filteredPurchases = normalizedPurchases.filter(
      (p) => !!p.previewImage,
    );

    // 🧊 Climate sanity check — if Polar but outfit lacks insulation, patch style_note
    if (
      styleProfile.climate?.toLowerCase().includes('polar') &&
      !/coat|jacket|parka|boot|knit|sweater/i.test(
        JSON.stringify(parsed.recreated_outfit || []),
      )
    ) {
      parsed.style_note +=
        ' Reinforced with insulated outerwear and cold-weather layering for Polar climates.';
    }

    // 🚫 Prevent fallback or secondary recreate() from overwriting personalized flow
    if (
      enrichedPurchases?.length > 0 ||
      parsed?.suggested_purchases?.length > 0
    ) {
      console.log(
        '✅ [personalizedShop] Finalizing personalized results — skipping generic recreate()',
      );
      return {
        user_id,
        image_url,
        tags,
        recreated_outfit: parsed?.recreated_outfit || [],
        suggested_purchases: normalizedPurchases,
        style_note:
          parsed?.style_note ||
          'Personalized recreation based on your wardrobe, with curated seasonal add-ons.',
        applied_filters: {
          preferFit,
          bannedWords: bannedWords.map((r) => r.source),
        },
      };
    }

    return {
      user_id,
      image_url,
      tags,
      recreated_outfit: parsed?.recreated_outfit || [],
      suggested_purchases: normalizedPurchases,
      style_note:
        parsed?.style_note ||
        'Personalized recreation based on your wardrobe, with curated seasonal add-ons.',
      applied_filters: {
        preferFit,
        bannedWords: bannedWords.map((r) => r.source),
      },
    };
  }

  ////////END CREATE LOOK

  //////. START REPLACED CHAT WITH LINKS AND SEARCH NET

  /** 🧠 Conversational fashion chat — now with visuals + links */
  async chat(dto: ChatDto) {
    const { messages } = dto;
    const lastUserMsg = messages
      .slice()
      .reverse()
      .find((m) => m.role === 'user')?.content;

    if (!lastUserMsg) {
      throw new Error('No user message provided');
    }

    // 1️⃣ Generate base text with OpenAI
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.8,
      messages: [
        {
          role: 'system',
          content: `
You are a world-class personal fashion stylist.
Respond naturally and helpfully about outfits, wardrobe planning, or styling.
At the end of your reasoning, also return a short JSON block like:
{"search_terms":["smart casual men","navy blazer outfit","loafers"]}
        `,
        },
        ...messages,
      ],
    });

    const aiReply =
      completion.choices[0]?.message?.content?.trim() ||
      'Styled response unavailable.';

    // 2️⃣ Extract search terms if model provided them
    let searchTerms: string[] = [];
    const match = aiReply.match(/\{.*"search_terms":.*\}/s);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        searchTerms = parsed.search_terms ?? [];
      } catch {
        searchTerms = [];
      }
    }

    // 3️⃣ Fallback heuristic: derive terms if none found
    if (!searchTerms.length) {
      const lowered = lastUserMsg.toLowerCase();
      if (lowered.includes('smart')) searchTerms.push('smart casual outfit');
      if (lowered.includes('summer')) searchTerms.push('summer outfit');
      if (lowered.includes('work')) searchTerms.push('business casual look');
      if (!searchTerms.length)
        searchTerms.push(`${lowered} outfit inspiration`);
    }

    // 4️⃣ Fetch Unsplash images
    const images = await this.fetchUnsplash(searchTerms);

    // 5️⃣ Build shoppable links
    const links = searchTerms.map((term) => ({
      label: `Shop ${term} on ASOS`,
      url: `https://www.asos.com/search/?q=${encodeURIComponent(term)}`,
    }));

    return { reply: aiReply, images, links };
  }

  /** 🔍 Lightweight Unsplash fetch helper */
  private async fetchUnsplash(terms: string[]) {
    const key = process.env.UNSPLASH_ACCESS_KEY;
    if (!key || !terms.length) return [];
    const q = encodeURIComponent(terms[0]);
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${q}&per_page=5&client_id=${key}`,
    );
    if (!res.ok) return [];
    const json = await res.json();
    return json.results.map((r) => ({
      imageUrl: r.urls.small,
      title: r.description || r.alt_description,
      sourceLink: r.links.html,
    }));
  }

  /** 🌤️ Suggest daily style plan */
  async suggest(body: {
    user?: string;
    weather?: any;
    wardrobe?: any[];
    preferences?: Record<string, any>;
  }) {
    const { user, weather, wardrobe, preferences } = body;

    const temp = weather?.fahrenheit?.main?.temp;
    const tempDesc = temp
      ? `${temp}°F and ${temp < 60 ? 'cool' : temp > 85 ? 'warm' : 'mild'} weather`
      : 'unknown temperature';

    const wardrobeCount = wardrobe?.length || 0;

    const systemPrompt = `
You are a luxury personal stylist.
Your goal is to provide a daily style briefing that helps the user feel prepared, stylish, and confident.
Be concise, intelligent, and polished — similar to a stylist at a high-end menswear brand.

Output must be JSON with:
- suggestion
- insight
- tomorrow
Optionally include seasonalForecast, lifecycleForecast, styleTrajectory.
`;

    const userPrompt = `
Client: ${user || 'The user'}
Weather: ${tempDesc}
Wardrobe items: ${wardrobeCount}
Preferences: ${JSON.stringify(preferences || {})}
`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.8,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error('No suggestion response received from model.');

    let parsed: {
      suggestion: string;
      insight: string;
      tomorrow: string;
      seasonalForecast?: string;
      lifecycleForecast?: string;
      styleTrajectory?: string;
    };

    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error('❌ Failed to parse AI JSON:', raw);
      throw new Error('AI response was not valid JSON.');
    }

    if (!parsed.seasonalForecast) {
      parsed.seasonalForecast = generateSeasonalForecast(wardrobe);
    }

    return parsed;
  }
}

// END REPLACED CHAT WITH LINKS AND SEARCH NET

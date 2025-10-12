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
    const finalPrompt = profileCtx ? `${prompt}\n${profileCtx}` : prompt;

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

    const { rows: wardrobe } = await pool.query(
      `SELECT name, main_category AS category, subcategory, color, material 
   FROM wardrobe_items 
   WHERE user_id::text = $1 
   ORDER BY updated_at DESC 
   LIMIT 50`,
      [user_id],
    );

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
    Return ONLY valid JSON in this structure:
    {
      "recreated_outfit": [
        { "source":"wardrobe"|"purchase", "category":"Top", "item":"...", "color":"...", "fit":"..." }
      ],
      "suggested_purchases": [
        { "category":"...", "item":"...", "color":"...", "material":"...", "brand":"...", "shopUrl":"..." }
      ],
      "style_note": "Explain how this respects the user's climate, fit, and taste."
    }

User gender: ${gender}
Detected tags: ${tags.join(', ')}
User style profile: ${JSON.stringify(styleProfile, null, 2)}
${climateNote}
Wardrobe subset: ${JSON.stringify(wardrobe.slice(0, 10), null, 2)}
`;

    console.log('🧥 [personalizedShop] wardrobe count:', wardrobe?.length);
    console.log('🧥 [personalizedShop] wardrobe sample:', wardrobe?.[0]);

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

      // 🧩 FINAL POST-PROCESS FILTER — guarantees profile consistency
      if (parsed?.recreated_outfit?.length) {
        parsed.recreated_outfit = parsed.recreated_outfit.filter((o: any) => {
          const text =
            `${o.item} ${o.category} ${o.color} ${o.fit}`.toLowerCase();
          // Block bad fits and disliked styles
          const fitBan = preferFit?.match(/relaxed|oversized|boxy|loose/)
            ? ['skinny', 'slim']
            : preferFit?.match(/skinny|slim/)
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
      }

      console.log(
        '💎 [personalizedShop] Parsed recreated outfit sample:',
        parsed?.recreated_outfit?.slice(0, 2),
      );
      console.log(
        '💎 [personalizedShop] Parsed suggested purchases sample:',
        parsed?.suggested_purchases?.slice(0, 2),
      );

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
      parsed.recreated_outfit = parsed.recreated_outfit.filter((o: any) => {
        const text =
          `${o.item} ${o.category} ${o.color} ${o.fit}`.toLowerCase();
        return !banned.some((b) => text.includes(b));
      });
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

        let products = await this.productSearch.search(q);

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

      const products = await this.productSearch.search(fallbackQuery);

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
    ); // ✅ ← this closes Promise.all()

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

//////////////////

// import { Injectable } from '@nestjs/common';
// import OpenAI from 'openai';
// import { ChatDto } from './dto/chat.dto';
// import { VertexService } from '../vertex/vertex.service'; // 🔹 ADDED
// import { ProductSearchService } from '../product-services/product-search.service';
// import { Pool } from 'pg';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// import * as fs from 'fs';
// import * as path from 'path';
// import * as dotenv from 'dotenv';

// function loadOpenAISecrets(): {
//   apiKey?: string;
//   project?: string;
//   source: string;
// } {
//   const candidates = [
//     path.join(process.cwd(), '.env'),
//     path.join(process.cwd(), 'apps', 'backend-nest', '.env'),
//     path.join(__dirname, '..', '..', '.env'),
//   ];

//   for (const p of candidates) {
//     try {
//       if (fs.existsSync(p)) {
//         const parsed = dotenv.parse(fs.readFileSync(p));
//         const apiKey = parsed['OPENAI_API_KEY'];
//         const project = parsed['OPENAI_PROJECT_ID'];
//         if (apiKey) return { apiKey, project, source: p };
//       }
//     } catch {
//       // ignore
//     }
//   }

//   return {
//     apiKey: process.env.OPENAI_API_KEY,
//     project: process.env.OPENAI_PROJECT_ID,
//     source: 'process.env',
//   };
// }

// // 🧥 Basic capsule wardrobe templates
// const CAPSULES = {
//   Spring: [
//     { category: 'Outerwear', subcategory: 'Light Jacket', recommended: 2 },
//     { category: 'Tops', subcategory: 'Oxford Shirt', recommended: 3 },
//     { category: 'Bottoms', subcategory: 'Chinos', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Loafers', recommended: 1 },
//     { category: 'Shoes', subcategory: 'Sneakers', recommended: 1 },
//   ],
//   Summer: [
//     { category: 'Tops', subcategory: 'Short Sleeve Shirt', recommended: 4 },
//     { category: 'Tops', subcategory: 'Polo Shirt', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Linen Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Loafers', recommended: 1 },
//     { category: 'Shoes', subcategory: 'Sandals', recommended: 1 },
//   ],
//   Fall: [
//     { category: 'Outerwear', subcategory: 'Field Jacket', recommended: 1 },
//     { category: 'Outerwear', subcategory: 'Blazer', recommended: 1 },
//     { category: 'Tops', subcategory: 'Knit Sweater', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Wool Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Chelsea Boots', recommended: 1 },
//   ],
//   Winter: [
//     { category: 'Outerwear', subcategory: 'Overcoat', recommended: 1 },
//     { category: 'Outerwear', subcategory: 'Heavy Parka', recommended: 1 },
//     { category: 'Tops', subcategory: 'Heavy Knit Sweater', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Wool Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Boots', recommended: 2 },
//   ],
// };

// // 🗓️ Auto-detect season based on month
// function getCurrentSeason(): 'Spring' | 'Summer' | 'Fall' | 'Winter' {
//   const month = new Date().getMonth() + 1;
//   if ([3, 4, 5].includes(month)) return 'Spring';
//   if ([6, 7, 8].includes(month)) return 'Summer';
//   if ([9, 10, 11].includes(month)) return 'Fall';
//   return 'Winter';
// }

// // 🧠 Compare wardrobe to capsule and return simple forecast text
// function generateSeasonalForecast(wardrobe: any[] = []): string | undefined {
//   const season = getCurrentSeason();
//   const capsule = CAPSULES[season];
//   if (!capsule) return;

//   const missing: string[] = [];

//   capsule.forEach((item) => {
//     const owned = wardrobe.filter(
//       (w) =>
//         w.category?.toLowerCase() === item.category.toLowerCase() &&
//         w.subcategory?.toLowerCase() === item.subcategory.toLowerCase(),
//     ).length;

//     if (owned < item.recommended) {
//       const needed = item.recommended - owned;
//       missing.push(`${needed} × ${item.subcategory}`);
//     }
//   });

//   if (missing.length === 0) {
//     return `✅ Your ${season} capsule is complete — you're ready for the season.`;
//   }

//   return `🍂 ${season} is approaching — you're missing: ${missing.join(', ')}.`;
// }

// @Injectable()
// export class AiService {
//   private openai: OpenAI;
//   private useVertex: boolean;
//   private vertexService?: VertexService; // 🔹 optional instance
//   private productSearch: ProductSearchService; // ✅ add this

//   constructor(vertexService?: VertexService) {
//     const { apiKey, project, source } = loadOpenAISecrets();

//     const snippet = apiKey?.slice(0, 20) ?? '';
//     const len = apiKey?.length ?? 0;
//     console.log('🔑 OPENAI key source:', source);
//     console.log('🔑 OPENAI key snippet:', JSON.stringify(snippet));
//     console.log('🔑 OPENAI key length:', len);
//     console.log('📂 CWD:', process.cwd());

//     if (!apiKey) {
//       throw new Error('OPENAI_API_KEY not found in .env or environment.');
//     }
//     if (/^sk-?x{3,}/i.test(apiKey)) {
//       throw new Error(
//         'OPENAI_API_KEY appears masked (e.g., "sk-xxxxx..."). Read from the correct .env instead.',
//       );
//     }
//     if (!apiKey.startsWith('sk-')) {
//       throw new Error('OPENAI_API_KEY is malformed — must start with "sk-".');
//     }

//     this.openai = new OpenAI({ apiKey, project });

//     // 🔹 New: Vertex toggle
//     this.useVertex = process.env.USE_VERTEX === 'true';
//     if (this.useVertex) {
//       this.vertexService = vertexService;
//       console.log('🧠 Vertex/Gemini mode enabled for analyze/recreate');
//     }

//     this.productSearch = new ProductSearchService(); // NEW
//   }

//   //////ANALYZE LOOK

//   async analyze(imageUrl: string) {
//     console.log('🧠 [AI] analyze() called with', imageUrl);
//     if (!imageUrl) throw new Error('Missing imageUrl');

//     // 🔹 Try Vertex first if enabled
//     if (this.useVertex && this.vertexService) {
//       try {
//         const gcsUri = imageUrl.replace(
//           'https://storage.googleapis.com/',
//           'gs://',
//         );
//         const metadata = await this.vertexService.analyzeImage(gcsUri);
//         const tags = [
//           ...(metadata.tags || []),
//           ...(metadata.style_descriptors || []),
//           metadata.main_category,
//           metadata.subcategory,
//         ].filter(Boolean);
//         console.log('🧠 [Vertex] analyze() success:', tags);
//         return { tags };
//       } catch (err: any) {
//         console.warn(
//           '[Vertex] analyze() failed → fallback to OpenAI:',
//           err.message,
//         );
//       }
//     }

//     // 🔸 OpenAI fallback
//     try {
//       const completion = await this.openai.chat.completions.create({
//         model: 'gpt-4o-mini',
//         messages: [
//           {
//             role: 'system',
//             content:
//               'You are a professional fashion classifier. Return only JSON with a "tags" array describing the outfit’s style, color palette, and vibe.',
//           },
//           {
//             role: 'user',
//             content: [
//               { type: 'text', text: 'Describe this outfit as tags only:' },
//               { type: 'image_url', image_url: { url: imageUrl } },
//             ],
//           },
//         ],
//         response_format: { type: 'json_object' },
//       });

//       const raw = completion.choices[0]?.message?.content;
//       console.log('🧠 [AI] analyze() raw response:', raw);

//       if (!raw) throw new Error('Empty response from OpenAI');
//       const parsed = JSON.parse(raw || '{}');
//       return { tags: parsed.tags || [] };
//     } catch (err: any) {
//       console.error('❌ [AI] analyze() failed:', err.message);
//       return { tags: ['casual', 'modern', 'neutral'] };
//     }
//   }

//   /* ------------------------------------------------------------
//      🧩 Weighted Tag Enrichment + Trend Injection
//   -------------------------------------------------------------*/
//   private async enrichTags(tags: string[]): Promise<string[]> {
//     const weightMap: Record<string, number> = {
//       tailored: 3,
//       minimal: 3,
//       neutral: 3,
//       modern: 2,
//       vintage: 2,
//       classic: 2,
//       streetwear: 2,
//       oversized: 2,
//       slim: 2,
//       relaxed: 2,
//       casual: 1,
//       sporty: 1,
//     };

//     // 🧹 Normalize + de-dupe
//     const cleanTags = Array.from(
//       new Set(
//         tags
//           .map((t) => t.toLowerCase().trim())
//           .filter((t) => t && !['outfit', 'style', 'fashion'].includes(t)),
//       ),
//     );

//     // 🧠 Apply weights
//     const weighted = cleanTags
//       .map((t) => ({ tag: t, weight: weightMap[t] || 1 }))
//       .sort((a, b) => b.weight - a.weight);

//     // 🌍 Inject current trend tags
//     const trendTags = await this.fetchTrendTags();
//     const final = Array.from(
//       new Set([...weighted.map((w) => w.tag), ...trendTags.slice(0, 3)]),
//     );

//     console.log('🎯 [AI] Enriched tags →', final);
//     return final;
//   }

//   private async fetchTrendTags(): Promise<string[]> {
//     try {
//       const res = await fetch(
//         'https://trends.google.com/trends/hottrends/visualize/internal/data/en_us',
//       );
//       if (!res.ok) throw new Error(`HTTP ${res.status}`);
//       const json = await res.json().catch(() => []);
//       const trendWords = JSON.stringify(json).toLowerCase();
//       const matched = trendWords.match(
//         /(quiet luxury|monochrome|minimalism|maximalism|italian|tailoring|loafers|neutrals|linen|structured|preppy|flannel|earth tones|autumn layering)/gi,
//       );
//       if (matched?.length) return Array.from(new Set(matched));

//       // 🧭 If Google Trends returned empty, use local backup
//       return [
//         'quiet luxury',
//         'neutral tones',
//         'tailored fit',
//         'autumn layering',
//       ];
//     } catch (err: any) {
//       console.warn('⚠️ Trend fetch fallback triggered:', err.message);
//       return [
//         'quiet luxury',
//         'neutral tones',
//         'tailored fit',
//         'autumn layering',
//       ];
//     }
//   }

//   async recreate(
//     user_id: string,
//     tags: string[],
//     image_url?: string,
//     user_gender?: string,
//   ) {
//     console.log(
//       '🧥 [AI] recreate() called for user',
//       user_id,
//       'with tags:',
//       tags,
//       'and gender:',
//       user_gender,
//     );

//     if (!user_id) throw new Error('Missing user_id');
//     if (!tags?.length) {
//       console.warn('⚠️ [AI] recreate() empty tags → using defaults.');
//       tags = ['modern', 'neutral', 'tailored'];
//     }

//     // ✅ Weighted + trend-injected tags
//     tags = await this.enrichTags(tags);

//     // 🧠 Fetch gender_presentation if missing
//     if (!user_gender) {
//       try {
//         const result = await pool.query(
//           'SELECT gender_presentation FROM users WHERE id = $1 LIMIT 1',
//           [user_id],
//         );
//         user_gender = result.rows[0]?.gender_presentation || 'neutral';
//       } catch {
//         user_gender = 'neutral';
//       }
//     }

//     // 🧩 Normalize gender
//     const normalizedGender =
//       user_gender?.toLowerCase().includes('female') ||
//       user_gender?.toLowerCase().includes('woman')
//         ? 'female'
//         : user_gender?.toLowerCase().includes('male') ||
//             user_gender?.toLowerCase().includes('man')
//           ? 'male'
//           : process.env.DEFAULT_GENDER || 'neutral';

//     // 🧠 Build stylist prompt
//     const prompt = `
// You are a world-class AI stylist for ${normalizedGender} fashion.
// Create a cohesive outfit inspired by an uploaded look.

// Client: ${user_id}
// Image: ${image_url || 'N/A'}
// Detected tags: ${tags.join(', ')}

// Rules:
// - Match fabric, color palette, and silhouette.
// - Use ${normalizedGender}-appropriate pieces.
// - Output only JSON:
// {
//   "outfit": [
//     { "category": "Top", "item": "Grey Cotton Tee", "color": "gray" },
//     { "category": "Bottom", "item": "Navy Chinos", "color": "navy" },
//     { "category": "Outerwear", "item": "Beige Overshirt", "color": "beige" },
//     { "category": "Shoes", "item": "White Sneakers", "color": "white" }
//   ],
//   "style_note": "Describe how the look connects to the uploaded image."
// }
// `;

//     // 🧠 Generate outfit via Vertex or OpenAI
//     let parsed: any;
//     if (this.useVertex && this.vertexService) {
//       try {
//         const result = await this.vertexService.generateReasonedOutfit(prompt);
//         let text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
//         text = text
//           .replace(/^```json\s*/i, '')
//           .replace(/```$/, '')
//           .trim();
//         parsed = JSON.parse(text);
//         console.log('🧠 [Vertex] recreate() success');
//       } catch (err: any) {
//         console.warn('[Vertex] recreate() failed → fallback', err.message);
//       }
//     }

//     if (!parsed) {
//       const completion = await this.openai.chat.completions.create({
//         model: 'gpt-4o-mini',
//         temperature: 0.7,
//         messages: [{ role: 'user', content: prompt }],
//         response_format: { type: 'json_object' },
//       });

//       const raw = completion.choices[0]?.message?.content || '{}';
//       try {
//         parsed = JSON.parse(raw);
//       } catch {
//         parsed = {};
//       }
//     }

//     const outfit = Array.isArray(parsed?.outfit) ? parsed.outfit : [];
//     const style_note =
//       parsed?.style_note || 'Modern outfit inspired by the uploaded look.';

//     // 🛍️ Enrich each item with live products
//     const enriched = await Promise.all(
//       outfit.map(async (o: any) => {
//         const query =
//           `${normalizedGender} ${o.item || o.category || ''} ${o.color || ''}`.trim();
//         let products = await this.productSearch.search(query);
//         let top = products[0];

//         if (!top?.image || top.image.includes('No_image')) {
//           const serp = await this.productSearch.searchSerpApi(query);
//           if (serp?.[0]) top = { ...serp[0], source: 'SerpAPI' };
//         }

//         const materialHint =
//           query.match(/(wool|cotton|linen|leather|denim|polyester)/i)?.[0] ||
//           null;
//         const seasonalityHint =
//           query.match(/(summer|winter|fall|spring)/i)?.[0] ||
//           getCurrentSeason();
//         const fitHint =
//           query.match(/(slim|regular|relaxed|oversized|tailored)/i)?.[0] ||
//           'regular';

//         return {
//           category: o.category,
//           item: o.item,
//           color: o.color,
//           brand: top?.brand || 'Unknown',
//           price: top?.price || '—',
//           image:
//             top?.image && top.image.startsWith('http')
//               ? top.image
//               : 'https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg',
//           shopUrl:
//             top?.shopUrl ||
//             `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=shop`,
//           source: top?.source || 'ASOS / Fallback',
//           material: materialHint,
//           seasonality: seasonalityHint,
//           fit: fitHint,
//         };
//       }),
//     );

//     return { user_id, outfit: enriched, style_note };
//   }

//   // 👔 PERSONALIZED SHOP — image + wardrobe + preferences
//   async personalizedShop(
//     user_id: string,
//     image_url: string,
//     user_gender?: string,
//   ) {
//     if (!user_id || !image_url) throw new Error('Missing user_id or image_url');

//     /** -----------------------------------------------------------
//      * 🧠 buildProfileConstraints(profile)
//      * Converts full style_profiles record into explicit hard rules
//      * ---------------------------------------------------------- */
//     function buildProfileConstraints(profile: any): string {
//       if (!profile) return '';

//       const fit = Array.isArray(profile.fit_preferences)
//         ? profile.fit_preferences.join(', ')
//         : profile.fit_preferences;

//       const colors = Array.isArray(profile.favorite_colors)
//         ? profile.favorite_colors.join(', ')
//         : profile.favorite_colors;

//       const brands = Array.isArray(profile.preferred_brands)
//         ? profile.preferred_brands.join(', ')
//         : profile.preferred_brands;

//       const styles = [
//         ...(profile.style_keywords || []),
//         ...(profile.style_preferences || []),
//       ]
//         .filter(Boolean)
//         .join(', ');

//       const dislikes =
//         typeof profile.disliked_styles === 'string'
//           ? profile.disliked_styles
//           : (profile.disliked_styles || []).join(', ');

//       const climate = profile.climate || 'Temperate';
//       const goals = profile.goals || '';

//       // 🔹 Inject explicit hard “only color” or “except color” rule for the model itself
//       let colorRule = '';
//       if (profile.disliked_styles?.match(/only\s+(\w+)/i)) {
//         const onlyColor = profile.disliked_styles.match(/only\s+(\w+)/i)[1];
//         colorRule = `• Use ONLY ${onlyColor} items — all other colors are forbidden.`;
//       } else if (profile.disliked_styles?.match(/except\s+(\w+)/i)) {
//         const exceptColor = profile.disliked_styles.match(/except\s+(\w+)/i)[1];
//         colorRule = `• Exclude every color except ${exceptColor}.`;
//       }

//       // 🔹 Explicitly enforce fit preferences
//       let fitRule = '';
//       if (profile.fit_preferences?.length) {
//         fitRule = `• Allow ONLY these fits: ${profile.fit_preferences.join(
//           ', ',
//         )}; exclude all others.`;
//       }

//       return `
// # USER PROFILE CONSTRAINTS (Hard Rules)

// ${fitRule}
// ${colorRule}

// • Fit: ${fit || 'Regular fit'} — outfit items must match this silhouette; exclude all opposing fits.
// • Climate: ${climate} — use materials and layers appropriate to this temperature zone.
// • Preferred brands: ${brands || '—'} — bias all product searches toward these or comparable aesthetics.
// • Favorite colors: ${colors || '—'} — bias color palette to these tones; avoid disliked colors.
// • Disliked styles: ${dislikes || '—'} — exclude these aesthetics entirely.
// • Style & vibe keywords: ${styles || '—'} — reflect these qualities in overall tone and accessories.
// • Goals: ${goals}
// • Body & proportions: ${profile.body_type || '—'}, ${
//         profile.proportions || '—'
//       } — ensure silhouette and layering suit these proportions.
// • Skin tone / hair / eyes: ${profile.skin_tone || '—'}, ${
//         profile.hair_color || '—'
//       }, ${profile.eye_color || '—'} — choose tones that complement.
// `;
//     }

//     // 1) Analyze uploaded image
//     const analysis = await this.analyze(image_url);
//     const tags = analysis?.tags || [];

//     const { rows: wardrobe } = await pool.query(
//       `SELECT name, main_category AS category, subcategory, color, material
//    FROM wardrobe_items
//    WHERE user_id::text = $1
//    ORDER BY updated_at DESC
//    LIMIT 50`,
//       [user_id],
//     );

//     const prefRes = await pool.query(
//       `SELECT gender_presentation
//      FROM users
//      WHERE id = $1
//      LIMIT 1`,
//       [user_id],
//     );
//     const profile = prefRes.rows[0] || {};
//     const gender = user_gender || profile.gender_presentation || 'neutral';
//     // 2️⃣ Fetch user style profile (full data used for personalization)
//     const styleProfileRes = await pool.query(
//       `
//   SELECT
//     body_type,
//     skin_tone,
//     undertone,
//     climate,
//     favorite_colors,
//     disliked_styles,
//     style_keywords,
//     preferred_brands,
//     goals,
//     proportions,
//     hair_color,
//     eye_color,
//     height,
//     waist,
//     fit_preferences,
//     style_preferences
//   FROM style_profiles
//   WHERE user_id::text = $1
//   LIMIT 1
// `,
//       [user_id],
//     );

//     const styleProfile = styleProfileRes.rows[0] || {};

//     // 🔹 Build user filter preferences
//     const { preferFit, bannedWords } = buildUserFilter(styleProfile);

//     /* ------------------------------------------------------------
//    🎛️ VISUAL + STYLE FILTERING HELPERS
// -------------------------------------------------------------*/
//     const FIT_KEYWORDS = {
//       skinny: [/skinny/i, /super[- ]skinny/i, /spray[- ]on/i],
//       slim: [/slim/i],
//       tailored: [/tailored/i, /tapered/i],
//       relaxed: [/relaxed/i, /loose/i, /baggy/i, /wide[- ]leg/i],
//       oversized: [/oversized/i, /boxy/i],
//     };

//     function buildUserFilter(profile: any) {
//       const fitPrefs = (profile.fit_preferences || []).map((x: string) =>
//         x.toLowerCase(),
//       );
//       const disliked = (profile.disliked_styles || '')
//         .toLowerCase()
//         .split(/[,\s]+/)
//         .filter(Boolean);
//       const favColors = (profile.favorite_colors || []).map((x: string) =>
//         x.toLowerCase(),
//       );

//       const preferFit =
//         fitPrefs.find((f) => /(relaxed|loose|baggy|oversized|boxy)/.test(f)) ||
//         fitPrefs.find((f) => /(regular|tailored)/.test(f)) ||
//         fitPrefs[0] ||
//         null;

//       const banFits: string[] = [];
//       if (preferFit?.match(/relaxed|loose|baggy|oversized|boxy/))
//         banFits.push('skinny', 'slim');
//       else if (preferFit?.match(/skinny|slim/))
//         banFits.push('relaxed', 'baggy', 'oversized');

//       const bannedWords = [
//         ...disliked,
//         ...banFits,
//         ...(!favColors.includes('green') ? ['green'] : []),
//       ]
//         .filter(Boolean)
//         .map((x) => new RegExp(x, 'i'));

//       return { preferFit, bannedWords };
//     }

//     function enforceProfileFilters(
//       products: any[] = [],
//       preferFit?: string | null,
//       bannedWords: RegExp[] = [],
//     ) {
//       if (!products.length) return products;

//       return products
//         .filter((p) => {
//           const hay = `${p.title || ''} ${p.name || ''} ${p.description || ''}`;
//           return !bannedWords.some((rx) => rx.test(hay));
//         })
//         .sort((a, b) => {
//           if (!preferFit) return 0;
//           const aHit = FIT_KEYWORDS[preferFit]?.some((rx) =>
//             rx.test(`${a.title} ${a.name}`),
//           )
//             ? 1
//             : 0;
//           const bHit = FIT_KEYWORDS[preferFit]?.some((rx) =>
//             rx.test(`${b.title} ${b.name}`),
//           )
//             ? 1
//             : 0;
//           return bHit - aHit; // boost preferred fits
//         });
//     }

//     // 3) Ask model to split into "owned" vs "missing"

//     const climateNote = styleProfile.climate
//       ? `The user's climate is ${styleProfile.climate}.
//     If it is cold (like Polar or Cold), emphasize insulated materials, coats, layers, scarves, gloves, and boots.
//     If it is hot (like Tropical or Desert), emphasize breathable, lightweight fabrics and open footwear.`
//       : '';

//     // 🔒 Enforced personalization hierarchy
//     const rules = `
// # PERSONALIZATION ENFORCEMENT
// Follow these user preferences as *absolute constraints*, not suggestions.
// `;

//     const profileConstraints = buildProfileConstraints(styleProfile);

//     const prompt = `
// You are a world-class personal stylist generating a personalized recreation of an uploaded look.

// ${rules}
// ${profileConstraints}

// Return ONLY valid JSON in this structure:
// {
//   "recreated_outfit": [
//     { "source":"wardrobe"|"purchase", "category":"Top", "item":"...", "color":"...", "fit":"..." }
//   ],
//   "suggested_purchases": [
//     { "category":"...", "item":"...", "color":"...", "material":"...", "brand":"...", "shopUrl":"..." }
//   ],
//   "style_note": "Explain how this respects the user's climate, fit, and taste."
// }

// User gender: ${gender}
// Detected tags: ${tags.join(', ')}
// User style profile: ${JSON.stringify(styleProfile, null, 2)}
// ${climateNote}
// Wardrobe subset: ${JSON.stringify(wardrobe.slice(0, 10), null, 2)}
// `;

//     console.log('🧥 [personalizedShop] wardrobe count:', wardrobe?.length);
//     console.log('🧥 [personalizedShop] wardrobe sample:', wardrobe?.[0]);

//     console.log('🧥 [personalizedShop] profile:', profile);
//     console.log('🧥 [personalizedShop] gender:', gender);
//     console.log('🧥 [personalizedShop] styleProfile:', styleProfile);
//     console.log('🧠 [personalizedShop] Prompt preview:', prompt.slice(0, 800));

//     // 🧠 DEBUG START — prompt verification
//     console.log('─────────────── PROMPT SENT TO MODEL ───────────────');
//     console.log(prompt);
//     console.log('─────────────── END PROMPT ───────────────');

//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o-mini',
//       temperature: 0.7,
//       messages: [{ role: 'user', content: prompt }],
//       response_format: { type: 'json_object' },
//     });

//     // 🧠 DEBUG END — raw model output
//     console.log('─────────────── RAW MODEL RESPONSE ───────────────');
//     console.log(completion.choices[0]?.message?.content);
//     console.log('─────────────── END RESPONSE ───────────────');

//     let parsed: any = {};
//     try {
//       parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');

//       // 🧩 SAFETY GUARD — ensure we keep valid recreated_outfit
//       try {
//         const parsedKeys = Object.keys(parsed);
//         console.log('✅ [personalizedShop] Parsed JSON keys:', parsedKeys);

//         // If model used "outfit" instead of "recreated_outfit", normalize it
//         if (!parsed.recreated_outfit && parsed.outfit) {
//           parsed.recreated_outfit = parsed.outfit;
//           console.log('✅ [personalizedShop] Mapped outfit → recreated_outfit');
//         }

//         // Double-check array validity before fallback clears it
//         if (parsed.recreated_outfit && parsed.recreated_outfit.length > 0) {
//           console.log(
//             '✅ [personalizedShop] Using recreated_outfit from model',
//           );
//         } else {
//           console.warn(
//             '⚠️ [personalizedShop] No recreated_outfit found — fallback may trigger',
//           );
//         }
//       } catch (err) {
//         console.error(
//           '❌ [personalizedShop] JSON structure guard failed:',
//           err,
//         );
//       }

//       // 🧩 FINAL POST-PROCESS FILTER — guarantees profile consistency
//       if (parsed?.recreated_outfit?.length) {
//         parsed.recreated_outfit = parsed.recreated_outfit.filter((o: any) => {
//           const text =
//             `${o.item} ${o.category} ${o.color} ${o.fit}`.toLowerCase();
//           // Block bad fits and disliked styles
//           const fitBan = preferFit?.match(/relaxed|oversized|boxy|loose/)
//             ? ['skinny', 'slim']
//             : preferFit?.match(/skinny|slim/)
//               ? ['relaxed', 'baggy', 'oversized']
//               : [];
//           const styleBan =
//             (styleProfile.disliked_styles || '')
//               .toLowerCase()
//               .split(/[,\s]+/)
//               .filter(Boolean) || [];
//           const banned = [...fitBan, ...styleBan];
//           return !banned.some((b) => text.includes(b));
//         });
//       }

//       console.log(
//         '💎 [personalizedShop] Parsed recreated outfit sample:',
//         parsed?.recreated_outfit?.slice(0, 2),
//       );
//       console.log(
//         '💎 [personalizedShop] Parsed suggested purchases sample:',
//         parsed?.suggested_purchases?.slice(0, 2),
//       );

//       // 🎨 Enforce "only <color>" rule from disliked_styles (e.g. "I dislike all colors except pink")
//       // 🎨 Optional color-only enforcement — only if explicit "ONLY <color>" flag exists
//       if (styleProfile?.disliked_styles?.toLowerCase().includes('only')) {
//         const match = styleProfile.disliked_styles.match(/only\s+(\w+)/i);
//         if (match) {
//           const onlyColor = match[1].toLowerCase();
//           const filterColor = (arr: any[]) =>
//             arr.filter((x) =>
//               (x.color || '').toLowerCase().includes(onlyColor),
//             );

//           if (Array.isArray(parsed?.recreated_outfit))
//             parsed.recreated_outfit = filterColor(parsed.recreated_outfit);
//           if (Array.isArray(parsed?.suggested_purchases))
//             parsed.suggested_purchases = filterColor(
//               parsed.suggested_purchases,
//             );

//           console.log(
//             `[personalizedShop] 🎨 Enforcing ONLY-color rule: ${onlyColor}`,
//           );
//         }
//       }
//     } catch {
//       parsed = {};
//     }

//     const purchases = Array.isArray(parsed?.suggested_purchases)
//       ? parsed.suggested_purchases
//       : [];

//     if (parsed?.recreated_outfit?.some((i: any) => i.source === 'wardrobe')) {
//       console.log('🧥 [personalizedShop] ✅ Model reused wardrobe pieces.');
//     } else {
//       console.warn(
//         '🧥 [personalizedShop] ⚠️ Model did NOT reuse wardrobe — fallback to generic recreation.',
//       );
//     }

//     // 🚫 Enforce profile bans in returned outfit
//     const banned = [
//       ...(styleProfile.disliked_styles?.toLowerCase().split(/[,\s]+/) || []),
//       ...(preferFit?.match(/relaxed|oversized|boxy|loose/)
//         ? ['skinny', 'slim']
//         : []),
//       ...(preferFit?.match(/skinny|slim/)
//         ? ['relaxed', 'oversized', 'baggy']
//         : []),
//     ].filter(Boolean);

//     if (parsed?.recreated_outfit?.length) {
//       parsed.recreated_outfit = parsed.recreated_outfit.filter((o: any) => {
//         const text =
//           `${o.item} ${o.category} ${o.color} ${o.fit}`.toLowerCase();
//         return !banned.some((b) => text.includes(b));
//       });
//     }

//     // 🧩 Centralized enforcement for personalizedShop only
//     function applyProfileFilters(products: any[], profile: any) {
//       if (!Array.isArray(products) || !products.length) return [];

//       const favColors = (profile.favorite_colors || []).map((x: string) =>
//         x.toLowerCase(),
//       );
//       const prefBrands = (profile.preferred_brands || []).map((x: string) =>
//         x.toLowerCase(),
//       );
//       const fitPrefs = (profile.fit_preferences || []).map((x: string) =>
//         x.toLowerCase(),
//       );
//       const dislikes = (profile.disliked_styles || '')
//         .toLowerCase()
//         .split(/[,\s]+/);
//       const climate = (profile.climate || '').toLowerCase();

//       const isCold = /(polar|cold|arctic|tundra|winter)/.test(climate);
//       const isHot = /(tropical|desert|hot|humid|summer)/.test(climate);

//       // 🩷 detect "only" or "except" color rule from disliked_styles
//       let onlyColor: string | null = null;
//       let exceptColor: string | null = null;

//       if (profile.disliked_styles?.match(/only\s+(\w+)/i)) {
//         onlyColor = profile.disliked_styles
//           .match(/only\s+(\w+)/i)[1]
//           .toLowerCase();
//       } else if (profile.disliked_styles?.match(/except\s+(\w+)/i)) {
//         exceptColor = profile.disliked_styles
//           .match(/except\s+(\w+)/i)[1]
//           .toLowerCase();
//       }

//       return products
//         .filter((p) => {
//           const t = `${p.name ?? ''} ${p.title ?? ''} ${p.brand ?? ''} ${
//             p.description ?? ''
//           } ${p.color ?? ''} ${p.fit ?? ''}`.toLowerCase();

//           // 🚫 Filter out disliked words/styles
//           if (dislikes.some((d) => d && t.includes(d))) return false;

//           // 🎨 HARD color enforcement from DB rules
//           if (onlyColor) {
//             // Only allow if text or color includes the specified color
//             if (
//               !t.includes(onlyColor) &&
//               !p.color?.toLowerCase().includes(onlyColor)
//             )
//               return false;
//           } else if (exceptColor) {
//             // Exclude everything not matching that color
//             if (
//               !t.includes(exceptColor) &&
//               !p.color?.toLowerCase().includes(exceptColor)
//             )
//               return false;
//           } else {
//             // Normal favorite color bias if no hard rule
//             if (favColors.length && !favColors.some((c) => t.includes(c)))
//               return false;
//           }

//           // 👕 Fit preferences
//           if (fitPrefs.length && !fitPrefs.some((f) => t.includes(f)))
//             return false;

//           // 🌡️ Climate-based filtering
//           if (isCold && /(tank|shorts|sandal)/.test(t)) return false;
//           if (isHot && /(wool|parka|coat|boot|knit)/.test(t)) return false;

//           return true;
//         })
//         .sort((a, b) => {
//           const score = (x: any) => {
//             const txt =
//               `${x.name} ${x.title} ${x.brand} ${x.color} ${x.fit}`.toLowerCase();
//             let s = 0;
//             if (onlyColor && txt.includes(onlyColor)) s += 4;
//             if (exceptColor && txt.includes(exceptColor)) s += 4;
//             if (favColors.some((c) => txt.includes(c))) s += 2;
//             if (prefBrands.some((b) => txt.includes(b))) s += 2;
//             if (fitPrefs.some((f) => txt.includes(f))) s += 1;
//             return s;
//           };
//           return score(b) - score(a);
//         });
//     }

//     // 4️⃣ Attach live shop links to the "missing" items — now honoring user taste
//     let enrichedPurchases = await Promise.all(
//       purchases.map(async (p: any) => {
//         // Base query
//         let q = [
//           gender,
//           p.item || p.category || '',
//           p.color || '',
//           p.material || '',
//         ]
//           .filter(Boolean)
//           .join(' ')
//           .trim();

//         // 🔹 Inject personalization bias terms
//         const brandTerms = (styleProfile.preferred_brands || [])
//           .slice(0, 3)
//           .join(' ');
//         const colorTerms = (styleProfile.favorite_colors || [])
//           .slice(0, 2)
//           .join(' ');
//         const fitTerms = Array.isArray(styleProfile.fit_preferences)
//           ? styleProfile.fit_preferences.join(' ')
//           : styleProfile.fit_preferences || '';

//         // 🎨 “Only color” rule (e.g. “I dislike all colors except pink”)
//         const colorMatch =
//           styleProfile.disliked_styles?.match(/except\s+(\w+)/i);
//         if (colorMatch) {
//           const onlyColor = colorMatch[1].toLowerCase();
//           q += ` ${onlyColor}`;
//         }

//         // Combine into final query with brand + color + fit bias
//         q = [q, brandTerms, colorTerms, fitTerms].filter(Boolean).join(' ');

//         const products = await this.productSearch.search(q);
//         return {
//           ...p,
//           query: q,
//           products: applyProfileFilters(products, styleProfile),
//         };
//       }),
//     );

//     // 5️⃣ Fallback enrichment if AI returned nothing or products failed
//     if (!enrichedPurchases.length) {
//       console.warn(
//         '⚠️ [personalizedShop] Empty suggested_purchases → fallback.',
//       );

//       const tagSeed = tags.slice(0, 6).join(' ');
//       const season = getCurrentSeason();
//       const genderPrefix =
//         gender?.toLowerCase().includes('female') ||
//         gender?.toLowerCase().includes('woman')
//           ? 'women'
//           : 'men';

//       // 🧠 Enrich fallback with style taste as well
//       const brandTerms = (styleProfile.preferred_brands || [])
//         .slice(0, 3)
//         .join(' ');
//       const colorTerms = (styleProfile.favorite_colors || [])
//         .slice(0, 2)
//         .join(' ');
//       const fitTerms = Array.isArray(styleProfile.fit_preferences)
//         ? styleProfile.fit_preferences.join(' ')
//         : styleProfile.fit_preferences || '';

//       const fallbackQuery = `${genderPrefix} ${tagSeed} ${season} fashion ${brandTerms} ${colorTerms} ${fitTerms}`;
//       console.log('🧩 [personalizedShop] fallbackQuery →', fallbackQuery);

//       const products = await this.productSearch.search(fallbackQuery);

//       enrichedPurchases = [
//         {
//           category: 'General',
//           item: 'Curated Outfit Add-Ons',
//           color: 'Mixed',
//           material: null,
//           products: applyProfileFilters(products.slice(0, 8), styleProfile),
//           query: fallbackQuery,
//           source: 'fallback',
//         },
//       ];
//     }

//     // 🎨 Enforce color-only rule on fallback products too
//     if (styleProfile?.disliked_styles) {
//       const match = styleProfile.disliked_styles.match(/except\s+(\w+)/i);
//       if (match) {
//         const onlyColor = match[1].toLowerCase();
//         enrichedPurchases = enrichedPurchases.map((p) => ({
//           ...p,
//           products: (p.products || []).filter((prod) =>
//             (prod.color || '').toLowerCase().includes(onlyColor),
//           ),
//         }));
//         console.log(
//           `[personalizedShop] 🎨 Enforced fallback color-only rule: ${onlyColor}`,
//         );
//       }
//     }

//     // 🧹 Enforce visual and logical consistency before returning
//     const cleanPurchases = enrichedPurchases.map((p) => ({
//       ...p,
//       products: enforceProfileFilters(p.products || [], preferFit, bannedWords),
//     }));

//     // 🧊 Climate sanity check — if Polar but outfit lacks insulation, patch style_note
//     if (
//       styleProfile.climate?.toLowerCase().includes('polar') &&
//       !/coat|jacket|parka|boot|knit|sweater/i.test(
//         JSON.stringify(parsed.recreated_outfit || []),
//       )
//     ) {
//       parsed.style_note +=
//         ' Reinforced with insulated outerwear and cold-weather layering for Polar climates.';
//     }

//     return {
//       user_id,
//       image_url,
//       tags,
//       recreated_outfit: parsed?.recreated_outfit || [],
//       suggested_purchases: cleanPurchases,
//       style_note:
//         parsed?.style_note ||
//         'Personalized recreation based on your wardrobe, with curated seasonal add-ons.',
//       applied_filters: {
//         preferFit,
//         bannedWords: bannedWords.map((r) => r.source),
//       },
//     };
//   }

//   ////////END CREATE LOOK

//   //////. START REPLACED CHAT WITH LINKS AND SEARCH NET

//   /** 🧠 Conversational fashion chat — now with visuals + links */
//   async chat(dto: ChatDto) {
//     const { messages } = dto;
//     const lastUserMsg = messages
//       .slice()
//       .reverse()
//       .find((m) => m.role === 'user')?.content;

//     if (!lastUserMsg) {
//       throw new Error('No user message provided');
//     }

//     // 1️⃣ Generate base text with OpenAI
//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         {
//           role: 'system',
//           content: `
// You are a world-class personal fashion stylist.
// Respond naturally and helpfully about outfits, wardrobe planning, or styling.
// At the end of your reasoning, also return a short JSON block like:
// {"search_terms":["smart casual men","navy blazer outfit","loafers"]}
//         `,
//         },
//         ...messages,
//       ],
//     });

//     const aiReply =
//       completion.choices[0]?.message?.content?.trim() ||
//       'Styled response unavailable.';

//     // 2️⃣ Extract search terms if model provided them
//     let searchTerms: string[] = [];
//     const match = aiReply.match(/\{.*"search_terms":.*\}/s);
//     if (match) {
//       try {
//         const parsed = JSON.parse(match[0]);
//         searchTerms = parsed.search_terms ?? [];
//       } catch {
//         searchTerms = [];
//       }
//     }

//     // 3️⃣ Fallback heuristic: derive terms if none found
//     if (!searchTerms.length) {
//       const lowered = lastUserMsg.toLowerCase();
//       if (lowered.includes('smart')) searchTerms.push('smart casual outfit');
//       if (lowered.includes('summer')) searchTerms.push('summer outfit');
//       if (lowered.includes('work')) searchTerms.push('business casual look');
//       if (!searchTerms.length)
//         searchTerms.push(`${lowered} outfit inspiration`);
//     }

//     // 4️⃣ Fetch Unsplash images
//     const images = await this.fetchUnsplash(searchTerms);

//     // 5️⃣ Build shoppable links
//     const links = searchTerms.map((term) => ({
//       label: `Shop ${term} on ASOS`,
//       url: `https://www.asos.com/search/?q=${encodeURIComponent(term)}`,
//     }));

//     return { reply: aiReply, images, links };
//   }

//   /** 🔍 Lightweight Unsplash fetch helper */
//   private async fetchUnsplash(terms: string[]) {
//     const key = process.env.UNSPLASH_ACCESS_KEY;
//     if (!key || !terms.length) return [];
//     const q = encodeURIComponent(terms[0]);
//     const res = await fetch(
//       `https://api.unsplash.com/search/photos?query=${q}&per_page=5&client_id=${key}`,
//     );
//     if (!res.ok) return [];
//     const json = await res.json();
//     return json.results.map((r) => ({
//       imageUrl: r.urls.small,
//       title: r.description || r.alt_description,
//       sourceLink: r.links.html,
//     }));
//   }

//   /** 🌤️ Suggest daily style plan */
//   async suggest(body: {
//     user?: string;
//     weather?: any;
//     wardrobe?: any[];
//     preferences?: Record<string, any>;
//   }) {
//     const { user, weather, wardrobe, preferences } = body;

//     const temp = weather?.fahrenheit?.main?.temp;
//     const tempDesc = temp
//       ? `${temp}°F and ${temp < 60 ? 'cool' : temp > 85 ? 'warm' : 'mild'} weather`
//       : 'unknown temperature';

//     const wardrobeCount = wardrobe?.length || 0;

//     const systemPrompt = `
// You are a luxury personal stylist.
// Your goal is to provide a daily style briefing that helps the user feel prepared, stylish, and confident.
// Be concise, intelligent, and polished — similar to a stylist at a high-end menswear brand.

// Output must be JSON with:
// - suggestion
// - insight
// - tomorrow
// Optionally include seasonalForecast, lifecycleForecast, styleTrajectory.
// `;

//     const userPrompt = `
// Client: ${user || 'The user'}
// Weather: ${tempDesc}
// Wardrobe items: ${wardrobeCount}
// Preferences: ${JSON.stringify(preferences || {})}
// `;

//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         { role: 'system', content: systemPrompt },
//         { role: 'user', content: userPrompt },
//       ],
//       response_format: { type: 'json_object' },
//     });

//     const raw = completion.choices[0]?.message?.content;
//     if (!raw) throw new Error('No suggestion response received from model.');

//     let parsed: {
//       suggestion: string;
//       insight: string;
//       tomorrow: string;
//       seasonalForecast?: string;
//       lifecycleForecast?: string;
//       styleTrajectory?: string;
//     };

//     try {
//       parsed = JSON.parse(raw);
//     } catch {
//       console.error('❌ Failed to parse AI JSON:', raw);
//       throw new Error('AI response was not valid JSON.');
//     }

//     if (!parsed.seasonalForecast) {
//       parsed.seasonalForecast = generateSeasonalForecast(wardrobe);
//     }

//     return parsed;
//   }
// }

// // END REPLACED CHAT WITH LINKS AND SEARCH NET

////////////////////

// import { Injectable } from '@nestjs/common';
// import OpenAI from 'openai';
// import { ChatDto } from './dto/chat.dto';
// import { VertexService } from '../vertex/vertex.service'; // 🔹 ADDED
// import { ProductSearchService } from '../product-services/product-search.service';
// import { Pool } from 'pg';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// import * as fs from 'fs';
// import * as path from 'path';
// import * as dotenv from 'dotenv';

// function loadOpenAISecrets(): {
//   apiKey?: string;
//   project?: string;
//   source: string;
// } {
//   const candidates = [
//     path.join(process.cwd(), '.env'),
//     path.join(process.cwd(), 'apps', 'backend-nest', '.env'),
//     path.join(__dirname, '..', '..', '.env'),
//   ];

//   for (const p of candidates) {
//     try {
//       if (fs.existsSync(p)) {
//         const parsed = dotenv.parse(fs.readFileSync(p));
//         const apiKey = parsed['OPENAI_API_KEY'];
//         const project = parsed['OPENAI_PROJECT_ID'];
//         if (apiKey) return { apiKey, project, source: p };
//       }
//     } catch {
//       // ignore
//     }
//   }

//   return {
//     apiKey: process.env.OPENAI_API_KEY,
//     project: process.env.OPENAI_PROJECT_ID,
//     source: 'process.env',
//   };
// }

// // 🧥 Basic capsule wardrobe templates
// const CAPSULES = {
//   Spring: [
//     { category: 'Outerwear', subcategory: 'Light Jacket', recommended: 2 },
//     { category: 'Tops', subcategory: 'Oxford Shirt', recommended: 3 },
//     { category: 'Bottoms', subcategory: 'Chinos', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Loafers', recommended: 1 },
//     { category: 'Shoes', subcategory: 'Sneakers', recommended: 1 },
//   ],
//   Summer: [
//     { category: 'Tops', subcategory: 'Short Sleeve Shirt', recommended: 4 },
//     { category: 'Tops', subcategory: 'Polo Shirt', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Linen Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Loafers', recommended: 1 },
//     { category: 'Shoes', subcategory: 'Sandals', recommended: 1 },
//   ],
//   Fall: [
//     { category: 'Outerwear', subcategory: 'Field Jacket', recommended: 1 },
//     { category: 'Outerwear', subcategory: 'Blazer', recommended: 1 },
//     { category: 'Tops', subcategory: 'Knit Sweater', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Wool Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Chelsea Boots', recommended: 1 },
//   ],
//   Winter: [
//     { category: 'Outerwear', subcategory: 'Overcoat', recommended: 1 },
//     { category: 'Outerwear', subcategory: 'Heavy Parka', recommended: 1 },
//     { category: 'Tops', subcategory: 'Heavy Knit Sweater', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Wool Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Boots', recommended: 2 },
//   ],
// };

// // 🗓️ Auto-detect season based on month
// function getCurrentSeason(): 'Spring' | 'Summer' | 'Fall' | 'Winter' {
//   const month = new Date().getMonth() + 1;
//   if ([3, 4, 5].includes(month)) return 'Spring';
//   if ([6, 7, 8].includes(month)) return 'Summer';
//   if ([9, 10, 11].includes(month)) return 'Fall';
//   return 'Winter';
// }

// // 🧠 Compare wardrobe to capsule and return simple forecast text
// function generateSeasonalForecast(wardrobe: any[] = []): string | undefined {
//   const season = getCurrentSeason();
//   const capsule = CAPSULES[season];
//   if (!capsule) return;

//   const missing: string[] = [];

//   capsule.forEach((item) => {
//     const owned = wardrobe.filter(
//       (w) =>
//         w.category?.toLowerCase() === item.category.toLowerCase() &&
//         w.subcategory?.toLowerCase() === item.subcategory.toLowerCase(),
//     ).length;

//     if (owned < item.recommended) {
//       const needed = item.recommended - owned;
//       missing.push(`${needed} × ${item.subcategory}`);
//     }
//   });

//   if (missing.length === 0) {
//     return `✅ Your ${season} capsule is complete — you're ready for the season.`;
//   }

//   return `🍂 ${season} is approaching — you're missing: ${missing.join(', ')}.`;
// }

// @Injectable()
// export class AiService {
//   private openai: OpenAI;
//   private useVertex: boolean;
//   private vertexService?: VertexService; // 🔹 optional instance
//   private productSearch: ProductSearchService; // ✅ add this

//   constructor(vertexService?: VertexService) {
//     const { apiKey, project, source } = loadOpenAISecrets();

//     const snippet = apiKey?.slice(0, 20) ?? '';
//     const len = apiKey?.length ?? 0;
//     console.log('🔑 OPENAI key source:', source);
//     console.log('🔑 OPENAI key snippet:', JSON.stringify(snippet));
//     console.log('🔑 OPENAI key length:', len);
//     console.log('📂 CWD:', process.cwd());

//     if (!apiKey) {
//       throw new Error('OPENAI_API_KEY not found in .env or environment.');
//     }
//     if (/^sk-?x{3,}/i.test(apiKey)) {
//       throw new Error(
//         'OPENAI_API_KEY appears masked (e.g., "sk-xxxxx..."). Read from the correct .env instead.',
//       );
//     }
//     if (!apiKey.startsWith('sk-')) {
//       throw new Error('OPENAI_API_KEY is malformed — must start with "sk-".');
//     }

//     this.openai = new OpenAI({ apiKey, project });

//     // 🔹 New: Vertex toggle
//     this.useVertex = process.env.USE_VERTEX === 'true';
//     if (this.useVertex) {
//       this.vertexService = vertexService;
//       console.log('🧠 Vertex/Gemini mode enabled for analyze/recreate');
//     }

//     this.productSearch = new ProductSearchService(); // NEW
//   }

//   //////ANALYZE LOOK

//   async analyze(imageUrl: string) {
//     console.log('🧠 [AI] analyze() called with', imageUrl);
//     if (!imageUrl) throw new Error('Missing imageUrl');

//     // 🔹 Try Vertex first if enabled
//     if (this.useVertex && this.vertexService) {
//       try {
//         const gcsUri = imageUrl.replace(
//           'https://storage.googleapis.com/',
//           'gs://',
//         );
//         const metadata = await this.vertexService.analyzeImage(gcsUri);
//         const tags = [
//           ...(metadata.tags || []),
//           ...(metadata.style_descriptors || []),
//           metadata.main_category,
//           metadata.subcategory,
//         ].filter(Boolean);
//         console.log('🧠 [Vertex] analyze() success:', tags);
//         return { tags };
//       } catch (err: any) {
//         console.warn(
//           '[Vertex] analyze() failed → fallback to OpenAI:',
//           err.message,
//         );
//       }
//     }

//     // 🔸 OpenAI fallback
//     try {
//       const completion = await this.openai.chat.completions.create({
//         model: 'gpt-4o-mini',
//         messages: [
//           {
//             role: 'system',
//             content:
//               'You are a professional fashion classifier. Return only JSON with a "tags" array describing the outfit’s style, color palette, and vibe.',
//           },
//           {
//             role: 'user',
//             content: [
//               { type: 'text', text: 'Describe this outfit as tags only:' },
//               { type: 'image_url', image_url: { url: imageUrl } },
//             ],
//           },
//         ],
//         response_format: { type: 'json_object' },
//       });

//       const raw = completion.choices[0]?.message?.content;
//       console.log('🧠 [AI] analyze() raw response:', raw);

//       if (!raw) throw new Error('Empty response from OpenAI');
//       const parsed = JSON.parse(raw || '{}');
//       return { tags: parsed.tags || [] };
//     } catch (err: any) {
//       console.error('❌ [AI] analyze() failed:', err.message);
//       return { tags: ['casual', 'modern', 'neutral'] };
//     }
//   }

//   /* ------------------------------------------------------------
//      🧩 Weighted Tag Enrichment + Trend Injection
//   -------------------------------------------------------------*/
//   private async enrichTags(tags: string[]): Promise<string[]> {
//     const weightMap: Record<string, number> = {
//       tailored: 3,
//       minimal: 3,
//       neutral: 3,
//       modern: 2,
//       vintage: 2,
//       classic: 2,
//       streetwear: 2,
//       oversized: 2,
//       slim: 2,
//       relaxed: 2,
//       casual: 1,
//       sporty: 1,
//     };

//     // 🧹 Normalize + de-dupe
//     const cleanTags = Array.from(
//       new Set(
//         tags
//           .map((t) => t.toLowerCase().trim())
//           .filter((t) => t && !['outfit', 'style', 'fashion'].includes(t)),
//       ),
//     );

//     // 🧠 Apply weights
//     const weighted = cleanTags
//       .map((t) => ({ tag: t, weight: weightMap[t] || 1 }))
//       .sort((a, b) => b.weight - a.weight);

//     // 🌍 Inject current trend tags
//     const trendTags = await this.fetchTrendTags();
//     const final = Array.from(
//       new Set([...weighted.map((w) => w.tag), ...trendTags.slice(0, 3)]),
//     );

//     console.log('🎯 [AI] Enriched tags →', final);
//     return final;
//   }

//   private async fetchTrendTags(): Promise<string[]> {
//     try {
//       const res = await fetch(
//         'https://trends.google.com/trends/hottrends/visualize/internal/data/en_us',
//       );
//       if (!res.ok) throw new Error(`HTTP ${res.status}`);
//       const json = await res.json().catch(() => []);
//       const trendWords = JSON.stringify(json).toLowerCase();
//       const matched = trendWords.match(
//         /(quiet luxury|monochrome|minimalism|maximalism|italian|tailoring|loafers|neutrals|linen|structured|preppy|flannel|earth tones|autumn layering)/gi,
//       );
//       if (matched?.length) return Array.from(new Set(matched));

//       // 🧭 If Google Trends returned empty, use local backup
//       return [
//         'quiet luxury',
//         'neutral tones',
//         'tailored fit',
//         'autumn layering',
//       ];
//     } catch (err: any) {
//       console.warn('⚠️ Trend fetch fallback triggered:', err.message);
//       return [
//         'quiet luxury',
//         'neutral tones',
//         'tailored fit',
//         'autumn layering',
//       ];
//     }
//   }

//   async recreate(
//     user_id: string,
//     tags: string[],
//     image_url?: string,
//     user_gender?: string,
//   ) {
//     console.log(
//       '🧥 [AI] recreate() called for user',
//       user_id,
//       'with tags:',
//       tags,
//       'and gender:',
//       user_gender,
//     );

//     if (!user_id) throw new Error('Missing user_id');
//     if (!tags?.length) {
//       console.warn('⚠️ [AI] recreate() empty tags → using defaults.');
//       tags = ['modern', 'neutral', 'tailored'];
//     }

//     // ✅ Weighted + trend-injected tags
//     tags = await this.enrichTags(tags);

//     // 🧠 Fetch gender_presentation if missing
//     if (!user_gender) {
//       try {
//         const result = await pool.query(
//           'SELECT gender_presentation FROM users WHERE id = $1 LIMIT 1',
//           [user_id],
//         );
//         user_gender = result.rows[0]?.gender_presentation || 'neutral';
//       } catch {
//         user_gender = 'neutral';
//       }
//     }

//     // 🧩 Normalize gender
//     const normalizedGender =
//       user_gender?.toLowerCase().includes('female') ||
//       user_gender?.toLowerCase().includes('woman')
//         ? 'female'
//         : user_gender?.toLowerCase().includes('male') ||
//             user_gender?.toLowerCase().includes('man')
//           ? 'male'
//           : process.env.DEFAULT_GENDER || 'neutral';

//     // 🧠 Build stylist prompt
//     const prompt = `
// You are a world-class AI stylist for ${normalizedGender} fashion.
// Create a cohesive outfit inspired by an uploaded look.

// Client: ${user_id}
// Image: ${image_url || 'N/A'}
// Detected tags: ${tags.join(', ')}

// Rules:
// - Match fabric, color palette, and silhouette.
// - Use ${normalizedGender}-appropriate pieces.
// - Output only JSON:
// {
//   "outfit": [
//     { "category": "Top", "item": "Grey Cotton Tee", "color": "gray" },
//     { "category": "Bottom", "item": "Navy Chinos", "color": "navy" },
//     { "category": "Outerwear", "item": "Beige Overshirt", "color": "beige" },
//     { "category": "Shoes", "item": "White Sneakers", "color": "white" }
//   ],
//   "style_note": "Describe how the look connects to the uploaded image."
// }
// `;

//     // 🧠 Generate outfit via Vertex or OpenAI
//     let parsed: any;
//     if (this.useVertex && this.vertexService) {
//       try {
//         const result = await this.vertexService.generateReasonedOutfit(prompt);
//         let text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
//         text = text
//           .replace(/^```json\s*/i, '')
//           .replace(/```$/, '')
//           .trim();
//         parsed = JSON.parse(text);
//         console.log('🧠 [Vertex] recreate() success');
//       } catch (err: any) {
//         console.warn('[Vertex] recreate() failed → fallback', err.message);
//       }
//     }

//     if (!parsed) {
//       const completion = await this.openai.chat.completions.create({
//         model: 'gpt-4o-mini',
//         temperature: 0.7,
//         messages: [{ role: 'user', content: prompt }],
//         response_format: { type: 'json_object' },
//       });

//       const raw = completion.choices[0]?.message?.content || '{}';
//       try {
//         parsed = JSON.parse(raw);
//       } catch {
//         parsed = {};
//       }
//     }

//     const outfit = Array.isArray(parsed?.outfit) ? parsed.outfit : [];
//     const style_note =
//       parsed?.style_note || 'Modern outfit inspired by the uploaded look.';

//     // 🛍️ Enrich each item with live products
//     const enriched = await Promise.all(
//       outfit.map(async (o: any) => {
//         const query =
//           `${normalizedGender} ${o.item || o.category || ''} ${o.color || ''}`.trim();
//         let products = await this.productSearch.search(query);
//         let top = products[0];

//         if (!top?.image || top.image.includes('No_image')) {
//           const serp = await this.productSearch.searchSerpApi(query);
//           if (serp?.[0]) top = { ...serp[0], source: 'SerpAPI' };
//         }

//         const materialHint =
//           query.match(/(wool|cotton|linen|leather|denim|polyester)/i)?.[0] ||
//           null;
//         const seasonalityHint =
//           query.match(/(summer|winter|fall|spring)/i)?.[0] ||
//           getCurrentSeason();
//         const fitHint =
//           query.match(/(slim|regular|relaxed|oversized|tailored)/i)?.[0] ||
//           'regular';

//         return {
//           category: o.category,
//           item: o.item,
//           color: o.color,
//           brand: top?.brand || 'Unknown',
//           price: top?.price || '—',
//           image:
//             top?.image && top.image.startsWith('http')
//               ? top.image
//               : 'https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg',
//           shopUrl:
//             top?.shopUrl ||
//             `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=shop`,
//           source: top?.source || 'ASOS / Fallback',
//           material: materialHint,
//           seasonality: seasonalityHint,
//           fit: fitHint,
//         };
//       }),
//     );

//     return { user_id, outfit: enriched, style_note };
//   }

//   // 👔 PERSONALIZED SHOP — image + wardrobe + preferences
//   async personalizedShop(
//     user_id: string,
//     image_url: string,
//     user_gender?: string,
//   ) {
//     if (!user_id || !image_url) throw new Error('Missing user_id or image_url');

//     // 1) Analyze uploaded image
//     const analysis = await this.analyze(image_url);
//     const tags = analysis?.tags || [];

//     const { rows: wardrobe } = await pool.query(
//       `SELECT name, main_category AS category, subcategory, color, material
//    FROM wardrobe_items
//    WHERE user_id::text = $1
//    ORDER BY updated_at DESC
//    LIMIT 50`,
//       [user_id],
//     );

//     const prefRes = await pool.query(
//       `SELECT gender_presentation
//      FROM users
//      WHERE id = $1
//      LIMIT 1`,
//       [user_id],
//     );
//     const profile = prefRes.rows[0] || {};
//     const gender = user_gender || profile.gender_presentation || 'neutral';
//     // 2️⃣ Fetch user style profile (full data used for personalization)
//     const styleProfileRes = await pool.query(
//       `
//   SELECT
//     body_type,
//     skin_tone,
//     undertone,
//     climate,
//     favorite_colors,
//     disliked_styles,
//     style_keywords,
//     preferred_brands,
//     goals,
//     proportions,
//     hair_color,
//     eye_color,
//     height,
//     waist,
//     fit_preferences,
//     style_preferences
//   FROM style_profiles
//   WHERE user_id::text = $1
//   LIMIT 1
// `,
//       [user_id],
//     );

//     const styleProfile = styleProfileRes.rows[0] || {};

//     // 🔹 Build user filter preferences
//     const { preferFit, bannedWords } = buildUserFilter(styleProfile);

//     /* ------------------------------------------------------------
//    🎛️ VISUAL + STYLE FILTERING HELPERS
// -------------------------------------------------------------*/
//     const FIT_KEYWORDS = {
//       skinny: [/skinny/i, /super[- ]skinny/i, /spray[- ]on/i],
//       slim: [/slim/i],
//       tailored: [/tailored/i, /tapered/i],
//       relaxed: [/relaxed/i, /loose/i, /baggy/i, /wide[- ]leg/i],
//       oversized: [/oversized/i, /boxy/i],
//     };

//     function buildUserFilter(profile: any) {
//       const fitPrefs = (profile.fit_preferences || []).map((x: string) =>
//         x.toLowerCase(),
//       );
//       const disliked = (profile.disliked_styles || '')
//         .toLowerCase()
//         .split(/[,\s]+/)
//         .filter(Boolean);
//       const favColors = (profile.favorite_colors || []).map((x: string) =>
//         x.toLowerCase(),
//       );

//       const preferFit =
//         fitPrefs.find((f) => /(relaxed|loose|baggy|oversized|boxy)/.test(f)) ||
//         fitPrefs.find((f) => /(regular|tailored)/.test(f)) ||
//         fitPrefs[0] ||
//         null;

//       const banFits: string[] = [];
//       if (preferFit?.match(/relaxed|loose|baggy|oversized|boxy/))
//         banFits.push('skinny', 'slim');
//       else if (preferFit?.match(/skinny|slim/))
//         banFits.push('relaxed', 'baggy', 'oversized');

//       const bannedWords = [
//         ...disliked,
//         ...banFits,
//         ...(!favColors.includes('green') ? ['green'] : []),
//       ]
//         .filter(Boolean)
//         .map((x) => new RegExp(x, 'i'));

//       return { preferFit, bannedWords };
//     }

//     function enforceProfileFilters(
//       products: any[] = [],
//       preferFit?: string | null,
//       bannedWords: RegExp[] = [],
//     ) {
//       if (!products.length) return products;

//       return products
//         .filter((p) => {
//           const hay = `${p.title || ''} ${p.name || ''} ${p.description || ''}`;
//           return !bannedWords.some((rx) => rx.test(hay));
//         })
//         .sort((a, b) => {
//           if (!preferFit) return 0;
//           const aHit = FIT_KEYWORDS[preferFit]?.some((rx) =>
//             rx.test(`${a.title} ${a.name}`),
//           )
//             ? 1
//             : 0;
//           const bHit = FIT_KEYWORDS[preferFit]?.some((rx) =>
//             rx.test(`${b.title} ${b.name}`),
//           )
//             ? 1
//             : 0;
//           return bHit - aHit; // boost preferred fits
//         });
//     }

//     // 3) Ask model to split into "owned" vs "missing"

//     const climateNote = styleProfile.climate
//       ? `The user's climate is ${styleProfile.climate}.
//     If it is cold (like Polar or Cold), emphasize insulated materials, coats, layers, scarves, gloves, and boots.
//     If it is hot (like Tropical or Desert), emphasize breathable, lightweight fabrics and open footwear.`
//       : '';

//     // 🔒 Enforced personalization hierarchy
//     const rules = `
// # PERSONALIZATION ENFORCEMENT
// Follow these user preferences as *absolute constraints*, not suggestions.

// 1️⃣ Climate Adaptation
// - If climate = "Polar" or "Cold": use insulated, layered, waterproof items (coats, boots, knits).
// - If climate = "Tropical" or "Hot": use breathable fabrics (linen, cotton, short sleeves, open footwear).
// - If climate = "Temperate": use balanced layering and transitional fabrics.

// 2️⃣ Fit & Silhouette
// - ALWAYS apply the user's fit_preferences globally (e.g., Relaxed, Boxy, Oversized).
// - NEVER include opposite fits (e.g., Slim or Skinny if user prefers Relaxed/Boxy).

// 3️⃣ Style Alignment
// - Respect style_keywords and style_preferences (e.g., Minimal, Modern, Streetwear).
// - Use them to define vibe, color palette, and accessories.

// 4️⃣ Brand & Taste
// - Prefer preferred_brands or equivalent aesthetics.
// - NEVER include disliked_styles or aesthetics that contradict their style_preferences.

// - Always bias toward preferred_brands or equivalent luxury-tier labels.
// - If user prefers luxury, use similar tier alternatives when unavailable.
// - Reflect brand-level aesthetic in tone and item naming (e.g., “tailored wool coat” vs “puffer jacket”).

// 5️⃣ Wardrobe Reuse
// - ALWAYS reuse wardrobe items that visually match the inspiration.
// - Only suggest new purchases when a required category is missing.

// 6️⃣ Explanation
// - In style_note, clearly explain how the outfit respects the user’s climate, fit, and preferences.
// `;

//     const prompt = `
// You are a world-class personal stylist generating a personalized recreation of an uploaded look.

// ${rules}

// Return ONLY valid JSON in this structure:
// {
//   "recreated_outfit": [
//     { "source":"wardrobe"|"purchase", "category":"Top", "item":"...", "color":"...", "fit":"..." }
//   ],
//   "suggested_purchases": [
//     { "category":"...", "item":"...", "color":"...", "material":"...", "brand":"...", "shopUrl":"..." }
//   ],
//   "style_note": "Explain how this respects the user's climate, fit, and taste."
// }

// User gender: ${gender}
// Detected tags: ${tags.join(', ')}
// User style profile: ${JSON.stringify(styleProfile, null, 2)}
// ${climateNote}
// Wardrobe subset: ${JSON.stringify(wardrobe.slice(0, 10), null, 2)}
// `;

//     console.log('🧥 [personalizedShop] wardrobe count:', wardrobe?.length);
//     console.log('🧥 [personalizedShop] wardrobe sample:', wardrobe?.[0]);

//     console.log('🧥 [personalizedShop] profile:', profile);
//     console.log('🧥 [personalizedShop] gender:', gender);
//     console.log('🧥 [personalizedShop] styleProfile:', styleProfile);
//     console.log('🧠 [personalizedShop] Prompt preview:', prompt.slice(0, 800));

//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o-mini',
//       temperature: 0.7,
//       messages: [{ role: 'user', content: prompt }],
//       response_format: { type: 'json_object' },
//     });

//     let parsed: any = {};
//     try {
//       parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
//       // 🧩 FINAL POST-PROCESS FILTER — guarantees profile consistency
//       if (parsed?.recreated_outfit?.length) {
//         parsed.recreated_outfit = parsed.recreated_outfit.filter((o: any) => {
//           const text =
//             `${o.item} ${o.category} ${o.color} ${o.fit}`.toLowerCase();
//           // Block bad fits and disliked styles
//           const fitBan = preferFit?.match(/relaxed|oversized|boxy|loose/)
//             ? ['skinny', 'slim']
//             : preferFit?.match(/skinny|slim/)
//               ? ['relaxed', 'baggy', 'oversized']
//               : [];
//           const styleBan =
//             (styleProfile.disliked_styles || '')
//               .toLowerCase()
//               .split(/[,\s]+/)
//               .filter(Boolean) || [];
//           const banned = [...fitBan, ...styleBan];
//           return !banned.some((b) => text.includes(b));
//         });
//       }

//       console.log(
//         '💎 [personalizedShop] Parsed recreated outfit sample:',
//         parsed?.recreated_outfit?.slice(0, 2),
//       );
//       console.log(
//         '💎 [personalizedShop] Parsed suggested purchases sample:',
//         parsed?.suggested_purchases?.slice(0, 2),
//       );
//       // 🎨 Enforce "only <color>" rule from disliked_styles (e.g. "I dislike all colors except pink")
//       if (styleProfile?.disliked_styles) {
//         const match = styleProfile.disliked_styles.match(/except\s+(\w+)/i);
//         if (match) {
//           const onlyColor = match[1].toLowerCase();
//           const filterColor = (arr: any[]) =>
//             arr.filter((x) =>
//               (x.color || '').toLowerCase().includes(onlyColor),
//             );

//           if (Array.isArray(parsed?.recreated_outfit)) {
//             parsed.recreated_outfit = filterColor(parsed.recreated_outfit);
//           }
//           if (Array.isArray(parsed?.suggested_purchases)) {
//             parsed.suggested_purchases = filterColor(
//               parsed.suggested_purchases,
//             );
//           }

//           console.log(
//             `[personalizedShop] 🎨 Enforcing color-only rule: ${onlyColor} (kept ${
//               parsed?.recreated_outfit?.length || 0
//             } outfit items)`,
//           );
//         }
//       }
//     } catch {
//       parsed = {};
//     }

//     const purchases = Array.isArray(parsed?.suggested_purchases)
//       ? parsed.suggested_purchases
//       : [];

//     if (parsed?.recreated_outfit?.some((i: any) => i.source === 'wardrobe')) {
//       console.log('🧥 [personalizedShop] ✅ Model reused wardrobe pieces.');
//     } else {
//       console.warn(
//         '🧥 [personalizedShop] ⚠️ Model did NOT reuse wardrobe — fallback to generic recreation.',
//       );
//     }

//     // 🚫 Enforce profile bans in returned outfit
//     const banned = [
//       ...(styleProfile.disliked_styles?.toLowerCase().split(/[,\s]+/) || []),
//       ...(preferFit?.match(/relaxed|oversized|boxy|loose/)
//         ? ['skinny', 'slim']
//         : []),
//       ...(preferFit?.match(/skinny|slim/)
//         ? ['relaxed', 'oversized', 'baggy']
//         : []),
//     ].filter(Boolean);

//     if (parsed?.recreated_outfit?.length) {
//       parsed.recreated_outfit = parsed.recreated_outfit.filter((o: any) => {
//         const text =
//           `${o.item} ${o.category} ${o.color} ${o.fit}`.toLowerCase();
//         return !banned.some((b) => text.includes(b));
//       });
//     }

//     // 4) Attach live shop links to the "missing" items
//     let enrichedPurchases = await Promise.all(
//       purchases.map(async (p: any) => {
//         const q = [
//           gender,
//           p.item || p.category || '',
//           p.color || '',
//           p.material || '',
//         ]
//           .filter(Boolean)
//           .join(' ')
//           .trim();

//         const products = await this.productSearch.search(q);
//         return { ...p, query: q, products };
//       }),
//     );

//     // 🧩 5) Fallback enrichment if AI returned nothing or products failed
//     if (!enrichedPurchases.length) {
//       console.warn(
//         '⚠️ [personalizedShop] Empty suggested_purchases → fallback.',
//       );

//       // derive safe fallback query from tags
//       const tagSeed = tags.slice(0, 6).join(' ');
//       const season = getCurrentSeason();
//       const genderPrefix =
//         gender?.toLowerCase().includes('female') ||
//         gender?.toLowerCase().includes('woman')
//           ? 'women'
//           : 'men';

//       const fallbackQuery = `${genderPrefix} ${tagSeed} ${season} fashion`;
//       console.log('🧩 [personalizedShop] fallbackQuery →', fallbackQuery);

//       const products = await this.productSearch.search(fallbackQuery);

//       enrichedPurchases = [
//         {
//           category: 'General',
//           item: 'Curated Outfit Add-Ons',
//           color: 'Mixed',
//           material: null,
//           products: products.slice(0, 8),
//           query: fallbackQuery,
//           source: 'fallback',
//         },
//       ];
//     }

//     // 🎨 Enforce color-only rule on fallback products too
//     if (styleProfile?.disliked_styles) {
//       const match = styleProfile.disliked_styles.match(/except\s+(\w+)/i);
//       if (match) {
//         const onlyColor = match[1].toLowerCase();
//         enrichedPurchases = enrichedPurchases.map((p) => ({
//           ...p,
//           products: (p.products || []).filter((prod) =>
//             (prod.color || '').toLowerCase().includes(onlyColor),
//           ),
//         }));
//         console.log(
//           `[personalizedShop] 🎨 Enforced fallback color-only rule: ${onlyColor}`,
//         );
//       }
//     }

//     // 🧹 Enforce visual and logical consistency before returning
//     const cleanPurchases = enrichedPurchases.map((p) => ({
//       ...p,
//       products: enforceProfileFilters(p.products || [], preferFit, bannedWords),
//     }));

//     // 🧊 Climate sanity check — if Polar but outfit lacks insulation, patch style_note
//     if (
//       styleProfile.climate?.toLowerCase().includes('polar') &&
//       !/coat|jacket|parka|boot|knit|sweater/i.test(
//         JSON.stringify(parsed.recreated_outfit || []),
//       )
//     ) {
//       parsed.style_note +=
//         ' Reinforced with insulated outerwear and cold-weather layering for Polar climates.';
//     }

//     return {
//       user_id,
//       image_url,
//       tags,
//       recreated_outfit: parsed?.recreated_outfit || [],
//       suggested_purchases: cleanPurchases,
//       style_note:
//         parsed?.style_note ||
//         'Personalized recreation based on your wardrobe, with curated seasonal add-ons.',
//       applied_filters: {
//         preferFit,
//         bannedWords: bannedWords.map((r) => r.source),
//       },
//     };
//   }

//   ////////END CREATE LOOK

//   //////. START REPLACED CHAT WITH LINKS AND SEARCH NET

//   /** 🧠 Conversational fashion chat — now with visuals + links */
//   async chat(dto: ChatDto) {
//     const { messages } = dto;
//     const lastUserMsg = messages
//       .slice()
//       .reverse()
//       .find((m) => m.role === 'user')?.content;

//     if (!lastUserMsg) {
//       throw new Error('No user message provided');
//     }

//     // 1️⃣ Generate base text with OpenAI
//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         {
//           role: 'system',
//           content: `
// You are a world-class personal fashion stylist.
// Respond naturally and helpfully about outfits, wardrobe planning, or styling.
// At the end of your reasoning, also return a short JSON block like:
// {"search_terms":["smart casual men","navy blazer outfit","loafers"]}
//         `,
//         },
//         ...messages,
//       ],
//     });

//     const aiReply =
//       completion.choices[0]?.message?.content?.trim() ||
//       'Styled response unavailable.';

//     // 2️⃣ Extract search terms if model provided them
//     let searchTerms: string[] = [];
//     const match = aiReply.match(/\{.*"search_terms":.*\}/s);
//     if (match) {
//       try {
//         const parsed = JSON.parse(match[0]);
//         searchTerms = parsed.search_terms ?? [];
//       } catch {
//         searchTerms = [];
//       }
//     }

//     // 3️⃣ Fallback heuristic: derive terms if none found
//     if (!searchTerms.length) {
//       const lowered = lastUserMsg.toLowerCase();
//       if (lowered.includes('smart')) searchTerms.push('smart casual outfit');
//       if (lowered.includes('summer')) searchTerms.push('summer outfit');
//       if (lowered.includes('work')) searchTerms.push('business casual look');
//       if (!searchTerms.length)
//         searchTerms.push(`${lowered} outfit inspiration`);
//     }

//     // 4️⃣ Fetch Unsplash images
//     const images = await this.fetchUnsplash(searchTerms);

//     // 5️⃣ Build shoppable links
//     const links = searchTerms.map((term) => ({
//       label: `Shop ${term} on ASOS`,
//       url: `https://www.asos.com/search/?q=${encodeURIComponent(term)}`,
//     }));

//     return { reply: aiReply, images, links };
//   }

//   /** 🔍 Lightweight Unsplash fetch helper */
//   private async fetchUnsplash(terms: string[]) {
//     const key = process.env.UNSPLASH_ACCESS_KEY;
//     if (!key || !terms.length) return [];
//     const q = encodeURIComponent(terms[0]);
//     const res = await fetch(
//       `https://api.unsplash.com/search/photos?query=${q}&per_page=5&client_id=${key}`,
//     );
//     if (!res.ok) return [];
//     const json = await res.json();
//     return json.results.map((r) => ({
//       imageUrl: r.urls.small,
//       title: r.description || r.alt_description,
//       sourceLink: r.links.html,
//     }));
//   }

//   /** 🌤️ Suggest daily style plan */
//   async suggest(body: {
//     user?: string;
//     weather?: any;
//     wardrobe?: any[];
//     preferences?: Record<string, any>;
//   }) {
//     const { user, weather, wardrobe, preferences } = body;

//     const temp = weather?.fahrenheit?.main?.temp;
//     const tempDesc = temp
//       ? `${temp}°F and ${temp < 60 ? 'cool' : temp > 85 ? 'warm' : 'mild'} weather`
//       : 'unknown temperature';

//     const wardrobeCount = wardrobe?.length || 0;

//     const systemPrompt = `
// You are a luxury personal stylist.
// Your goal is to provide a daily style briefing that helps the user feel prepared, stylish, and confident.
// Be concise, intelligent, and polished — similar to a stylist at a high-end menswear brand.

// Output must be JSON with:
// - suggestion
// - insight
// - tomorrow
// Optionally include seasonalForecast, lifecycleForecast, styleTrajectory.
// `;

//     const userPrompt = `
// Client: ${user || 'The user'}
// Weather: ${tempDesc}
// Wardrobe items: ${wardrobeCount}
// Preferences: ${JSON.stringify(preferences || {})}
// `;

//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         { role: 'system', content: systemPrompt },
//         { role: 'user', content: userPrompt },
//       ],
//       response_format: { type: 'json_object' },
//     });

//     const raw = completion.choices[0]?.message?.content;
//     if (!raw) throw new Error('No suggestion response received from model.');

//     let parsed: {
//       suggestion: string;
//       insight: string;
//       tomorrow: string;
//       seasonalForecast?: string;
//       lifecycleForecast?: string;
//       styleTrajectory?: string;
//     };

//     try {
//       parsed = JSON.parse(raw);
//     } catch {
//       console.error('❌ Failed to parse AI JSON:', raw);
//       throw new Error('AI response was not valid JSON.');
//     }

//     if (!parsed.seasonalForecast) {
//       parsed.seasonalForecast = generateSeasonalForecast(wardrobe);
//     }

//     return parsed;
//   }
// }

// // END REPLACED CHAT WITH LINKS AND SEARCH NET

/////////////////

// import { Injectable } from '@nestjs/common';
// import OpenAI from 'openai';
// import { ChatDto } from './dto/chat.dto';
// import { VertexService } from '../vertex/vertex.service'; // 🔹 ADDED
// import { ProductSearchService } from '../product-services/product-search.service';
// import { Pool } from 'pg';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// import * as fs from 'fs';
// import * as path from 'path';
// import * as dotenv from 'dotenv';

// function loadOpenAISecrets(): {
//   apiKey?: string;
//   project?: string;
//   source: string;
// } {
//   const candidates = [
//     path.join(process.cwd(), '.env'),
//     path.join(process.cwd(), 'apps', 'backend-nest', '.env'),
//     path.join(__dirname, '..', '..', '.env'),
//   ];

//   for (const p of candidates) {
//     try {
//       if (fs.existsSync(p)) {
//         const parsed = dotenv.parse(fs.readFileSync(p));
//         const apiKey = parsed['OPENAI_API_KEY'];
//         const project = parsed['OPENAI_PROJECT_ID'];
//         if (apiKey) return { apiKey, project, source: p };
//       }
//     } catch {
//       // ignore
//     }
//   }

//   return {
//     apiKey: process.env.OPENAI_API_KEY,
//     project: process.env.OPENAI_PROJECT_ID,
//     source: 'process.env',
//   };
// }

// // 🧥 Basic capsule wardrobe templates
// const CAPSULES = {
//   Spring: [
//     { category: 'Outerwear', subcategory: 'Light Jacket', recommended: 2 },
//     { category: 'Tops', subcategory: 'Oxford Shirt', recommended: 3 },
//     { category: 'Bottoms', subcategory: 'Chinos', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Loafers', recommended: 1 },
//     { category: 'Shoes', subcategory: 'Sneakers', recommended: 1 },
//   ],
//   Summer: [
//     { category: 'Tops', subcategory: 'Short Sleeve Shirt', recommended: 4 },
//     { category: 'Tops', subcategory: 'Polo Shirt', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Linen Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Loafers', recommended: 1 },
//     { category: 'Shoes', subcategory: 'Sandals', recommended: 1 },
//   ],
//   Fall: [
//     { category: 'Outerwear', subcategory: 'Field Jacket', recommended: 1 },
//     { category: 'Outerwear', subcategory: 'Blazer', recommended: 1 },
//     { category: 'Tops', subcategory: 'Knit Sweater', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Wool Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Chelsea Boots', recommended: 1 },
//   ],
//   Winter: [
//     { category: 'Outerwear', subcategory: 'Overcoat', recommended: 1 },
//     { category: 'Outerwear', subcategory: 'Heavy Parka', recommended: 1 },
//     { category: 'Tops', subcategory: 'Heavy Knit Sweater', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Wool Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Boots', recommended: 2 },
//   ],
// };

// // 🗓️ Auto-detect season based on month
// function getCurrentSeason(): 'Spring' | 'Summer' | 'Fall' | 'Winter' {
//   const month = new Date().getMonth() + 1;
//   if ([3, 4, 5].includes(month)) return 'Spring';
//   if ([6, 7, 8].includes(month)) return 'Summer';
//   if ([9, 10, 11].includes(month)) return 'Fall';
//   return 'Winter';
// }

// // 🧠 Compare wardrobe to capsule and return simple forecast text
// function generateSeasonalForecast(wardrobe: any[] = []): string | undefined {
//   const season = getCurrentSeason();
//   const capsule = CAPSULES[season];
//   if (!capsule) return;

//   const missing: string[] = [];

//   capsule.forEach((item) => {
//     const owned = wardrobe.filter(
//       (w) =>
//         w.category?.toLowerCase() === item.category.toLowerCase() &&
//         w.subcategory?.toLowerCase() === item.subcategory.toLowerCase(),
//     ).length;

//     if (owned < item.recommended) {
//       const needed = item.recommended - owned;
//       missing.push(`${needed} × ${item.subcategory}`);
//     }
//   });

//   if (missing.length === 0) {
//     return `✅ Your ${season} capsule is complete — you're ready for the season.`;
//   }

//   return `🍂 ${season} is approaching — you're missing: ${missing.join(', ')}.`;
// }

// @Injectable()
// export class AiService {
//   private openai: OpenAI;
//   private useVertex: boolean;
//   private vertexService?: VertexService; // 🔹 optional instance
//   private productSearch: ProductSearchService; // ✅ add this

//   constructor(vertexService?: VertexService) {
//     const { apiKey, project, source } = loadOpenAISecrets();

//     const snippet = apiKey?.slice(0, 20) ?? '';
//     const len = apiKey?.length ?? 0;
//     console.log('🔑 OPENAI key source:', source);
//     console.log('🔑 OPENAI key snippet:', JSON.stringify(snippet));
//     console.log('🔑 OPENAI key length:', len);
//     console.log('📂 CWD:', process.cwd());

//     if (!apiKey) {
//       throw new Error('OPENAI_API_KEY not found in .env or environment.');
//     }
//     if (/^sk-?x{3,}/i.test(apiKey)) {
//       throw new Error(
//         'OPENAI_API_KEY appears masked (e.g., "sk-xxxxx..."). Read from the correct .env instead.',
//       );
//     }
//     if (!apiKey.startsWith('sk-')) {
//       throw new Error('OPENAI_API_KEY is malformed — must start with "sk-".');
//     }

//     this.openai = new OpenAI({ apiKey, project });

//     // 🔹 New: Vertex toggle
//     this.useVertex = process.env.USE_VERTEX === 'true';
//     if (this.useVertex) {
//       this.vertexService = vertexService;
//       console.log('🧠 Vertex/Gemini mode enabled for analyze/recreate');
//     }

//     this.productSearch = new ProductSearchService(); // NEW
//   }

//   //////ANALYZE LOOK

//   async analyze(imageUrl: string) {
//     console.log('🧠 [AI] analyze() called with', imageUrl);
//     if (!imageUrl) throw new Error('Missing imageUrl');

//     // 🔹 Try Vertex first if enabled
//     if (this.useVertex && this.vertexService) {
//       try {
//         const gcsUri = imageUrl.replace(
//           'https://storage.googleapis.com/',
//           'gs://',
//         );
//         const metadata = await this.vertexService.analyzeImage(gcsUri);
//         const tags = [
//           ...(metadata.tags || []),
//           ...(metadata.style_descriptors || []),
//           metadata.main_category,
//           metadata.subcategory,
//         ].filter(Boolean);
//         console.log('🧠 [Vertex] analyze() success:', tags);
//         return { tags };
//       } catch (err: any) {
//         console.warn(
//           '[Vertex] analyze() failed → fallback to OpenAI:',
//           err.message,
//         );
//       }
//     }

//     // 🔸 OpenAI fallback
//     try {
//       const completion = await this.openai.chat.completions.create({
//         model: 'gpt-4o-mini',
//         messages: [
//           {
//             role: 'system',
//             content:
//               'You are a professional fashion classifier. Return only JSON with a "tags" array describing the outfit’s style, color palette, and vibe.',
//           },
//           {
//             role: 'user',
//             content: [
//               { type: 'text', text: 'Describe this outfit as tags only:' },
//               { type: 'image_url', image_url: { url: imageUrl } },
//             ],
//           },
//         ],
//         response_format: { type: 'json_object' },
//       });

//       const raw = completion.choices[0]?.message?.content;
//       console.log('🧠 [AI] analyze() raw response:', raw);

//       if (!raw) throw new Error('Empty response from OpenAI');
//       const parsed = JSON.parse(raw || '{}');
//       return { tags: parsed.tags || [] };
//     } catch (err: any) {
//       console.error('❌ [AI] analyze() failed:', err.message);
//       return { tags: ['casual', 'modern', 'neutral'] };
//     }
//   }

//   /* ------------------------------------------------------------
//      🧩 Weighted Tag Enrichment + Trend Injection
//   -------------------------------------------------------------*/
//   private async enrichTags(tags: string[]): Promise<string[]> {
//     const weightMap: Record<string, number> = {
//       tailored: 3,
//       minimal: 3,
//       neutral: 3,
//       modern: 2,
//       vintage: 2,
//       classic: 2,
//       streetwear: 2,
//       oversized: 2,
//       slim: 2,
//       relaxed: 2,
//       casual: 1,
//       sporty: 1,
//     };

//     // 🧹 Normalize + de-dupe
//     const cleanTags = Array.from(
//       new Set(
//         tags
//           .map((t) => t.toLowerCase().trim())
//           .filter((t) => t && !['outfit', 'style', 'fashion'].includes(t)),
//       ),
//     );

//     // 🧠 Apply weights
//     const weighted = cleanTags
//       .map((t) => ({ tag: t, weight: weightMap[t] || 1 }))
//       .sort((a, b) => b.weight - a.weight);

//     // 🌍 Inject current trend tags
//     const trendTags = await this.fetchTrendTags();
//     const final = Array.from(
//       new Set([...weighted.map((w) => w.tag), ...trendTags.slice(0, 3)]),
//     );

//     console.log('🎯 [AI] Enriched tags →', final);
//     return final;
//   }

//   private async fetchTrendTags(): Promise<string[]> {
//     try {
//       const res = await fetch(
//         'https://trends.google.com/trends/hottrends/visualize/internal/data/en_us',
//       );
//       if (!res.ok) throw new Error(`HTTP ${res.status}`);
//       const json = await res.json().catch(() => []);
//       const trendWords = JSON.stringify(json).toLowerCase();
//       const matched = trendWords.match(
//         /(quiet luxury|monochrome|minimalism|maximalism|italian|tailoring|loafers|neutrals|linen|structured|preppy|flannel|earth tones|autumn layering)/gi,
//       );
//       if (matched?.length) return Array.from(new Set(matched));

//       // 🧭 If Google Trends returned empty, use local backup
//       return [
//         'quiet luxury',
//         'neutral tones',
//         'tailored fit',
//         'autumn layering',
//       ];
//     } catch (err: any) {
//       console.warn('⚠️ Trend fetch fallback triggered:', err.message);
//       return [
//         'quiet luxury',
//         'neutral tones',
//         'tailored fit',
//         'autumn layering',
//       ];
//     }
//   }

//   async recreate(
//     user_id: string,
//     tags: string[],
//     image_url?: string,
//     user_gender?: string,
//   ) {
//     console.log(
//       '🧥 [AI] recreate() called for user',
//       user_id,
//       'with tags:',
//       tags,
//       'and gender:',
//       user_gender,
//     );

//     if (!user_id) throw new Error('Missing user_id');
//     if (!tags?.length) {
//       console.warn('⚠️ [AI] recreate() empty tags → using defaults.');
//       tags = ['modern', 'neutral', 'tailored'];
//     }

//     // ✅ Weighted + trend-injected tags
//     tags = await this.enrichTags(tags);

//     // 🧠 Fetch gender_presentation if missing
//     if (!user_gender) {
//       try {
//         const result = await pool.query(
//           'SELECT gender_presentation FROM users WHERE id = $1 LIMIT 1',
//           [user_id],
//         );
//         user_gender = result.rows[0]?.gender_presentation || 'neutral';
//       } catch {
//         user_gender = 'neutral';
//       }
//     }

//     // 🧩 Normalize gender
//     const normalizedGender =
//       user_gender?.toLowerCase().includes('female') ||
//       user_gender?.toLowerCase().includes('woman')
//         ? 'female'
//         : user_gender?.toLowerCase().includes('male') ||
//             user_gender?.toLowerCase().includes('man')
//           ? 'male'
//           : process.env.DEFAULT_GENDER || 'neutral';

//     // 🧠 Build stylist prompt
//     const prompt = `
// You are a world-class AI stylist for ${normalizedGender} fashion.
// Create a cohesive outfit inspired by an uploaded look.

// Client: ${user_id}
// Image: ${image_url || 'N/A'}
// Detected tags: ${tags.join(', ')}

// Rules:
// - Match fabric, color palette, and silhouette.
// - Use ${normalizedGender}-appropriate pieces.
// - Output only JSON:
// {
//   "outfit": [
//     { "category": "Top", "item": "Grey Cotton Tee", "color": "gray" },
//     { "category": "Bottom", "item": "Navy Chinos", "color": "navy" },
//     { "category": "Outerwear", "item": "Beige Overshirt", "color": "beige" },
//     { "category": "Shoes", "item": "White Sneakers", "color": "white" }
//   ],
//   "style_note": "Describe how the look connects to the uploaded image."
// }
// `;

//     // 🧠 Generate outfit via Vertex or OpenAI
//     let parsed: any;
//     if (this.useVertex && this.vertexService) {
//       try {
//         const result = await this.vertexService.generateReasonedOutfit(prompt);
//         let text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
//         text = text
//           .replace(/^```json\s*/i, '')
//           .replace(/```$/, '')
//           .trim();
//         parsed = JSON.parse(text);
//         console.log('🧠 [Vertex] recreate() success');
//       } catch (err: any) {
//         console.warn('[Vertex] recreate() failed → fallback', err.message);
//       }
//     }

//     if (!parsed) {
//       const completion = await this.openai.chat.completions.create({
//         model: 'gpt-4o-mini',
//         temperature: 0.7,
//         messages: [{ role: 'user', content: prompt }],
//         response_format: { type: 'json_object' },
//       });

//       const raw = completion.choices[0]?.message?.content || '{}';
//       try {
//         parsed = JSON.parse(raw);
//       } catch {
//         parsed = {};
//       }
//     }

//     const outfit = Array.isArray(parsed?.outfit) ? parsed.outfit : [];
//     const style_note =
//       parsed?.style_note || 'Modern outfit inspired by the uploaded look.';

//     // 🛍️ Enrich each item with live products
//     const enriched = await Promise.all(
//       outfit.map(async (o: any) => {
//         const query =
//           `${normalizedGender} ${o.item || o.category || ''} ${o.color || ''}`.trim();
//         let products = await this.productSearch.search(query);
//         let top = products[0];

//         if (!top?.image || top.image.includes('No_image')) {
//           const serp = await this.productSearch.searchSerpApi(query);
//           if (serp?.[0]) top = { ...serp[0], source: 'SerpAPI' };
//         }

//         const materialHint =
//           query.match(/(wool|cotton|linen|leather|denim|polyester)/i)?.[0] ||
//           null;
//         const seasonalityHint =
//           query.match(/(summer|winter|fall|spring)/i)?.[0] ||
//           getCurrentSeason();
//         const fitHint =
//           query.match(/(slim|regular|relaxed|oversized|tailored)/i)?.[0] ||
//           'regular';

//         return {
//           category: o.category,
//           item: o.item,
//           color: o.color,
//           brand: top?.brand || 'Unknown',
//           price: top?.price || '—',
//           image:
//             top?.image && top.image.startsWith('http')
//               ? top.image
//               : 'https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg',
//           shopUrl:
//             top?.shopUrl ||
//             `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=shop`,
//           source: top?.source || 'ASOS / Fallback',
//           material: materialHint,
//           seasonality: seasonalityHint,
//           fit: fitHint,
//         };
//       }),
//     );

//     return { user_id, outfit: enriched, style_note };
//   }

//   // 👔 PERSONALIZED SHOP — image + wardrobe + preferences
//   async personalizedShop(
//     user_id: string,
//     image_url: string,
//     user_gender?: string,
//   ) {
//     if (!user_id || !image_url) throw new Error('Missing user_id or image_url');

//     // 1) Analyze uploaded image
//     const analysis = await this.analyze(image_url);
//     const tags = analysis?.tags || [];

//     const { rows: wardrobe } = await pool.query(
//       `SELECT name, main_category AS category, subcategory, color, material
//    FROM wardrobe_items
//    WHERE user_id::text = $1
//    ORDER BY updated_at DESC
//    LIMIT 50`,
//       [user_id],
//     );

//     const prefRes = await pool.query(
//       `SELECT gender_presentation
//      FROM users
//      WHERE id = $1
//      LIMIT 1`,
//       [user_id],
//     );
//     const profile = prefRes.rows[0] || {};
//     const gender = user_gender || profile.gender_presentation || 'neutral';
//     // 2️⃣ Fetch user style profile (full data used for personalization)
//     const styleProfileRes = await pool.query(
//       `
//   SELECT
//     body_type,
//     skin_tone,
//     undertone,
//     climate,
//     favorite_colors,
//     disliked_styles,
//     style_keywords,
//     preferred_brands,
//     goals,
//     proportions,
//     hair_color,
//     eye_color,
//     height,
//     waist,
//     fit_preferences,
//     style_preferences
//   FROM style_profiles
//   WHERE user_id::text = $1
//   LIMIT 1
// `,
//       [user_id],
//     );

//     const styleProfile = styleProfileRes.rows[0] || {};

//     // 🔹 Build user filter preferences
//     const { preferFit, bannedWords } = buildUserFilter(styleProfile);

//     /* ------------------------------------------------------------
//    🎛️ VISUAL + STYLE FILTERING HELPERS
// -------------------------------------------------------------*/
//     const FIT_KEYWORDS = {
//       skinny: [/skinny/i, /super[- ]skinny/i, /spray[- ]on/i],
//       slim: [/slim/i],
//       tailored: [/tailored/i, /tapered/i],
//       relaxed: [/relaxed/i, /loose/i, /baggy/i, /wide[- ]leg/i],
//       oversized: [/oversized/i, /boxy/i],
//     };

//     function buildUserFilter(profile: any) {
//       const fitPrefs = (profile.fit_preferences || []).map((x: string) =>
//         x.toLowerCase(),
//       );
//       const disliked = (profile.disliked_styles || '')
//         .toLowerCase()
//         .split(/[,\s]+/)
//         .filter(Boolean);
//       const favColors = (profile.favorite_colors || []).map((x: string) =>
//         x.toLowerCase(),
//       );

//       const preferFit =
//         fitPrefs.find((f) => /(relaxed|loose|baggy|oversized|boxy)/.test(f)) ||
//         fitPrefs.find((f) => /(regular|tailored)/.test(f)) ||
//         fitPrefs[0] ||
//         null;

//       const banFits: string[] = [];
//       if (preferFit?.match(/relaxed|loose|baggy|oversized|boxy/))
//         banFits.push('skinny', 'slim');
//       else if (preferFit?.match(/skinny|slim/))
//         banFits.push('relaxed', 'baggy', 'oversized');

//       const bannedWords = [
//         ...disliked,
//         ...banFits,
//         ...(!favColors.includes('green') ? ['green'] : []),
//       ]
//         .filter(Boolean)
//         .map((x) => new RegExp(x, 'i'));

//       return { preferFit, bannedWords };
//     }

//     function enforceProfileFilters(
//       products: any[] = [],
//       preferFit?: string | null,
//       bannedWords: RegExp[] = [],
//     ) {
//       if (!products.length) return products;

//       return products
//         .filter((p) => {
//           const hay = `${p.title || ''} ${p.name || ''} ${p.description || ''}`;
//           return !bannedWords.some((rx) => rx.test(hay));
//         })
//         .sort((a, b) => {
//           if (!preferFit) return 0;
//           const aHit = FIT_KEYWORDS[preferFit]?.some((rx) =>
//             rx.test(`${a.title} ${a.name}`),
//           )
//             ? 1
//             : 0;
//           const bHit = FIT_KEYWORDS[preferFit]?.some((rx) =>
//             rx.test(`${b.title} ${b.name}`),
//           )
//             ? 1
//             : 0;
//           return bHit - aHit; // boost preferred fits
//         });
//     }

//     // 3) Ask model to split into "owned" vs "missing"

//     const climateNote = styleProfile.climate
//       ? `The user's climate is ${styleProfile.climate}.
//     If it is cold (like Polar or Cold), emphasize insulated materials, coats, layers, scarves, gloves, and boots.
//     If it is hot (like Tropical or Desert), emphasize breathable, lightweight fabrics and open footwear.`
//       : '';

//     const prompt = `
// You are a personal stylist. Recreate the uploaded look using the user's wardrobe and taste.
// Return ONLY JSON with:
// {
//   "recreated_outfit": [ { "source":"wardrobe", "category":"Top", "item":"...", "color":"..." }, ... ],
//   "suggested_purchases": [ { "category":"...", "item":"...", "color":"...", "material":"..." }, ... ],
//   "style_note": "..."
// }

// User gender: ${gender}
// Detected tags: ${tags.join(', ')}
// User style profile: ${JSON.stringify(styleProfile)}
// ${climateNote}
// User wardrobe (subset): ${JSON.stringify(wardrobe)}

// `;

//     console.log('🧥 [personalizedShop] wardrobe count:', wardrobe?.length);
//     console.log('🧥 [personalizedShop] wardrobe sample:', wardrobe?.[0]);

//     console.log('🧥 [personalizedShop] profile:', profile);
//     console.log('🧥 [personalizedShop] gender:', gender);
//     console.log('🧥 [personalizedShop] styleProfile:', styleProfile);
//     console.log('🧠 [personalizedShop] Prompt preview:', prompt.slice(0, 800));

//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o-mini',
//       temperature: 0.7,
//       messages: [{ role: 'user', content: prompt }],
//       response_format: { type: 'json_object' },
//     });

//     let parsed: any = {};
//     try {
//       parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
//       console.log(
//         '💎 [personalizedShop] Parsed recreated outfit sample:',
//         parsed?.recreated_outfit?.slice(0, 2),
//       );
//       console.log(
//         '💎 [personalizedShop] Parsed suggested purchases sample:',
//         parsed?.suggested_purchases?.slice(0, 2),
//       );
//     } catch {
//       parsed = {};
//     }

//     const purchases = Array.isArray(parsed?.suggested_purchases)
//       ? parsed.suggested_purchases
//       : [];

//     if (parsed?.recreated_outfit?.some((i: any) => i.source === 'wardrobe')) {
//       console.log('🧥 [personalizedShop] ✅ Model reused wardrobe pieces.');
//     } else {
//       console.warn(
//         '🧥 [personalizedShop] ⚠️ Model did NOT reuse wardrobe — fallback to generic recreation.',
//       );
//     }

//     // 4) Attach live shop links to the "missing" items
//     let enrichedPurchases = await Promise.all(
//       purchases.map(async (p: any) => {
//         const q = [
//           gender,
//           p.item || p.category || '',
//           p.color || '',
//           p.material || '',
//         ]
//           .filter(Boolean)
//           .join(' ')
//           .trim();

//         const products = await this.productSearch.search(q);
//         return { ...p, query: q, products };
//       }),
//     );

//     // 🧩 5) Fallback enrichment if AI returned nothing or products failed
//     if (!enrichedPurchases.length) {
//       console.warn(
//         '⚠️ [personalizedShop] Empty suggested_purchases → fallback.',
//       );

//       // derive safe fallback query from tags
//       const tagSeed = tags.slice(0, 6).join(' ');
//       const season = getCurrentSeason();
//       const genderPrefix =
//         gender?.toLowerCase().includes('female') ||
//         gender?.toLowerCase().includes('woman')
//           ? 'women'
//           : 'men';

//       const fallbackQuery = `${genderPrefix} ${tagSeed} ${season} fashion`;
//       console.log('🧩 [personalizedShop] fallbackQuery →', fallbackQuery);

//       const products = await this.productSearch.search(fallbackQuery);

//       enrichedPurchases = [
//         {
//           category: 'General',
//           item: 'Curated Outfit Add-Ons',
//           color: 'Mixed',
//           material: null,
//           products: products.slice(0, 8),
//           query: fallbackQuery,
//           source: 'fallback',
//         },
//       ];
//     }

//     // 🧹 Enforce visual and logical consistency before returning
//     const cleanPurchases = enrichedPurchases.map((p) => ({
//       ...p,
//       products: enforceProfileFilters(p.products || [], preferFit, bannedWords),
//     }));

//     return {
//       user_id,
//       image_url,
//       tags,
//       recreated_outfit: parsed?.recreated_outfit || [],
//       suggested_purchases: cleanPurchases,
//       style_note:
//         parsed?.style_note ||
//         'Personalized recreation based on your wardrobe, with curated seasonal add-ons.',
//       applied_filters: {
//         preferFit,
//         bannedWords: bannedWords.map((r) => r.source),
//       },
//     };
//   }

//   ////////END CREATE LOOK

//   //////. START REPLACED CHAT WITH LINKS AND SEARCH NET

//   /** 🧠 Conversational fashion chat — now with visuals + links */
//   async chat(dto: ChatDto) {
//     const { messages } = dto;
//     const lastUserMsg = messages
//       .slice()
//       .reverse()
//       .find((m) => m.role === 'user')?.content;

//     if (!lastUserMsg) {
//       throw new Error('No user message provided');
//     }

//     // 1️⃣ Generate base text with OpenAI
//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         {
//           role: 'system',
//           content: `
// You are a world-class personal fashion stylist.
// Respond naturally and helpfully about outfits, wardrobe planning, or styling.
// At the end of your reasoning, also return a short JSON block like:
// {"search_terms":["smart casual men","navy blazer outfit","loafers"]}
//         `,
//         },
//         ...messages,
//       ],
//     });

//     const aiReply =
//       completion.choices[0]?.message?.content?.trim() ||
//       'Styled response unavailable.';

//     // 2️⃣ Extract search terms if model provided them
//     let searchTerms: string[] = [];
//     const match = aiReply.match(/\{.*"search_terms":.*\}/s);
//     if (match) {
//       try {
//         const parsed = JSON.parse(match[0]);
//         searchTerms = parsed.search_terms ?? [];
//       } catch {
//         searchTerms = [];
//       }
//     }

//     // 3️⃣ Fallback heuristic: derive terms if none found
//     if (!searchTerms.length) {
//       const lowered = lastUserMsg.toLowerCase();
//       if (lowered.includes('smart')) searchTerms.push('smart casual outfit');
//       if (lowered.includes('summer')) searchTerms.push('summer outfit');
//       if (lowered.includes('work')) searchTerms.push('business casual look');
//       if (!searchTerms.length)
//         searchTerms.push(`${lowered} outfit inspiration`);
//     }

//     // 4️⃣ Fetch Unsplash images
//     const images = await this.fetchUnsplash(searchTerms);

//     // 5️⃣ Build shoppable links
//     const links = searchTerms.map((term) => ({
//       label: `Shop ${term} on ASOS`,
//       url: `https://www.asos.com/search/?q=${encodeURIComponent(term)}`,
//     }));

//     return { reply: aiReply, images, links };
//   }

//   /** 🔍 Lightweight Unsplash fetch helper */
//   private async fetchUnsplash(terms: string[]) {
//     const key = process.env.UNSPLASH_ACCESS_KEY;
//     if (!key || !terms.length) return [];
//     const q = encodeURIComponent(terms[0]);
//     const res = await fetch(
//       `https://api.unsplash.com/search/photos?query=${q}&per_page=5&client_id=${key}`,
//     );
//     if (!res.ok) return [];
//     const json = await res.json();
//     return json.results.map((r) => ({
//       imageUrl: r.urls.small,
//       title: r.description || r.alt_description,
//       sourceLink: r.links.html,
//     }));
//   }

//   /** 🌤️ Suggest daily style plan */
//   async suggest(body: {
//     user?: string;
//     weather?: any;
//     wardrobe?: any[];
//     preferences?: Record<string, any>;
//   }) {
//     const { user, weather, wardrobe, preferences } = body;

//     const temp = weather?.fahrenheit?.main?.temp;
//     const tempDesc = temp
//       ? `${temp}°F and ${temp < 60 ? 'cool' : temp > 85 ? 'warm' : 'mild'} weather`
//       : 'unknown temperature';

//     const wardrobeCount = wardrobe?.length || 0;

//     const systemPrompt = `
// You are a luxury personal stylist.
// Your goal is to provide a daily style briefing that helps the user feel prepared, stylish, and confident.
// Be concise, intelligent, and polished — similar to a stylist at a high-end menswear brand.

// Output must be JSON with:
// - suggestion
// - insight
// - tomorrow
// Optionally include seasonalForecast, lifecycleForecast, styleTrajectory.
// `;

//     const userPrompt = `
// Client: ${user || 'The user'}
// Weather: ${tempDesc}
// Wardrobe items: ${wardrobeCount}
// Preferences: ${JSON.stringify(preferences || {})}
// `;

//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         { role: 'system', content: systemPrompt },
//         { role: 'user', content: userPrompt },
//       ],
//       response_format: { type: 'json_object' },
//     });

//     const raw = completion.choices[0]?.message?.content;
//     if (!raw) throw new Error('No suggestion response received from model.');

//     let parsed: {
//       suggestion: string;
//       insight: string;
//       tomorrow: string;
//       seasonalForecast?: string;
//       lifecycleForecast?: string;
//       styleTrajectory?: string;
//     };

//     try {
//       parsed = JSON.parse(raw);
//     } catch {
//       console.error('❌ Failed to parse AI JSON:', raw);
//       throw new Error('AI response was not valid JSON.');
//     }

//     if (!parsed.seasonalForecast) {
//       parsed.seasonalForecast = generateSeasonalForecast(wardrobe);
//     }

//     return parsed;
//   }
// }

// // END REPLACED CHAT WITH LINKS AND SEARCH NET

/////////////////////

// import { Injectable } from '@nestjs/common';
// import OpenAI from 'openai';
// import { ChatDto } from './dto/chat.dto';
// import { VertexService } from '../vertex/vertex.service'; // 🔹 ADDED
// import { ProductSearchService } from '../product-services/product-search.service';
// import { Pool } from 'pg';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// import * as fs from 'fs';
// import * as path from 'path';
// import * as dotenv from 'dotenv';

// function loadOpenAISecrets(): {
//   apiKey?: string;
//   project?: string;
//   source: string;
// } {
//   const candidates = [
//     path.join(process.cwd(), '.env'),
//     path.join(process.cwd(), 'apps', 'backend-nest', '.env'),
//     path.join(__dirname, '..', '..', '.env'),
//   ];

//   for (const p of candidates) {
//     try {
//       if (fs.existsSync(p)) {
//         const parsed = dotenv.parse(fs.readFileSync(p));
//         const apiKey = parsed['OPENAI_API_KEY'];
//         const project = parsed['OPENAI_PROJECT_ID'];
//         if (apiKey) return { apiKey, project, source: p };
//       }
//     } catch {
//       // ignore
//     }
//   }

//   return {
//     apiKey: process.env.OPENAI_API_KEY,
//     project: process.env.OPENAI_PROJECT_ID,
//     source: 'process.env',
//   };
// }

// // 🧥 Basic capsule wardrobe templates
// const CAPSULES = {
//   Spring: [
//     { category: 'Outerwear', subcategory: 'Light Jacket', recommended: 2 },
//     { category: 'Tops', subcategory: 'Oxford Shirt', recommended: 3 },
//     { category: 'Bottoms', subcategory: 'Chinos', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Loafers', recommended: 1 },
//     { category: 'Shoes', subcategory: 'Sneakers', recommended: 1 },
//   ],
//   Summer: [
//     { category: 'Tops', subcategory: 'Short Sleeve Shirt', recommended: 4 },
//     { category: 'Tops', subcategory: 'Polo Shirt', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Linen Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Loafers', recommended: 1 },
//     { category: 'Shoes', subcategory: 'Sandals', recommended: 1 },
//   ],
//   Fall: [
//     { category: 'Outerwear', subcategory: 'Field Jacket', recommended: 1 },
//     { category: 'Outerwear', subcategory: 'Blazer', recommended: 1 },
//     { category: 'Tops', subcategory: 'Knit Sweater', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Wool Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Chelsea Boots', recommended: 1 },
//   ],
//   Winter: [
//     { category: 'Outerwear', subcategory: 'Overcoat', recommended: 1 },
//     { category: 'Outerwear', subcategory: 'Heavy Parka', recommended: 1 },
//     { category: 'Tops', subcategory: 'Heavy Knit Sweater', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Wool Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Boots', recommended: 2 },
//   ],
// };

// // 🗓️ Auto-detect season based on month
// function getCurrentSeason(): 'Spring' | 'Summer' | 'Fall' | 'Winter' {
//   const month = new Date().getMonth() + 1;
//   if ([3, 4, 5].includes(month)) return 'Spring';
//   if ([6, 7, 8].includes(month)) return 'Summer';
//   if ([9, 10, 11].includes(month)) return 'Fall';
//   return 'Winter';
// }

// // 🧠 Compare wardrobe to capsule and return simple forecast text
// function generateSeasonalForecast(wardrobe: any[] = []): string | undefined {
//   const season = getCurrentSeason();
//   const capsule = CAPSULES[season];
//   if (!capsule) return;

//   const missing: string[] = [];

//   capsule.forEach((item) => {
//     const owned = wardrobe.filter(
//       (w) =>
//         w.category?.toLowerCase() === item.category.toLowerCase() &&
//         w.subcategory?.toLowerCase() === item.subcategory.toLowerCase(),
//     ).length;

//     if (owned < item.recommended) {
//       const needed = item.recommended - owned;
//       missing.push(`${needed} × ${item.subcategory}`);
//     }
//   });

//   if (missing.length === 0) {
//     return `✅ Your ${season} capsule is complete — you're ready for the season.`;
//   }

//   return `🍂 ${season} is approaching — you're missing: ${missing.join(', ')}.`;
// }

// @Injectable()
// export class AiService {
//   private openai: OpenAI;
//   private useVertex: boolean;
//   private vertexService?: VertexService; // 🔹 optional instance
//   private productSearch: ProductSearchService; // ✅ add this

//   constructor(vertexService?: VertexService) {
//     const { apiKey, project, source } = loadOpenAISecrets();

//     const snippet = apiKey?.slice(0, 20) ?? '';
//     const len = apiKey?.length ?? 0;
//     console.log('🔑 OPENAI key source:', source);
//     console.log('🔑 OPENAI key snippet:', JSON.stringify(snippet));
//     console.log('🔑 OPENAI key length:', len);
//     console.log('📂 CWD:', process.cwd());

//     if (!apiKey) {
//       throw new Error('OPENAI_API_KEY not found in .env or environment.');
//     }
//     if (/^sk-?x{3,}/i.test(apiKey)) {
//       throw new Error(
//         'OPENAI_API_KEY appears masked (e.g., "sk-xxxxx..."). Read from the correct .env instead.',
//       );
//     }
//     if (!apiKey.startsWith('sk-')) {
//       throw new Error('OPENAI_API_KEY is malformed — must start with "sk-".');
//     }

//     this.openai = new OpenAI({ apiKey, project });

//     // 🔹 New: Vertex toggle
//     this.useVertex = process.env.USE_VERTEX === 'true';
//     if (this.useVertex) {
//       this.vertexService = vertexService;
//       console.log('🧠 Vertex/Gemini mode enabled for analyze/recreate');
//     }

//     this.productSearch = new ProductSearchService(); // NEW
//   }

//   //////ANALYZE LOOK

//   async analyze(imageUrl: string) {
//     console.log('🧠 [AI] analyze() called with', imageUrl);
//     if (!imageUrl) throw new Error('Missing imageUrl');

//     // 🔹 Try Vertex first if enabled
//     if (this.useVertex && this.vertexService) {
//       try {
//         const gcsUri = imageUrl.replace(
//           'https://storage.googleapis.com/',
//           'gs://',
//         );
//         const metadata = await this.vertexService.analyzeImage(gcsUri);
//         const tags = [
//           ...(metadata.tags || []),
//           ...(metadata.style_descriptors || []),
//           metadata.main_category,
//           metadata.subcategory,
//         ].filter(Boolean);
//         console.log('🧠 [Vertex] analyze() success:', tags);
//         return { tags };
//       } catch (err: any) {
//         console.warn(
//           '[Vertex] analyze() failed → fallback to OpenAI:',
//           err.message,
//         );
//       }
//     }

//     // 🔸 OpenAI fallback
//     try {
//       const completion = await this.openai.chat.completions.create({
//         model: 'gpt-4o-mini',
//         messages: [
//           {
//             role: 'system',
//             content:
//               'You are a professional fashion classifier. Return only JSON with a "tags" array describing the outfit’s style, color palette, and vibe.',
//           },
//           {
//             role: 'user',
//             content: [
//               { type: 'text', text: 'Describe this outfit as tags only:' },
//               { type: 'image_url', image_url: { url: imageUrl } },
//             ],
//           },
//         ],
//         response_format: { type: 'json_object' },
//       });

//       const raw = completion.choices[0]?.message?.content;
//       console.log('🧠 [AI] analyze() raw response:', raw);

//       if (!raw) throw new Error('Empty response from OpenAI');
//       const parsed = JSON.parse(raw || '{}');
//       return { tags: parsed.tags || [] };
//     } catch (err: any) {
//       console.error('❌ [AI] analyze() failed:', err.message);
//       return { tags: ['casual', 'modern', 'neutral'] };
//     }
//   }

//   /* ------------------------------------------------------------
//      🧩 Weighted Tag Enrichment + Trend Injection
//   -------------------------------------------------------------*/
//   private async enrichTags(tags: string[]): Promise<string[]> {
//     const weightMap: Record<string, number> = {
//       tailored: 3,
//       minimal: 3,
//       neutral: 3,
//       modern: 2,
//       vintage: 2,
//       classic: 2,
//       streetwear: 2,
//       oversized: 2,
//       slim: 2,
//       relaxed: 2,
//       casual: 1,
//       sporty: 1,
//     };

//     // 🧹 Normalize + de-dupe
//     const cleanTags = Array.from(
//       new Set(
//         tags
//           .map((t) => t.toLowerCase().trim())
//           .filter((t) => t && !['outfit', 'style', 'fashion'].includes(t)),
//       ),
//     );

//     // 🧠 Apply weights
//     const weighted = cleanTags
//       .map((t) => ({ tag: t, weight: weightMap[t] || 1 }))
//       .sort((a, b) => b.weight - a.weight);

//     // 🌍 Inject current trend tags
//     const trendTags = await this.fetchTrendTags();
//     const final = Array.from(
//       new Set([...weighted.map((w) => w.tag), ...trendTags.slice(0, 3)]),
//     );

//     console.log('🎯 [AI] Enriched tags →', final);
//     return final;
//   }

//   private async fetchTrendTags(): Promise<string[]> {
//     try {
//       const res = await fetch(
//         'https://trends.google.com/trends/hottrends/visualize/internal/data/en_us',
//       );
//       if (!res.ok) throw new Error(`HTTP ${res.status}`);
//       const json = await res.json().catch(() => []);
//       const trendWords = JSON.stringify(json).toLowerCase();
//       const matched = trendWords.match(
//         /(quiet luxury|monochrome|minimalism|maximalism|italian|tailoring|loafers|neutrals|linen|structured|preppy|flannel|earth tones|autumn layering)/gi,
//       );
//       if (matched?.length) return Array.from(new Set(matched));

//       // 🧭 If Google Trends returned empty, use local backup
//       return [
//         'quiet luxury',
//         'neutral tones',
//         'tailored fit',
//         'autumn layering',
//       ];
//     } catch (err: any) {
//       console.warn('⚠️ Trend fetch fallback triggered:', err.message);
//       return [
//         'quiet luxury',
//         'neutral tones',
//         'tailored fit',
//         'autumn layering',
//       ];
//     }
//   }

//   async recreate(
//     user_id: string,
//     tags: string[],
//     image_url?: string,
//     user_gender?: string,
//   ) {
//     console.log(
//       '🧥 [AI] recreate() called for user',
//       user_id,
//       'with tags:',
//       tags,
//       'and gender:',
//       user_gender,
//     );

//     if (!user_id) throw new Error('Missing user_id');
//     if (!tags?.length) {
//       console.warn('⚠️ [AI] recreate() empty tags → using defaults.');
//       tags = ['modern', 'neutral', 'tailored'];
//     }

//     // ✅ Weighted + trend-injected tags
//     tags = await this.enrichTags(tags);

//     // 🧠 Fetch gender_presentation if missing
//     if (!user_gender) {
//       try {
//         const result = await pool.query(
//           'SELECT gender_presentation FROM users WHERE id = $1 LIMIT 1',
//           [user_id],
//         );
//         user_gender = result.rows[0]?.gender_presentation || 'neutral';
//       } catch {
//         user_gender = 'neutral';
//       }
//     }

//     // 🧩 Normalize gender
//     const normalizedGender =
//       user_gender?.toLowerCase().includes('female') ||
//       user_gender?.toLowerCase().includes('woman')
//         ? 'female'
//         : user_gender?.toLowerCase().includes('male') ||
//             user_gender?.toLowerCase().includes('man')
//           ? 'male'
//           : process.env.DEFAULT_GENDER || 'neutral';

//     // 🧠 Build stylist prompt
//     const prompt = `
// You are a world-class AI stylist for ${normalizedGender} fashion.
// Create a cohesive outfit inspired by an uploaded look.

// Client: ${user_id}
// Image: ${image_url || 'N/A'}
// Detected tags: ${tags.join(', ')}

// Rules:
// - Match fabric, color palette, and silhouette.
// - Use ${normalizedGender}-appropriate pieces.
// - Output only JSON:
// {
//   "outfit": [
//     { "category": "Top", "item": "Grey Cotton Tee", "color": "gray" },
//     { "category": "Bottom", "item": "Navy Chinos", "color": "navy" },
//     { "category": "Outerwear", "item": "Beige Overshirt", "color": "beige" },
//     { "category": "Shoes", "item": "White Sneakers", "color": "white" }
//   ],
//   "style_note": "Describe how the look connects to the uploaded image."
// }
// `;

//     // 🧠 Generate outfit via Vertex or OpenAI
//     let parsed: any;
//     if (this.useVertex && this.vertexService) {
//       try {
//         const result = await this.vertexService.generateReasonedOutfit(prompt);
//         let text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
//         text = text
//           .replace(/^```json\s*/i, '')
//           .replace(/```$/, '')
//           .trim();
//         parsed = JSON.parse(text);
//         console.log('🧠 [Vertex] recreate() success');
//       } catch (err: any) {
//         console.warn('[Vertex] recreate() failed → fallback', err.message);
//       }
//     }

//     if (!parsed) {
//       const completion = await this.openai.chat.completions.create({
//         model: 'gpt-4o-mini',
//         temperature: 0.7,
//         messages: [{ role: 'user', content: prompt }],
//         response_format: { type: 'json_object' },
//       });

//       const raw = completion.choices[0]?.message?.content || '{}';
//       try {
//         parsed = JSON.parse(raw);
//       } catch {
//         parsed = {};
//       }
//     }

//     const outfit = Array.isArray(parsed?.outfit) ? parsed.outfit : [];
//     const style_note =
//       parsed?.style_note || 'Modern outfit inspired by the uploaded look.';

//     // 🛍️ Enrich each item with live products
//     const enriched = await Promise.all(
//       outfit.map(async (o: any) => {
//         const query =
//           `${normalizedGender} ${o.item || o.category || ''} ${o.color || ''}`.trim();
//         let products = await this.productSearch.search(query);
//         let top = products[0];

//         if (!top?.image || top.image.includes('No_image')) {
//           const serp = await this.productSearch.searchSerpApi(query);
//           if (serp?.[0]) top = { ...serp[0], source: 'SerpAPI' };
//         }

//         const materialHint =
//           query.match(/(wool|cotton|linen|leather|denim|polyester)/i)?.[0] ||
//           null;
//         const seasonalityHint =
//           query.match(/(summer|winter|fall|spring)/i)?.[0] ||
//           getCurrentSeason();
//         const fitHint =
//           query.match(/(slim|regular|relaxed|oversized|tailored)/i)?.[0] ||
//           'regular';

//         return {
//           category: o.category,
//           item: o.item,
//           color: o.color,
//           brand: top?.brand || 'Unknown',
//           price: top?.price || '—',
//           image:
//             top?.image && top.image.startsWith('http')
//               ? top.image
//               : 'https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg',
//           shopUrl:
//             top?.shopUrl ||
//             `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=shop`,
//           source: top?.source || 'ASOS / Fallback',
//           material: materialHint,
//           seasonality: seasonalityHint,
//           fit: fitHint,
//         };
//       }),
//     );

//     return { user_id, outfit: enriched, style_note };
//   }

//   // 👔 PERSONALIZED SHOP — image + wardrobe + preferences
//   async personalizedShop(
//     user_id: string,
//     image_url: string,
//     user_gender?: string,
//   ) {
//     if (!user_id || !image_url) throw new Error('Missing user_id or image_url');

//     // 1) Analyze uploaded image
//     const analysis = await this.analyze(image_url);
//     const tags = analysis?.tags || [];

//     const { rows: wardrobe } = await pool.query(
//       `SELECT name, main_category AS category, subcategory, color, material
//    FROM wardrobe_items
//    WHERE user_id::text = $1
//    ORDER BY updated_at DESC
//    LIMIT 50`,
//       [user_id],
//     );

//     const prefRes = await pool.query(
//       `SELECT gender_presentation
//      FROM users
//      WHERE id = $1
//      LIMIT 1`,
//       [user_id],
//     );
//     const profile = prefRes.rows[0] || {};
//     const gender = user_gender || profile.gender_presentation || 'neutral';
//     const preferences = {}; // fallback

//     // 3) Ask model to split into "owned" vs "missing"
//     const prompt = `
// You are a personal stylist. Recreate the uploaded look using the user's wardrobe and taste.
// Return ONLY JSON with:
// {
//   "recreated_outfit": [ { "source":"wardrobe", "category":"Top", "item":"...", "color":"..." }, ... ],
//   "suggested_purchases": [ { "category":"...", "item":"...", "color":"...", "material":"..." }, ... ],
//   "style_note": "..."
// }

// User gender: ${gender}
// Detected tags: ${tags.join(', ')}
// User preferences: ${JSON.stringify(preferences)}
// User wardrobe (subset): ${JSON.stringify(wardrobe)}
// `;

//     console.log('🧥 [personalizedShop] wardrobe count:', wardrobe?.length);
//     console.log('🧥 [personalizedShop] wardrobe sample:', wardrobe?.[0]);

//     console.log('🧥 [personalizedShop] profile:', profile);
//     console.log('🧥 [personalizedShop] gender:', gender);
//     console.log('🧥 [personalizedShop] preferences:', preferences);
//     console.log('🧠 [personalizedShop] Prompt preview:', prompt.slice(0, 800));

//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o-mini',
//       temperature: 0.7,
//       messages: [{ role: 'user', content: prompt }],
//       response_format: { type: 'json_object' },
//     });

//     let parsed: any = {};
//     try {
//       parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
//       console.log(
//         '💎 [personalizedShop] Parsed recreated outfit sample:',
//         parsed?.recreated_outfit?.slice(0, 2),
//       );
//       console.log(
//         '💎 [personalizedShop] Parsed suggested purchases sample:',
//         parsed?.suggested_purchases?.slice(0, 2),
//       );
//     } catch {
//       parsed = {};
//     }

//     const purchases = Array.isArray(parsed?.suggested_purchases)
//       ? parsed.suggested_purchases
//       : [];

//     if (parsed?.recreated_outfit?.some((i: any) => i.source === 'wardrobe')) {
//       console.log('🧥 [personalizedShop] ✅ Model reused wardrobe pieces.');
//     } else {
//       console.warn(
//         '🧥 [personalizedShop] ⚠️ Model did NOT reuse wardrobe — fallback to generic recreation.',
//       );
//     }

//     // 4) Attach live shop links to the "missing" items
//     let enrichedPurchases = await Promise.all(
//       purchases.map(async (p: any) => {
//         const q = [
//           gender,
//           p.item || p.category || '',
//           p.color || '',
//           p.material || '',
//         ]
//           .filter(Boolean)
//           .join(' ')
//           .trim();

//         const products = await this.productSearch.search(q);
//         return { ...p, query: q, products };
//       }),
//     );

//     // 🧩 5) Fallback enrichment if AI returned nothing or products failed
//     if (!enrichedPurchases.length) {
//       console.warn(
//         '⚠️ [personalizedShop] Empty suggested_purchases → fallback.',
//       );

//       // derive safe fallback query from tags
//       const tagSeed = tags.slice(0, 6).join(' ');
//       const season = getCurrentSeason();
//       const genderPrefix =
//         gender?.toLowerCase().includes('female') ||
//         gender?.toLowerCase().includes('woman')
//           ? 'women'
//           : 'men';

//       const fallbackQuery = `${genderPrefix} ${tagSeed} ${season} fashion`;
//       console.log('🧩 [personalizedShop] fallbackQuery →', fallbackQuery);

//       const products = await this.productSearch.search(fallbackQuery);

//       enrichedPurchases = [
//         {
//           category: 'General',
//           item: 'Curated Outfit Add-Ons',
//           color: 'Mixed',
//           material: null,
//           products: products.slice(0, 8),
//           query: fallbackQuery,
//           source: 'fallback',
//         },
//       ];
//     }

//     return {
//       user_id,
//       image_url,
//       tags,
//       recreated_outfit: parsed?.recreated_outfit || [],
//       suggested_purchases: enrichedPurchases,
//       style_note:
//         parsed?.style_note ||
//         'Personalized recreation based on your wardrobe, with curated seasonal add-ons.',
//     };
//   }

//   ////////END CREATE LOOK

//   //////. START REPLACED CHAT WITH LINKS AND SEARCH NET

//   /** 🧠 Conversational fashion chat — now with visuals + links */
//   async chat(dto: ChatDto) {
//     const { messages } = dto;
//     const lastUserMsg = messages
//       .slice()
//       .reverse()
//       .find((m) => m.role === 'user')?.content;

//     if (!lastUserMsg) {
//       throw new Error('No user message provided');
//     }

//     // 1️⃣ Generate base text with OpenAI
//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         {
//           role: 'system',
//           content: `
// You are a world-class personal fashion stylist.
// Respond naturally and helpfully about outfits, wardrobe planning, or styling.
// At the end of your reasoning, also return a short JSON block like:
// {"search_terms":["smart casual men","navy blazer outfit","loafers"]}
//         `,
//         },
//         ...messages,
//       ],
//     });

//     const aiReply =
//       completion.choices[0]?.message?.content?.trim() ||
//       'Styled response unavailable.';

//     // 2️⃣ Extract search terms if model provided them
//     let searchTerms: string[] = [];
//     const match = aiReply.match(/\{.*"search_terms":.*\}/s);
//     if (match) {
//       try {
//         const parsed = JSON.parse(match[0]);
//         searchTerms = parsed.search_terms ?? [];
//       } catch {
//         searchTerms = [];
//       }
//     }

//     // 3️⃣ Fallback heuristic: derive terms if none found
//     if (!searchTerms.length) {
//       const lowered = lastUserMsg.toLowerCase();
//       if (lowered.includes('smart')) searchTerms.push('smart casual outfit');
//       if (lowered.includes('summer')) searchTerms.push('summer outfit');
//       if (lowered.includes('work')) searchTerms.push('business casual look');
//       if (!searchTerms.length)
//         searchTerms.push(`${lowered} outfit inspiration`);
//     }

//     // 4️⃣ Fetch Unsplash images
//     const images = await this.fetchUnsplash(searchTerms);

//     // 5️⃣ Build shoppable links
//     const links = searchTerms.map((term) => ({
//       label: `Shop ${term} on ASOS`,
//       url: `https://www.asos.com/search/?q=${encodeURIComponent(term)}`,
//     }));

//     return { reply: aiReply, images, links };
//   }

//   /** 🔍 Lightweight Unsplash fetch helper */
//   private async fetchUnsplash(terms: string[]) {
//     const key = process.env.UNSPLASH_ACCESS_KEY;
//     if (!key || !terms.length) return [];
//     const q = encodeURIComponent(terms[0]);
//     const res = await fetch(
//       `https://api.unsplash.com/search/photos?query=${q}&per_page=5&client_id=${key}`,
//     );
//     if (!res.ok) return [];
//     const json = await res.json();
//     return json.results.map((r) => ({
//       imageUrl: r.urls.small,
//       title: r.description || r.alt_description,
//       sourceLink: r.links.html,
//     }));
//   }

//   /** 🌤️ Suggest daily style plan */
//   async suggest(body: {
//     user?: string;
//     weather?: any;
//     wardrobe?: any[];
//     preferences?: Record<string, any>;
//   }) {
//     const { user, weather, wardrobe, preferences } = body;

//     const temp = weather?.fahrenheit?.main?.temp;
//     const tempDesc = temp
//       ? `${temp}°F and ${temp < 60 ? 'cool' : temp > 85 ? 'warm' : 'mild'} weather`
//       : 'unknown temperature';

//     const wardrobeCount = wardrobe?.length || 0;

//     const systemPrompt = `
// You are a luxury personal stylist.
// Your goal is to provide a daily style briefing that helps the user feel prepared, stylish, and confident.
// Be concise, intelligent, and polished — similar to a stylist at a high-end menswear brand.

// Output must be JSON with:
// - suggestion
// - insight
// - tomorrow
// Optionally include seasonalForecast, lifecycleForecast, styleTrajectory.
// `;

//     const userPrompt = `
// Client: ${user || 'The user'}
// Weather: ${tempDesc}
// Wardrobe items: ${wardrobeCount}
// Preferences: ${JSON.stringify(preferences || {})}
// `;

//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         { role: 'system', content: systemPrompt },
//         { role: 'user', content: userPrompt },
//       ],
//       response_format: { type: 'json_object' },
//     });

//     const raw = completion.choices[0]?.message?.content;
//     if (!raw) throw new Error('No suggestion response received from model.');

//     let parsed: {
//       suggestion: string;
//       insight: string;
//       tomorrow: string;
//       seasonalForecast?: string;
//       lifecycleForecast?: string;
//       styleTrajectory?: string;
//     };

//     try {
//       parsed = JSON.parse(raw);
//     } catch {
//       console.error('❌ Failed to parse AI JSON:', raw);
//       throw new Error('AI response was not valid JSON.');
//     }

//     if (!parsed.seasonalForecast) {
//       parsed.seasonalForecast = generateSeasonalForecast(wardrobe);
//     }

//     return parsed;
//   }
// }

// // END REPLACED CHAT WITH LINKS AND SEARCH NET

//////////////////////

// import { Injectable } from '@nestjs/common';
// import OpenAI from 'openai';
// import { ChatDto } from './dto/chat.dto';
// import { VertexService } from '../vertex/vertex.service'; // 🔹 ADDED
// import { ProductSearchService } from '../product-services/product-search.service';
// import { Pool } from 'pg';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// import * as fs from 'fs';
// import * as path from 'path';
// import * as dotenv from 'dotenv';

// function loadOpenAISecrets(): {
//   apiKey?: string;
//   project?: string;
//   source: string;
// } {
//   const candidates = [
//     path.join(process.cwd(), '.env'),
//     path.join(process.cwd(), 'apps', 'backend-nest', '.env'),
//     path.join(__dirname, '..', '..', '.env'),
//   ];

//   for (const p of candidates) {
//     try {
//       if (fs.existsSync(p)) {
//         const parsed = dotenv.parse(fs.readFileSync(p));
//         const apiKey = parsed['OPENAI_API_KEY'];
//         const project = parsed['OPENAI_PROJECT_ID'];
//         if (apiKey) return { apiKey, project, source: p };
//       }
//     } catch {
//       // ignore
//     }
//   }

//   return {
//     apiKey: process.env.OPENAI_API_KEY,
//     project: process.env.OPENAI_PROJECT_ID,
//     source: 'process.env',
//   };
// }

// // 🧥 Basic capsule wardrobe templates
// const CAPSULES = {
//   Spring: [
//     { category: 'Outerwear', subcategory: 'Light Jacket', recommended: 2 },
//     { category: 'Tops', subcategory: 'Oxford Shirt', recommended: 3 },
//     { category: 'Bottoms', subcategory: 'Chinos', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Loafers', recommended: 1 },
//     { category: 'Shoes', subcategory: 'Sneakers', recommended: 1 },
//   ],
//   Summer: [
//     { category: 'Tops', subcategory: 'Short Sleeve Shirt', recommended: 4 },
//     { category: 'Tops', subcategory: 'Polo Shirt', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Linen Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Loafers', recommended: 1 },
//     { category: 'Shoes', subcategory: 'Sandals', recommended: 1 },
//   ],
//   Fall: [
//     { category: 'Outerwear', subcategory: 'Field Jacket', recommended: 1 },
//     { category: 'Outerwear', subcategory: 'Blazer', recommended: 1 },
//     { category: 'Tops', subcategory: 'Knit Sweater', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Wool Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Chelsea Boots', recommended: 1 },
//   ],
//   Winter: [
//     { category: 'Outerwear', subcategory: 'Overcoat', recommended: 1 },
//     { category: 'Outerwear', subcategory: 'Heavy Parka', recommended: 1 },
//     { category: 'Tops', subcategory: 'Heavy Knit Sweater', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Wool Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Boots', recommended: 2 },
//   ],
// };

// // 🗓️ Auto-detect season based on month
// function getCurrentSeason(): 'Spring' | 'Summer' | 'Fall' | 'Winter' {
//   const month = new Date().getMonth() + 1;
//   if ([3, 4, 5].includes(month)) return 'Spring';
//   if ([6, 7, 8].includes(month)) return 'Summer';
//   if ([9, 10, 11].includes(month)) return 'Fall';
//   return 'Winter';
// }

// // 🧠 Compare wardrobe to capsule and return simple forecast text
// function generateSeasonalForecast(wardrobe: any[] = []): string | undefined {
//   const season = getCurrentSeason();
//   const capsule = CAPSULES[season];
//   if (!capsule) return;

//   const missing: string[] = [];

//   capsule.forEach((item) => {
//     const owned = wardrobe.filter(
//       (w) =>
//         w.category?.toLowerCase() === item.category.toLowerCase() &&
//         w.subcategory?.toLowerCase() === item.subcategory.toLowerCase(),
//     ).length;

//     if (owned < item.recommended) {
//       const needed = item.recommended - owned;
//       missing.push(`${needed} × ${item.subcategory}`);
//     }
//   });

//   if (missing.length === 0) {
//     return `✅ Your ${season} capsule is complete — you're ready for the season.`;
//   }

//   return `🍂 ${season} is approaching — you're missing: ${missing.join(', ')}.`;
// }

// @Injectable()
// export class AiService {
//   private openai: OpenAI;
//   private useVertex: boolean;
//   private vertexService?: VertexService; // 🔹 optional instance
//   private productSearch: ProductSearchService; // ✅ add this

//   constructor(vertexService?: VertexService) {
//     const { apiKey, project, source } = loadOpenAISecrets();

//     const snippet = apiKey?.slice(0, 20) ?? '';
//     const len = apiKey?.length ?? 0;
//     console.log('🔑 OPENAI key source:', source);
//     console.log('🔑 OPENAI key snippet:', JSON.stringify(snippet));
//     console.log('🔑 OPENAI key length:', len);
//     console.log('📂 CWD:', process.cwd());

//     if (!apiKey) {
//       throw new Error('OPENAI_API_KEY not found in .env or environment.');
//     }
//     if (/^sk-?x{3,}/i.test(apiKey)) {
//       throw new Error(
//         'OPENAI_API_KEY appears masked (e.g., "sk-xxxxx..."). Read from the correct .env instead.',
//       );
//     }
//     if (!apiKey.startsWith('sk-')) {
//       throw new Error('OPENAI_API_KEY is malformed — must start with "sk-".');
//     }

//     this.openai = new OpenAI({ apiKey, project });

//     // 🔹 New: Vertex toggle
//     this.useVertex = process.env.USE_VERTEX === 'true';
//     if (this.useVertex) {
//       this.vertexService = vertexService;
//       console.log('🧠 Vertex/Gemini mode enabled for analyze/recreate');
//     }

//     this.productSearch = new ProductSearchService(); // NEW
//   }

//   //////ANALYZE LOOK

//   async analyze(imageUrl: string) {
//     console.log('🧠 [AI] analyze() called with', imageUrl);
//     if (!imageUrl) throw new Error('Missing imageUrl');

//     // 🔹 Try Vertex first if enabled
//     if (this.useVertex && this.vertexService) {
//       try {
//         const gcsUri = imageUrl.replace(
//           'https://storage.googleapis.com/',
//           'gs://',
//         );
//         const metadata = await this.vertexService.analyzeImage(gcsUri);
//         const tags = [
//           ...(metadata.tags || []),
//           ...(metadata.style_descriptors || []),
//           metadata.main_category,
//           metadata.subcategory,
//         ].filter(Boolean);
//         console.log('🧠 [Vertex] analyze() success:', tags);
//         return { tags };
//       } catch (err: any) {
//         console.warn(
//           '[Vertex] analyze() failed → fallback to OpenAI:',
//           err.message,
//         );
//       }
//     }

//     // 🔸 OpenAI fallback
//     try {
//       const completion = await this.openai.chat.completions.create({
//         model: 'gpt-4o-mini',
//         messages: [
//           {
//             role: 'system',
//             content:
//               'You are a professional fashion classifier. Return only JSON with a "tags" array describing the outfit’s style, color palette, and vibe.',
//           },
//           {
//             role: 'user',
//             content: [
//               { type: 'text', text: 'Describe this outfit as tags only:' },
//               { type: 'image_url', image_url: { url: imageUrl } },
//             ],
//           },
//         ],
//         response_format: { type: 'json_object' },
//       });

//       const raw = completion.choices[0]?.message?.content;
//       console.log('🧠 [AI] analyze() raw response:', raw);

//       if (!raw) throw new Error('Empty response from OpenAI');
//       const parsed = JSON.parse(raw || '{}');
//       return { tags: parsed.tags || [] };
//     } catch (err: any) {
//       console.error('❌ [AI] analyze() failed:', err.message);
//       return { tags: ['casual', 'modern', 'neutral'] };
//     }
//   }

//   /* ------------------------------------------------------------
//      🧩 Weighted Tag Enrichment + Trend Injection
//   -------------------------------------------------------------*/
//   private async enrichTags(tags: string[]): Promise<string[]> {
//     const weightMap: Record<string, number> = {
//       tailored: 3,
//       minimal: 3,
//       neutral: 3,
//       modern: 2,
//       vintage: 2,
//       classic: 2,
//       streetwear: 2,
//       oversized: 2,
//       slim: 2,
//       relaxed: 2,
//       casual: 1,
//       sporty: 1,
//     };

//     // 🧹 Normalize + de-dupe
//     const cleanTags = Array.from(
//       new Set(
//         tags
//           .map((t) => t.toLowerCase().trim())
//           .filter((t) => t && !['outfit', 'style', 'fashion'].includes(t)),
//       ),
//     );

//     // 🧠 Apply weights
//     const weighted = cleanTags
//       .map((t) => ({ tag: t, weight: weightMap[t] || 1 }))
//       .sort((a, b) => b.weight - a.weight);

//     // 🌍 Inject current trend tags
//     const trendTags = await this.fetchTrendTags();
//     const final = Array.from(
//       new Set([...weighted.map((w) => w.tag), ...trendTags.slice(0, 3)]),
//     );

//     console.log('🎯 [AI] Enriched tags →', final);
//     return final;
//   }

//   /* 🔥 Pull in fashion trends (cached or RSS) */
//   // private async fetchTrendTags(): Promise<string[]> {
//   //   try {
//   //     const res = await fetch(
//   //       'https://trends.google.com/trends/hottrends/visualize/internal/data/en_us',
//   //     );
//   //     const json = await res.json().catch(() => []);
//   //     const trendWords = JSON.stringify(json).toLowerCase();
//   //     const matched = trendWords.match(
//   //       /(quiet luxury|monochrome|minimalism|maximalism|italian|tailoring|loafers|neutrals|linen|structured|preppy)/gi,
//   //     );
//   //     return matched ? Array.from(new Set(matched)) : [];
//   //   } catch {
//   //     return ['quiet luxury', 'neutral tones', 'tailored fit'];
//   //   }
//   // }

//   private async fetchTrendTags(): Promise<string[]> {
//     try {
//       const res = await fetch(
//         'https://trends.google.com/trends/hottrends/visualize/internal/data/en_us',
//       );
//       if (!res.ok) throw new Error(`HTTP ${res.status}`);
//       const json = await res.json().catch(() => []);
//       const trendWords = JSON.stringify(json).toLowerCase();
//       const matched = trendWords.match(
//         /(quiet luxury|monochrome|minimalism|maximalism|italian|tailoring|loafers|neutrals|linen|structured|preppy|flannel|earth tones|autumn layering)/gi,
//       );
//       if (matched?.length) return Array.from(new Set(matched));

//       // 🧭 If Google Trends returned empty, use local backup
//       return [
//         'quiet luxury',
//         'neutral tones',
//         'tailored fit',
//         'autumn layering',
//       ];
//     } catch (err: any) {
//       console.warn('⚠️ Trend fetch fallback triggered:', err.message);
//       return [
//         'quiet luxury',
//         'neutral tones',
//         'tailored fit',
//         'autumn layering',
//       ];
//     }
//   }

//   async recreate(
//     user_id: string,
//     tags: string[],
//     image_url?: string,
//     user_gender?: string,
//   ) {
//     console.log(
//       '🧥 [AI] recreate() called for user',
//       user_id,
//       'with tags:',
//       tags,
//       'and gender:',
//       user_gender,
//     );

//     if (!user_id) throw new Error('Missing user_id');
//     if (!tags?.length) {
//       console.warn('⚠️ [AI] recreate() empty tags → using defaults.');
//       tags = ['modern', 'neutral', 'tailored'];
//     }

//     // ✅ Weighted + trend-injected tags
//     tags = await this.enrichTags(tags);

//     // 🧠 Fetch gender_presentation if missing
//     if (!user_gender) {
//       try {
//         const result = await pool.query(
//           'SELECT gender_presentation FROM users WHERE id = $1 LIMIT 1',
//           [user_id],
//         );
//         user_gender = result.rows[0]?.gender_presentation || 'neutral';
//       } catch {
//         user_gender = 'neutral';
//       }
//     }

//     // 🧩 Normalize gender
//     const normalizedGender =
//       user_gender?.toLowerCase().includes('female') ||
//       user_gender?.toLowerCase().includes('woman')
//         ? 'female'
//         : user_gender?.toLowerCase().includes('male') ||
//             user_gender?.toLowerCase().includes('man')
//           ? 'male'
//           : process.env.DEFAULT_GENDER || 'neutral';

//     // 🧠 Build stylist prompt
//     const prompt = `
// You are a world-class AI stylist for ${normalizedGender} fashion.
// Create a cohesive outfit inspired by an uploaded look.

// Client: ${user_id}
// Image: ${image_url || 'N/A'}
// Detected tags: ${tags.join(', ')}

// Rules:
// - Match fabric, color palette, and silhouette.
// - Use ${normalizedGender}-appropriate pieces.
// - Output only JSON:
// {
//   "outfit": [
//     { "category": "Top", "item": "Grey Cotton Tee", "color": "gray" },
//     { "category": "Bottom", "item": "Navy Chinos", "color": "navy" },
//     { "category": "Outerwear", "item": "Beige Overshirt", "color": "beige" },
//     { "category": "Shoes", "item": "White Sneakers", "color": "white" }
//   ],
//   "style_note": "Describe how the look connects to the uploaded image."
// }
// `;

//     // 🧠 Generate outfit via Vertex or OpenAI
//     let parsed: any;
//     if (this.useVertex && this.vertexService) {
//       try {
//         const result = await this.vertexService.generateReasonedOutfit(prompt);
//         let text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
//         text = text
//           .replace(/^```json\s*/i, '')
//           .replace(/```$/, '')
//           .trim();
//         parsed = JSON.parse(text);
//         console.log('🧠 [Vertex] recreate() success');
//       } catch (err: any) {
//         console.warn('[Vertex] recreate() failed → fallback', err.message);
//       }
//     }

//     if (!parsed) {
//       const completion = await this.openai.chat.completions.create({
//         model: 'gpt-4o-mini',
//         temperature: 0.7,
//         messages: [{ role: 'user', content: prompt }],
//         response_format: { type: 'json_object' },
//       });

//       const raw = completion.choices[0]?.message?.content || '{}';
//       try {
//         parsed = JSON.parse(raw);
//       } catch {
//         parsed = {};
//       }
//     }

//     const outfit = Array.isArray(parsed?.outfit) ? parsed.outfit : [];
//     const style_note =
//       parsed?.style_note || 'Modern outfit inspired by the uploaded look.';

//     // 🛍️ Enrich each item with live products
//     const enriched = await Promise.all(
//       outfit.map(async (o: any) => {
//         const query =
//           `${normalizedGender} ${o.item || o.category || ''} ${o.color || ''}`.trim();
//         let products = await this.productSearch.search(query);
//         let top = products[0];

//         if (!top?.image || top.image.includes('No_image')) {
//           const serp = await this.productSearch.searchSerpApi(query);
//           if (serp?.[0]) top = { ...serp[0], source: 'SerpAPI' };
//         }

//         const materialHint =
//           query.match(/(wool|cotton|linen|leather|denim|polyester)/i)?.[0] ||
//           null;
//         const seasonalityHint =
//           query.match(/(summer|winter|fall|spring)/i)?.[0] ||
//           getCurrentSeason();
//         const fitHint =
//           query.match(/(slim|regular|relaxed|oversized|tailored)/i)?.[0] ||
//           'regular';

//         return {
//           category: o.category,
//           item: o.item,
//           color: o.color,
//           brand: top?.brand || 'Unknown',
//           price: top?.price || '—',
//           image:
//             top?.image && top.image.startsWith('http')
//               ? top.image
//               : 'https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg',
//           shopUrl:
//             top?.shopUrl ||
//             `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=shop`,
//           source: top?.source || 'ASOS / Fallback',
//           material: materialHint,
//           seasonality: seasonalityHint,
//           fit: fitHint,
//         };
//       }),
//     );

//     return { user_id, outfit: enriched, style_note };
//   }

//   // 👔 PERSONALIZED SHOP — image + wardrobe + preferences
//   async personalizedShop(
//     user_id: string,
//     image_url: string,
//     user_gender?: string,
//   ) {
//     if (!user_id || !image_url) throw new Error('Missing user_id or image_url');

//     // 1) Analyze uploaded image
//     const analysis = await this.analyze(image_url);
//     const tags = analysis?.tags || [];

//     const { rows: wardrobe } = await pool.query(
//       `SELECT name, main_category AS category, subcategory, color, material
//    FROM wardrobe_items
//    WHERE user_id::text = $1
//    ORDER BY updated_at DESC
//    LIMIT 50`,
//       [user_id],
//     );

//     const prefRes = await pool.query(
//       `SELECT gender_presentation
//      FROM users
//      WHERE id = $1
//      LIMIT 1`,
//       [user_id],
//     );
//     const profile = prefRes.rows[0] || {};
//     const gender = user_gender || profile.gender_presentation || 'neutral';
//     const preferences = {}; // fallback

//     // 3) Ask model to split into "owned" vs "missing"
//     const prompt = `
// You are a personal stylist. Recreate the uploaded look using the user's wardrobe and taste.
// Return ONLY JSON with:
// {
//   "recreated_outfit": [ { "source":"wardrobe", "category":"Top", "item":"...", "color":"..." }, ... ],
//   "suggested_purchases": [ { "category":"...", "item":"...", "color":"...", "material":"..." }, ... ],
//   "style_note": "..."
// }

// User gender: ${gender}
// Detected tags: ${tags.join(', ')}
// User preferences: ${JSON.stringify(preferences)}
// User wardrobe (subset): ${JSON.stringify(wardrobe)}
// `;

//     console.log('🧥 [personalizedShop] wardrobe count:', wardrobe?.length);
//     console.log('🧥 [personalizedShop] wardrobe sample:', wardrobe?.[0]);

//     console.log('🧥 [personalizedShop] profile:', profile);
//     console.log('🧥 [personalizedShop] gender:', gender);
//     console.log('🧥 [personalizedShop] preferences:', preferences);

//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o-mini',
//       temperature: 0.7,
//       messages: [{ role: 'user', content: prompt }],
//       response_format: { type: 'json_object' },
//     });

//     let parsed: any = {};
//     try {
//       parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
//     } catch {
//       parsed = {};
//     }

//     const purchases = Array.isArray(parsed?.suggested_purchases)
//       ? parsed.suggested_purchases
//       : [];

//     //   // 4) Attach live shop links to the "missing" items
//     //   const enrichedPurchases = await Promise.all(
//     //     purchases.map(async (p: any) => {
//     //       const q = [
//     //         gender,
//     //         p.item || p.category || '',
//     //         p.color || '',
//     //         p.material || '',
//     //       ]
//     //         .filter(Boolean)
//     //         .join(' ')
//     //         .trim();

//     //       const products = await this.productSearch.search(q);
//     //       return { ...p, query: q, products };
//     //     }),
//     //   );

//     //   return {
//     //     user_id,
//     //     image_url,
//     //     tags,
//     //     recreated_outfit: parsed?.recreated_outfit || [],
//     //     suggested_purchases: enrichedPurchases,
//     //     style_note:
//     //       parsed?.style_note || 'Personalized recreation based on your wardrobe.',
//     //   };
//     // }

//     // 4) Attach live shop links to the "missing" items
//     let enrichedPurchases = await Promise.all(
//       purchases.map(async (p: any) => {
//         const q = [
//           gender,
//           p.item || p.category || '',
//           p.color || '',
//           p.material || '',
//         ]
//           .filter(Boolean)
//           .join(' ')
//           .trim();

//         const products = await this.productSearch.search(q);
//         return { ...p, query: q, products };
//       }),
//     );

//     // 🧩 5) Fallback enrichment if AI returned nothing or products failed
//     if (!enrichedPurchases.length) {
//       console.warn(
//         '⚠️ [personalizedShop] Empty suggested_purchases → fallback.',
//       );

//       // derive safe fallback query from tags
//       const tagSeed = tags.slice(0, 6).join(' ');
//       const season = getCurrentSeason();
//       const genderPrefix =
//         gender?.toLowerCase().includes('female') ||
//         gender?.toLowerCase().includes('woman')
//           ? 'women'
//           : 'men';

//       const fallbackQuery = `${genderPrefix} ${tagSeed} ${season} fashion`;
//       console.log('🧩 [personalizedShop] fallbackQuery →', fallbackQuery);

//       const products = await this.productSearch.search(fallbackQuery);

//       enrichedPurchases = [
//         {
//           category: 'General',
//           item: 'Curated Outfit Add-Ons',
//           color: 'Mixed',
//           material: null,
//           products: products.slice(0, 8),
//           query: fallbackQuery,
//           source: 'fallback',
//         },
//       ];
//     }

//     return {
//       user_id,
//       image_url,
//       tags,
//       recreated_outfit: parsed?.recreated_outfit || [],
//       suggested_purchases: enrichedPurchases,
//       style_note:
//         parsed?.style_note ||
//         'Personalized recreation based on your wardrobe, with curated seasonal add-ons.',
//     };
//   }

//   ////////END CREATE LOOK

//   //////. START REPLACED CHAT WITH LINKS AND SEARCH NET

//   /** 🧠 Conversational fashion chat — now with visuals + links */
//   async chat(dto: ChatDto) {
//     const { messages } = dto;
//     const lastUserMsg = messages
//       .slice()
//       .reverse()
//       .find((m) => m.role === 'user')?.content;

//     if (!lastUserMsg) {
//       throw new Error('No user message provided');
//     }

//     // 1️⃣ Generate base text with OpenAI
//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         {
//           role: 'system',
//           content: `
// You are a world-class personal fashion stylist.
// Respond naturally and helpfully about outfits, wardrobe planning, or styling.
// At the end of your reasoning, also return a short JSON block like:
// {"search_terms":["smart casual men","navy blazer outfit","loafers"]}
//         `,
//         },
//         ...messages,
//       ],
//     });

//     const aiReply =
//       completion.choices[0]?.message?.content?.trim() ||
//       'Styled response unavailable.';

//     // 2️⃣ Extract search terms if model provided them
//     let searchTerms: string[] = [];
//     const match = aiReply.match(/\{.*"search_terms":.*\}/s);
//     if (match) {
//       try {
//         const parsed = JSON.parse(match[0]);
//         searchTerms = parsed.search_terms ?? [];
//       } catch {
//         searchTerms = [];
//       }
//     }

//     // 3️⃣ Fallback heuristic: derive terms if none found
//     if (!searchTerms.length) {
//       const lowered = lastUserMsg.toLowerCase();
//       if (lowered.includes('smart')) searchTerms.push('smart casual outfit');
//       if (lowered.includes('summer')) searchTerms.push('summer outfit');
//       if (lowered.includes('work')) searchTerms.push('business casual look');
//       if (!searchTerms.length)
//         searchTerms.push(`${lowered} outfit inspiration`);
//     }

//     // 4️⃣ Fetch Unsplash images
//     const images = await this.fetchUnsplash(searchTerms);

//     // 5️⃣ Build shoppable links
//     const links = searchTerms.map((term) => ({
//       label: `Shop ${term} on ASOS`,
//       url: `https://www.asos.com/search/?q=${encodeURIComponent(term)}`,
//     }));

//     return { reply: aiReply, images, links };
//   }

//   /** 🔍 Lightweight Unsplash fetch helper */
//   private async fetchUnsplash(terms: string[]) {
//     const key = process.env.UNSPLASH_ACCESS_KEY;
//     if (!key || !terms.length) return [];
//     const q = encodeURIComponent(terms[0]);
//     const res = await fetch(
//       `https://api.unsplash.com/search/photos?query=${q}&per_page=5&client_id=${key}`,
//     );
//     if (!res.ok) return [];
//     const json = await res.json();
//     return json.results.map((r) => ({
//       imageUrl: r.urls.small,
//       title: r.description || r.alt_description,
//       sourceLink: r.links.html,
//     }));
//   }

//   /** 🌤️ Suggest daily style plan */
//   async suggest(body: {
//     user?: string;
//     weather?: any;
//     wardrobe?: any[];
//     preferences?: Record<string, any>;
//   }) {
//     const { user, weather, wardrobe, preferences } = body;

//     const temp = weather?.fahrenheit?.main?.temp;
//     const tempDesc = temp
//       ? `${temp}°F and ${temp < 60 ? 'cool' : temp > 85 ? 'warm' : 'mild'} weather`
//       : 'unknown temperature';

//     const wardrobeCount = wardrobe?.length || 0;

//     const systemPrompt = `
// You are a luxury personal stylist.
// Your goal is to provide a daily style briefing that helps the user feel prepared, stylish, and confident.
// Be concise, intelligent, and polished — similar to a stylist at a high-end menswear brand.

// Output must be JSON with:
// - suggestion
// - insight
// - tomorrow
// Optionally include seasonalForecast, lifecycleForecast, styleTrajectory.
// `;

//     const userPrompt = `
// Client: ${user || 'The user'}
// Weather: ${tempDesc}
// Wardrobe items: ${wardrobeCount}
// Preferences: ${JSON.stringify(preferences || {})}
// `;

//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         { role: 'system', content: systemPrompt },
//         { role: 'user', content: userPrompt },
//       ],
//       response_format: { type: 'json_object' },
//     });

//     const raw = completion.choices[0]?.message?.content;
//     if (!raw) throw new Error('No suggestion response received from model.');

//     let parsed: {
//       suggestion: string;
//       insight: string;
//       tomorrow: string;
//       seasonalForecast?: string;
//       lifecycleForecast?: string;
//       styleTrajectory?: string;
//     };

//     try {
//       parsed = JSON.parse(raw);
//     } catch {
//       console.error('❌ Failed to parse AI JSON:', raw);
//       throw new Error('AI response was not valid JSON.');
//     }

//     if (!parsed.seasonalForecast) {
//       parsed.seasonalForecast = generateSeasonalForecast(wardrobe);
//     }

//     return parsed;
//   }
// }

// END REPLACED CHAT WITH LINKS AND SEARCH NET

//////////////////////

// import { Injectable } from '@nestjs/common';
// import OpenAI from 'openai';
// import { ChatDto } from './dto/chat.dto';
// import { VertexService } from '../vertex/vertex.service'; // 🔹 ADDED
// import { ProductSearchService } from '../product-services/product-search.service';
// import { Pool } from 'pg';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// import * as fs from 'fs';
// import * as path from 'path';
// import * as dotenv from 'dotenv';

// function loadOpenAISecrets(): {
//   apiKey?: string;
//   project?: string;
//   source: string;
// } {
//   const candidates = [
//     path.join(process.cwd(), '.env'),
//     path.join(process.cwd(), 'apps', 'backend-nest', '.env'),
//     path.join(__dirname, '..', '..', '.env'),
//   ];

//   for (const p of candidates) {
//     try {
//       if (fs.existsSync(p)) {
//         const parsed = dotenv.parse(fs.readFileSync(p));
//         const apiKey = parsed['OPENAI_API_KEY'];
//         const project = parsed['OPENAI_PROJECT_ID'];
//         if (apiKey) return { apiKey, project, source: p };
//       }
//     } catch {
//       // ignore
//     }
//   }

//   return {
//     apiKey: process.env.OPENAI_API_KEY,
//     project: process.env.OPENAI_PROJECT_ID,
//     source: 'process.env',
//   };
// }

// // 🧥 Basic capsule wardrobe templates
// const CAPSULES = {
//   Spring: [
//     { category: 'Outerwear', subcategory: 'Light Jacket', recommended: 2 },
//     { category: 'Tops', subcategory: 'Oxford Shirt', recommended: 3 },
//     { category: 'Bottoms', subcategory: 'Chinos', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Loafers', recommended: 1 },
//     { category: 'Shoes', subcategory: 'Sneakers', recommended: 1 },
//   ],
//   Summer: [
//     { category: 'Tops', subcategory: 'Short Sleeve Shirt', recommended: 4 },
//     { category: 'Tops', subcategory: 'Polo Shirt', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Linen Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Loafers', recommended: 1 },
//     { category: 'Shoes', subcategory: 'Sandals', recommended: 1 },
//   ],
//   Fall: [
//     { category: 'Outerwear', subcategory: 'Field Jacket', recommended: 1 },
//     { category: 'Outerwear', subcategory: 'Blazer', recommended: 1 },
//     { category: 'Tops', subcategory: 'Knit Sweater', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Wool Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Chelsea Boots', recommended: 1 },
//   ],
//   Winter: [
//     { category: 'Outerwear', subcategory: 'Overcoat', recommended: 1 },
//     { category: 'Outerwear', subcategory: 'Heavy Parka', recommended: 1 },
//     { category: 'Tops', subcategory: 'Heavy Knit Sweater', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Wool Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Boots', recommended: 2 },
//   ],
// };

// // 🗓️ Auto-detect season based on month
// function getCurrentSeason(): 'Spring' | 'Summer' | 'Fall' | 'Winter' {
//   const month = new Date().getMonth() + 1;
//   if ([3, 4, 5].includes(month)) return 'Spring';
//   if ([6, 7, 8].includes(month)) return 'Summer';
//   if ([9, 10, 11].includes(month)) return 'Fall';
//   return 'Winter';
// }

// // 🧠 Compare wardrobe to capsule and return simple forecast text
// function generateSeasonalForecast(wardrobe: any[] = []): string | undefined {
//   const season = getCurrentSeason();
//   const capsule = CAPSULES[season];
//   if (!capsule) return;

//   const missing: string[] = [];

//   capsule.forEach((item) => {
//     const owned = wardrobe.filter(
//       (w) =>
//         w.category?.toLowerCase() === item.category.toLowerCase() &&
//         w.subcategory?.toLowerCase() === item.subcategory.toLowerCase(),
//     ).length;

//     if (owned < item.recommended) {
//       const needed = item.recommended - owned;
//       missing.push(`${needed} × ${item.subcategory}`);
//     }
//   });

//   if (missing.length === 0) {
//     return `✅ Your ${season} capsule is complete — you're ready for the season.`;
//   }

//   return `🍂 ${season} is approaching — you're missing: ${missing.join(', ')}.`;
// }

// @Injectable()
// export class AiService {
//   private openai: OpenAI;
//   private useVertex: boolean;
//   private vertexService?: VertexService; // 🔹 optional instance
//   private productSearch: ProductSearchService; // ✅ add this

//   constructor(vertexService?: VertexService) {
//     const { apiKey, project, source } = loadOpenAISecrets();

//     const snippet = apiKey?.slice(0, 20) ?? '';
//     const len = apiKey?.length ?? 0;
//     console.log('🔑 OPENAI key source:', source);
//     console.log('🔑 OPENAI key snippet:', JSON.stringify(snippet));
//     console.log('🔑 OPENAI key length:', len);
//     console.log('📂 CWD:', process.cwd());

//     if (!apiKey) {
//       throw new Error('OPENAI_API_KEY not found in .env or environment.');
//     }
//     if (/^sk-?x{3,}/i.test(apiKey)) {
//       throw new Error(
//         'OPENAI_API_KEY appears masked (e.g., "sk-xxxxx..."). Read from the correct .env instead.',
//       );
//     }
//     if (!apiKey.startsWith('sk-')) {
//       throw new Error('OPENAI_API_KEY is malformed — must start with "sk-".');
//     }

//     this.openai = new OpenAI({ apiKey, project });

//     // 🔹 New: Vertex toggle
//     this.useVertex = process.env.USE_VERTEX === 'true';
//     if (this.useVertex) {
//       this.vertexService = vertexService;
//       console.log('🧠 Vertex/Gemini mode enabled for analyze/recreate');
//     }

//     this.productSearch = new ProductSearchService(); // NEW
//   }

//   //////ANALYZE LOOK

//   async analyze(imageUrl: string) {
//     console.log('🧠 [AI] analyze() called with', imageUrl);
//     if (!imageUrl) throw new Error('Missing imageUrl');

//     // 🔹 Try Vertex first if enabled
//     if (this.useVertex && this.vertexService) {
//       try {
//         const gcsUri = imageUrl.replace(
//           'https://storage.googleapis.com/',
//           'gs://',
//         );
//         const metadata = await this.vertexService.analyzeImage(gcsUri);
//         const tags = [
//           ...(metadata.tags || []),
//           ...(metadata.style_descriptors || []),
//           metadata.main_category,
//           metadata.subcategory,
//         ].filter(Boolean);
//         console.log('🧠 [Vertex] analyze() success:', tags);
//         return { tags };
//       } catch (err: any) {
//         console.warn(
//           '[Vertex] analyze() failed → fallback to OpenAI:',
//           err.message,
//         );
//       }
//     }

//     // 🔸 OpenAI fallback
//     try {
//       const completion = await this.openai.chat.completions.create({
//         model: 'gpt-4o-mini',
//         messages: [
//           {
//             role: 'system',
//             content:
//               'You are a professional fashion classifier. Return only JSON with a "tags" array describing the outfit’s style, color palette, and vibe.',
//           },
//           {
//             role: 'user',
//             content: [
//               { type: 'text', text: 'Describe this outfit as tags only:' },
//               { type: 'image_url', image_url: { url: imageUrl } },
//             ],
//           },
//         ],
//         response_format: { type: 'json_object' },
//       });

//       const raw = completion.choices[0]?.message?.content;
//       console.log('🧠 [AI] analyze() raw response:', raw);

//       if (!raw) throw new Error('Empty response from OpenAI');
//       const parsed = JSON.parse(raw || '{}');
//       return { tags: parsed.tags || [] };
//     } catch (err: any) {
//       console.error('❌ [AI] analyze() failed:', err.message);
//       return { tags: ['casual', 'modern', 'neutral'] };
//     }
//   }

//   /* ------------------------------------------------------------
//      🧩 Weighted Tag Enrichment + Trend Injection
//   -------------------------------------------------------------*/
//   private async enrichTags(tags: string[]): Promise<string[]> {
//     const weightMap: Record<string, number> = {
//       tailored: 3,
//       minimal: 3,
//       neutral: 3,
//       modern: 2,
//       vintage: 2,
//       classic: 2,
//       streetwear: 2,
//       oversized: 2,
//       slim: 2,
//       relaxed: 2,
//       casual: 1,
//       sporty: 1,
//     };

//     // 🧹 Normalize + de-dupe
//     const cleanTags = Array.from(
//       new Set(
//         tags
//           .map((t) => t.toLowerCase().trim())
//           .filter((t) => t && !['outfit', 'style', 'fashion'].includes(t)),
//       ),
//     );

//     // 🧠 Apply weights
//     const weighted = cleanTags
//       .map((t) => ({ tag: t, weight: weightMap[t] || 1 }))
//       .sort((a, b) => b.weight - a.weight);

//     // 🌍 Inject current trend tags
//     const trendTags = await this.fetchTrendTags();
//     const final = Array.from(
//       new Set([...weighted.map((w) => w.tag), ...trendTags.slice(0, 3)]),
//     );

//     console.log('🎯 [AI] Enriched tags →', final);
//     return final;
//   }

//   /* 🔥 Pull in fashion trends (cached or RSS) */
//   // private async fetchTrendTags(): Promise<string[]> {
//   //   try {
//   //     const res = await fetch(
//   //       'https://trends.google.com/trends/hottrends/visualize/internal/data/en_us',
//   //     );
//   //     const json = await res.json().catch(() => []);
//   //     const trendWords = JSON.stringify(json).toLowerCase();
//   //     const matched = trendWords.match(
//   //       /(quiet luxury|monochrome|minimalism|maximalism|italian|tailoring|loafers|neutrals|linen|structured|preppy)/gi,
//   //     );
//   //     return matched ? Array.from(new Set(matched)) : [];
//   //   } catch {
//   //     return ['quiet luxury', 'neutral tones', 'tailored fit'];
//   //   }
//   // }

//   private async fetchTrendTags(): Promise<string[]> {
//     try {
//       const res = await fetch(
//         'https://trends.google.com/trends/hottrends/visualize/internal/data/en_us',
//       );
//       if (!res.ok) throw new Error(`HTTP ${res.status}`);
//       const json = await res.json().catch(() => []);
//       const trendWords = JSON.stringify(json).toLowerCase();
//       const matched = trendWords.match(
//         /(quiet luxury|monochrome|minimalism|maximalism|italian|tailoring|loafers|neutrals|linen|structured|preppy|flannel|earth tones|autumn layering)/gi,
//       );
//       if (matched?.length) return Array.from(new Set(matched));

//       // 🧭 If Google Trends returned empty, use local backup
//       return [
//         'quiet luxury',
//         'neutral tones',
//         'tailored fit',
//         'autumn layering',
//       ];
//     } catch (err: any) {
//       console.warn('⚠️ Trend fetch fallback triggered:', err.message);
//       return [
//         'quiet luxury',
//         'neutral tones',
//         'tailored fit',
//         'autumn layering',
//       ];
//     }
//   }

//   async recreate(
//     user_id: string,
//     tags: string[],
//     image_url?: string,
//     user_gender?: string,
//   ) {
//     console.log(
//       '🧥 [AI] recreate() called for user',
//       user_id,
//       'with tags:',
//       tags,
//       'and gender:',
//       user_gender,
//     );

//     if (!user_id) throw new Error('Missing user_id');
//     if (!tags?.length) {
//       console.warn('⚠️ [AI] recreate() empty tags → using defaults.');
//       tags = ['modern', 'neutral', 'tailored'];
//     }

//     // ✅ Weighted + trend-injected tags
//     tags = await this.enrichTags(tags);

//     // 🧠 Fetch gender_presentation if missing
//     if (!user_gender) {
//       try {
//         const result = await pool.query(
//           'SELECT gender_presentation FROM users WHERE id = $1 LIMIT 1',
//           [user_id],
//         );
//         user_gender = result.rows[0]?.gender_presentation || 'neutral';
//       } catch {
//         user_gender = 'neutral';
//       }
//     }

//     // 🧩 Normalize gender
//     const normalizedGender =
//       user_gender?.toLowerCase().includes('female') ||
//       user_gender?.toLowerCase().includes('woman')
//         ? 'female'
//         : user_gender?.toLowerCase().includes('male') ||
//             user_gender?.toLowerCase().includes('man')
//           ? 'male'
//           : process.env.DEFAULT_GENDER || 'neutral';

//     // 🧠 Build stylist prompt
//     const prompt = `
// You are a world-class AI stylist for ${normalizedGender} fashion.
// Create a cohesive outfit inspired by an uploaded look.

// Client: ${user_id}
// Image: ${image_url || 'N/A'}
// Detected tags: ${tags.join(', ')}

// Rules:
// - Match fabric, color palette, and silhouette.
// - Use ${normalizedGender}-appropriate pieces.
// - Output only JSON:
// {
//   "outfit": [
//     { "category": "Top", "item": "Grey Cotton Tee", "color": "gray" },
//     { "category": "Bottom", "item": "Navy Chinos", "color": "navy" },
//     { "category": "Outerwear", "item": "Beige Overshirt", "color": "beige" },
//     { "category": "Shoes", "item": "White Sneakers", "color": "white" }
//   ],
//   "style_note": "Describe how the look connects to the uploaded image."
// }
// `;

//     // 🧠 Generate outfit via Vertex or OpenAI
//     let parsed: any;
//     if (this.useVertex && this.vertexService) {
//       try {
//         const result = await this.vertexService.generateReasonedOutfit(prompt);
//         let text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
//         text = text
//           .replace(/^```json\s*/i, '')
//           .replace(/```$/, '')
//           .trim();
//         parsed = JSON.parse(text);
//         console.log('🧠 [Vertex] recreate() success');
//       } catch (err: any) {
//         console.warn('[Vertex] recreate() failed → fallback', err.message);
//       }
//     }

//     if (!parsed) {
//       const completion = await this.openai.chat.completions.create({
//         model: 'gpt-4o-mini',
//         temperature: 0.7,
//         messages: [{ role: 'user', content: prompt }],
//         response_format: { type: 'json_object' },
//       });

//       const raw = completion.choices[0]?.message?.content || '{}';
//       try {
//         parsed = JSON.parse(raw);
//       } catch {
//         parsed = {};
//       }
//     }

//     const outfit = Array.isArray(parsed?.outfit) ? parsed.outfit : [];
//     const style_note =
//       parsed?.style_note || 'Modern outfit inspired by the uploaded look.';

//     // 🛍️ Enrich each item with live products
//     const enriched = await Promise.all(
//       outfit.map(async (o: any) => {
//         const query =
//           `${normalizedGender} ${o.item || o.category || ''} ${o.color || ''}`.trim();
//         let products = await this.productSearch.search(query);
//         let top = products[0];

//         if (!top?.image || top.image.includes('No_image')) {
//           const serp = await this.productSearch.searchSerpApi(query);
//           if (serp?.[0]) top = { ...serp[0], source: 'SerpAPI' };
//         }

//         const materialHint =
//           query.match(/(wool|cotton|linen|leather|denim|polyester)/i)?.[0] ||
//           null;
//         const seasonalityHint =
//           query.match(/(summer|winter|fall|spring)/i)?.[0] ||
//           getCurrentSeason();
//         const fitHint =
//           query.match(/(slim|regular|relaxed|oversized|tailored)/i)?.[0] ||
//           'regular';

//         return {
//           category: o.category,
//           item: o.item,
//           color: o.color,
//           brand: top?.brand || 'Unknown',
//           price: top?.price || '—',
//           image:
//             top?.image && top.image.startsWith('http')
//               ? top.image
//               : 'https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg',
//           shopUrl:
//             top?.shopUrl ||
//             `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=shop`,
//           source: top?.source || 'ASOS / Fallback',
//           material: materialHint,
//           seasonality: seasonalityHint,
//           fit: fitHint,
//         };
//       }),
//     );

//     return { user_id, outfit: enriched, style_note };
//   }

//   // 👔 PERSONALIZED SHOP — image + wardrobe + preferences
//   async personalizedShop(
//     user_id: string,
//     image_url: string,
//     user_gender?: string,
//   ) {
//     if (!user_id || !image_url) throw new Error('Missing user_id or image_url');

//     // 1) Analyze uploaded image
//     const analysis = await this.analyze(image_url);
//     const tags = analysis?.tags || [];

//     const { rows: wardrobe } = await pool.query(
//       `SELECT name, main_category AS category, subcategory, color, material
//    FROM wardrobe_items
//    WHERE user_id::text = $1
//    ORDER BY updated_at DESC
//    LIMIT 50`,
//       [user_id],
//     );

//     const prefRes = await pool.query(
//       `SELECT gender_presentation
//      FROM users
//      WHERE id = $1
//      LIMIT 1`,
//       [user_id],
//     );
//     const profile = prefRes.rows[0] || {};
//     const gender = user_gender || profile.gender_presentation || 'neutral';
//     const preferences = {}; // fallback

//     // 3) Ask model to split into "owned" vs "missing"
//     const prompt = `
// You are a personal stylist. Recreate the uploaded look using the user's wardrobe and taste.
// Return ONLY JSON with:
// {
//   "recreated_outfit": [ { "source":"wardrobe", "category":"Top", "item":"...", "color":"..." }, ... ],
//   "suggested_purchases": [ { "category":"...", "item":"...", "color":"...", "material":"..." }, ... ],
//   "style_note": "..."
// }

// User gender: ${gender}
// Detected tags: ${tags.join(', ')}
// User preferences: ${JSON.stringify(preferences)}
// User wardrobe (subset): ${JSON.stringify(wardrobe)}
// `;

//     console.log('🧥 [personalizedShop] wardrobe count:', wardrobe?.length);
//     console.log('🧥 [personalizedShop] wardrobe sample:', wardrobe?.[0]);

//     console.log('🧥 [personalizedShop] profile:', profile);
//     console.log('🧥 [personalizedShop] gender:', gender);
//     console.log('🧥 [personalizedShop] preferences:', preferences);

//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o-mini',
//       temperature: 0.7,
//       messages: [{ role: 'user', content: prompt }],
//       response_format: { type: 'json_object' },
//     });

//     let parsed: any = {};
//     try {
//       parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
//     } catch {
//       parsed = {};
//     }

//     const purchases = Array.isArray(parsed?.suggested_purchases)
//       ? parsed.suggested_purchases
//       : [];

//     // 4) Attach live shop links to the "missing" items
//     const enrichedPurchases = await Promise.all(
//       purchases.map(async (p: any) => {
//         const q = [
//           gender,
//           p.item || p.category || '',
//           p.color || '',
//           p.material || '',
//         ]
//           .filter(Boolean)
//           .join(' ')
//           .trim();

//         const products = await this.productSearch.search(q);
//         return { ...p, query: q, products };
//       }),
//     );

//     return {
//       user_id,
//       image_url,
//       tags,
//       recreated_outfit: parsed?.recreated_outfit || [],
//       suggested_purchases: enrichedPurchases,
//       style_note:
//         parsed?.style_note || 'Personalized recreation based on your wardrobe.',
//     };
//   }

//   ////////END CREATE LOOK

//   //////. START REPLACED CHAT WITH LINKS AND SEARCH NET

//   /** 🧠 Conversational fashion chat — now with visuals + links */
//   async chat(dto: ChatDto) {
//     const { messages } = dto;
//     const lastUserMsg = messages
//       .slice()
//       .reverse()
//       .find((m) => m.role === 'user')?.content;

//     if (!lastUserMsg) {
//       throw new Error('No user message provided');
//     }

//     // 1️⃣ Generate base text with OpenAI
//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         {
//           role: 'system',
//           content: `
// You are a world-class personal fashion stylist.
// Respond naturally and helpfully about outfits, wardrobe planning, or styling.
// At the end of your reasoning, also return a short JSON block like:
// {"search_terms":["smart casual men","navy blazer outfit","loafers"]}
//         `,
//         },
//         ...messages,
//       ],
//     });

//     const aiReply =
//       completion.choices[0]?.message?.content?.trim() ||
//       'Styled response unavailable.';

//     // 2️⃣ Extract search terms if model provided them
//     let searchTerms: string[] = [];
//     const match = aiReply.match(/\{.*"search_terms":.*\}/s);
//     if (match) {
//       try {
//         const parsed = JSON.parse(match[0]);
//         searchTerms = parsed.search_terms ?? [];
//       } catch {
//         searchTerms = [];
//       }
//     }

//     // 3️⃣ Fallback heuristic: derive terms if none found
//     if (!searchTerms.length) {
//       const lowered = lastUserMsg.toLowerCase();
//       if (lowered.includes('smart')) searchTerms.push('smart casual outfit');
//       if (lowered.includes('summer')) searchTerms.push('summer outfit');
//       if (lowered.includes('work')) searchTerms.push('business casual look');
//       if (!searchTerms.length)
//         searchTerms.push(`${lowered} outfit inspiration`);
//     }

//     // 4️⃣ Fetch Unsplash images
//     const images = await this.fetchUnsplash(searchTerms);

//     // 5️⃣ Build shoppable links
//     const links = searchTerms.map((term) => ({
//       label: `Shop ${term} on ASOS`,
//       url: `https://www.asos.com/search/?q=${encodeURIComponent(term)}`,
//     }));

//     return { reply: aiReply, images, links };
//   }

//   /** 🔍 Lightweight Unsplash fetch helper */
//   private async fetchUnsplash(terms: string[]) {
//     const key = process.env.UNSPLASH_ACCESS_KEY;
//     if (!key || !terms.length) return [];
//     const q = encodeURIComponent(terms[0]);
//     const res = await fetch(
//       `https://api.unsplash.com/search/photos?query=${q}&per_page=5&client_id=${key}`,
//     );
//     if (!res.ok) return [];
//     const json = await res.json();
//     return json.results.map((r) => ({
//       imageUrl: r.urls.small,
//       title: r.description || r.alt_description,
//       sourceLink: r.links.html,
//     }));
//   }

//   /** 🌤️ Suggest daily style plan */
//   async suggest(body: {
//     user?: string;
//     weather?: any;
//     wardrobe?: any[];
//     preferences?: Record<string, any>;
//   }) {
//     const { user, weather, wardrobe, preferences } = body;

//     const temp = weather?.fahrenheit?.main?.temp;
//     const tempDesc = temp
//       ? `${temp}°F and ${temp < 60 ? 'cool' : temp > 85 ? 'warm' : 'mild'} weather`
//       : 'unknown temperature';

//     const wardrobeCount = wardrobe?.length || 0;

//     const systemPrompt = `
// You are a luxury personal stylist.
// Your goal is to provide a daily style briefing that helps the user feel prepared, stylish, and confident.
// Be concise, intelligent, and polished — similar to a stylist at a high-end menswear brand.

// Output must be JSON with:
// - suggestion
// - insight
// - tomorrow
// Optionally include seasonalForecast, lifecycleForecast, styleTrajectory.
// `;

//     const userPrompt = `
// Client: ${user || 'The user'}
// Weather: ${tempDesc}
// Wardrobe items: ${wardrobeCount}
// Preferences: ${JSON.stringify(preferences || {})}
// `;

//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         { role: 'system', content: systemPrompt },
//         { role: 'user', content: userPrompt },
//       ],
//       response_format: { type: 'json_object' },
//     });

//     const raw = completion.choices[0]?.message?.content;
//     if (!raw) throw new Error('No suggestion response received from model.');

//     let parsed: {
//       suggestion: string;
//       insight: string;
//       tomorrow: string;
//       seasonalForecast?: string;
//       lifecycleForecast?: string;
//       styleTrajectory?: string;
//     };

//     try {
//       parsed = JSON.parse(raw);
//     } catch {
//       console.error('❌ Failed to parse AI JSON:', raw);
//       throw new Error('AI response was not valid JSON.');
//     }

//     if (!parsed.seasonalForecast) {
//       parsed.seasonalForecast = generateSeasonalForecast(wardrobe);
//     }

//     return parsed;
//   }
// }

// // END REPLACED CHAT WITH LINKS AND SEARCH NET

///////////////////

// import { Injectable } from '@nestjs/common';
// import OpenAI from 'openai';
// import { ChatDto } from './dto/chat.dto';
// import { VertexService } from '../vertex/vertex.service'; // 🔹 ADDED
// import { ProductSearchService } from '../product-services/product-search.service';
// import { Pool } from 'pg';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// import * as fs from 'fs';
// import * as path from 'path';
// import * as dotenv from 'dotenv';

// function loadOpenAISecrets(): {
//   apiKey?: string;
//   project?: string;
//   source: string;
// } {
//   const candidates = [
//     path.join(process.cwd(), '.env'),
//     path.join(process.cwd(), 'apps', 'backend-nest', '.env'),
//     path.join(__dirname, '..', '..', '.env'),
//   ];

//   for (const p of candidates) {
//     try {
//       if (fs.existsSync(p)) {
//         const parsed = dotenv.parse(fs.readFileSync(p));
//         const apiKey = parsed['OPENAI_API_KEY'];
//         const project = parsed['OPENAI_PROJECT_ID'];
//         if (apiKey) return { apiKey, project, source: p };
//       }
//     } catch {
//       // ignore
//     }
//   }

//   return {
//     apiKey: process.env.OPENAI_API_KEY,
//     project: process.env.OPENAI_PROJECT_ID,
//     source: 'process.env',
//   };
// }

// // 🧥 Basic capsule wardrobe templates
// const CAPSULES = {
//   Spring: [
//     { category: 'Outerwear', subcategory: 'Light Jacket', recommended: 2 },
//     { category: 'Tops', subcategory: 'Oxford Shirt', recommended: 3 },
//     { category: 'Bottoms', subcategory: 'Chinos', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Loafers', recommended: 1 },
//     { category: 'Shoes', subcategory: 'Sneakers', recommended: 1 },
//   ],
//   Summer: [
//     { category: 'Tops', subcategory: 'Short Sleeve Shirt', recommended: 4 },
//     { category: 'Tops', subcategory: 'Polo Shirt', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Linen Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Loafers', recommended: 1 },
//     { category: 'Shoes', subcategory: 'Sandals', recommended: 1 },
//   ],
//   Fall: [
//     { category: 'Outerwear', subcategory: 'Field Jacket', recommended: 1 },
//     { category: 'Outerwear', subcategory: 'Blazer', recommended: 1 },
//     { category: 'Tops', subcategory: 'Knit Sweater', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Wool Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Chelsea Boots', recommended: 1 },
//   ],
//   Winter: [
//     { category: 'Outerwear', subcategory: 'Overcoat', recommended: 1 },
//     { category: 'Outerwear', subcategory: 'Heavy Parka', recommended: 1 },
//     { category: 'Tops', subcategory: 'Heavy Knit Sweater', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Wool Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Boots', recommended: 2 },
//   ],
// };

// // 🗓️ Auto-detect season based on month
// function getCurrentSeason(): 'Spring' | 'Summer' | 'Fall' | 'Winter' {
//   const month = new Date().getMonth() + 1;
//   if ([3, 4, 5].includes(month)) return 'Spring';
//   if ([6, 7, 8].includes(month)) return 'Summer';
//   if ([9, 10, 11].includes(month)) return 'Fall';
//   return 'Winter';
// }

// // 🧠 Compare wardrobe to capsule and return simple forecast text
// function generateSeasonalForecast(wardrobe: any[] = []): string | undefined {
//   const season = getCurrentSeason();
//   const capsule = CAPSULES[season];
//   if (!capsule) return;

//   const missing: string[] = [];

//   capsule.forEach((item) => {
//     const owned = wardrobe.filter(
//       (w) =>
//         w.category?.toLowerCase() === item.category.toLowerCase() &&
//         w.subcategory?.toLowerCase() === item.subcategory.toLowerCase(),
//     ).length;

//     if (owned < item.recommended) {
//       const needed = item.recommended - owned;
//       missing.push(`${needed} × ${item.subcategory}`);
//     }
//   });

//   if (missing.length === 0) {
//     return `✅ Your ${season} capsule is complete — you're ready for the season.`;
//   }

//   return `🍂 ${season} is approaching — you're missing: ${missing.join(', ')}.`;
// }

// @Injectable()
// export class AiService {
//   private openai: OpenAI;
//   private useVertex: boolean;
//   private vertexService?: VertexService; // 🔹 optional instance
//   private productSearch: ProductSearchService; // ✅ add this

//   constructor(vertexService?: VertexService) {
//     const { apiKey, project, source } = loadOpenAISecrets();

//     const snippet = apiKey?.slice(0, 20) ?? '';
//     const len = apiKey?.length ?? 0;
//     console.log('🔑 OPENAI key source:', source);
//     console.log('🔑 OPENAI key snippet:', JSON.stringify(snippet));
//     console.log('🔑 OPENAI key length:', len);
//     console.log('📂 CWD:', process.cwd());

//     if (!apiKey) {
//       throw new Error('OPENAI_API_KEY not found in .env or environment.');
//     }
//     if (/^sk-?x{3,}/i.test(apiKey)) {
//       throw new Error(
//         'OPENAI_API_KEY appears masked (e.g., "sk-xxxxx..."). Read from the correct .env instead.',
//       );
//     }
//     if (!apiKey.startsWith('sk-')) {
//       throw new Error('OPENAI_API_KEY is malformed — must start with "sk-".');
//     }

//     this.openai = new OpenAI({ apiKey, project });

//     // 🔹 New: Vertex toggle
//     this.useVertex = process.env.USE_VERTEX === 'true';
//     if (this.useVertex) {
//       this.vertexService = vertexService;
//       console.log('🧠 Vertex/Gemini mode enabled for analyze/recreate');
//     }

//     this.productSearch = new ProductSearchService(); // NEW
//   }

//   //////ANALYZE LOOK

//   async analyze(imageUrl: string) {
//     console.log('🧠 [AI] analyze() called with', imageUrl);
//     if (!imageUrl) throw new Error('Missing imageUrl');

//     // 🔹 Try Vertex first if enabled
//     if (this.useVertex && this.vertexService) {
//       try {
//         const gcsUri = imageUrl.replace(
//           'https://storage.googleapis.com/',
//           'gs://',
//         );
//         const metadata = await this.vertexService.analyzeImage(gcsUri);
//         const tags = [
//           ...(metadata.tags || []),
//           ...(metadata.style_descriptors || []),
//           metadata.main_category,
//           metadata.subcategory,
//         ].filter(Boolean);
//         console.log('🧠 [Vertex] analyze() success:', tags);
//         return { tags };
//       } catch (err: any) {
//         console.warn(
//           '[Vertex] analyze() failed → fallback to OpenAI:',
//           err.message,
//         );
//       }
//     }

//     // 🔸 OpenAI fallback
//     try {
//       const completion = await this.openai.chat.completions.create({
//         model: 'gpt-4o-mini',
//         messages: [
//           {
//             role: 'system',
//             content:
//               'You are a professional fashion classifier. Return only JSON with a "tags" array describing the outfit’s style, color palette, and vibe.',
//           },
//           {
//             role: 'user',
//             content: [
//               { type: 'text', text: 'Describe this outfit as tags only:' },
//               { type: 'image_url', image_url: { url: imageUrl } },
//             ],
//           },
//         ],
//         response_format: { type: 'json_object' },
//       });

//       const raw = completion.choices[0]?.message?.content;
//       console.log('🧠 [AI] analyze() raw response:', raw);

//       if (!raw) throw new Error('Empty response from OpenAI');
//       const parsed = JSON.parse(raw || '{}');
//       return { tags: parsed.tags || [] };
//     } catch (err: any) {
//       console.error('❌ [AI] analyze() failed:', err.message);
//       return { tags: ['casual', 'modern', 'neutral'] };
//     }
//   }

//   /* ------------------------------------------------------------
//      🧩 Weighted Tag Enrichment + Trend Injection
//   -------------------------------------------------------------*/
//   private async enrichTags(tags: string[]): Promise<string[]> {
//     const weightMap: Record<string, number> = {
//       tailored: 3,
//       minimal: 3,
//       neutral: 3,
//       modern: 2,
//       vintage: 2,
//       classic: 2,
//       streetwear: 2,
//       oversized: 2,
//       slim: 2,
//       relaxed: 2,
//       casual: 1,
//       sporty: 1,
//     };

//     // 🧹 Normalize + de-dupe
//     const cleanTags = Array.from(
//       new Set(
//         tags
//           .map((t) => t.toLowerCase().trim())
//           .filter((t) => t && !['outfit', 'style', 'fashion'].includes(t)),
//       ),
//     );

//     // 🧠 Apply weights
//     const weighted = cleanTags
//       .map((t) => ({ tag: t, weight: weightMap[t] || 1 }))
//       .sort((a, b) => b.weight - a.weight);

//     // 🌍 Inject current trend tags
//     const trendTags = await this.fetchTrendTags();
//     const final = Array.from(
//       new Set([...weighted.map((w) => w.tag), ...trendTags.slice(0, 3)]),
//     );

//     console.log('🎯 [AI] Enriched tags →', final);
//     return final;
//   }

//   /* 🔥 Pull in fashion trends (cached or RSS) */
//   // private async fetchTrendTags(): Promise<string[]> {
//   //   try {
//   //     const res = await fetch(
//   //       'https://trends.google.com/trends/hottrends/visualize/internal/data/en_us',
//   //     );
//   //     const json = await res.json().catch(() => []);
//   //     const trendWords = JSON.stringify(json).toLowerCase();
//   //     const matched = trendWords.match(
//   //       /(quiet luxury|monochrome|minimalism|maximalism|italian|tailoring|loafers|neutrals|linen|structured|preppy)/gi,
//   //     );
//   //     return matched ? Array.from(new Set(matched)) : [];
//   //   } catch {
//   //     return ['quiet luxury', 'neutral tones', 'tailored fit'];
//   //   }
//   // }

//   private async fetchTrendTags(): Promise<string[]> {
//     try {
//       const res = await fetch(
//         'https://trends.google.com/trends/hottrends/visualize/internal/data/en_us',
//       );
//       if (!res.ok) throw new Error(`HTTP ${res.status}`);
//       const json = await res.json().catch(() => []);
//       const trendWords = JSON.stringify(json).toLowerCase();
//       const matched = trendWords.match(
//         /(quiet luxury|monochrome|minimalism|maximalism|italian|tailoring|loafers|neutrals|linen|structured|preppy|flannel|earth tones|autumn layering)/gi,
//       );
//       if (matched?.length) return Array.from(new Set(matched));

//       // 🧭 If Google Trends returned empty, use local backup
//       return [
//         'quiet luxury',
//         'neutral tones',
//         'tailored fit',
//         'autumn layering',
//       ];
//     } catch (err: any) {
//       console.warn('⚠️ Trend fetch fallback triggered:', err.message);
//       return [
//         'quiet luxury',
//         'neutral tones',
//         'tailored fit',
//         'autumn layering',
//       ];
//     }
//   }

//   async recreate(
//     user_id: string,
//     tags: string[],
//     image_url?: string,
//     user_gender?: string,
//   ) {
//     console.log(
//       '🧥 [AI] recreate() called for user',
//       user_id,
//       'with tags:',
//       tags,
//       'and gender:',
//       user_gender,
//     );

//     if (!user_id) throw new Error('Missing user_id');
//     if (!tags?.length) {
//       console.warn('⚠️ [AI] recreate() empty tags → using defaults.');
//       tags = ['modern', 'neutral', 'tailored'];
//     }

//     // ✅ Weighted + trend-injected tags
//     tags = await this.enrichTags(tags);

//     // 🧠 Fetch gender_presentation if missing
//     if (!user_gender) {
//       try {
//         const result = await pool.query(
//           'SELECT gender_presentation FROM users WHERE id = $1 LIMIT 1',
//           [user_id],
//         );
//         user_gender = result.rows[0]?.gender_presentation || 'neutral';
//       } catch {
//         user_gender = 'neutral';
//       }
//     }

//     // 🧩 Normalize gender
//     const normalizedGender =
//       user_gender?.toLowerCase().includes('female') ||
//       user_gender?.toLowerCase().includes('woman')
//         ? 'female'
//         : user_gender?.toLowerCase().includes('male') ||
//             user_gender?.toLowerCase().includes('man')
//           ? 'male'
//           : process.env.DEFAULT_GENDER || 'neutral';

//     // 🧠 Build stylist prompt
//     const prompt = `
// You are a world-class AI stylist for ${normalizedGender} fashion.
// Create a cohesive outfit inspired by an uploaded look.

// Client: ${user_id}
// Image: ${image_url || 'N/A'}
// Detected tags: ${tags.join(', ')}

// Rules:
// - Match fabric, color palette, and silhouette.
// - Use ${normalizedGender}-appropriate pieces.
// - Output only JSON:
// {
//   "outfit": [
//     { "category": "Top", "item": "Grey Cotton Tee", "color": "gray" },
//     { "category": "Bottom", "item": "Navy Chinos", "color": "navy" },
//     { "category": "Outerwear", "item": "Beige Overshirt", "color": "beige" },
//     { "category": "Shoes", "item": "White Sneakers", "color": "white" }
//   ],
//   "style_note": "Describe how the look connects to the uploaded image."
// }
// `;

//     // 🧠 Generate outfit via Vertex or OpenAI
//     let parsed: any;
//     if (this.useVertex && this.vertexService) {
//       try {
//         const result = await this.vertexService.generateReasonedOutfit(prompt);
//         let text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
//         text = text
//           .replace(/^```json\s*/i, '')
//           .replace(/```$/, '')
//           .trim();
//         parsed = JSON.parse(text);
//         console.log('🧠 [Vertex] recreate() success');
//       } catch (err: any) {
//         console.warn('[Vertex] recreate() failed → fallback', err.message);
//       }
//     }

//     if (!parsed) {
//       const completion = await this.openai.chat.completions.create({
//         model: 'gpt-4o-mini',
//         temperature: 0.7,
//         messages: [{ role: 'user', content: prompt }],
//         response_format: { type: 'json_object' },
//       });

//       const raw = completion.choices[0]?.message?.content || '{}';
//       try {
//         parsed = JSON.parse(raw);
//       } catch {
//         parsed = {};
//       }
//     }

//     const outfit = Array.isArray(parsed?.outfit) ? parsed.outfit : [];
//     const style_note =
//       parsed?.style_note || 'Modern outfit inspired by the uploaded look.';

//     // 🛍️ Enrich each item with live products
//     const enriched = await Promise.all(
//       outfit.map(async (o: any) => {
//         const query =
//           `${normalizedGender} ${o.item || o.category || ''} ${o.color || ''}`.trim();
//         let products = await this.productSearch.search(query);
//         let top = products[0];

//         if (!top?.image || top.image.includes('No_image')) {
//           const serp = await this.productSearch.searchSerpApi(query);
//           if (serp?.[0]) top = { ...serp[0], source: 'SerpAPI' };
//         }

//         const materialHint =
//           query.match(/(wool|cotton|linen|leather|denim|polyester)/i)?.[0] ||
//           null;
//         const seasonalityHint =
//           query.match(/(summer|winter|fall|spring)/i)?.[0] ||
//           getCurrentSeason();
//         const fitHint =
//           query.match(/(slim|regular|relaxed|oversized|tailored)/i)?.[0] ||
//           'regular';

//         return {
//           category: o.category,
//           item: o.item,
//           color: o.color,
//           brand: top?.brand || 'Unknown',
//           price: top?.price || '—',
//           image:
//             top?.image && top.image.startsWith('http')
//               ? top.image
//               : 'https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg',
//           shopUrl:
//             top?.shopUrl ||
//             `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=shop`,
//           source: top?.source || 'ASOS / Fallback',
//           material: materialHint,
//           seasonality: seasonalityHint,
//           fit: fitHint,
//         };
//       }),
//     );

//     return { user_id, outfit: enriched, style_note };
//   }

//   ////////END CREATE LOOK

//   //////. START REPLACED CHAT WITH LINKS AND SEARCH NET
//   //   async chat(dto: ChatDto) {
//   //     const { messages } = dto;
//   //     const lastUserMsg = messages
//   //       .slice()
//   //       .reverse()
//   //       .find((m) => m.role === 'user')?.content;

//   //     if (!lastUserMsg) {
//   //       throw new Error('No user message provided');
//   //     }

//   //     const completion = await this.openai.chat.completions.create({
//   //       model: 'gpt-4o',
//   //       temperature: 0.8,
//   //       messages: [
//   //         {
//   //           role: 'system',
//   //           content:
//   //             'You are a world-class personal fashion stylist. Give sleek, modern, practical outfit advice with attention to silhouette, color harmony, occasion, climate, and user comfort. Keep responses concise and actionable.',
//   //         },
//   //         ...messages,
//   //       ],
//   //     });

//   //     const aiReply =
//   //       completion.choices[0]?.message?.content?.trim() ||
//   //       'Styled response unavailable.';

//   //     return { reply: aiReply };
//   //   }

//   //   async suggest(body: {
//   //     user?: string;
//   //     weather?: any;
//   //     wardrobe?: any[];
//   //     preferences?: Record<string, any>;
//   //   }) {
//   //     const { user, weather, wardrobe, preferences } = body;

//   //     const temp = weather?.fahrenheit?.main?.temp;
//   //     const tempDesc = temp
//   //       ? `${temp}°F and ${temp < 60 ? 'cool' : temp > 85 ? 'warm' : 'mild'} weather`
//   //       : 'unknown temperature';

//   //     const wardrobeCount = wardrobe?.length || 0;

//   //     const systemPrompt = `
//   // You are a luxury personal stylist.
//   // Your goal is to provide a daily style briefing that helps the user feel prepared, stylish, and confident.
//   // Be concise, intelligent, and polished — similar to a stylist at a high-end menswear brand.

//   // Output must be JSON with the following fields:
//   // - suggestion (string)
//   // - insight (string)
//   // - tomorrow (string)
//   // Optionally include seasonalForecast, lifecycleForecast, styleTrajectory.
//   // `;

//   //     const userPrompt = `
//   // Client: ${user || 'The user'}
//   // Weather: ${tempDesc}
//   // Wardrobe items: ${wardrobeCount}
//   // Preferences: ${JSON.stringify(preferences || {})}
//   // `;

//   //     const completion = await this.openai.chat.completions.create({
//   //       model: 'gpt-4o',
//   //       temperature: 0.8,
//   //       messages: [
//   //         { role: 'system', content: systemPrompt },
//   //         { role: 'user', content: userPrompt },
//   //       ],
//   //       response_format: { type: 'json_object' },
//   //     });

//   //     const raw = completion.choices[0]?.message?.content;
//   //     if (!raw) throw new Error('No suggestion response received from model.');

//   //     let parsed: {
//   //       suggestion: string;
//   //       insight: string;
//   //       tomorrow: string;
//   //       seasonalForecast?: string;
//   //       lifecycleForecast?: string;
//   //       styleTrajectory?: string;
//   //     };
//   //     try {
//   //       parsed = JSON.parse(raw);
//   //     } catch {
//   //       console.error('❌ Failed to parse AI JSON:', raw);
//   //       throw new Error('AI response was not valid JSON.');
//   //     }

//   //     if (!parsed.seasonalForecast) {
//   //       parsed.seasonalForecast = generateSeasonalForecast(wardrobe);
//   //     }

//   //     return parsed;
//   //   }
//   // }

//   /** 🧠 Conversational fashion chat — now with visuals + links */
//   async chat(dto: ChatDto) {
//     const { messages } = dto;
//     const lastUserMsg = messages
//       .slice()
//       .reverse()
//       .find((m) => m.role === 'user')?.content;

//     if (!lastUserMsg) {
//       throw new Error('No user message provided');
//     }

//     // 1️⃣ Generate base text with OpenAI
//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         {
//           role: 'system',
//           content: `
// You are a world-class personal fashion stylist.
// Respond naturally and helpfully about outfits, wardrobe planning, or styling.
// At the end of your reasoning, also return a short JSON block like:
// {"search_terms":["smart casual men","navy blazer outfit","loafers"]}
//         `,
//         },
//         ...messages,
//       ],
//     });

//     const aiReply =
//       completion.choices[0]?.message?.content?.trim() ||
//       'Styled response unavailable.';

//     // 2️⃣ Extract search terms if model provided them
//     let searchTerms: string[] = [];
//     const match = aiReply.match(/\{.*"search_terms":.*\}/s);
//     if (match) {
//       try {
//         const parsed = JSON.parse(match[0]);
//         searchTerms = parsed.search_terms ?? [];
//       } catch {
//         searchTerms = [];
//       }
//     }

//     // 3️⃣ Fallback heuristic: derive terms if none found
//     if (!searchTerms.length) {
//       const lowered = lastUserMsg.toLowerCase();
//       if (lowered.includes('smart')) searchTerms.push('smart casual outfit');
//       if (lowered.includes('summer')) searchTerms.push('summer outfit');
//       if (lowered.includes('work')) searchTerms.push('business casual look');
//       if (!searchTerms.length)
//         searchTerms.push(`${lowered} outfit inspiration`);
//     }

//     // 4️⃣ Fetch Unsplash images
//     const images = await this.fetchUnsplash(searchTerms);

//     // 5️⃣ Build shoppable links
//     const links = searchTerms.map((term) => ({
//       label: `Shop ${term} on ASOS`,
//       url: `https://www.asos.com/search/?q=${encodeURIComponent(term)}`,
//     }));

//     return { reply: aiReply, images, links };
//   }

//   /** 🔍 Lightweight Unsplash fetch helper */
//   private async fetchUnsplash(terms: string[]) {
//     const key = process.env.UNSPLASH_ACCESS_KEY;
//     if (!key || !terms.length) return [];
//     const q = encodeURIComponent(terms[0]);
//     const res = await fetch(
//       `https://api.unsplash.com/search/photos?query=${q}&per_page=5&client_id=${key}`,
//     );
//     if (!res.ok) return [];
//     const json = await res.json();
//     return json.results.map((r) => ({
//       imageUrl: r.urls.small,
//       title: r.description || r.alt_description,
//       sourceLink: r.links.html,
//     }));
//   }

//   /** 🌤️ Suggest daily style plan */
//   async suggest(body: {
//     user?: string;
//     weather?: any;
//     wardrobe?: any[];
//     preferences?: Record<string, any>;
//   }) {
//     const { user, weather, wardrobe, preferences } = body;

//     const temp = weather?.fahrenheit?.main?.temp;
//     const tempDesc = temp
//       ? `${temp}°F and ${temp < 60 ? 'cool' : temp > 85 ? 'warm' : 'mild'} weather`
//       : 'unknown temperature';

//     const wardrobeCount = wardrobe?.length || 0;

//     const systemPrompt = `
// You are a luxury personal stylist.
// Your goal is to provide a daily style briefing that helps the user feel prepared, stylish, and confident.
// Be concise, intelligent, and polished — similar to a stylist at a high-end menswear brand.

// Output must be JSON with:
// - suggestion
// - insight
// - tomorrow
// Optionally include seasonalForecast, lifecycleForecast, styleTrajectory.
// `;

//     const userPrompt = `
// Client: ${user || 'The user'}
// Weather: ${tempDesc}
// Wardrobe items: ${wardrobeCount}
// Preferences: ${JSON.stringify(preferences || {})}
// `;

//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         { role: 'system', content: systemPrompt },
//         { role: 'user', content: userPrompt },
//       ],
//       response_format: { type: 'json_object' },
//     });

//     const raw = completion.choices[0]?.message?.content;
//     if (!raw) throw new Error('No suggestion response received from model.');

//     let parsed: {
//       suggestion: string;
//       insight: string;
//       tomorrow: string;
//       seasonalForecast?: string;
//       lifecycleForecast?: string;
//       styleTrajectory?: string;
//     };

//     try {
//       parsed = JSON.parse(raw);
//     } catch {
//       console.error('❌ Failed to parse AI JSON:', raw);
//       throw new Error('AI response was not valid JSON.');
//     }

//     if (!parsed.seasonalForecast) {
//       parsed.seasonalForecast = generateSeasonalForecast(wardrobe);
//     }

//     return parsed;
//   }
// }

// // END REPLACED CHAT WITH LINKS AND SEARCH NET

//////////////////

// import { Injectable } from '@nestjs/common';
// import OpenAI from 'openai';
// import { ChatDto } from './dto/chat.dto';
// import { VertexService } from '../vertex/vertex.service'; // 🔹 ADDED
// import { ProductSearchService } from '../product-services/product-search.service';
// import { Pool } from 'pg';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// import * as fs from 'fs';
// import * as path from 'path';
// import * as dotenv from 'dotenv';

// function loadOpenAISecrets(): {
//   apiKey?: string;
//   project?: string;
//   source: string;
// } {
//   const candidates = [
//     path.join(process.cwd(), '.env'),
//     path.join(process.cwd(), 'apps', 'backend-nest', '.env'),
//     path.join(__dirname, '..', '..', '.env'),
//   ];

//   for (const p of candidates) {
//     try {
//       if (fs.existsSync(p)) {
//         const parsed = dotenv.parse(fs.readFileSync(p));
//         const apiKey = parsed['OPENAI_API_KEY'];
//         const project = parsed['OPENAI_PROJECT_ID'];
//         if (apiKey) return { apiKey, project, source: p };
//       }
//     } catch {
//       // ignore
//     }
//   }

//   return {
//     apiKey: process.env.OPENAI_API_KEY,
//     project: process.env.OPENAI_PROJECT_ID,
//     source: 'process.env',
//   };
// }

// // 🧥 Basic capsule wardrobe templates
// const CAPSULES = {
//   Spring: [
//     { category: 'Outerwear', subcategory: 'Light Jacket', recommended: 2 },
//     { category: 'Tops', subcategory: 'Oxford Shirt', recommended: 3 },
//     { category: 'Bottoms', subcategory: 'Chinos', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Loafers', recommended: 1 },
//     { category: 'Shoes', subcategory: 'Sneakers', recommended: 1 },
//   ],
//   Summer: [
//     { category: 'Tops', subcategory: 'Short Sleeve Shirt', recommended: 4 },
//     { category: 'Tops', subcategory: 'Polo Shirt', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Linen Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Loafers', recommended: 1 },
//     { category: 'Shoes', subcategory: 'Sandals', recommended: 1 },
//   ],
//   Fall: [
//     { category: 'Outerwear', subcategory: 'Field Jacket', recommended: 1 },
//     { category: 'Outerwear', subcategory: 'Blazer', recommended: 1 },
//     { category: 'Tops', subcategory: 'Knit Sweater', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Wool Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Chelsea Boots', recommended: 1 },
//   ],
//   Winter: [
//     { category: 'Outerwear', subcategory: 'Overcoat', recommended: 1 },
//     { category: 'Outerwear', subcategory: 'Heavy Parka', recommended: 1 },
//     { category: 'Tops', subcategory: 'Heavy Knit Sweater', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Wool Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Boots', recommended: 2 },
//   ],
// };

// // 🗓️ Auto-detect season based on month
// function getCurrentSeason(): 'Spring' | 'Summer' | 'Fall' | 'Winter' {
//   const month = new Date().getMonth() + 1;
//   if ([3, 4, 5].includes(month)) return 'Spring';
//   if ([6, 7, 8].includes(month)) return 'Summer';
//   if ([9, 10, 11].includes(month)) return 'Fall';
//   return 'Winter';
// }

// // 🧠 Compare wardrobe to capsule and return simple forecast text
// function generateSeasonalForecast(wardrobe: any[] = []): string | undefined {
//   const season = getCurrentSeason();
//   const capsule = CAPSULES[season];
//   if (!capsule) return;

//   const missing: string[] = [];

//   capsule.forEach((item) => {
//     const owned = wardrobe.filter(
//       (w) =>
//         w.category?.toLowerCase() === item.category.toLowerCase() &&
//         w.subcategory?.toLowerCase() === item.subcategory.toLowerCase(),
//     ).length;

//     if (owned < item.recommended) {
//       const needed = item.recommended - owned;
//       missing.push(`${needed} × ${item.subcategory}`);
//     }
//   });

//   if (missing.length === 0) {
//     return `✅ Your ${season} capsule is complete — you're ready for the season.`;
//   }

//   return `🍂 ${season} is approaching — you're missing: ${missing.join(', ')}.`;
// }

// @Injectable()
// export class AiService {
//   private openai: OpenAI;
//   private useVertex: boolean;
//   private vertexService?: VertexService; // 🔹 optional instance
//   private productSearch: ProductSearchService; // ✅ add this

//   constructor(vertexService?: VertexService) {
//     const { apiKey, project, source } = loadOpenAISecrets();

//     const snippet = apiKey?.slice(0, 20) ?? '';
//     const len = apiKey?.length ?? 0;
//     console.log('🔑 OPENAI key source:', source);
//     console.log('🔑 OPENAI key snippet:', JSON.stringify(snippet));
//     console.log('🔑 OPENAI key length:', len);
//     console.log('📂 CWD:', process.cwd());

//     if (!apiKey) {
//       throw new Error('OPENAI_API_KEY not found in .env or environment.');
//     }
//     if (/^sk-?x{3,}/i.test(apiKey)) {
//       throw new Error(
//         'OPENAI_API_KEY appears masked (e.g., "sk-xxxxx..."). Read from the correct .env instead.',
//       );
//     }
//     if (!apiKey.startsWith('sk-')) {
//       throw new Error('OPENAI_API_KEY is malformed — must start with "sk-".');
//     }

//     this.openai = new OpenAI({ apiKey, project });

//     // 🔹 New: Vertex toggle
//     this.useVertex = process.env.USE_VERTEX === 'true';
//     if (this.useVertex) {
//       this.vertexService = vertexService;
//       console.log('🧠 Vertex/Gemini mode enabled for analyze/recreate');
//     }

//     this.productSearch = new ProductSearchService(); // NEW
//   }

//   //////ANALYZE LOOK

//   async analyze(imageUrl: string) {
//     console.log('🧠 [AI] analyze() called with', imageUrl);
//     if (!imageUrl) throw new Error('Missing imageUrl');

//     // 🔹 Try Vertex first if enabled
//     if (this.useVertex && this.vertexService) {
//       try {
//         const gcsUri = imageUrl.replace(
//           'https://storage.googleapis.com/',
//           'gs://',
//         );
//         const metadata = await this.vertexService.analyzeImage(gcsUri);
//         const tags = [
//           ...(metadata.tags || []),
//           ...(metadata.style_descriptors || []),
//           metadata.main_category,
//           metadata.subcategory,
//         ].filter(Boolean);
//         console.log('🧠 [Vertex] analyze() success:', tags);
//         return { tags };
//       } catch (err: any) {
//         console.warn(
//           '[Vertex] analyze() failed → fallback to OpenAI:',
//           err.message,
//         );
//       }
//     }

//     // 🔸 OpenAI fallback
//     try {
//       const completion = await this.openai.chat.completions.create({
//         model: 'gpt-4o-mini',
//         messages: [
//           {
//             role: 'system',
//             content:
//               'You are a professional fashion classifier. Return only JSON with a "tags" array describing the outfit’s style, color palette, and vibe.',
//           },
//           {
//             role: 'user',
//             content: [
//               { type: 'text', text: 'Describe this outfit as tags only:' },
//               { type: 'image_url', image_url: { url: imageUrl } },
//             ],
//           },
//         ],
//         response_format: { type: 'json_object' },
//       });

//       const raw = completion.choices[0]?.message?.content;
//       console.log('🧠 [AI] analyze() raw response:', raw);

//       if (!raw) throw new Error('Empty response from OpenAI');
//       const parsed = JSON.parse(raw || '{}');
//       return { tags: parsed.tags || [] };
//     } catch (err: any) {
//       console.error('❌ [AI] analyze() failed:', err.message);
//       return { tags: ['casual', 'modern', 'neutral'] };
//     }
//   }

//   /* ------------------------------------------------------------
//      🧩 Weighted Tag Enrichment + Trend Injection
//   -------------------------------------------------------------*/
//   private async enrichTags(tags: string[]): Promise<string[]> {
//     const weightMap: Record<string, number> = {
//       tailored: 3,
//       minimal: 3,
//       neutral: 3,
//       modern: 2,
//       vintage: 2,
//       classic: 2,
//       streetwear: 2,
//       oversized: 2,
//       slim: 2,
//       relaxed: 2,
//       casual: 1,
//       sporty: 1,
//     };

//     // 🧹 Normalize + de-dupe
//     const cleanTags = Array.from(
//       new Set(
//         tags
//           .map((t) => t.toLowerCase().trim())
//           .filter((t) => t && !['outfit', 'style', 'fashion'].includes(t)),
//       ),
//     );

//     // 🧠 Apply weights
//     const weighted = cleanTags
//       .map((t) => ({ tag: t, weight: weightMap[t] || 1 }))
//       .sort((a, b) => b.weight - a.weight);

//     // 🌍 Inject current trend tags
//     const trendTags = await this.fetchTrendTags();
//     const final = Array.from(
//       new Set([...weighted.map((w) => w.tag), ...trendTags.slice(0, 3)]),
//     );

//     console.log('🎯 [AI] Enriched tags →', final);
//     return final;
//   }

//   /* 🔥 Pull in fashion trends (cached or RSS) */
//   // private async fetchTrendTags(): Promise<string[]> {
//   //   try {
//   //     const res = await fetch(
//   //       'https://trends.google.com/trends/hottrends/visualize/internal/data/en_us',
//   //     );
//   //     const json = await res.json().catch(() => []);
//   //     const trendWords = JSON.stringify(json).toLowerCase();
//   //     const matched = trendWords.match(
//   //       /(quiet luxury|monochrome|minimalism|maximalism|italian|tailoring|loafers|neutrals|linen|structured|preppy)/gi,
//   //     );
//   //     return matched ? Array.from(new Set(matched)) : [];
//   //   } catch {
//   //     return ['quiet luxury', 'neutral tones', 'tailored fit'];
//   //   }
//   // }

//   private async fetchTrendTags(): Promise<string[]> {
//     try {
//       const res = await fetch(
//         'https://trends.google.com/trends/hottrends/visualize/internal/data/en_us',
//       );
//       if (!res.ok) throw new Error(`HTTP ${res.status}`);
//       const json = await res.json().catch(() => []);
//       const trendWords = JSON.stringify(json).toLowerCase();
//       const matched = trendWords.match(
//         /(quiet luxury|monochrome|minimalism|maximalism|italian|tailoring|loafers|neutrals|linen|structured|preppy|flannel|earth tones|autumn layering)/gi,
//       );
//       if (matched?.length) return Array.from(new Set(matched));

//       // 🧭 If Google Trends returned empty, use local backup
//       return [
//         'quiet luxury',
//         'neutral tones',
//         'tailored fit',
//         'autumn layering',
//       ];
//     } catch (err: any) {
//       console.warn('⚠️ Trend fetch fallback triggered:', err.message);
//       return [
//         'quiet luxury',
//         'neutral tones',
//         'tailored fit',
//         'autumn layering',
//       ];
//     }
//   }

//   async recreate(
//     user_id: string,
//     tags: string[],
//     image_url?: string,
//     user_gender?: string,
//   ) {
//     console.log(
//       '🧥 [AI] recreate() called for user',
//       user_id,
//       'with tags:',
//       tags,
//       'and gender:',
//       user_gender,
//     );

//     if (!user_id) throw new Error('Missing user_id');
//     if (!tags?.length) {
//       console.warn('⚠️ [AI] recreate() empty tags → using defaults.');
//       tags = ['modern', 'neutral', 'tailored'];
//     }

//     // ✅ Weighted + trend-injected tags
//     tags = await this.enrichTags(tags);

//     // 🧠 Fetch gender_presentation if missing
//     if (!user_gender) {
//       try {
//         const result = await pool.query(
//           'SELECT gender_presentation FROM users WHERE id = $1 LIMIT 1',
//           [user_id],
//         );
//         user_gender = result.rows[0]?.gender_presentation || 'neutral';
//       } catch {
//         user_gender = 'neutral';
//       }
//     }

//     // 🧩 Normalize gender
//     const normalizedGender =
//       user_gender?.toLowerCase().includes('female') ||
//       user_gender?.toLowerCase().includes('woman')
//         ? 'female'
//         : user_gender?.toLowerCase().includes('male') ||
//             user_gender?.toLowerCase().includes('man')
//           ? 'male'
//           : process.env.DEFAULT_GENDER || 'neutral';

//     // 🧠 Build stylist prompt
//     const prompt = `
// You are a world-class AI stylist for ${normalizedGender} fashion.
// Create a cohesive outfit inspired by an uploaded look.

// Client: ${user_id}
// Image: ${image_url || 'N/A'}
// Detected tags: ${tags.join(', ')}

// Rules:
// - Match fabric, color palette, and silhouette.
// - Use ${normalizedGender}-appropriate pieces.
// - Output only JSON:
// {
//   "outfit": [
//     { "category": "Top", "item": "Grey Cotton Tee", "color": "gray" },
//     { "category": "Bottom", "item": "Navy Chinos", "color": "navy" },
//     { "category": "Outerwear", "item": "Beige Overshirt", "color": "beige" },
//     { "category": "Shoes", "item": "White Sneakers", "color": "white" }
//   ],
//   "style_note": "Describe how the look connects to the uploaded image."
// }
// `;

//     // 🧠 Generate outfit via Vertex or OpenAI
//     let parsed: any;
//     if (this.useVertex && this.vertexService) {
//       try {
//         const result = await this.vertexService.generateReasonedOutfit(prompt);
//         let text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
//         text = text
//           .replace(/^```json\s*/i, '')
//           .replace(/```$/, '')
//           .trim();
//         parsed = JSON.parse(text);
//         console.log('🧠 [Vertex] recreate() success');
//       } catch (err: any) {
//         console.warn('[Vertex] recreate() failed → fallback', err.message);
//       }
//     }

//     if (!parsed) {
//       const completion = await this.openai.chat.completions.create({
//         model: 'gpt-4o-mini',
//         temperature: 0.7,
//         messages: [{ role: 'user', content: prompt }],
//         response_format: { type: 'json_object' },
//       });

//       const raw = completion.choices[0]?.message?.content || '{}';
//       try {
//         parsed = JSON.parse(raw);
//       } catch {
//         parsed = {};
//       }
//     }

//     const outfit = Array.isArray(parsed?.outfit) ? parsed.outfit : [];
//     const style_note =
//       parsed?.style_note || 'Modern outfit inspired by the uploaded look.';

//     // 🛍️ Enrich each item with live products
//     const enriched = await Promise.all(
//       outfit.map(async (o: any) => {
//         const query =
//           `${normalizedGender} ${o.item || o.category || ''} ${o.color || ''}`.trim();
//         let products = await this.productSearch.search(query);
//         let top = products[0];

//         if (!top?.image || top.image.includes('No_image')) {
//           const serp = await this.productSearch.searchSerpApi(query);
//           if (serp?.[0]) top = { ...serp[0], source: 'SerpAPI' };
//         }

//         const materialHint =
//           query.match(/(wool|cotton|linen|leather|denim|polyester)/i)?.[0] ||
//           null;
//         const seasonalityHint =
//           query.match(/(summer|winter|fall|spring)/i)?.[0] ||
//           getCurrentSeason();
//         const fitHint =
//           query.match(/(slim|regular|relaxed|oversized|tailored)/i)?.[0] ||
//           'regular';

//         return {
//           category: o.category,
//           item: o.item,
//           color: o.color,
//           brand: top?.brand || 'Unknown',
//           price: top?.price || '—',
//           image:
//             top?.image && top.image.startsWith('http')
//               ? top.image
//               : 'https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg',
//           shopUrl:
//             top?.shopUrl ||
//             `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=shop`,
//           source: top?.source || 'ASOS / Fallback',
//           material: materialHint,
//           seasonality: seasonalityHint,
//           fit: fitHint,
//         };
//       }),
//     );

//     return { user_id, outfit: enriched, style_note };
//   }

//   ////////END CREATE LOOK

//   async chat(dto: ChatDto) {
//     const { messages } = dto;
//     const lastUserMsg = messages
//       .slice()
//       .reverse()
//       .find((m) => m.role === 'user')?.content;

//     if (!lastUserMsg) {
//       throw new Error('No user message provided');
//     }

//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         {
//           role: 'system',
//           content:
//             'You are a world-class personal fashion stylist. Give sleek, modern, practical outfit advice with attention to silhouette, color harmony, occasion, climate, and user comfort. Keep responses concise and actionable.',
//         },
//         ...messages,
//       ],
//     });

//     const aiReply =
//       completion.choices[0]?.message?.content?.trim() ||
//       'Styled response unavailable.';

//     return { reply: aiReply };
//   }

//   async suggest(body: {
//     user?: string;
//     weather?: any;
//     wardrobe?: any[];
//     preferences?: Record<string, any>;
//   }) {
//     const { user, weather, wardrobe, preferences } = body;

//     const temp = weather?.fahrenheit?.main?.temp;
//     const tempDesc = temp
//       ? `${temp}°F and ${temp < 60 ? 'cool' : temp > 85 ? 'warm' : 'mild'} weather`
//       : 'unknown temperature';

//     const wardrobeCount = wardrobe?.length || 0;

//     const systemPrompt = `
// You are a luxury personal stylist.
// Your goal is to provide a daily style briefing that helps the user feel prepared, stylish, and confident.
// Be concise, intelligent, and polished — similar to a stylist at a high-end menswear brand.

// Output must be JSON with the following fields:
// - suggestion (string)
// - insight (string)
// - tomorrow (string)
// Optionally include seasonalForecast, lifecycleForecast, styleTrajectory.
// `;

//     const userPrompt = `
// Client: ${user || 'The user'}
// Weather: ${tempDesc}
// Wardrobe items: ${wardrobeCount}
// Preferences: ${JSON.stringify(preferences || {})}
// `;

//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         { role: 'system', content: systemPrompt },
//         { role: 'user', content: userPrompt },
//       ],
//       response_format: { type: 'json_object' },
//     });

//     const raw = completion.choices[0]?.message?.content;
//     if (!raw) throw new Error('No suggestion response received from model.');

//     let parsed: {
//       suggestion: string;
//       insight: string;
//       tomorrow: string;
//       seasonalForecast?: string;
//       lifecycleForecast?: string;
//       styleTrajectory?: string;
//     };
//     try {
//       parsed = JSON.parse(raw);
//     } catch {
//       console.error('❌ Failed to parse AI JSON:', raw);
//       throw new Error('AI response was not valid JSON.');
//     }

//     if (!parsed.seasonalForecast) {
//       parsed.seasonalForecast = generateSeasonalForecast(wardrobe);
//     }

//     return parsed;
//   }
// }

////////////////////////

// import { Injectable } from '@nestjs/common';
// import OpenAI from 'openai';
// import { ChatDto } from './dto/chat.dto';
// import { VertexService } from '../vertex/vertex.service'; // 🔹 ADDED
// import { ProductSearchService } from '../product-services/product-search.service';
// import { Pool } from 'pg';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// import * as fs from 'fs';
// import * as path from 'path';
// import * as dotenv from 'dotenv';

// function loadOpenAISecrets(): {
//   apiKey?: string;
//   project?: string;
//   source: string;
// } {
//   const candidates = [
//     path.join(process.cwd(), '.env'),
//     path.join(process.cwd(), 'apps', 'backend-nest', '.env'),
//     path.join(__dirname, '..', '..', '.env'),
//   ];

//   for (const p of candidates) {
//     try {
//       if (fs.existsSync(p)) {
//         const parsed = dotenv.parse(fs.readFileSync(p));
//         const apiKey = parsed['OPENAI_API_KEY'];
//         const project = parsed['OPENAI_PROJECT_ID'];
//         if (apiKey) return { apiKey, project, source: p };
//       }
//     } catch {
//       // ignore
//     }
//   }

//   return {
//     apiKey: process.env.OPENAI_API_KEY,
//     project: process.env.OPENAI_PROJECT_ID,
//     source: 'process.env',
//   };
// }

// // 🧥 Basic capsule wardrobe templates
// const CAPSULES = {
//   Spring: [
//     { category: 'Outerwear', subcategory: 'Light Jacket', recommended: 2 },
//     { category: 'Tops', subcategory: 'Oxford Shirt', recommended: 3 },
//     { category: 'Bottoms', subcategory: 'Chinos', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Loafers', recommended: 1 },
//     { category: 'Shoes', subcategory: 'Sneakers', recommended: 1 },
//   ],
//   Summer: [
//     { category: 'Tops', subcategory: 'Short Sleeve Shirt', recommended: 4 },
//     { category: 'Tops', subcategory: 'Polo Shirt', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Linen Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Loafers', recommended: 1 },
//     { category: 'Shoes', subcategory: 'Sandals', recommended: 1 },
//   ],
//   Fall: [
//     { category: 'Outerwear', subcategory: 'Field Jacket', recommended: 1 },
//     { category: 'Outerwear', subcategory: 'Blazer', recommended: 1 },
//     { category: 'Tops', subcategory: 'Knit Sweater', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Wool Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Chelsea Boots', recommended: 1 },
//   ],
//   Winter: [
//     { category: 'Outerwear', subcategory: 'Overcoat', recommended: 1 },
//     { category: 'Outerwear', subcategory: 'Heavy Parka', recommended: 1 },
//     { category: 'Tops', subcategory: 'Heavy Knit Sweater', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Wool Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Boots', recommended: 2 },
//   ],
// };

// // 🗓️ Auto-detect season based on month
// function getCurrentSeason(): 'Spring' | 'Summer' | 'Fall' | 'Winter' {
//   const month = new Date().getMonth() + 1;
//   if ([3, 4, 5].includes(month)) return 'Spring';
//   if ([6, 7, 8].includes(month)) return 'Summer';
//   if ([9, 10, 11].includes(month)) return 'Fall';
//   return 'Winter';
// }

// // 🧠 Compare wardrobe to capsule and return simple forecast text
// function generateSeasonalForecast(wardrobe: any[] = []): string | undefined {
//   const season = getCurrentSeason();
//   const capsule = CAPSULES[season];
//   if (!capsule) return;

//   const missing: string[] = [];

//   capsule.forEach((item) => {
//     const owned = wardrobe.filter(
//       (w) =>
//         w.category?.toLowerCase() === item.category.toLowerCase() &&
//         w.subcategory?.toLowerCase() === item.subcategory.toLowerCase(),
//     ).length;

//     if (owned < item.recommended) {
//       const needed = item.recommended - owned;
//       missing.push(`${needed} × ${item.subcategory}`);
//     }
//   });

//   if (missing.length === 0) {
//     return `✅ Your ${season} capsule is complete — you're ready for the season.`;
//   }

//   return `🍂 ${season} is approaching — you're missing: ${missing.join(', ')}.`;
// }

// @Injectable()
// export class AiService {
//   private openai: OpenAI;
//   private useVertex: boolean;
//   private vertexService?: VertexService; // 🔹 optional instance
//   private productSearch: ProductSearchService; // ✅ add this

//   constructor(vertexService?: VertexService) {
//     const { apiKey, project, source } = loadOpenAISecrets();

//     const snippet = apiKey?.slice(0, 20) ?? '';
//     const len = apiKey?.length ?? 0;
//     console.log('🔑 OPENAI key source:', source);
//     console.log('🔑 OPENAI key snippet:', JSON.stringify(snippet));
//     console.log('🔑 OPENAI key length:', len);
//     console.log('📂 CWD:', process.cwd());

//     if (!apiKey) {
//       throw new Error('OPENAI_API_KEY not found in .env or environment.');
//     }
//     if (/^sk-?x{3,}/i.test(apiKey)) {
//       throw new Error(
//         'OPENAI_API_KEY appears masked (e.g., "sk-xxxxx..."). Read from the correct .env instead.',
//       );
//     }
//     if (!apiKey.startsWith('sk-')) {
//       throw new Error('OPENAI_API_KEY is malformed — must start with "sk-".');
//     }

//     this.openai = new OpenAI({ apiKey, project });

//     // 🔹 New: Vertex toggle
//     this.useVertex = process.env.USE_VERTEX === 'true';
//     if (this.useVertex) {
//       this.vertexService = vertexService;
//       console.log('🧠 Vertex/Gemini mode enabled for analyze/recreate');
//     }

//     this.productSearch = new ProductSearchService(); // NEW
//   }

//   //////ANALYZE LOOK
//   async analyze(imageUrl: string) {
//     console.log('🧠 [AI] analyze() called with', imageUrl);
//     if (!imageUrl) throw new Error('Missing imageUrl');

//     // 🔹 Try Vertex first if enabled
//     if (this.useVertex && this.vertexService) {
//       try {
//         const gcsUri = imageUrl.replace(
//           'https://storage.googleapis.com/',
//           'gs://',
//         );
//         const metadata = await this.vertexService.analyzeImage(gcsUri);
//         const tags = [
//           ...(metadata.tags || []),
//           ...(metadata.style_descriptors || []),
//           metadata.main_category,
//           metadata.subcategory,
//         ].filter(Boolean);
//         console.log('🧠 [Vertex] analyze() success:', tags);
//         return { tags };
//       } catch (err: any) {
//         console.warn(
//           '[Vertex] analyze() failed → fallback to OpenAI:',
//           err.message,
//         );
//       }
//     }

//     // 🔸 OpenAI fallback (unchanged)
//     try {
//       const completion = await this.openai.chat.completions.create({
//         model: 'gpt-4o-mini',
//         messages: [
//           {
//             role: 'system',
//             content:
//               'You are a professional fashion classifier. Return only JSON with a "tags" array describing the outfit’s style, color palette, and vibe.',
//           },
//           {
//             role: 'user',
//             content: [
//               { type: 'text', text: 'Describe this outfit as tags only:' },
//               { type: 'image_url', image_url: { url: imageUrl } },
//             ],
//           },
//         ],
//         response_format: { type: 'json_object' },
//       });

//       const raw = completion.choices[0]?.message?.content;
//       console.log('🧠 [AI] analyze() raw response:', raw);

//       if (!raw) throw new Error('Empty response from OpenAI');

//       let parsed: any = {};
//       try {
//         parsed = JSON.parse(raw);
//       } catch {
//         console.error('⚠️ [AI] analyze() JSON parse failed:', raw);
//         parsed = {};
//       }

//       return { tags: parsed.tags || [] };
//     } catch (err: any) {
//       console.error('❌ [AI] analyze() failed:', err.message);
//       return { tags: ['casual', 'modern', 'neutral'] };
//     }
//   }

//   async recreate(
//     user_id: string,
//     tags: string[],
//     image_url?: string,
//     user_gender?: string,
//   ) {
//     console.log(
//       '🧥 [AI] recreate() called for user',
//       user_id,
//       'with tags:',
//       tags,
//       'and gender:',
//       user_gender,
//     );

//     if (!user_id) throw new Error('Missing user_id');
//     if (!tags?.length) {
//       console.warn('⚠️ [AI] recreate() empty tags, using fallback keywords.');
//       tags = ['modern', 'neutral', 'tailored'];
//     }

//     /* 🧩 1️⃣ Fetch gender_presentation from DB only if not provided */
//     if (!user_gender) {
//       try {
//         const result = await pool.query(
//           'SELECT gender_presentation FROM users WHERE id = $1 LIMIT 1',
//           [user_id],
//         );
//         user_gender = result.rows[0]?.gender_presentation || 'neutral';
//         console.log('🧠 [AI] gender_presentation from DB →', user_gender);
//       } catch (err: any) {
//         console.warn(
//           '⚠️ [AI] Could not fetch gender_presentation:',
//           err.message,
//         );
//         user_gender = 'neutral';
//       }
//     }

//     /* 🧠 2️⃣ Normalize gender */
//     const normalizedGender =
//       user_gender?.toLowerCase().includes('female') ||
//       user_gender?.toLowerCase().includes('woman')
//         ? 'female'
//         : user_gender?.toLowerCase().includes('male') ||
//             user_gender?.toLowerCase().includes('man')
//           ? 'male'
//           : process.env.DEFAULT_GENDER || 'neutral';

//     console.log('🧠 [AI] normalized gender →', normalizedGender);

//     /* 🎩 3️⃣ Build gender-aware prompt */
//     const prompt = `
// You are a professional AI fashion stylist specializing in ${normalizedGender} fashion.
// Create a cohesive outfit inspired by a *real uploaded look*.

// Client ID: ${user_id}
// Uploaded look image: ${image_url || 'N/A'}
// Detected visual tags: ${tags.join(', ')}

// Guidelines:
// - Only include items consistent with ${normalizedGender} fashion.
// - Use the uploaded image’s palette, fabric, and silhouette as inspiration.
// - Match the same overall style (e.g., tailored, streetwear, minimal, modern).
// - Output only valid JSON exactly like this:

// {
//   "outfit": [
//     { "category": "Top", "item": "Grey Cotton Tee", "color": "gray" },
//     { "category": "Bottom", "item": "Ripped Indigo Jeans", "color": "indigo" },
//     { "category": "Outerwear", "item": "Beige Overshirt", "color": "beige" },
//     { "category": "Shoes", "item": "White Sneakers", "color": "white" }
//   ],
//   "style_note": "Brief note describing how the recreated outfit connects to the uploaded image."
// }
// `;

//     /* ---------------------- 1️⃣ Generate outfit ---------------------- */
//     let parsed: any;
//     if (this.useVertex && this.vertexService) {
//       try {
//         const result = await this.vertexService.generateReasonedOutfit(prompt);
//         let text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
//         text = text
//           .replace(/^```json\s*/i, '')
//           .replace(/```$/, '')
//           .trim();
//         parsed = JSON.parse(text);
//         console.log('🧠 [Vertex] recreate() success:', parsed);
//       } catch (err: any) {
//         console.warn(
//           '[Vertex] recreate() failed → fallback to OpenAI:',
//           err.message,
//         );
//       }
//     }

//     if (!parsed) {
//       const completion = await this.openai.chat.completions.create({
//         model: 'gpt-4o-mini',
//         temperature: 0.7,
//         messages: [{ role: 'user', content: prompt }],
//         response_format: { type: 'json_object' },
//       });

//       const raw = completion.choices[0]?.message?.content || '{}';
//       try {
//         parsed = JSON.parse(raw);
//       } catch {
//         console.error('⚠️ [AI] recreate() JSON parse failed:', raw);
//         parsed = {};
//       }
//     }

//     const outfit = Array.isArray(parsed?.outfit) ? parsed.outfit : [];
//     const style_note =
//       parsed?.style_note || 'Modern outfit inspired by the uploaded look.';

//     /* ---------------------- 2️⃣ Enrich with live products ---------------------- */
//     const enriched = await Promise.all(
//       outfit.map(async (o: any) => {
//         // 👇 Add this
//         const genderPrefix = normalizedGender + ' ';
//         const query =
//           `${genderPrefix}${o.item || o.category || ''} ${o.color || ''}`.trim();

//         const products = await this.productSearch.search(query);
//         let top = products[0];

//         // 🔁 Retry with SerpAPI if no valid image
//         if (!top?.image || top.image.includes('No_Image')) {
//           const serp = await this.productSearch.searchSerpApi(query);
//           if (serp?.[0]) top = { ...serp[0], source: 'SerpAPI' };
//         }

//         // 🌟 Extract Farfetch / SerpAPI extras if available
//         const hasMeta =
//           top &&
//           (top.source === 'Farfetch' || top.source === 'SerpAPI') &&
//           (top as any);

//         const discount =
//           (hasMeta as any)?.tag ||
//           (hasMeta as any)?.extensions?.join(', ') ||
//           null;
//         const delivery = (hasMeta as any)?.delivery || null;

//         // Optionally, try to infer metadata fields for enrichment
//         const materialHint = query.match(
//           /(wool|cotton|linen|leather|nylon|denim|polyester)/i,
//         )?.[0];
//         const seasonalityHint = query.match(
//           /(summer|winter|fall|spring)/i,
//         )?.[0];
//         const fitHint = query.match(
//           /(slim|regular|relaxed|oversized|tailored)/i,
//         )?.[0];

//         // 🧱 Return enriched object
//         return {
//           category: o.category,
//           item: o.item,
//           color: o.color,
//           brand: top?.brand || 'Unknown',
//           price: top?.price || '—',
//           image:
//             top?.image && top.image.startsWith('http')
//               ? top.image
//               : 'https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg',
//           shopUrl:
//             top?.shopUrl ||
//             `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=shop`,
//           source: top?.source || 'ASOS / Fallback',

//           // 🧩 Extended metadata
//           discount,
//           delivery,
//           material: materialHint || null,
//           seasonality: seasonalityHint || getCurrentSeason(),
//           fit: fitHint || 'regular',
//         };
//       }),
//     );

//     /* ---------------------- 3️⃣ Return final payload ---------------------- */
//     return { user_id, outfit: enriched, style_note };
//   }

//   ////////END CREATE LOOK

//   async chat(dto: ChatDto) {
//     const { messages } = dto;
//     const lastUserMsg = messages
//       .slice()
//       .reverse()
//       .find((m) => m.role === 'user')?.content;

//     if (!lastUserMsg) {
//       throw new Error('No user message provided');
//     }

//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         {
//           role: 'system',
//           content:
//             'You are a world-class personal fashion stylist. Give sleek, modern, practical outfit advice with attention to silhouette, color harmony, occasion, climate, and user comfort. Keep responses concise and actionable.',
//         },
//         ...messages,
//       ],
//     });

//     const aiReply =
//       completion.choices[0]?.message?.content?.trim() ||
//       'Styled response unavailable.';

//     return { reply: aiReply };
//   }

//   async suggest(body: {
//     user?: string;
//     weather?: any;
//     wardrobe?: any[];
//     preferences?: Record<string, any>;
//   }) {
//     const { user, weather, wardrobe, preferences } = body;

//     const temp = weather?.fahrenheit?.main?.temp;
//     const tempDesc = temp
//       ? `${temp}°F and ${temp < 60 ? 'cool' : temp > 85 ? 'warm' : 'mild'} weather`
//       : 'unknown temperature';

//     const wardrobeCount = wardrobe?.length || 0;

//     const systemPrompt = `
// You are a luxury personal stylist.
// Your goal is to provide a daily style briefing that helps the user feel prepared, stylish, and confident.
// Be concise, intelligent, and polished — similar to a stylist at a high-end menswear brand.

// Output must be JSON with the following fields:
// - suggestion (string)
// - insight (string)
// - tomorrow (string)
// Optionally include seasonalForecast, lifecycleForecast, styleTrajectory.
// `;

//     const userPrompt = `
// Client: ${user || 'The user'}
// Weather: ${tempDesc}
// Wardrobe items: ${wardrobeCount}
// Preferences: ${JSON.stringify(preferences || {})}
// `;

//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         { role: 'system', content: systemPrompt },
//         { role: 'user', content: userPrompt },
//       ],
//       response_format: { type: 'json_object' },
//     });

//     const raw = completion.choices[0]?.message?.content;
//     if (!raw) throw new Error('No suggestion response received from model.');

//     let parsed: {
//       suggestion: string;
//       insight: string;
//       tomorrow: string;
//       seasonalForecast?: string;
//       lifecycleForecast?: string;
//       styleTrajectory?: string;
//     };
//     try {
//       parsed = JSON.parse(raw);
//     } catch {
//       console.error('❌ Failed to parse AI JSON:', raw);
//       throw new Error('AI response was not valid JSON.');
//     }

//     if (!parsed.seasonalForecast) {
//       parsed.seasonalForecast = generateSeasonalForecast(wardrobe);
//     }

//     return parsed;
//   }
// }

////////////////////

// import { Injectable } from '@nestjs/common';
// import OpenAI from 'openai';
// import { ChatDto } from './dto/chat.dto';
// import { VertexService } from '../vertex/vertex.service'; // 🔹 ADDED

// import * as fs from 'fs';
// import * as path from 'path';
// import * as dotenv from 'dotenv';

// function loadOpenAISecrets(): {
//   apiKey?: string;
//   project?: string;
//   source: string;
// } {
//   const candidates = [
//     path.join(process.cwd(), '.env'),
//     path.join(process.cwd(), 'apps', 'backend-nest', '.env'),
//     path.join(__dirname, '..', '..', '.env'),
//   ];

//   for (const p of candidates) {
//     try {
//       if (fs.existsSync(p)) {
//         const parsed = dotenv.parse(fs.readFileSync(p));
//         const apiKey = parsed['OPENAI_API_KEY'];
//         const project = parsed['OPENAI_PROJECT_ID'];
//         if (apiKey) return { apiKey, project, source: p };
//       }
//     } catch {
//       // ignore
//     }
//   }

//   return {
//     apiKey: process.env.OPENAI_API_KEY,
//     project: process.env.OPENAI_PROJECT_ID,
//     source: 'process.env',
//   };
// }

// // 🧥 Basic capsule wardrobe templates
// const CAPSULES = {
//   Spring: [
//     { category: 'Outerwear', subcategory: 'Light Jacket', recommended: 2 },
//     { category: 'Tops', subcategory: 'Oxford Shirt', recommended: 3 },
//     { category: 'Bottoms', subcategory: 'Chinos', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Loafers', recommended: 1 },
//     { category: 'Shoes', subcategory: 'Sneakers', recommended: 1 },
//   ],
//   Summer: [
//     { category: 'Tops', subcategory: 'Short Sleeve Shirt', recommended: 4 },
//     { category: 'Tops', subcategory: 'Polo Shirt', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Linen Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Loafers', recommended: 1 },
//     { category: 'Shoes', subcategory: 'Sandals', recommended: 1 },
//   ],
//   Fall: [
//     { category: 'Outerwear', subcategory: 'Field Jacket', recommended: 1 },
//     { category: 'Outerwear', subcategory: 'Blazer', recommended: 1 },
//     { category: 'Tops', subcategory: 'Knit Sweater', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Wool Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Chelsea Boots', recommended: 1 },
//   ],
//   Winter: [
//     { category: 'Outerwear', subcategory: 'Overcoat', recommended: 1 },
//     { category: 'Outerwear', subcategory: 'Heavy Parka', recommended: 1 },
//     { category: 'Tops', subcategory: 'Heavy Knit Sweater', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Wool Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Boots', recommended: 2 },
//   ],
// };

// // 🗓️ Auto-detect season based on month
// function getCurrentSeason(): 'Spring' | 'Summer' | 'Fall' | 'Winter' {
//   const month = new Date().getMonth() + 1;
//   if ([3, 4, 5].includes(month)) return 'Spring';
//   if ([6, 7, 8].includes(month)) return 'Summer';
//   if ([9, 10, 11].includes(month)) return 'Fall';
//   return 'Winter';
// }

// // 🧠 Compare wardrobe to capsule and return simple forecast text
// function generateSeasonalForecast(wardrobe: any[] = []): string | undefined {
//   const season = getCurrentSeason();
//   const capsule = CAPSULES[season];
//   if (!capsule) return;

//   const missing: string[] = [];

//   capsule.forEach((item) => {
//     const owned = wardrobe.filter(
//       (w) =>
//         w.category?.toLowerCase() === item.category.toLowerCase() &&
//         w.subcategory?.toLowerCase() === item.subcategory.toLowerCase(),
//     ).length;

//     if (owned < item.recommended) {
//       const needed = item.recommended - owned;
//       missing.push(`${needed} × ${item.subcategory}`);
//     }
//   });

//   if (missing.length === 0) {
//     return `✅ Your ${season} capsule is complete — you're ready for the season.`;
//   }

//   return `🍂 ${season} is approaching — you're missing: ${missing.join(', ')}.`;
// }

// @Injectable()
// export class AiService {
//   private openai: OpenAI;
//   private useVertex: boolean;
//   private vertexService?: VertexService; // 🔹 optional instance

//   constructor(vertexService?: VertexService) {
//     const { apiKey, project, source } = loadOpenAISecrets();

//     const snippet = apiKey?.slice(0, 20) ?? '';
//     const len = apiKey?.length ?? 0;
//     console.log('🔑 OPENAI key source:', source);
//     console.log('🔑 OPENAI key snippet:', JSON.stringify(snippet));
//     console.log('🔑 OPENAI key length:', len);
//     console.log('📂 CWD:', process.cwd());

//     if (!apiKey) {
//       throw new Error('OPENAI_API_KEY not found in .env or environment.');
//     }
//     if (/^sk-?x{3,}/i.test(apiKey)) {
//       throw new Error(
//         'OPENAI_API_KEY appears masked (e.g., "sk-xxxxx..."). Read from the correct .env instead.',
//       );
//     }
//     if (!apiKey.startsWith('sk-')) {
//       throw new Error('OPENAI_API_KEY is malformed — must start with "sk-".');
//     }

//     this.openai = new OpenAI({ apiKey, project });

//     // 🔹 New: Vertex toggle
//     this.useVertex = process.env.USE_VERTEX === 'true';
//     if (this.useVertex) {
//       this.vertexService = vertexService;
//       console.log('🧠 Vertex/Gemini mode enabled for analyze/recreate');
//     }
//   }

//   //////ANALYZE LOOK
//   async analyze(imageUrl: string) {
//     console.log('🧠 [AI] analyze() called with', imageUrl);
//     if (!imageUrl) throw new Error('Missing imageUrl');

//     // 🔹 Try Vertex first if enabled
//     if (this.useVertex && this.vertexService) {
//       try {
//         const gcsUri = imageUrl.replace(
//           'https://storage.googleapis.com/',
//           'gs://',
//         );
//         const metadata = await this.vertexService.analyzeImage(gcsUri);
//         const tags = [
//           ...(metadata.tags || []),
//           ...(metadata.style_descriptors || []),
//           metadata.main_category,
//           metadata.subcategory,
//         ].filter(Boolean);
//         console.log('🧠 [Vertex] analyze() success:', tags);
//         return { tags };
//       } catch (err: any) {
//         console.warn(
//           '[Vertex] analyze() failed → fallback to OpenAI:',
//           err.message,
//         );
//       }
//     }

//     // 🔸 OpenAI fallback (unchanged)
//     try {
//       const completion = await this.openai.chat.completions.create({
//         model: 'gpt-4o-mini',
//         messages: [
//           {
//             role: 'system',
//             content:
//               'You are a professional fashion classifier. Return only JSON with a "tags" array describing the outfit’s style, color palette, and vibe.',
//           },
//           {
//             role: 'user',
//             content: [
//               { type: 'text', text: 'Describe this outfit as tags only:' },
//               { type: 'image_url', image_url: { url: imageUrl } },
//             ],
//           },
//         ],
//         response_format: { type: 'json_object' },
//       });

//       const raw = completion.choices[0]?.message?.content;
//       console.log('🧠 [AI] analyze() raw response:', raw);

//       if (!raw) throw new Error('Empty response from OpenAI');

//       let parsed: any = {};
//       try {
//         parsed = JSON.parse(raw);
//       } catch {
//         console.error('⚠️ [AI] analyze() JSON parse failed:', raw);
//         parsed = {};
//       }

//       return { tags: parsed.tags || [] };
//     } catch (err: any) {
//       console.error('❌ [AI] analyze() failed:', err.message);
//       return { tags: ['casual', 'modern', 'neutral'] };
//     }
//   }

//   // 👗 Recreate outfit from tags
//   //   async recreate(user_id: string, tags: string[]) {
//   //     console.log(
//   //       '🧥 [AI] recreate() called for user',
//   //       user_id,
//   //       'with tags:',
//   //       tags,
//   //     );
//   //     if (!user_id) throw new Error('Missing user_id');
//   //     if (!tags || !tags.length) {
//   //       console.warn('⚠️ [AI] recreate() empty tags, using fallback keywords.');
//   //       tags = ['modern', 'neutral', 'tailored'];
//   //     }

//   //     const prompt = `
//   // You are a luxury personal stylist.
//   // Build a cohesive outfit inspired by the following visual tags:
//   // ${tags.join(', ')}.

//   // Return JSON strictly in this format:
//   // {
//   //   "outfit": [
//   //     { "category": "Top", "item": "White Oxford Shirt", "color": "white" },
//   //     { "category": "Bottom", "item": "Beige Chinos", "color": "beige" },
//   //     { "category": "Shoes", "item": "Brown Loafers", "color": "brown" }
//   //   ],
//   //   "style_note": "Clean, tailored neutral look suitable for warm weather."
//   // }
//   // `;

//   //     // 🔹 Try Gemini first if enabled
//   //     if (this.useVertex && this.vertexService) {
//   //       try {
//   //         const result = await this.vertexService.generateReasonedOutfit(prompt);
//   //         let text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

//   //         // 🧩 Gemini often wraps JSON inside markdown fences (```json ... ```)
//   //         text = text
//   //           .replace(/^```json\s*/i, '')
//   //           .replace(/```$/, '')
//   //           .trim();

//   //         let parsed: any = {};
//   //         try {
//   //           parsed = JSON.parse(text);
//   //           console.log('🧠 [Vertex] recreate() success:', parsed);
//   //         } catch (parseErr: any) {
//   //           console.warn(
//   //             '[Vertex] recreate() JSON parse failed → raw text:',
//   //             text,
//   //           );
//   //           throw parseErr; // triggers fallback to OpenAI
//   //         }

//   //         return {
//   //           user_id,
//   //           outfit: parsed.outfit || [],
//   //           style_note:
//   //             parsed.style_note ||
//   //             'Minimal neutral outfit for an easy, refined look.',
//   //         };
//   //       } catch (err: any) {
//   //         console.warn(
//   //           '[Vertex] recreate() failed → fallback to OpenAI:',
//   //           err.message,
//   //         );
//   //       }
//   //     }

//   //     // 🔸 OpenAI fallback (unchanged)
//   //     try {
//   //       const completion = await this.openai.chat.completions.create({
//   //         model: 'gpt-4o-mini',
//   //         temperature: 0.7,
//   //         messages: [{ role: 'user', content: prompt }],
//   //         response_format: { type: 'json_object' },
//   //       });

//   //       const raw = completion.choices[0]?.message?.content;
//   //       console.log('🧥 [AI] recreate() raw response:', raw);

//   //       if (!raw) throw new Error('No content returned from OpenAI');

//   //       let parsed: any = {};
//   //       try {
//   //         parsed = JSON.parse(raw);
//   //       } catch {
//   //         console.error('⚠️ [AI] recreate() JSON parse failed:', raw);
//   //         parsed = {};
//   //       }

//   //       return {
//   //         user_id,
//   //         outfit: parsed.outfit || [],
//   //         style_note:
//   //           parsed.style_note ||
//   //           'Minimal neutral outfit for an easy, refined look.',
//   //       };
//   //     } catch (err: any) {
//   //       console.error('❌ [AI] recreate() failed:', err.message);
//   //       return {
//   //         user_id,
//   //         outfit: [],
//   //         style_note: 'Error generating look (AI unavailable).',
//   //       };
//   //     }
//   //   }

//   async recreate(user_id: string, tags: string[], image_url?: string) {
//     console.log(
//       '🧥 [AI] recreate() called for user',
//       user_id,
//       'with tags:',
//       tags,
//     );
//     if (!user_id) throw new Error('Missing user_id');
//     if (!tags || !tags.length) {
//       console.warn('⚠️ [AI] recreate() empty tags, using fallback keywords.');
//       tags = ['modern', 'neutral', 'tailored'];
//     }

//     // 🧠 Updated prompt: grounded in uploaded look
//     const prompt = `
// You are a professional AI fashion stylist.
// Create a cohesive outfit inspired by a *real uploaded look*.

// Client ID: ${user_id}
// Uploaded look image: ${image_url || 'N/A'}
// Detected visual tags: ${tags.join(', ')}

// Guidelines:
// - Use the image (if provided) as the main inspiration for palette, mood, and silhouette.
// - Keep the same style family (e.g. streetwear, tailored, casual, etc).
// - Avoid random gender or season shifts unless evident from the photo.
// - Output only valid JSON, in the exact format below — no text outside the JSON.

// {
//   "outfit": [
//     { "category": "Top", "item": "Grey Cotton Tee", "color": "gray" },
//     { "category": "Bottom", "item": "Ripped Indigo Jeans", "color": "indigo" },
//     { "category": "Outerwear", "item": "Beige Overshirt", "color": "beige" },
//     { "category": "Shoes", "item": "White Sneakers", "color": "white" }
//   ],
//   "style_note": "Brief note describing the overall look and how it connects to the uploaded image."
// }
// `;

//     // 🔹 Try Gemini first if enabled
//     if (this.useVertex && this.vertexService) {
//       try {
//         const result = await this.vertexService.generateReasonedOutfit(prompt);
//         let text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

//         // 🧩 Remove markdown wrappers (```json ... ```)
//         text = text
//           .replace(/^```json\s*/i, '')
//           .replace(/```$/, '')
//           .trim();

//         let parsed: any = {};
//         try {
//           parsed = JSON.parse(text);
//           console.log('🧠 [Vertex] recreate() success:', parsed);
//         } catch (parseErr: any) {
//           console.warn(
//             '[Vertex] recreate() JSON parse failed → raw text:',
//             text,
//           );
//           throw parseErr; // triggers fallback
//         }

//         return {
//           user_id,
//           outfit: parsed.outfit || [],
//           style_note:
//             parsed.style_note ||
//             'Minimal neutral outfit for an easy, refined look.',
//         };
//       } catch (err: any) {
//         console.warn(
//           '[Vertex] recreate() failed → fallback to OpenAI:',
//           err.message,
//         );
//       }
//     }

//     // 🔸 OpenAI fallback (unchanged)
//     try {
//       const completion = await this.openai.chat.completions.create({
//         model: 'gpt-4o-mini',
//         temperature: 0.7,
//         messages: [{ role: 'user', content: prompt }],
//         response_format: { type: 'json_object' },
//       });

//       const raw = completion.choices[0]?.message?.content;
//       console.log('🧥 [AI] recreate() raw response:', raw);

//       if (!raw) throw new Error('No content returned from OpenAI');

//       let parsed: any = {};
//       try {
//         parsed = JSON.parse(raw);
//       } catch {
//         console.error('⚠️ [AI] recreate() JSON parse failed:', raw);
//         parsed = {};
//       }

//       return {
//         user_id,
//         outfit: parsed.outfit || [],
//         style_note:
//           parsed.style_note ||
//           'Minimal neutral outfit for an easy, refined look.',
//       };
//     } catch (err: any) {
//       console.error('❌ [AI] recreate() failed:', err.message);
//       return {
//         user_id,
//         outfit: [],
//         style_note: 'Error generating look (AI unavailable).',
//       };
//     }
//   }

//   ////////END CREATE LOOK

//   async chat(dto: ChatDto) {
//     const { messages } = dto;
//     const lastUserMsg = messages
//       .slice()
//       .reverse()
//       .find((m) => m.role === 'user')?.content;

//     if (!lastUserMsg) {
//       throw new Error('No user message provided');
//     }

//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         {
//           role: 'system',
//           content:
//             'You are a world-class personal fashion stylist. Give sleek, modern, practical outfit advice with attention to silhouette, color harmony, occasion, climate, and user comfort. Keep responses concise and actionable.',
//         },
//         ...messages,
//       ],
//     });

//     const aiReply =
//       completion.choices[0]?.message?.content?.trim() ||
//       'Styled response unavailable.';

//     return { reply: aiReply };
//   }

//   async suggest(body: {
//     user?: string;
//     weather?: any;
//     wardrobe?: any[];
//     preferences?: Record<string, any>;
//   }) {
//     const { user, weather, wardrobe, preferences } = body;

//     const temp = weather?.fahrenheit?.main?.temp;
//     const tempDesc = temp
//       ? `${temp}°F and ${temp < 60 ? 'cool' : temp > 85 ? 'warm' : 'mild'} weather`
//       : 'unknown temperature';

//     const wardrobeCount = wardrobe?.length || 0;

//     const systemPrompt = `
// You are a luxury personal stylist.
// Your goal is to provide a daily style briefing that helps the user feel prepared, stylish, and confident.
// Be concise, intelligent, and polished — similar to a stylist at a high-end menswear brand.

// Output must be JSON with the following fields:
// - suggestion (string)
// - insight (string)
// - tomorrow (string)
// Optionally include seasonalForecast, lifecycleForecast, styleTrajectory.
// `;

//     const userPrompt = `
// Client: ${user || 'The user'}
// Weather: ${tempDesc}
// Wardrobe items: ${wardrobeCount}
// Preferences: ${JSON.stringify(preferences || {})}
// `;

//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         { role: 'system', content: systemPrompt },
//         { role: 'user', content: userPrompt },
//       ],
//       response_format: { type: 'json_object' },
//     });

//     const raw = completion.choices[0]?.message?.content;
//     if (!raw) throw new Error('No suggestion response received from model.');

//     let parsed: {
//       suggestion: string;
//       insight: string;
//       tomorrow: string;
//       seasonalForecast?: string;
//       lifecycleForecast?: string;
//       styleTrajectory?: string;
//     };
//     try {
//       parsed = JSON.parse(raw);
//     } catch {
//       console.error('❌ Failed to parse AI JSON:', raw);
//       throw new Error('AI response was not valid JSON.');
//     }

//     if (!parsed.seasonalForecast) {
//       parsed.seasonalForecast = generateSeasonalForecast(wardrobe);
//     }

//     return parsed;
//   }
// }

/////////////////////////////////////////

// VERSION BELOW WITH NEW INSPIRATION HUB LOGIC temp using openAi - KEEP1

// import { Injectable } from '@nestjs/common';
// import OpenAI from 'openai';
// import { ChatDto } from './dto/chat.dto';

// import * as fs from 'fs';
// import * as path from 'path';
// import * as dotenv from 'dotenv';

// function loadOpenAISecrets(): {
//   apiKey?: string;
//   project?: string;
//   source: string;
// } {
//   // Try the most likely locations FIRST. We prefer reading the file directly
//   // so a masked/global OPENAI_API_KEY can't override it.
//   const candidates = [
//     path.join(process.cwd(), '.env'), // when CWD = apps/backend-nest
//     path.join(process.cwd(), 'apps', 'backend-nest', '.env'), // when CWD = repo root
//     path.join(__dirname, '..', '..', '.env'), // dist/src-relative fallback
//   ];

//   for (const p of candidates) {
//     try {
//       if (fs.existsSync(p)) {
//         const parsed = dotenv.parse(fs.readFileSync(p));
//         const apiKey = parsed['OPENAI_API_KEY'];
//         const project = parsed['OPENAI_PROJECT_ID'];
//         if (apiKey) return { apiKey, project, source: p };
//       }
//     } catch {
//       // ignore and keep searching
//     }
//   }

//   // Final fallback to process.env (may be masked by your shell/IDE)
//   return {
//     apiKey: process.env.OPENAI_API_KEY,
//     project: process.env.OPENAI_PROJECT_ID,
//     source: 'process.env',
//   };
// }

// // 🧥 Basic capsule wardrobe templates
// const CAPSULES = {
//   Spring: [
//     { category: 'Outerwear', subcategory: 'Light Jacket', recommended: 2 },
//     { category: 'Tops', subcategory: 'Oxford Shirt', recommended: 3 },
//     { category: 'Bottoms', subcategory: 'Chinos', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Loafers', recommended: 1 },
//     { category: 'Shoes', subcategory: 'Sneakers', recommended: 1 },
//   ],
//   Summer: [
//     { category: 'Tops', subcategory: 'Short Sleeve Shirt', recommended: 4 },
//     { category: 'Tops', subcategory: 'Polo Shirt', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Linen Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Loafers', recommended: 1 },
//     { category: 'Shoes', subcategory: 'Sandals', recommended: 1 },
//   ],
//   Fall: [
//     { category: 'Outerwear', subcategory: 'Field Jacket', recommended: 1 },
//     { category: 'Outerwear', subcategory: 'Blazer', recommended: 1 },
//     { category: 'Tops', subcategory: 'Knit Sweater', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Wool Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Chelsea Boots', recommended: 1 },
//   ],
//   Winter: [
//     { category: 'Outerwear', subcategory: 'Overcoat', recommended: 1 },
//     { category: 'Outerwear', subcategory: 'Heavy Parka', recommended: 1 },
//     { category: 'Tops', subcategory: 'Heavy Knit Sweater', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Wool Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Boots', recommended: 2 },
//   ],
// };

// // 🗓️ Auto-detect season based on month
// function getCurrentSeason(): 'Spring' | 'Summer' | 'Fall' | 'Winter' {
//   const month = new Date().getMonth() + 1;
//   if ([3, 4, 5].includes(month)) return 'Spring';
//   if ([6, 7, 8].includes(month)) return 'Summer';
//   if ([9, 10, 11].includes(month)) return 'Fall';
//   return 'Winter';
// }

// // 🧠 Compare wardrobe to capsule and return simple forecast text
// function generateSeasonalForecast(wardrobe: any[] = []): string | undefined {
//   const season = getCurrentSeason();
//   const capsule = CAPSULES[season];
//   if (!capsule) return;

//   const missing: string[] = [];

//   capsule.forEach((item) => {
//     const owned = wardrobe.filter(
//       (w) =>
//         w.category?.toLowerCase() === item.category.toLowerCase() &&
//         w.subcategory?.toLowerCase() === item.subcategory.toLowerCase(),
//     ).length;

//     if (owned < item.recommended) {
//       const needed = item.recommended - owned;
//       missing.push(`${needed} × ${item.subcategory}`);
//     }
//   });

//   if (missing.length === 0) {
//     return `✅ Your ${season} capsule is complete — you're ready for the season.`;
//   }

//   return `🍂 ${season} is approaching — you're missing: ${missing.join(', ')}.`;
// }

// @Injectable()
// export class AiService {
//   private openai: OpenAI;

//   constructor() {
//     const { apiKey, project, source } = loadOpenAISecrets();

//     // Debug (safe): show where it came from + snippet/length, not the full secret.
//     const snippet = apiKey?.slice(0, 20) ?? '';
//     const len = apiKey?.length ?? 0;
//     console.log('🔑 OPENAI key source:', source);
//     console.log('🔑 OPENAI key snippet:', JSON.stringify(snippet));
//     console.log('🔑 OPENAI key length:', len);
//     console.log('📂 CWD:', process.cwd());

//     // Guards: catch masked/bad keys ASAP.
//     if (!apiKey) {
//       throw new Error('OPENAI_API_KEY not found in .env or environment.');
//     }
//     if (/^sk-?x{3,}/i.test(apiKey)) {
//       throw new Error(
//         'OPENAI_API_KEY appears masked (e.g., "sk-xxxxx..."). Read from the correct .env instead.',
//       );
//     }
//     if (!apiKey.startsWith('sk-')) {
//       throw new Error('OPENAI_API_KEY is malformed — must start with "sk-".');
//     }

//     this.openai = new OpenAI({ apiKey, project });
//   }

//   //////ANALYZE LOOK
//   // 🧠 Analyze outfit photo → return tags
//   async analyze(imageUrl: string) {
//     console.log('🧠 [AI] analyze() called with', imageUrl);

//     if (!imageUrl) {
//       throw new Error('Missing imageUrl');
//     }

//     try {
//       const completion = await this.openai.chat.completions.create({
//         model: 'gpt-4o-mini',
//         messages: [
//           {
//             role: 'system',
//             content:
//               'You are a professional fashion classifier. Return only JSON with a "tags" array describing the outfit’s style, color palette, and vibe.',
//           },
//           {
//             role: 'user',
//             content: [
//               { type: 'text', text: 'Describe this outfit as tags only:' },
//               { type: 'image_url', image_url: { url: imageUrl } },
//             ],
//           },
//         ],
//         response_format: { type: 'json_object' },
//       });

//       const raw = completion.choices[0]?.message?.content;
//       console.log('🧠 [AI] analyze() raw response:', raw);

//       if (!raw) throw new Error('Empty response from OpenAI');

//       // Guard parse
//       let parsed: any = {};
//       try {
//         parsed = JSON.parse(raw);
//       } catch (e) {
//         console.error('⚠️ [AI] analyze() JSON parse failed:', raw);
//         parsed = {};
//       }

//       return { tags: parsed.tags || [] };
//     } catch (err: any) {
//       console.error('❌ [AI] analyze() failed:', err.message);
//       // return safe fallback so frontend doesn’t 404
//       return { tags: ['casual', 'modern', 'neutral'] };
//     }
//   }

//   // 👗 Recreate outfit from tags
//   async recreate(user_id: string, tags: string[]) {
//     console.log(
//       '🧥 [AI] recreate() called for user',
//       user_id,
//       'with tags:',
//       tags,
//     );

//     if (!user_id) throw new Error('Missing user_id');
//     if (!tags || !tags.length) {
//       console.warn('⚠️ [AI] recreate() empty tags, using fallback keywords.');
//       tags = ['modern', 'neutral', 'tailored'];
//     }

//     const prompt = `
// You are a luxury personal stylist.
// Build a cohesive outfit inspired by the following visual tags:
// ${tags.join(', ')}.

// Return JSON strictly in this format:
// {
//   "outfit": [
//     { "category": "Top", "item": "White Oxford Shirt", "color": "white" },
//     { "category": "Bottom", "item": "Beige Chinos", "color": "beige" },
//     { "category": "Shoes", "item": "Brown Loafers", "color": "brown" }
//   ],
//   "style_note": "Clean, tailored neutral look suitable for warm weather."
// }
// `;

//     try {
//       const completion = await this.openai.chat.completions.create({
//         model: 'gpt-4o-mini',
//         temperature: 0.7,
//         messages: [{ role: 'user', content: prompt }],
//         response_format: { type: 'json_object' },
//       });

//       const raw = completion.choices[0]?.message?.content;
//       console.log('🧥 [AI] recreate() raw response:', raw);

//       if (!raw) throw new Error('No content returned from OpenAI');

//       let parsed: any = {};
//       try {
//         parsed = JSON.parse(raw);
//       } catch (e) {
//         console.error('⚠️ [AI] recreate() JSON parse failed:', raw);
//         parsed = {};
//       }

//       return {
//         user_id,
//         outfit: parsed.outfit || [],
//         style_note:
//           parsed.style_note ||
//           'Minimal neutral outfit for an easy, refined look.',
//       };
//     } catch (err: any) {
//       console.error('❌ [AI] recreate() failed:', err.message);
//       // ✅ Safe fallback to prevent 500 crash
//       return {
//         user_id,
//         outfit: [],
//         style_note: 'Error generating look (AI unavailable).',
//       };
//     }
//   }

//   ////////END CREATE LOOK

//   /**
//    * 💬 Full conversational chat (powers AiStylistChatScreen)
//    */
//   async chat(dto: ChatDto) {
//     const { messages } = dto;

//     const lastUserMsg = messages
//       .slice()
//       .reverse()
//       .find((m) => m.role === 'user')?.content;

//     if (!lastUserMsg) {
//       throw new Error('No user message provided');
//     }

//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         {
//           role: 'system',
//           content:
//             'You are a world-class personal fashion stylist. Give sleek, modern, practical outfit advice with attention to silhouette, color harmony, occasion, climate, and user comfort. Keep responses concise and actionable.',
//         },
//         ...messages,
//       ],
//     });

//     const aiReply =
//       completion.choices[0]?.message?.content?.trim() ||
//       'Styled response unavailable.';

//     return { reply: aiReply };
//   }

//   /**
//    * 🧠 Suggest: Quick proactive outfit suggestion, wardrobe insight, tomorrow preview,
//    * and (optionally) predictive fields like seasonal capsule, lifecycle, and style trajectory.
//    */
//   async suggest(body: {
//     user?: string;
//     weather?: any;
//     wardrobe?: any[];
//     preferences?: Record<string, any>;
//   }) {
//     const { user, weather, wardrobe, preferences } = body;

//     const temp = weather?.fahrenheit?.main?.temp;
//     const tempDesc = temp
//       ? `${temp}°F and ${
//           temp < 60 ? 'cool' : temp > 85 ? 'warm' : 'mild'
//         } weather`
//       : 'unknown temperature';

//     const wardrobeCount = wardrobe?.length || 0;

//     const systemPrompt = `
// You are a luxury personal stylist.
// Your goal is to provide a daily style briefing that helps the user feel prepared, stylish, and confident.
// Be concise, intelligent, and polished — similar to a stylist at a high-end menswear brand.

// Output must be JSON with the following fields:
// - suggestion (string): Outfit recommendation for today.
// - insight (string): Smart observation about their wardrobe.
// - tomorrow (string): Guidance for tomorrow.

// Optionally, you may also include:
// - seasonalForecast (string): Forward-looking note on what they'll need for the next season.
// - lifecycleForecast (string): Prediction about an item that may soon need replacing.
// - styleTrajectory (string): Brief prediction of their evolving style direction.
// `;

//     const userPrompt = `
// Client: ${user || 'The user'}
// Weather: ${tempDesc}
// Wardrobe items: ${wardrobeCount}
// Preferences: ${JSON.stringify(preferences || {})}

// 1. suggestion: Outfit recommendation (1–2 sentences).
// 2. insight: Observation about wardrobe gaps or usage.
// 3. tomorrow: Preparation for tomorrow.
// (Optionally include seasonalForecast, lifecycleForecast, styleTrajectory if relevant.)
// `;

//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         { role: 'system', content: systemPrompt },
//         { role: 'user', content: userPrompt },
//       ],
//       response_format: { type: 'json_object' },
//     });

//     const raw = completion.choices[0]?.message?.content;
//     if (!raw) {
//       throw new Error('No suggestion response received from model.');
//     }

//     let parsed: {
//       suggestion: string;
//       insight: string;
//       tomorrow: string;
//       seasonalForecast?: string;
//       lifecycleForecast?: string;
//       styleTrajectory?: string;
//     };
//     try {
//       parsed = JSON.parse(raw);
//     } catch (e) {
//       console.error('❌ Failed to parse AI JSON:', raw);
//       throw new Error('AI response was not valid JSON.');
//     }

//     // ✅ If AI didn't generate a seasonal forecast, generate one automatically
//     if (!parsed.seasonalForecast) {
//       parsed.seasonalForecast = generateSeasonalForecast(wardrobe);
//     }

//     return parsed;
//   }
// }

//////////////////

// VERSION BELOW HERE BEFORE INSPIRATION HUB LOGIC - KEEP WAS WORKING PERFECTLY

// import { Injectable } from '@nestjs/common';
// import OpenAI from 'openai';
// import { ChatDto } from './dto/chat.dto';

// import * as fs from 'fs';
// import * as path from 'path';
// import * as dotenv from 'dotenv';

// function loadOpenAISecrets(): {
//   apiKey?: string;
//   project?: string;
//   source: string;
// } {
//   // Try the most likely locations FIRST. We prefer reading the file directly
//   // so a masked/global OPENAI_API_KEY can't override it.
//   const candidates = [
//     path.join(process.cwd(), '.env'), // when CWD = apps/backend-nest
//     path.join(process.cwd(), 'apps', 'backend-nest', '.env'), // when CWD = repo root
//     path.join(__dirname, '..', '..', '.env'), // dist/src-relative fallback
//   ];

//   for (const p of candidates) {
//     try {
//       if (fs.existsSync(p)) {
//         const parsed = dotenv.parse(fs.readFileSync(p));
//         const apiKey = parsed['OPENAI_API_KEY'];
//         const project = parsed['OPENAI_PROJECT_ID'];
//         if (apiKey) return { apiKey, project, source: p };
//       }
//     } catch {
//       // ignore and keep searching
//     }
//   }

//   // Final fallback to process.env (may be masked by your shell/IDE)
//   return {
//     apiKey: process.env.OPENAI_API_KEY,
//     project: process.env.OPENAI_PROJECT_ID,
//     source: 'process.env',
//   };
// }

// // 🧥 Basic capsule wardrobe templates
// const CAPSULES = {
//   Spring: [
//     { category: 'Outerwear', subcategory: 'Light Jacket', recommended: 2 },
//     { category: 'Tops', subcategory: 'Oxford Shirt', recommended: 3 },
//     { category: 'Bottoms', subcategory: 'Chinos', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Loafers', recommended: 1 },
//     { category: 'Shoes', subcategory: 'Sneakers', recommended: 1 },
//   ],
//   Summer: [
//     { category: 'Tops', subcategory: 'Short Sleeve Shirt', recommended: 4 },
//     { category: 'Tops', subcategory: 'Polo Shirt', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Linen Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Loafers', recommended: 1 },
//     { category: 'Shoes', subcategory: 'Sandals', recommended: 1 },
//   ],
//   Fall: [
//     { category: 'Outerwear', subcategory: 'Field Jacket', recommended: 1 },
//     { category: 'Outerwear', subcategory: 'Blazer', recommended: 1 },
//     { category: 'Tops', subcategory: 'Knit Sweater', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Wool Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Chelsea Boots', recommended: 1 },
//   ],
//   Winter: [
//     { category: 'Outerwear', subcategory: 'Overcoat', recommended: 1 },
//     { category: 'Outerwear', subcategory: 'Heavy Parka', recommended: 1 },
//     { category: 'Tops', subcategory: 'Heavy Knit Sweater', recommended: 2 },
//     { category: 'Bottoms', subcategory: 'Wool Trousers', recommended: 2 },
//     { category: 'Shoes', subcategory: 'Boots', recommended: 2 },
//   ],
// };

// // 🗓️ Auto-detect season based on month
// function getCurrentSeason(): 'Spring' | 'Summer' | 'Fall' | 'Winter' {
//   const month = new Date().getMonth() + 1;
//   if ([3, 4, 5].includes(month)) return 'Spring';
//   if ([6, 7, 8].includes(month)) return 'Summer';
//   if ([9, 10, 11].includes(month)) return 'Fall';
//   return 'Winter';
// }

// // 🧠 Compare wardrobe to capsule and return simple forecast text
// function generateSeasonalForecast(wardrobe: any[] = []): string | undefined {
//   const season = getCurrentSeason();
//   const capsule = CAPSULES[season];
//   if (!capsule) return;

//   const missing: string[] = [];

//   capsule.forEach((item) => {
//     const owned = wardrobe.filter(
//       (w) =>
//         w.category?.toLowerCase() === item.category.toLowerCase() &&
//         w.subcategory?.toLowerCase() === item.subcategory.toLowerCase(),
//     ).length;

//     if (owned < item.recommended) {
//       const needed = item.recommended - owned;
//       missing.push(`${needed} × ${item.subcategory}`);
//     }
//   });

//   if (missing.length === 0) {
//     return `✅ Your ${season} capsule is complete — you're ready for the season.`;
//   }

//   return `🍂 ${season} is approaching — you're missing: ${missing.join(', ')}.`;
// }

// @Injectable()
// export class AiService {
//   private openai: OpenAI;

//   constructor() {
//     const { apiKey, project, source } = loadOpenAISecrets();

//     // Debug (safe): show where it came from + snippet/length, not the full secret.
//     const snippet = apiKey?.slice(0, 20) ?? '';
//     const len = apiKey?.length ?? 0;
//     console.log('🔑 OPENAI key source:', source);
//     console.log('🔑 OPENAI key snippet:', JSON.stringify(snippet));
//     console.log('🔑 OPENAI key length:', len);
//     console.log('📂 CWD:', process.cwd());

//     // Guards: catch masked/bad keys ASAP.
//     if (!apiKey) {
//       throw new Error('OPENAI_API_KEY not found in .env or environment.');
//     }
//     if (/^sk-?x{3,}/i.test(apiKey)) {
//       throw new Error(
//         'OPENAI_API_KEY appears masked (e.g., "sk-xxxxx..."). Read from the correct .env instead.',
//       );
//     }
//     if (!apiKey.startsWith('sk-')) {
//       throw new Error('OPENAI_API_KEY is malformed — must start with "sk-".');
//     }

//     this.openai = new OpenAI({ apiKey, project });
//   }

//   /**
//    * 💬 Full conversational chat (powers AiStylistChatScreen)
//    */
//   async chat(dto: ChatDto) {
//     const { messages } = dto;

//     const lastUserMsg = messages
//       .slice()
//       .reverse()
//       .find((m) => m.role === 'user')?.content;

//     if (!lastUserMsg) {
//       throw new Error('No user message provided');
//     }

//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         {
//           role: 'system',
//           content:
//             'You are a world-class personal fashion stylist. Give sleek, modern, practical outfit advice with attention to silhouette, color harmony, occasion, climate, and user comfort. Keep responses concise and actionable.',
//         },
//         ...messages,
//       ],
//     });

//     const aiReply =
//       completion.choices[0]?.message?.content?.trim() ||
//       'Styled response unavailable.';

//     return { reply: aiReply };
//   }

//   /**
//    * 🧠 Suggest: Quick proactive outfit suggestion, wardrobe insight, tomorrow preview,
//    * and (optionally) predictive fields like seasonal capsule, lifecycle, and style trajectory.
//    */
//   async suggest(body: {
//     user?: string;
//     weather?: any;
//     wardrobe?: any[];
//     preferences?: Record<string, any>;
//   }) {
//     const { user, weather, wardrobe, preferences } = body;

//     const temp = weather?.fahrenheit?.main?.temp;
//     const tempDesc = temp
//       ? `${temp}°F and ${
//           temp < 60 ? 'cool' : temp > 85 ? 'warm' : 'mild'
//         } weather`
//       : 'unknown temperature';

//     const wardrobeCount = wardrobe?.length || 0;

//     const systemPrompt = `
// You are a luxury personal stylist.
// Your goal is to provide a daily style briefing that helps the user feel prepared, stylish, and confident.
// Be concise, intelligent, and polished — similar to a stylist at a high-end menswear brand.

// Output must be JSON with the following fields:
// - suggestion (string): Outfit recommendation for today.
// - insight (string): Smart observation about their wardrobe.
// - tomorrow (string): Guidance for tomorrow.

// Optionally, you may also include:
// - seasonalForecast (string): Forward-looking note on what they'll need for the next season.
// - lifecycleForecast (string): Prediction about an item that may soon need replacing.
// - styleTrajectory (string): Brief prediction of their evolving style direction.
// `;

//     const userPrompt = `
// Client: ${user || 'The user'}
// Weather: ${tempDesc}
// Wardrobe items: ${wardrobeCount}
// Preferences: ${JSON.stringify(preferences || {})}

// 1. suggestion: Outfit recommendation (1–2 sentences).
// 2. insight: Observation about wardrobe gaps or usage.
// 3. tomorrow: Preparation for tomorrow.
// (Optionally include seasonalForecast, lifecycleForecast, styleTrajectory if relevant.)
// `;

//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         { role: 'system', content: systemPrompt },
//         { role: 'user', content: userPrompt },
//       ],
//       response_format: { type: 'json_object' },
//     });

//     const raw = completion.choices[0]?.message?.content;
//     if (!raw) {
//       throw new Error('No suggestion response received from model.');
//     }

//     let parsed: {
//       suggestion: string;
//       insight: string;
//       tomorrow: string;
//       seasonalForecast?: string;
//       lifecycleForecast?: string;
//       styleTrajectory?: string;
//     };
//     try {
//       parsed = JSON.parse(raw);
//     } catch (e) {
//       console.error('❌ Failed to parse AI JSON:', raw);
//       throw new Error('AI response was not valid JSON.');
//     }

//     // ✅ If AI didn't generate a seasonal forecast, generate one automatically
//     if (!parsed.seasonalForecast) {
//       parsed.seasonalForecast = generateSeasonalForecast(wardrobe);
//     }

//     return parsed;
//   }
// }

////////////////////

// import { Injectable } from '@nestjs/common';
// import OpenAI from 'openai';
// import { ChatDto } from './dto/chat.dto';

// import * as fs from 'fs';
// import * as path from 'path';
// import * as dotenv from 'dotenv';

// function loadOpenAISecrets(): {
//   apiKey?: string;
//   project?: string;
//   source: string;
// } {
//   // Try the most likely locations FIRST. We prefer reading the file directly
//   // so a masked/global OPENAI_API_KEY can't override it.
//   const candidates = [
//     path.join(process.cwd(), '.env'), // when CWD = apps/backend-nest
//     path.join(process.cwd(), 'apps', 'backend-nest', '.env'), // when CWD = repo root
//     path.join(__dirname, '..', '..', '.env'), // dist/src-relative fallback
//   ];

//   for (const p of candidates) {
//     try {
//       if (fs.existsSync(p)) {
//         const parsed = dotenv.parse(fs.readFileSync(p));
//         const apiKey = parsed['OPENAI_API_KEY'];
//         const project = parsed['OPENAI_PROJECT_ID'];
//         if (apiKey) return { apiKey, project, source: p };
//       }
//     } catch {
//       // ignore and keep searching
//     }
//   }

//   // Final fallback to process.env (may be masked by your shell/IDE)
//   return {
//     apiKey: process.env.OPENAI_API_KEY,
//     project: process.env.OPENAI_PROJECT_ID,
//     source: 'process.env',
//   };
// }

// @Injectable()
// export class AiService {
//   private openai: OpenAI;

//   constructor() {
//     const { apiKey, project, source } = loadOpenAISecrets();

//     // Debug (safe): show where it came from + snippet/length, not the full secret.
//     const snippet = apiKey?.slice(0, 20) ?? '';
//     const len = apiKey?.length ?? 0;
//     console.log('🔑 OPENAI key source:', source);
//     console.log('🔑 OPENAI key snippet:', JSON.stringify(snippet));
//     console.log('🔑 OPENAI key length:', len);
//     console.log('📂 CWD:', process.cwd());

//     // Guards: catch masked/bad keys ASAP.
//     if (!apiKey) {
//       throw new Error('OPENAI_API_KEY not found in .env or environment.');
//     }
//     if (/^sk-?x{3,}/i.test(apiKey)) {
//       throw new Error(
//         'OPENAI_API_KEY appears masked (e.g., "sk-xxxxx..."). Read from the correct .env instead.',
//       );
//     }
//     if (!apiKey.startsWith('sk-')) {
//       throw new Error('OPENAI_API_KEY is malformed — must start with "sk-".');
//     }

//     this.openai = new OpenAI({ apiKey, project });
//   }

//   /**
//    * 💬 Full conversational chat (powers AiStylistChatScreen)
//    */
//   async chat(dto: ChatDto) {
//     const { messages } = dto;

//     const lastUserMsg = messages
//       .slice()
//       .reverse()
//       .find((m) => m.role === 'user')?.content;

//     if (!lastUserMsg) {
//       throw new Error('No user message provided');
//     }

//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         {
//           role: 'system',
//           content:
//             'You are a world-class personal fashion stylist. Give sleek, modern, practical outfit advice with attention to silhouette, color harmony, occasion, climate, and user comfort. Keep responses concise and actionable.',
//         },
//         ...messages,
//       ],
//     });

//     const aiReply =
//       completion.choices[0]?.message?.content?.trim() ||
//       'Styled response unavailable.';

//     return { reply: aiReply };
//   }

//   /**
//    * 🧠 Suggest: Quick proactive outfit suggestion, wardrobe insight, tomorrow preview,
//    * and (optionally) predictive fields like seasonal capsule, lifecycle, and style trajectory.
//    */
//   async suggest(body: {
//     user?: string;
//     weather?: any;
//     wardrobe?: any[];
//     preferences?: Record<string, any>;
//   }) {
//     const { user, weather, wardrobe, preferences } = body;

//     const temp = weather?.fahrenheit?.main?.temp;
//     const tempDesc = temp
//       ? `${temp}°F and ${
//           temp < 60 ? 'cool' : temp > 85 ? 'warm' : 'mild'
//         } weather`
//       : 'unknown temperature';

//     const wardrobeCount = wardrobe?.length || 0;

//     const systemPrompt = `
// You are a luxury personal stylist.
// Your goal is to provide a daily style briefing that helps the user feel prepared, stylish, and confident.
// Be concise, intelligent, and polished — similar to a stylist at a high-end menswear brand.

// Output must be JSON with the following fields:
// - suggestion (string): Outfit recommendation for today.
// - insight (string): Smart observation about their wardrobe.
// - tomorrow (string): Guidance for tomorrow.

// Optionally, you may also include:
// - seasonalForecast (string): Forward-looking note on what they'll need for the next season.
// - lifecycleForecast (string): Prediction about an item that may soon need replacing.
// - styleTrajectory (string): Brief prediction of their evolving style direction.
// `;

//     const userPrompt = `
// Client: ${user || 'The user'}
// Weather: ${tempDesc}
// Wardrobe items: ${wardrobeCount}
// Preferences: ${JSON.stringify(preferences || {})}

// 1. suggestion: Outfit recommendation (1–2 sentences).
// 2. insight: Observation about wardrobe gaps or usage.
// 3. tomorrow: Preparation for tomorrow.
// (Optionally include seasonalForecast, lifecycleForecast, styleTrajectory if relevant.)
// `;

//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         { role: 'system', content: systemPrompt },
//         { role: 'user', content: userPrompt },
//       ],
//       response_format: { type: 'json_object' },
//     });

//     const raw = completion.choices[0]?.message?.content;
//     if (!raw) {
//       throw new Error('No suggestion response received from model.');
//     }

//     let parsed: {
//       suggestion: string;
//       insight: string;
//       tomorrow: string;
//       seasonalForecast?: string;
//       lifecycleForecast?: string;
//       styleTrajectory?: string;
//     };
//     try {
//       parsed = JSON.parse(raw);
//     } catch (e) {
//       console.error('❌ Failed to parse AI JSON:', raw);
//       throw new Error('AI response was not valid JSON.');
//     }

//     return parsed;
//   }
// }

///////////////////////

// import { Injectable } from '@nestjs/common';
// import OpenAI from 'openai';
// import { ChatDto } from './dto/chat.dto';

// import * as fs from 'fs';
// import * as path from 'path';
// import * as dotenv from 'dotenv';

// function loadOpenAISecrets(): {
//   apiKey?: string;
//   project?: string;
//   source: string;
// } {
//   // Try the most likely locations FIRST. We prefer reading the file directly
//   // so a masked/global OPENAI_API_KEY can't override it.
//   const candidates = [
//     path.join(process.cwd(), '.env'), // when CWD = apps/backend-nest
//     path.join(process.cwd(), 'apps', 'backend-nest', '.env'), // when CWD = repo root
//     path.join(__dirname, '..', '..', '.env'), // dist/src-relative fallback
//   ];

//   for (const p of candidates) {
//     try {
//       if (fs.existsSync(p)) {
//         const parsed = dotenv.parse(fs.readFileSync(p));
//         const apiKey = parsed['OPENAI_API_KEY'];
//         const project = parsed['OPENAI_PROJECT_ID'];
//         if (apiKey) return { apiKey, project, source: p };
//       }
//     } catch {
//       // ignore and keep searching
//     }
//   }

//   // Final fallback to process.env (may be masked by your shell/IDE)
//   return {
//     apiKey: process.env.OPENAI_API_KEY,
//     project: process.env.OPENAI_PROJECT_ID,
//     source: 'process.env',
//   };
// }

// @Injectable()
// export class AiService {
//   private openai: OpenAI;

//   constructor() {
//     const { apiKey, project, source } = loadOpenAISecrets();

//     // Debug (safe): show where it came from + snippet/length, not the full secret.
//     const snippet = apiKey?.slice(0, 20) ?? '';
//     const len = apiKey?.length ?? 0;
//     console.log('🔑 OPENAI key source:', source);
//     console.log('🔑 OPENAI key snippet:', JSON.stringify(snippet));
//     console.log('🔑 OPENAI key length:', len);
//     console.log('📂 CWD:', process.cwd());

//     // Guards: catch masked/bad keys ASAP.
//     if (!apiKey) {
//       throw new Error('OPENAI_API_KEY not found in .env or environment.');
//     }
//     // Reject obviously masked placeholders like "sk-xxxxx***"
//     if (/^sk-?x{3,}/i.test(apiKey)) {
//       throw new Error(
//         'OPENAI_API_KEY appears masked (e.g., "sk-xxxxx..."). Read from the correct .env instead.',
//       );
//     }
//     // Accept both "sk-proj-" and normal "sk-" formats; prefer project-scoped key.
//     if (!apiKey.startsWith('sk-')) {
//       throw new Error('OPENAI_API_KEY is malformed — must start with "sk-".');
//     }

//     this.openai = new OpenAI({ apiKey, project });
//   }

//   /**
//    * 💬 Full conversational chat (powers AiStylistChatScreen)
//    */
//   async chat(dto: ChatDto) {
//     const { messages } = dto;

//     const lastUserMsg = messages
//       .slice()
//       .reverse()
//       .find((m) => m.role === 'user')?.content;

//     if (!lastUserMsg) {
//       throw new Error('No user message provided');
//     }

//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         {
//           role: 'system',
//           content:
//             'You are a world-class personal fashion stylist. Give sleek, modern, practical outfit advice with attention to silhouette, color harmony, occasion, climate, and user comfort. Keep responses concise and actionable.',
//         },
//         ...messages,
//       ],
//     });

//     const aiReply =
//       completion.choices[0]?.message?.content?.trim() ||
//       'Styled response unavailable.';

//     return { reply: aiReply };
//   }

//   /**
//    * 🧠 Suggest: Quick proactive outfit suggestion, wardrobe insight, and tomorrow preview.
//    * Powers AiStylistSuggestions.tsx on the home screen.
//    */
//   async suggest(body: {
//     user?: string;
//     weather?: any;
//     wardrobe?: any[];
//     preferences?: Record<string, any>;
//   }) {
//     const { user, weather, wardrobe, preferences } = body;

//     const temp = weather?.fahrenheit?.main?.temp;
//     const tempDesc = temp
//       ? `${temp}°F and ${
//           temp < 60 ? 'cool' : temp > 85 ? 'warm' : 'mild'
//         } weather`
//       : 'unknown temperature';

//     const wardrobeCount = wardrobe?.length || 0;

//     const systemPrompt = `
// You are a luxury personal stylist.
// Your goal is to provide a daily style briefing that helps the user feel prepared, stylish, and confident.
// Be concise, intelligent, and polished — similar to a stylist at a high-end menswear brand.
// Output must be JSON with three fields: "suggestion", "insight", and "tomorrow".
// `;

//     const userPrompt = `
// Client: ${user || 'The user'}
// Weather: ${tempDesc}
// Wardrobe items: ${wardrobeCount}
// Preferences: ${JSON.stringify(preferences || {})}

// 1. suggestion: One outfit recommendation (1–2 sentences) based on the above.
// 2. insight: One smart observation about their wardrobe (gap, underused item, etc.).
// 3. tomorrow: One brief note predicting how they should approach tomorrow’s outfit.
// `;

//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         { role: 'system', content: systemPrompt },
//         { role: 'user', content: userPrompt },
//       ],
//       response_format: { type: 'json_object' },
//     });

//     const raw = completion.choices[0]?.message?.content;
//     if (!raw) {
//       throw new Error('No suggestion response received from model.');
//     }

//     let parsed: { suggestion: string; insight: string; tomorrow: string };
//     try {
//       parsed = JSON.parse(raw);
//     } catch (e) {
//       console.error('❌ Failed to parse AI JSON:', raw);
//       throw new Error('AI response was not valid JSON.');
//     }

//     return parsed;
//   }
// }

///////////////////

// // apps/backend-nest/src/ai/ai.service.ts
// import { Injectable } from '@nestjs/common';
// import OpenAI from 'openai';
// import { ChatDto } from './dto/chat.dto';

// import * as fs from 'fs';
// import * as path from 'path';
// import * as dotenv from 'dotenv';

// function loadOpenAISecrets(): {
//   apiKey?: string;
//   project?: string;
//   source: string;
// } {
//   // Try the most likely locations FIRST. We prefer reading the file directly
//   // so a masked/global OPENAI_API_KEY can't override it.
//   const candidates = [
//     path.join(process.cwd(), '.env'), // when CWD = apps/backend-nest
//     path.join(process.cwd(), 'apps', 'backend-nest', '.env'), // when CWD = repo root
//     path.join(__dirname, '..', '..', '.env'), // dist/src-relative fallback
//   ];

//   for (const p of candidates) {
//     try {
//       if (fs.existsSync(p)) {
//         const parsed = dotenv.parse(fs.readFileSync(p));
//         const apiKey = parsed['OPENAI_API_KEY'];
//         const project = parsed['OPENAI_PROJECT_ID'];
//         if (apiKey) return { apiKey, project, source: p };
//       }
//     } catch {
//       // ignore and keep searching
//     }
//   }

//   // Final fallback to process.env (may be masked by your shell/IDE)
//   return {
//     apiKey: process.env.OPENAI_API_KEY,
//     project: process.env.OPENAI_PROJECT_ID,
//     source: 'process.env',
//   };
// }

// @Injectable()
// export class AiService {
//   private openai: OpenAI;

//   constructor() {
//     const { apiKey, project, source } = loadOpenAISecrets();

//     // Debug (safe): show where it came from + snippet/length, not the full secret.
//     const snippet = apiKey?.slice(0, 20) ?? '';
//     const len = apiKey?.length ?? 0;
//     console.log('🔑 OPENAI key source:', source);
//     console.log('🔑 OPENAI key snippet:', JSON.stringify(snippet));
//     console.log('🔑 OPENAI key length:', len);
//     console.log('📂 CWD:', process.cwd());

//     // Guards: catch masked/bad keys ASAP.
//     if (!apiKey) {
//       throw new Error('OPENAI_API_KEY not found in .env or environment.');
//     }
//     // Reject obviously masked placeholders like "sk-xxxxx***"
//     if (/^sk-?x{3,}/i.test(apiKey)) {
//       throw new Error(
//         'OPENAI_API_KEY appears masked (e.g., "sk-xxxxx..."). Read from the correct .env instead.',
//       );
//     }
//     // Accept both "sk-proj-" and normal "sk-" formats; prefer project-scoped key.
//     if (!apiKey.startsWith('sk-')) {
//       throw new Error('OPENAI_API_KEY is malformed — must start with "sk-".');
//     }

//     this.openai = new OpenAI({ apiKey, project });
//   }

//   async chat(dto: ChatDto) {
//     const { messages } = dto;

//     const lastUserMsg = messages
//       .slice()
//       .reverse()
//       .find((m) => m.role === 'user')?.content;

//     if (!lastUserMsg) {
//       throw new Error('No user message provided');
//     }

//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         {
//           role: 'system',
//           content:
//             'You are a world-class personal fashion stylist. Give sleek, modern, practical outfit advice with attention to silhouette, color harmony, occasion, climate, and user comfort. Keep responses concise and actionable.',
//         },
//         ...messages,
//       ],
//     });

//     const aiReply =
//       completion.choices[0]?.message?.content?.trim() ||
//       'Styled response unavailable.';

//     return { reply: aiReply };
//   }
// }

/////////////////////

// import { Injectable } from '@nestjs/common';
// import OpenAI from 'openai';
// import { ChatDto } from './dto/chat.dto';

// @Injectable()
// export class AiService {
//   private openai: OpenAI;

//   constructor() {
//     const apiKey = process.env.OPENAI_API_KEY;
//     const project = process.env.OPENAI_PROJECT_ID;
//     console.log('ENV KEY >>>', JSON.stringify(process.env.OPENAI_API_KEY));
//     console.log('ENV LENGTH >>>', process.env.OPENAI_API_KEY?.length);
//     console.log('DOTENV PATH >>>', process.env.PWD);

//     console.log('OPENAI_API_KEY loaded?', apiKey?.slice(0, 10));

//     this.openai = new OpenAI({
//       apiKey,
//       project,
//     });
//   }

//   async chat(dto: ChatDto) {
//     const { messages } = dto;

//     const lastUserMsg = messages
//       .slice()
//       .reverse()
//       .find((m) => m.role === 'user')?.content;

//     if (!lastUserMsg) {
//       throw new Error('No user message provided');
//     }

//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         {
//           role: 'system',
//           content:
//             'You are a world-class personal fashion stylist. Give sleek, modern, practical outfit advice with attention to silhouette, color harmony, occasion, climate, and user comfort. Keep responses concise and actionable.',
//         },
//         ...messages,
//       ],
//     });

//     const aiReply =
//       completion.choices[0]?.message?.content?.trim() ||
//       'Styled response unavailable.';

//     return { reply: aiReply };
//   }
// }

///////////////

// import { Injectable } from '@nestjs/common';
// import OpenAI from 'openai';
// import { ChatDto } from './dto/chat.dto';

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
//   project: process.env.OPENAI_PROJECT_ID,
// });
// console.log('OPENAI_API_KEY loaded?', process.env.OPENAI_API_KEY?.slice(0, 10));

// @Injectable()
// export class AiService {
//   /** Handles AI chat and returns GPT response (no DB logging) */
//   async chat(dto: ChatDto) {
//     const { messages } = dto;

//     const lastUserMsg = messages
//       .slice()
//       .reverse()
//       .find((m) => m.role === 'user')?.content;

//     if (!lastUserMsg) {
//       throw new Error('No user message provided');
//     }

//     // 🧠 Call GPT
//     const completion = await openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         {
//           role: 'system',
//           content:
//             'You are a world-class personal fashion stylist. Give sleek, modern, practical outfit advice with attention to silhouette, color harmony, occasion, climate, and user comfort. Keep responses concise and actionable.',
//         },
//         ...messages,
//       ],
//     });

//     const aiReply =
//       completion.choices[0]?.message?.content?.trim() ||
//       'Styled response unavailable.';

//     return { reply: aiReply };
//   }
// }

///////////////////

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import OpenAI from 'openai';
// import { PromptDto } from './dto/prompt.dto';
// import { ChatDto } from './dto/chat.dto';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// // const openai = new OpenAI({
// //   apiKey: process.env.OPENAI_API_KEY,
// //   project: process.env.OPENAI_PROJECT_ID,
// // });
// // console.log('OPENAI_API_KEY loaded?', process.env.OPENAI_API_KEY?.slice(0, 10));

// @Injectable()
// export class AiService {
//   async handlePrompt(dto: PromptDto) {
//     const {
//       user_id,
//       prompt,
//       ai_response_summary,
//       location,
//       weather,
//       suggested_outfit_id,
//     } = dto;

//     const res = await pool.query(
//       `INSERT INTO ai_prompts (
//          user_id, prompt, ai_response_summary, location, weather, suggested_outfit_id
//        ) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id;`,
//       [
//         user_id,
//         prompt,
//         ai_response_summary ?? null,
//         location ?? null,
//         weather ?? null,
//         suggested_outfit_id ?? null,
//       ],
//     );

//     return { message: 'Prompt logged', prompt_id: res.rows[0].id };
//   }

//   async chat(dto: ChatDto) {
//     const { user_id, messages, location, weather, suggested_outfit_id } = dto;

//     const lastUserMsg = [...messages]
//       .reverse()
//       .find((m) => m.role === 'user')?.content;
//     if (!lastUserMsg) throw new Error('No user message provided');

//     const completion = await openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         {
//           role: 'system',
//           content:
//             'You are a world-class personal fashion stylist. Give sleek, modern, practical outfit advice with attention to silhouette, color harmony, occasion, climate, and user comfort. Keep responses concise and actionable.',
//         },
//         ...messages,
//       ],
//     });

//     const aiReply =
//       completion.choices[0]?.message?.content?.trim() ??
//       'Styled response unavailable.';
//     const aiSummary = aiReply.slice(0, 240);

//     void this.handlePrompt({
//       user_id: user_id ?? 'anon',
//       prompt: lastUserMsg,
//       ai_response_summary: aiSummary,
//       location,
//       weather,
//       ...(suggested_outfit_id ? { suggested_outfit_id } : {}),
//     });

//     return { reply: aiReply };
//   }
// }

/////////////////

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import OpenAI from 'openai';
// import { PromptDto } from './dto/prompt.dto';
// import { ChatDto } from './dto/chat.dto';

// const pool = new Pool();

// // const openai = new OpenAI({
// //   apiKey: process.env.OPENAI_API_KEY,
// //   project: process.env.OPENAI_PROJECT_ID,
// // });
// // console.log('OPENAI_API_KEY loaded?', process.env.OPENAI_API_KEY?.slice(0, 10));

// @Injectable()
// export class AiService {
//   /** Logs a user prompt + optional AI response summary into ai_prompts table */
//   async handlePrompt(dto: PromptDto) {
//     const {
//       user_id,
//       prompt,
//       ai_response_summary,
//       location,
//       weather,
//       suggested_outfit_id,
//     } = dto;

//     const res = await pool.query(
//       `
//       INSERT INTO ai_prompts (
//         user_id,
//         prompt,
//         ai_response_summary,
//         location,
//         weather,
//         suggested_outfit_id
//       )
//       VALUES ($1, $2, $3, $4, $5, $6)
//       RETURNING id;
//       `,
//       [
//         user_id,
//         prompt,
//         ai_response_summary ?? null,
//         location ?? null,
//         weather ?? null,
//         suggested_outfit_id ?? null,
//       ],
//     );

//     return { message: 'Prompt logged', prompt_id: res.rows[0].id };
//   }

//   /** Handles AI chat, returns GPT-5 response and logs summary */
//   async chat(dto: ChatDto) {
//     const { user_id, messages, location, weather, suggested_outfit_id } = dto;

//     const lastUserMsg = messages
//       .slice()
//       .reverse()
//       .find((m) => m.role === 'user')?.content;

//     if (!lastUserMsg) {
//       throw new Error('No user message provided');
//     }

//     // 🧠 Call GPT-5
//     const completion = await openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         {
//           role: 'system',
//           content:
//             'You are a world-class personal fashion stylist. Give sleek, modern, practical outfit advice with attention to silhouette, color harmony, occasion, climate, and user comfort. Keep responses concise and actionable.',
//         },
//         ...messages,
//       ],
//     });

//     const aiReply =
//       completion.choices[0]?.message?.content?.trim() ||
//       'Styled response unavailable.';
//     const aiSummary = aiReply.slice(0, 240);

//     // 📝 Fire-and-forget log to ai_prompts
//     void this.handlePrompt({
//       user_id: user_id || 'anon',
//       prompt: lastUserMsg,
//       ai_response_summary: aiSummary,
//       location,
//       weather,
//       ...(suggested_outfit_id ? { suggested_outfit_id } : {}),
//     });

//     return { reply: aiReply };
//   }
// }

////////////////////

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import { PromptDto } from './dto/prompt.dto';

// const pool = new Pool();

// @Injectable()
// export class AiService {
//   async handlePrompt(dto: PromptDto) {
//     const {
//       user_id,
//       prompt,
//       ai_response_summary,
//       location,
//       weather,
//       suggested_outfit_id,
//     } = dto;

//     const res = await pool.query(
//       `
//       INSERT INTO ai_prompts (
//         user_id, prompt, ai_response_summary, location, weather, suggested_outfit_id
//       ) VALUES ($1, $2, $3, $4, $5, $6)
//       RETURNING id;
//     `,
//       [
//         user_id,
//         prompt,
//         ai_response_summary,
//         location,
//         weather,
//         suggested_outfit_id,
//       ],
//     );

//     return { message: 'Prompt logged', prompt_id: res.rows[0].id };
//   }
// }

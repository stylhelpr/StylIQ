import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ChatDto } from './dto/chat.dto';
import { VertexService } from '../vertex/vertex.service'; // 🔹 ADDED
import { ProductSearchService } from '../product-services/product-search.service';

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

    // 🔸 OpenAI fallback (unchanged)
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

      let parsed: any = {};
      try {
        parsed = JSON.parse(raw);
      } catch {
        console.error('⚠️ [AI] analyze() JSON parse failed:', raw);
        parsed = {};
      }

      return { tags: parsed.tags || [] };
    } catch (err: any) {
      console.error('❌ [AI] analyze() failed:', err.message);
      return { tags: ['casual', 'modern', 'neutral'] };
    }
  }

  //   async recreate(user_id: string, tags: string[], image_url?: string) {
  //     console.log(
  //       '🧥 [AI] recreate() called for user',
  //       user_id,
  //       'with tags:',
  //       tags,
  //     );
  //     if (!user_id) throw new Error('Missing user_id');
  //     if (!tags?.length) {
  //       console.warn('⚠️ [AI] recreate() empty tags, using fallback keywords.');
  //       tags = ['modern', 'neutral', 'tailored'];
  //     }

  //     const prompt = `
  // You are a professional AI fashion stylist.
  // Create a cohesive outfit inspired by a *real uploaded look*.

  // Client ID: ${user_id}
  // Uploaded look image: ${image_url || 'N/A'}
  // Detected visual tags: ${tags.join(', ')}

  // Guidelines:
  // - Use the image (if provided) as the main inspiration for palette, mood, and silhouette.
  // - Keep the same style family (e.g. streetwear, tailored, casual).
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
  //         const query = `${o.item || o.category || ''} ${o.color || ''}`.trim();

  //         // 🔎 1st pass: combined search (Farfetch → ASOS → SerpAPI)
  //         const products = await this.productSearch.search(query);
  //         let top = products[0];

  //         // 🔁 2nd pass: retry with SerpAPI if no valid image
  //         if (!top?.image || top.image.includes('No_Image')) {
  //           const serp = await this.productSearch.searchSerpApi(query);
  //           if (serp?.[0]) top = { ...serp[0], source: 'SerpAPI' };
  //         }

  //         // 🧱 Always return a full object
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
  //         };
  //       }),
  //     );

  //     /* ---------------------- 3️⃣ Return final payload ---------------------- */
  //     return { user_id, outfit: enriched, style_note };
  //   }

  async recreate(user_id: string, tags: string[], image_url?: string) {
    console.log(
      '🧥 [AI] recreate() called for user',
      user_id,
      'with tags:',
      tags,
    );
    if (!user_id) throw new Error('Missing user_id');
    if (!tags?.length) {
      console.warn('⚠️ [AI] recreate() empty tags, using fallback keywords.');
      tags = ['modern', 'neutral', 'tailored'];
    }

    const prompt = `
You are a professional AI fashion stylist. 
Create a cohesive outfit inspired by a *real uploaded look*.

Client ID: ${user_id}
Uploaded look image: ${image_url || 'N/A'}
Detected visual tags: ${tags.join(', ')}

Guidelines:
- Use the image (if provided) as the main inspiration for palette, mood, and silhouette.
- Keep the same style family (e.g. streetwear, tailored, casual).
- Output only valid JSON, in the exact format below — no text outside the JSON.

{
  "outfit": [
    { "category": "Top", "item": "Grey Cotton Tee", "color": "gray" },
    { "category": "Bottom", "item": "Ripped Indigo Jeans", "color": "indigo" },
    { "category": "Outerwear", "item": "Beige Overshirt", "color": "beige" },
    { "category": "Shoes", "item": "White Sneakers", "color": "white" }
  ],
  "style_note": "Brief note describing the overall look and how it connects to the uploaded image."
}
`;

    /* ---------------------- 1️⃣ Generate outfit ---------------------- */
    let parsed: any;
    if (this.useVertex && this.vertexService) {
      try {
        const result = await this.vertexService.generateReasonedOutfit(prompt);
        let text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        text = text
          .replace(/^```json\s*/i, '')
          .replace(/```$/, '')
          .trim();
        parsed = JSON.parse(text);
        console.log('🧠 [Vertex] recreate() success:', parsed);
      } catch (err: any) {
        console.warn(
          '[Vertex] recreate() failed → fallback to OpenAI:',
          err.message,
        );
      }
    }

    if (!parsed) {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const raw = completion.choices[0]?.message?.content || '{}';
      try {
        parsed = JSON.parse(raw);
      } catch {
        console.error('⚠️ [AI] recreate() JSON parse failed:', raw);
        parsed = {};
      }
    }

    const outfit = Array.isArray(parsed?.outfit) ? parsed.outfit : [];
    const style_note =
      parsed?.style_note || 'Modern outfit inspired by the uploaded look.';

    /* ---------------------- 2️⃣ Enrich with live products ---------------------- */
    const enriched = await Promise.all(
      outfit.map(async (o: any) => {
        const query = `${o.item || o.category || ''} ${o.color || ''}`.trim();
        const products = await this.productSearch.search(query);
        let top = products[0];

        // 🔁 Retry with SerpAPI if no valid image
        if (!top?.image || top.image.includes('No_Image')) {
          const serp = await this.productSearch.searchSerpApi(query);
          if (serp?.[0]) top = { ...serp[0], source: 'SerpAPI' };
        }

        // 🌟 Extract Farfetch / SerpAPI extras if available
        const hasMeta =
          top &&
          (top.source === 'Farfetch' || top.source === 'SerpAPI') &&
          (top as any);

        const discount =
          (hasMeta as any)?.tag ||
          (hasMeta as any)?.extensions?.join(', ') ||
          null;
        const delivery = (hasMeta as any)?.delivery || null;

        // Optionally, try to infer metadata fields for enrichment
        const materialHint = query.match(
          /(wool|cotton|linen|leather|nylon|denim|polyester)/i,
        )?.[0];
        const seasonalityHint = query.match(
          /(summer|winter|fall|spring)/i,
        )?.[0];
        const fitHint = query.match(
          /(slim|regular|relaxed|oversized|tailored)/i,
        )?.[0];

        // 🧱 Return enriched object
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

          // 🧩 Extended metadata
          discount,
          delivery,
          material: materialHint || null,
          seasonality: seasonalityHint || getCurrentSeason(),
          fit: fitHint || 'regular',
        };
      }),
    );

    /* ---------------------- 3️⃣ Return final payload ---------------------- */
    return { user_id, outfit: enriched, style_note };
  }

  ////////END CREATE LOOK

  async chat(dto: ChatDto) {
    const { messages } = dto;
    const lastUserMsg = messages
      .slice()
      .reverse()
      .find((m) => m.role === 'user')?.content;

    if (!lastUserMsg) {
      throw new Error('No user message provided');
    }

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.8,
      messages: [
        {
          role: 'system',
          content:
            'You are a world-class personal fashion stylist. Give sleek, modern, practical outfit advice with attention to silhouette, color harmony, occasion, climate, and user comfort. Keep responses concise and actionable.',
        },
        ...messages,
      ],
    });

    const aiReply =
      completion.choices[0]?.message?.content?.trim() ||
      'Styled response unavailable.';

    return { reply: aiReply };
  }

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

Output must be JSON with the following fields:
- suggestion (string)
- insight (string)
- tomorrow (string)
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

// //BELOW HERE IS LOGIC TO KEEP FOR BATCH UPLOAD ITEMS - KEEP VERSION 1

// apps/backend-nest/src/vertex/vertex.service.ts
import { Injectable } from '@nestjs/common';
import { PredictionServiceClient, helpers } from '@google-cloud/aiplatform';
import { VertexAI, SchemaType } from '@google-cloud/vertexai';
import { withBackoff } from './vertex.util';
import { getSecretJson } from '../config/secrets';

const { toValue } = helpers;

type GCPServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
  [key: string]: any;
};

type AnalyzeHints = {
  gender?: 'Male' | 'Female' | 'Unisex';
  dressCode?: string;
  season?: 'Spring' | 'Summer' | 'Fall' | 'Winter' | 'AllSeason';
};

export type AnalyzeOutput = {
  ai_title?: string;
  ai_description?: string;
  ai_key_attributes?: string[];
  ai_confidence?: number; // 0..1

  // Categorization
  main_category?: string;
  subcategory?: string;
  tags?: string[];
  style_descriptors?: string[];
  style_archetypes?: string[];
  anchor_role?: 'Hero' | 'Neutral' | 'Connector';

  // Occasion & Formality
  occasion_tags?: ('Work' | 'DateNight' | 'Travel' | 'Gym')[];
  dress_code?:
    | 'UltraCasual'
    | 'Casual'
    | 'SmartCasual'
    | 'BusinessCasual'
    | 'Business'
    | 'BlackTie';
  formality_score?: number;

  // Color & Palette
  color?: string;
  dominant_hex?: string;
  palette_hex?: string[];
  color_family?:
    | 'Black'
    | 'White'
    | 'Blue'
    | 'Red'
    | 'Green'
    | 'Yellow'
    | 'Brown'
    | 'Gray'
    | 'Navy'
    | 'Beige'
    | 'Purple'
    | 'Orange';
  color_temp?: 'Warm' | 'Cool' | 'Neutral';
  contrast_profile?: 'Low' | 'Medium' | 'High';

  // Material & Construction /
  material?: string;
  fabric_blend?: Array<{ material: string; percent: number }>;
  fit?: 'Slim' | 'Regular' | 'Oversized';
  stretch_pct?: number;
  thickness?: number;
  thermal_rating?: number;
  breathability?: number;
  fabric_weight_gsm?: number;
  wrinkle_resistance?: 'Low' | 'Med' | 'High';
  stretch_direction?: '2-way' | '4-way';

  // Pattern
  pattern?:
    | 'Solid'
    | 'Striped'
    | 'Check'
    | 'Herringbone'
    | 'Windowpane'
    | 'Floral'
    | 'Dot'
    | 'Camo'
    | 'Abstract'
    | 'Other';
  pattern_scale?: 'Micro' | 'Medium' | 'Bold';

  // Silhouette & Cut
  neckline?: string;
  collar_type?: string;
  sleeve_length?: string;
  hem_style?: string;
  rise?: string;
  leg?: string;
  inseam_in?: number;
  cuff?: boolean;
  lapel?: string;
  closure?: string;
  length_class?: string;
  shoe_style?: string;
  sole?: string;
  toe_shape?: string;

  // Seasonality & Layering
  seasonality?: 'Spring' | 'Summer' | 'Fall' | 'Winter' | 'AllSeason';
  seasonality_arr?: string[];
  layering?: 'Base' | 'Mid' | 'Outer';

  // Climate & Conditions
  rain_ok?: boolean;
  wind_ok?: boolean;
  waterproof_rating?: string;
  climate_sweetspot_f_min?: number;
  climate_sweetspot_f_max?: number;

  // Sizing
  size?: string;
  size_label?: string;
  size_system?: 'US' | 'EU' | 'UK';
  measurements?: Record<string, number>;
  width?: number;
  height?: number;

  // Care
  care_symbols?: string[];
  wash_temp_c?: number;
  dry_clean?: boolean;
  iron_ok?: boolean;

  // Commerce
  brand?: string;
  retailer?: string;
  purchase_date?: string;
  purchase_price?: number;
  country_of_origin?: string;
  condition?: 'New' | 'Like New' | 'Good' | 'Worn' | 'Damaged';
  defects_notes?: string;
};

@Injectable()
export class VertexService {
  private client: PredictionServiceClient; // Predict API (embeddings)
  private projectId: string;
  private location: string;
  private vertexAI: VertexAI; // Generative API (Gemini)

  // Model names - defaults, can be overridden via config secrets if needed
  private textModel = 'gemini-embedding-001';
  private imageModel = 'multimodalembedding@001';
  private generationModel = 'gemini-2.5-flash';
  private reasoningModel = 'gemini-2.5-pro';

  // 🔒 simple in-process semaphore to cap concurrent Vertex calls
  private static inflight = 0;
  private static readonly MAX_CONCURRENT = 5;

  private async withSemaphore<T>(fn: () => Promise<T>): Promise<T> {
    while (VertexService.inflight >= VertexService.MAX_CONCURRENT) {
      await new Promise((r) => setTimeout(r, 50));
    }
    VertexService.inflight++;
    try {
      return await fn();
    } finally {
      VertexService.inflight--;
    }
  }

  // tiny helper to pick a sane mime from gs:// path
  private detectMimeFromGcsUri(uri: string): string {
    const lower = uri.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.gif')) return 'image/gif';
    // HEIC/HEIF often not supported directly by models; prefer converting at upload time.
    // We default to jpeg to keep requests accepted when extension is unknown.
    return 'image/jpeg';
  }

  constructor() {
    // Predict API client for embeddings
    this.client = new PredictionServiceClient();

    // Load project ID from service account JSON secret
    const keyFile = getSecretJson<GCPServiceAccount>('GCP_SERVICE_ACCOUNT_JSON');
    this.projectId = keyFile.project_id;

    // Region - config (not a secret)
    this.location = process.env.GCP_REGION || 'us-central1';

    // Generative API client
    this.vertexAI = new VertexAI({
      project: this.projectId,
      location: this.location,
    });
  }

  // -------------------
  // Text Embeddings (Predict API)
  // -------------------
  async embedText(text: string): Promise<number[]> {
    const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.textModel}`;

    const [response]: any = await this.withSemaphore(() =>
      withBackoff(
        () =>
          this.client.predict({
            endpoint,
            instances: [toValue({ content: text }) as any],
            parameters: toValue({ outputDimensionality: 512 }),
          }),
        'predict:text',
      ),
    );

    const values =
      response?.predictions?.[0]?.structValue?.fields?.embeddings?.structValue
        ?.fields?.values?.listValue?.values;

    if (!values || values.length === 0) {
      throw new Error('No text embedding returned from Vertex AI');
    }

    return values.map((v: any) => v.numberValue!);
  }

  // -------------------
  // Image Embeddings (Predict API)
  // -------------------
  async embedImage(gcsUri: string): Promise<number[]> {
    const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.imageModel}`;

    const [response]: any = await this.withSemaphore(() =>
      withBackoff(
        () =>
          this.client.predict({
            endpoint,
            instances: [toValue({ image: { gcsUri } }) as any],
            parameters: toValue({ dimension: 512 }) as any,
          }),
        'predict:image',
      ),
    );

    const values =
      response?.predictions?.[0]?.structValue?.fields?.imageEmbedding?.listValue
        ?.values;

    if (!values || values.length === 0) {
      throw new Error('No image embedding returned from Vertex AI');
    }

    return values.map((v: any) => v.numberValue!);
  }

  // -------------------
  // Image → Structured Metadata (Gemini 2.5 Flash)
  // -------------------
  async analyzeImage(
    gcsUri: string,
    hints?: AnalyzeHints,
  ): Promise<AnalyzeOutput> {
    if (!gcsUri?.startsWith('gs://')) {
      throw new Error('analyzeImage expects a gs:// URI');
    }

    const model = this.vertexAI.getGenerativeModel({
      model: this.generationModel, // e.g., gemini-2.5-flash
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            ai_title: { type: SchemaType.STRING },
            ai_description: { type: SchemaType.STRING },
            ai_key_attributes: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
            ai_confidence: { type: SchemaType.NUMBER },

            main_category: { type: SchemaType.STRING },
            subcategory: { type: SchemaType.STRING },
            tags: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
            style_descriptors: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
            style_archetypes: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
            anchor_role: {
              type: SchemaType.STRING,
              enum: ['Hero', 'Neutral', 'Connector'],
            },

            occasion_tags: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.STRING,
                enum: ['Work', 'DateNight', 'Travel', 'Gym'],
              },
            },
            dress_code: {
              type: SchemaType.STRING,
              enum: [
                'UltraCasual',
                'Casual',
                'SmartCasual',
                'BusinessCasual',
                'Business',
                'BlackTie',
              ],
            },
            formality_score: { type: SchemaType.NUMBER },

            color: { type: SchemaType.STRING },
            dominant_hex: { type: SchemaType.STRING },
            palette_hex: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
            color_family: { type: SchemaType.STRING },
            color_temp: {
              type: SchemaType.STRING,
              enum: ['Warm', 'Cool', 'Neutral'],
            },
            contrast_profile: {
              type: SchemaType.STRING,
              enum: ['Low', 'Medium', 'High'],
            },

            material: { type: SchemaType.STRING },
            fabric_blend: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  material: { type: SchemaType.STRING },
                  percent: { type: SchemaType.NUMBER },
                },
              },
            },
            fit: {
              type: SchemaType.STRING,
              enum: ['Slim', 'Regular', 'Oversized'],
            },
            stretch_pct: { type: SchemaType.NUMBER },
            thickness: { type: SchemaType.NUMBER },
            thermal_rating: { type: SchemaType.NUMBER },
            breathability: { type: SchemaType.NUMBER },
            fabric_weight_gsm: { type: SchemaType.NUMBER },
            wrinkle_resistance: {
              type: SchemaType.STRING,
              enum: ['Low', 'Med', 'High'],
            },
            stretch_direction: {
              type: SchemaType.STRING,
              enum: ['2-way', '4-way'],
            },

            pattern: {
              type: SchemaType.STRING,
              enum: [
                'Solid',
                'Striped',
                'Check',
                'Herringbone',
                'Windowpane',
                'Floral',
                'Dot',
                'Camo',
                'Abstract',
                'Other',
              ],
            },
            pattern_scale: {
              type: SchemaType.STRING,
              enum: ['Micro', 'Medium', 'Bold'],
            },

            neckline: { type: SchemaType.STRING },
            collar_type: { type: SchemaType.STRING },
            sleeve_length: { type: SchemaType.STRING },
            hem_style: { type: SchemaType.STRING },
            rise: { type: SchemaType.STRING },
            leg: { type: SchemaType.STRING },
            inseam_in: { type: SchemaType.NUMBER },
            cuff: { type: SchemaType.BOOLEAN },
            lapel: { type: SchemaType.STRING },
            closure: { type: SchemaType.STRING },
            length_class: { type: SchemaType.STRING },
            shoe_style: { type: SchemaType.STRING },
            sole: { type: SchemaType.STRING },
            toe_shape: { type: SchemaType.STRING },

            seasonality: {
              type: SchemaType.STRING,
              enum: ['Spring', 'Summer', 'Fall', 'Winter', 'AllSeason'],
            },
            seasonality_arr: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
            layering: {
              type: SchemaType.STRING,
              enum: ['Base', 'Mid', 'Outer'],
            },

            rain_ok: { type: SchemaType.BOOLEAN },
            wind_ok: { type: SchemaType.BOOLEAN },
            waterproof_rating: { type: SchemaType.STRING },
            climate_sweetspot_f_min: { type: SchemaType.NUMBER },
            climate_sweetspot_f_max: { type: SchemaType.NUMBER },

            size: { type: SchemaType.STRING },
            size_label: { type: SchemaType.STRING },
            size_system: { type: SchemaType.STRING, enum: ['US', 'EU', 'UK'] },
            measurements: { type: SchemaType.OBJECT },
            width: { type: SchemaType.NUMBER },
            height: { type: SchemaType.NUMBER },

            care_symbols: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
            wash_temp_c: { type: SchemaType.NUMBER },
            dry_clean: { type: SchemaType.BOOLEAN },
            iron_ok: { type: SchemaType.BOOLEAN },

            brand: { type: SchemaType.STRING },
            retailer: { type: SchemaType.STRING },
            purchase_date: { type: SchemaType.STRING },
            purchase_price: { type: SchemaType.NUMBER },
            country_of_origin: { type: SchemaType.STRING },
            condition: {
              type: SchemaType.STRING,
              enum: ['New', 'Like New', 'Good', 'Worn', 'Damaged'],
            },
            defects_notes: { type: SchemaType.STRING },
          },
        },
      },
    });

    const guidance = [
      'Analyze the garment in the image and return STRICT JSON only.',
      'Prefer concrete, conservative values. If unknown, omit the field.',
      'Include both a human-readable color name and dominant_hex when visible.',
      'Use pattern_scale: Micro (subtle/small), Medium, Bold (loud/large).',
      'Dress code, seasonality, and layering should reflect visible cues only.',
      hints?.gender ? `Assume wearer context: ${hints.gender}.` : '',
      hints?.dressCode
        ? `If ambiguous, bias dress_code toward ${hints.dressCode}.`
        : '',
      hints?.season
        ? `If ambiguous, bias seasonality toward ${hints.season}.`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    const mimeType = this.detectMimeFromGcsUri(gcsUri);

    const result = await this.withSemaphore(() =>
      withBackoff(
        () =>
          model.generateContent({
            contents: [
              {
                role: 'user',
                parts: [
                  { fileData: { fileUri: gcsUri, mimeType } },
                  { text: guidance },
                ],
              },
            ],
          }),
        'gemini:analyze',
      ),
    );

    // SDK shape: response.candidates[0].content.parts[0].text
    // @ts-ignore
    const text =
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    try {
      const parsed = JSON.parse(text);
      if (typeof parsed.ai_confidence === 'number') {
        parsed.ai_confidence = Math.max(0, Math.min(1, parsed.ai_confidence));
      }
      return parsed as AnalyzeOutput;
    } catch {
      return {};
    }
  }

  // -------------------
  // Outfit Generation (Gemini Flash via Generative API)
  // -------------------
  async generateOutfits(prompt: string): Promise<any> {
    const model = this.vertexAI.getGenerativeModel({
      model: this.generationModel, // gemini-2.5-flash
    });

    const result = await this.withSemaphore(() =>
      withBackoff(() => model.generateContent(prompt), 'gemini:flash'),
    );

    console.log(
      '👗 Gemini Flash outfit response:',
      JSON.stringify(result.response, null, 2),
    );

    return result.response;
  }

  // -------------------
  // Outfit Generation (Gemini Pro via Generative API)
  // -------------------
  async generateReasonedOutfit(prompt: string): Promise<any> {
    const model = this.vertexAI.getGenerativeModel({
      model: this.reasoningModel, // gemini-2.5-pro
    });

    const result = await this.withSemaphore(() =>
      withBackoff(() => model.generateContent(prompt), 'gemini:pro'),
    );

    console.log(
      '🎩 Gemini Pro outfit response:',
      JSON.stringify(result.response, null, 2),
    );

    return result.response;
  }
}

////////////////////////

//BELOW HERE IS LOGIC TO KEEP FOR SINGLE UPLOAD ITEMS - KEEP VERSION 1

// // apps/backend-nest/src/vertex/vertex.service.ts
// import { Injectable } from '@nestjs/common';
// import { PredictionServiceClient, helpers } from '@google-cloud/aiplatform';
// import * as fs from 'fs';
// import { VertexAI, SchemaType } from '@google-cloud/vertexai';

// const { toValue } = helpers;

// type AnalyzeHints = {
//   gender?: 'Male' | 'Female' | 'Unisex';
//   dressCode?: string;
//   season?: 'Spring' | 'Summer' | 'Fall' | 'Winter' | 'AllSeason';
// };

// export type AnalyzeOutput = {
//   ai_title?: string;
//   ai_description?: string;
//   ai_key_attributes?: string[];
//   ai_confidence?: number; // 0..1

//   // Categorization
//   main_category?: string;
//   subcategory?: string;
//   tags?: string[];
//   style_descriptors?: string[];
//   style_archetypes?: string[];
//   anchor_role?: 'Hero' | 'Neutral' | 'Connector';

//   // Occasion & Formality
//   occasion_tags?: ('Work' | 'DateNight' | 'Travel' | 'Gym')[];
//   dress_code?:
//     | 'UltraCasual'
//     | 'Casual'
//     | 'SmartCasual'
//     | 'BusinessCasual'
//     | 'Business'
//     | 'BlackTie';
//   formality_score?: number;

//   // Color & Palette
//   color?: string;
//   dominant_hex?: string;
//   palette_hex?: string[];
//   color_family?:
//     | 'Black'
//     | 'White'
//     | 'Blue'
//     | 'Red'
//     | 'Green'
//     | 'Yellow'
//     | 'Brown'
//     | 'Gray'
//     | 'Navy'
//     | 'Beige'
//     | 'Purple'
//     | 'Orange';
//   color_temp?: 'Warm' | 'Cool' | 'Neutral';
//   contrast_profile?: 'Low' | 'Medium' | 'High';

//   // Material & Construction
//   material?: string;
//   fabric_blend?: Array<{ material: string; percent: number }>;
//   fit?: 'Slim' | 'Regular' | 'Oversized';
//   stretch_pct?: number;
//   thickness?: number;
//   thermal_rating?: number;
//   breathability?: number;
//   fabric_weight_gsm?: number;
//   wrinkle_resistance?: 'Low' | 'Med' | 'High';
//   stretch_direction?: '2-way' | '4-way';

//   // Pattern
//   pattern?:
//     | 'Solid'
//     | 'Striped'
//     | 'Check'
//     | 'Herringbone'
//     | 'Windowpane'
//     | 'Floral'
//     | 'Dot'
//     | 'Camo'
//     | 'Abstract'
//     | 'Other';
//   pattern_scale?: 'Micro' | 'Medium' | 'Bold';

//   // Silhouette & Cut
//   neckline?: string;
//   collar_type?: string;
//   sleeve_length?: string;
//   hem_style?: string;
//   rise?: string;
//   leg?: string;
//   inseam_in?: number;
//   cuff?: boolean;
//   lapel?: string;
//   closure?: string;
//   length_class?: string;
//   shoe_style?: string;
//   sole?: string;
//   toe_shape?: string;

//   // Seasonality & Layering
//   seasonality?: 'Spring' | 'Summer' | 'Fall' | 'Winter' | 'AllSeason';
//   seasonality_arr?: string[];
//   layering?: 'Base' | 'Mid' | 'Outer';

//   // Climate & Conditions
//   rain_ok?: boolean;
//   wind_ok?: boolean;
//   waterproof_rating?: string;
//   climate_sweetspot_f_min?: number;
//   climate_sweetspot_f_max?: number;

//   // Sizing
//   size?: string;
//   size_label?: string;
//   size_system?: 'US' | 'EU' | 'UK';
//   measurements?: Record<string, number>;
//   width?: number;
//   height?: number;

//   // Care
//   care_symbols?: string[];
//   wash_temp_c?: number;
//   dry_clean?: boolean;
//   iron_ok?: boolean;

//   // Commerce
//   brand?: string;
//   retailer?: string;
//   purchase_date?: string;
//   purchase_price?: number;
//   country_of_origin?: string;
//   condition?: 'New' | 'Like New' | 'Good' | 'Worn' | 'Damaged';
//   defects_notes?: string;
// };

// @Injectable()
// export class VertexService {
//   private client: PredictionServiceClient; // Predict API (embeddings)
//   private projectId: string;
//   private location: string;
//   private vertexAI: VertexAI; // Generative API (Gemini)

//   // Model names, configurable via .env
//   private textModel =
//     process.env.VERTEX_TEXT_EMBED_MODEL || 'gemini-embedding-001';
//   private imageModel =
//     process.env.VERTEX_IMAGE_EMBED_MODEL || 'multimodalembedding@001';
//   private generationModel =
//     process.env.VERTEX_GENERATION_MODEL || 'gemini-2.5-flash';
//   private reasoningModel =
//     process.env.VERTEX_REASONING_MODEL || 'gemini-2.5-pro';

//   constructor() {
//     // Predict API client for embeddings
//     this.client = new PredictionServiceClient();

//     // Load project ID from service account JSON
//     const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS!;
//     const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
//     this.projectId = keyFile.project_id;

//     // Region
//     this.location = process.env.GCP_REGION || 'us-central1';

//     // Generative API client
//     this.vertexAI = new VertexAI({
//       project: this.projectId,
//       location: this.location,
//     });

//     console.log('🔌 VertexService initialized:', this.projectId, this.location);
//     console.log('📦 Models:', {
//       text: this.textModel,
//       image: this.imageModel,
//       generation: this.generationModel,
//       reasoning: this.reasoningModel,
//     });
//   }

//   // -------------------
//   // Text Embeddings (Predict API)
//   // -------------------
//   async embedText(text: string): Promise<number[]> {
//     const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.textModel}`;

//     const [response]: any = await this.client.predict({
//       endpoint,
//       instances: [toValue({ content: text }) as any],
//       parameters: toValue({ outputDimensionality: 512 }),
//     });

//     const values =
//       response?.predictions?.[0]?.structValue?.fields?.embeddings?.structValue
//         ?.fields?.values?.listValue?.values;

//     if (!values || values.length === 0) {
//       throw new Error('No text embedding returned from Vertex AI');
//     }

//     return values.map((v: any) => v.numberValue!);
//   }

//   // -------------------
//   // Image Embeddings (Predict API)
//   // -------------------
//   async embedImage(gcsUri: string): Promise<number[]> {
//     const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.imageModel}`;

//     const [response]: any = await this.client.predict({
//       endpoint,
//       instances: [toValue({ image: { gcsUri } }) as any],
//       parameters: toValue({ dimension: 512 }) as any,
//     });

//     const values =
//       response?.predictions?.[0]?.structValue?.fields?.imageEmbedding?.listValue
//         ?.values;

//     if (!values || values.length === 0) {
//       throw new Error('No image embedding returned from Vertex AI');
//     }

//     return values.map((v: any) => v.numberValue!);
//   }

//   // -------------------
//   // Image → Structured Metadata (Gemini 2.5 Flash)
//   // -------------------
//   async analyzeImage(
//     gcsUri: string,
//     hints?: AnalyzeHints,
//   ): Promise<AnalyzeOutput> {
//     if (!gcsUri?.startsWith('gs://')) {
//       throw new Error('analyzeImage expects a gs:// URI');
//     }

//     const model = this.vertexAI.getGenerativeModel({
//       model: this.generationModel, // e.g., gemini-2.5-flash
//       generationConfig: {
//         responseMimeType: 'application/json',
//         responseSchema: {
//           type: SchemaType.OBJECT,
//           properties: {
//             ai_title: { type: SchemaType.STRING },
//             ai_description: { type: SchemaType.STRING },
//             ai_key_attributes: {
//               type: SchemaType.ARRAY,
//               items: { type: SchemaType.STRING },
//             },
//             ai_confidence: { type: SchemaType.NUMBER },

//             main_category: { type: SchemaType.STRING },
//             subcategory: { type: SchemaType.STRING },
//             tags: {
//               type: SchemaType.ARRAY,
//               items: { type: SchemaType.STRING },
//             },
//             style_descriptors: {
//               type: SchemaType.ARRAY,
//               items: { type: SchemaType.STRING },
//             },
//             style_archetypes: {
//               type: SchemaType.ARRAY,
//               items: { type: SchemaType.STRING },
//             },
//             anchor_role: {
//               type: SchemaType.STRING,
//               enum: ['Hero', 'Neutral', 'Connector'],
//             },

//             occasion_tags: {
//               type: SchemaType.ARRAY,
//               items: {
//                 type: SchemaType.STRING,
//                 enum: ['Work', 'DateNight', 'Travel', 'Gym'],
//               },
//             },
//             dress_code: {
//               type: SchemaType.STRING,
//               enum: [
//                 'UltraCasual',
//                 'Casual',
//                 'SmartCasual',
//                 'BusinessCasual',
//                 'Business',
//                 'BlackTie',
//               ],
//             },
//             formality_score: { type: SchemaType.NUMBER },

//             color: { type: SchemaType.STRING },
//             dominant_hex: { type: SchemaType.STRING },
//             palette_hex: {
//               type: SchemaType.ARRAY,
//               items: { type: SchemaType.STRING },
//             },
//             color_family: { type: SchemaType.STRING },
//             color_temp: {
//               type: SchemaType.STRING,
//               enum: ['Warm', 'Cool', 'Neutral'],
//             },
//             contrast_profile: {
//               type: SchemaType.STRING,
//               enum: ['Low', 'Medium', 'High'],
//             },

//             material: { type: SchemaType.STRING },
//             fabric_blend: {
//               type: SchemaType.ARRAY,
//               items: {
//                 type: SchemaType.OBJECT,
//                 properties: {
//                   material: { type: SchemaType.STRING },
//                   percent: { type: SchemaType.NUMBER },
//                 },
//               },
//             },
//             fit: {
//               type: SchemaType.STRING,
//               enum: ['Slim', 'Regular', 'Oversized'],
//             },
//             stretch_pct: { type: SchemaType.NUMBER },
//             thickness: { type: SchemaType.NUMBER },
//             thermal_rating: { type: SchemaType.NUMBER },
//             breathability: { type: SchemaType.NUMBER },
//             fabric_weight_gsm: { type: SchemaType.NUMBER },
//             wrinkle_resistance: {
//               type: SchemaType.STRING,
//               enum: ['Low', 'Med', 'High'],
//             },
//             stretch_direction: {
//               type: SchemaType.STRING,
//               enum: ['2-way', '4-way'],
//             },

//             pattern: {
//               type: SchemaType.STRING,
//               enum: [
//                 'Solid',
//                 'Striped',
//                 'Check',
//                 'Herringbone',
//                 'Windowpane',
//                 'Floral',
//                 'Dot',
//                 'Camo',
//                 'Abstract',
//                 'Other',
//               ],
//             },
//             pattern_scale: {
//               type: SchemaType.STRING,
//               enum: ['Micro', 'Medium', 'Bold'],
//             },

//             neckline: { type: SchemaType.STRING },
//             collar_type: { type: SchemaType.STRING },
//             sleeve_length: { type: SchemaType.STRING },
//             hem_style: { type: SchemaType.STRING },
//             rise: { type: SchemaType.STRING },
//             leg: { type: SchemaType.STRING },
//             inseam_in: { type: SchemaType.NUMBER },
//             cuff: { type: SchemaType.BOOLEAN },
//             lapel: { type: SchemaType.STRING },
//             closure: { type: SchemaType.STRING },
//             length_class: { type: SchemaType.STRING },
//             shoe_style: { type: SchemaType.STRING },
//             sole: { type: SchemaType.STRING },
//             toe_shape: { type: SchemaType.STRING },

//             seasonality: {
//               type: SchemaType.STRING,
//               enum: ['Spring', 'Summer', 'Fall', 'Winter', 'AllSeason'],
//             },
//             seasonality_arr: {
//               type: SchemaType.ARRAY,
//               items: { type: SchemaType.STRING },
//             },
//             layering: {
//               type: SchemaType.STRING,
//               enum: ['Base', 'Mid', 'Outer'],
//             },

//             rain_ok: { type: SchemaType.BOOLEAN },
//             wind_ok: { type: SchemaType.BOOLEAN },
//             waterproof_rating: { type: SchemaType.STRING },
//             climate_sweetspot_f_min: { type: SchemaType.NUMBER },
//             climate_sweetspot_f_max: { type: SchemaType.NUMBER },

//             size: { type: SchemaType.STRING },
//             size_label: { type: SchemaType.STRING },
//             size_system: { type: SchemaType.STRING, enum: ['US', 'EU', 'UK'] },
//             measurements: { type: SchemaType.OBJECT },
//             width: { type: SchemaType.NUMBER },
//             height: { type: SchemaType.NUMBER },

//             care_symbols: {
//               type: SchemaType.ARRAY,
//               items: { type: SchemaType.STRING },
//             },
//             wash_temp_c: { type: SchemaType.NUMBER },
//             dry_clean: { type: SchemaType.BOOLEAN },
//             iron_ok: { type: SchemaType.BOOLEAN },

//             brand: { type: SchemaType.STRING },
//             retailer: { type: SchemaType.STRING },
//             purchase_date: { type: SchemaType.STRING },
//             purchase_price: { type: SchemaType.NUMBER },
//             country_of_origin: { type: SchemaType.STRING },
//             condition: {
//               type: SchemaType.STRING,
//               enum: ['New', 'Like New', 'Good', 'Worn', 'Damaged'],
//             },
//             defects_notes: { type: SchemaType.STRING },
//           },
//         },
//       },
//     });

//     const guidance = [
//       'Analyze the garment in the image and return STRICT JSON only.',
//       'Prefer concrete, conservative values. If unknown, omit the field.',
//       'Include both a human-readable color name and dominant_hex when visible.',
//       'Use pattern_scale: Micro (subtle/small), Medium, Bold (loud/large).',
//       'Dress code, seasonality, and layering should reflect visible cues only.',
//       hints?.gender ? `Assume wearer context: ${hints.gender}.` : '',
//       hints?.dressCode
//         ? `If ambiguous, bias dress_code toward ${hints.dressCode}.`
//         : '',
//       hints?.season
//         ? `If ambiguous, bias seasonality toward ${hints.season}.`
//         : '',
//     ]
//       .filter(Boolean)
//       .join('\n');

//     const result = await model.generateContent({
//       contents: [
//         {
//           role: 'user',
//           parts: [
//             // ✅ camelCase: fileData.fileUri + fileData.mimeType
//             { fileData: { fileUri: gcsUri, mimeType: 'image/jpeg' } },
//             { text: guidance },
//           ],
//         },
//       ],
//     });

//     // SDK shape: response.candidates[0].content.parts[0].text
//     // @ts-ignore
//     const text =
//       result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

//     try {
//       const parsed = JSON.parse(text);
//       if (typeof parsed.ai_confidence === 'number') {
//         parsed.ai_confidence = Math.max(0, Math.min(1, parsed.ai_confidence));
//       }
//       return parsed as AnalyzeOutput;
//     } catch {
//       return {};
//     }
//   }

//   // -------------------
//   // Outfit Generation (Gemini Flash via Generative API)
//   // -------------------
//   async generateOutfits(prompt: string): Promise<any> {
//     const model = this.vertexAI.getGenerativeModel({
//       model: this.generationModel, // gemini-2.5-flash
//     });

//     const result = await model.generateContent(prompt);

//     console.log(
//       '👗 Gemini Flash outfit response:',
//       JSON.stringify(result.response, null, 2),
//     );

//     return result.response;
//   }

//   // -------------------
//   // Outfit Generation (Gemini Pro via Generative API)
//   // -------------------
//   async generateReasonedOutfit(prompt: string): Promise<any> {
//     const model = this.vertexAI.getGenerativeModel({
//       model: this.reasoningModel, // gemini-2.5-pro
//     });

//     const result = await model.generateContent(prompt);

//     console.log(
//       '🎩 Gemini Pro outfit response:',
//       JSON.stringify(result.response, null, 2),
//     );

//     return result.response;
//   }
// }

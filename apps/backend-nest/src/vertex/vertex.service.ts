import { Injectable } from '@nestjs/common';
import { PredictionServiceClient, helpers } from '@google-cloud/aiplatform';
import * as fs from 'fs';
import { VertexAI } from '@google-cloud/vertexai'; // 👈 NEW

const { toValue } = helpers;

@Injectable()
export class VertexService {
  private client: PredictionServiceClient;
  private projectId: string;
  private location: string;
  private vertexAI: VertexAI;

  private textModel =
    process.env.VERTEX_TEXT_EMBED_MODEL || 'gemini-embedding-001';
  private imageModel =
    process.env.VERTEX_IMAGE_EMBED_MODEL || 'multimodalembedding@001';
  private generationModel =
    process.env.VERTEX_GENERATION_MODEL || 'gemini-2.5-flash';

  constructor() {
    this.client = new PredictionServiceClient();

    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS!;
    const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    this.projectId = keyFile.project_id;

    this.location = process.env.GCP_REGION || 'us-central1';
    this.vertexAI = new VertexAI({
      project: this.projectId,
      location: this.location,
    });

    console.log('🔌 VertexService initialized:', this.projectId, this.location);
    console.log('📦 Models:', {
      text: this.textModel,
      image: this.imageModel,
      generation: this.generationModel,
    });
  }

  // -------------------
  // Embeddings (Predict API)
  // -------------------
  async embedText(text: string): Promise<number[]> {
    const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.textModel}`;

    const [response]: any = await this.client.predict({
      endpoint,
      instances: [toValue({ content: text }) as any],
      parameters: toValue({ outputDimensionality: 512 }),
    });

    const values =
      response?.predictions?.[0]?.structValue?.fields?.embeddings?.structValue
        ?.fields?.values?.listValue?.values;

    if (!values || values.length === 0) {
      throw new Error('No text embedding returned from Vertex AI');
    }

    return values.map((v: any) => v.numberValue!);
  }

  async embedImage(gcsUri: string): Promise<number[]> {
    const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.imageModel}`;

    const [response]: any = await this.client.predict({
      endpoint,
      instances: [toValue({ image: { gcsUri } }) as any],
      parameters: toValue({ dimension: 512 }) as any,
    });

    const values =
      response?.predictions?.[0]?.structValue?.fields?.imageEmbedding?.listValue
        ?.values;

    if (!values || values.length === 0) {
      throw new Error('No image embedding returned from Vertex AI');
    }

    return values.map((v: any) => v.numberValue!);
  }

  // -------------------
  // Generation (Generative API)
  // -------------------
  async generateOutfits(prompt: string): Promise<any> {
    const model = this.vertexAI.getGenerativeModel({
      model: this.generationModel,
    });

    const result = await model.generateContent(prompt);

    console.log(
      '👗 Gemini outfit response:',
      JSON.stringify(result.response, null, 2),
    );

    return result.response;
  }
}

///////////////

// import { Injectable } from '@nestjs/common';
// import { PredictionServiceClient, helpers } from '@google-cloud/aiplatform';
// import * as fs from 'fs';

// const { toValue } = helpers;

// @Injectable()
// export class VertexService {
//   private client: PredictionServiceClient;
//   private projectId: string;
//   private location: string;

//   // 🔹 Model IDs pulled from env, fallback defaults provided
//   private textModel =
//     process.env.VERTEX_TEXT_EMBED_MODEL || 'gemini-embedding-001';
//   private imageModel =
//     process.env.VERTEX_IMAGE_EMBED_MODEL || 'multimodalembedding@001';
//   private generationModel =
//     process.env.VERTEX_GENERATION_MODEL || 'gemini-1.5-flash';

//   constructor() {
//     this.client = new PredictionServiceClient();

//     const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS!;
//     const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
//     this.projectId = keyFile.project_id;

//     this.location = process.env.GCP_REGION || 'us-central1';
//     console.log('🔌 VertexService initialized:', this.projectId, this.location);
//     console.log('📦 Models:', {
//       text: this.textModel,
//       image: this.imageModel,
//       generation: this.generationModel,
//     });
//   }

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

//   async generateOutfits(prompt: string): Promise<any> {
//     const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.generationModel}`;

//     const [response]: any = await this.client.predict({
//       endpoint,
//       instances: [toValue({ prompt }) as any],
//     });

//     // Debug: log the raw response to see what Gemini sends back
//     console.log(
//       '👗 Gemini outfit response:',
//       JSON.stringify(response, null, 2),
//     );

//     return response?.predictions?.[0] ?? {};
//   }
// }

//////////////

// // apps/backend-nest/src/vertex/vertex.service.ts
// import { Injectable } from '@nestjs/common';
// import { PredictionServiceClient, helpers } from '@google-cloud/aiplatform';
// import * as fs from 'fs';

// const { toValue } = helpers;

// type ValueType = Record<string, any>;

// @Injectable()
// export class VertexService {
//   private client: PredictionServiceClient;
//   private projectId: string;
//   private location: string;

//   constructor() {
//     this.client = new PredictionServiceClient();

//     const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS!;
//     const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
//     this.projectId = keyFile.project_id;

//     this.location = process.env.GCP_REGION || 'us-central1';
//     console.log('🔌 VertexService initialized:', this.projectId, this.location);
//   }

//   async embedText(text: string): Promise<number[]> {
//     const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/text-embedding-004`;

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

//   async embedImage(gcsUri: string): Promise<number[]> {
//     const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/multimodalembedding@001`;

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
// }

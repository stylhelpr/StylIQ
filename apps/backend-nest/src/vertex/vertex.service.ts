import { Injectable } from '@nestjs/common';
import { PredictionServiceClient, helpers } from '@google-cloud/aiplatform';
import * as fs from 'fs';
import { VertexAI } from '@google-cloud/vertexai'; // 👈 NEW for generative models

const { toValue } = helpers;

@Injectable()
export class VertexService {
  private client: PredictionServiceClient; // ✅ for Predict API (embeddings)
  private projectId: string;
  private location: string;
  private vertexAI: VertexAI; // ✅ for Generative API (Gemini)

  // Model names, configurable via .env
  private textModel =
    process.env.VERTEX_TEXT_EMBED_MODEL || 'gemini-embedding-001';
  private imageModel =
    process.env.VERTEX_IMAGE_EMBED_MODEL || 'multimodalembedding@001';
  private generationModel =
    process.env.VERTEX_GENERATION_MODEL || 'gemini-2.5-flash';

  constructor() {
    // 🔹 Old-school client (Predict API) — used for embeddings
    this.client = new PredictionServiceClient();

    // 🔹 Load project ID from service account JSON
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS!;
    const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    this.projectId = keyFile.project_id;

    // 🔹 Default to us-central1 unless overridden
    this.location = process.env.GCP_REGION || 'us-central1';

    // 🔹 New VertexAI client (Generative API) — used for Gemini
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
  // Text Embeddings
  // -------------------
  async embedText(text: string): Promise<number[]> {
    // 👇 Hit the Predict API endpoint for the configured text model
    const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.textModel}`;

    const [response]: any = await this.client.predict({
      endpoint,
      instances: [toValue({ content: text }) as any],
      parameters: toValue({ outputDimensionality: 512 }), // match Pinecone dims
    });

    // Extract the embeddings array from the GRPC structValue
    const values =
      response?.predictions?.[0]?.structValue?.fields?.embeddings?.structValue
        ?.fields?.values?.listValue?.values;

    if (!values || values.length === 0) {
      throw new Error('No text embedding returned from Vertex AI');
    }

    return values.map((v: any) => v.numberValue!);
  }

  // -------------------
  // Image Embeddings
  // -------------------
  async embedImage(gcsUri: string): Promise<number[]> {
    // 👇 Hit the Predict API endpoint for the configured image model
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
  // Outfit Generation (Gemini via Generative API)
  // -------------------
  async generateOutfits(prompt: string): Promise<any> {
    // 👇 Use VertexAI's Generative API client
    const model = this.vertexAI.getGenerativeModel({
      model: this.generationModel, // e.g. gemini-2.5-flash
    });

    const result = await model.generateContent(prompt);

    console.log(
      '👗 Gemini outfit response:',
      JSON.stringify(result.response, null, 2),
    );

    // Returns Gemini’s structured response object
    return result.response;
  }
}

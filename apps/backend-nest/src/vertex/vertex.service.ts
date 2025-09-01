// apps/backend-nest/src/vertex/vertex.service.ts
import { Injectable } from '@nestjs/common';
import { PredictionServiceClient, helpers } from '@google-cloud/aiplatform';
import * as fs from 'fs';

const { toValue } = helpers;

type ValueType = Record<string, any>;

@Injectable()
export class VertexService {
  private client: PredictionServiceClient;
  private projectId: string;
  private location: string;

  constructor() {
    this.client = new PredictionServiceClient();

    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS!;
    const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    this.projectId = keyFile.project_id;

    this.location = process.env.GCP_REGION || 'us-central1';
    console.log('🔌 VertexService initialized:', this.projectId, this.location);
  }

  async embedText(text: string): Promise<number[]> {
    const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/text-embedding-004`;

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
    const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/multimodalembedding@001`;

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
}

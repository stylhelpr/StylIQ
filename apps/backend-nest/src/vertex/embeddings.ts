// Minimal Vertex AI embedding helpers using REST + Google Auth.
// deps: npm i google-auth-library undici

import { fetch } from 'undici';
import { GoogleAuth } from 'google-auth-library';

const PROJECT = process.env.GCP_PROJECT!;
const REGION = process.env.GCP_REGION || 'us-central1';

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

async function getAccessToken(): Promise<string> {
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  if (!token) throw new Error('Failed to obtain Google Cloud access token');
  return token;
}

/** Text embedding (Vertex: text-embedding-004, 512 dims) */
export async function embedText(text: string): Promise<number[]> {
  const token = await getAccessToken();
  const url = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/${REGION}/publishers/google/models/text-embedding-004:predict`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      instances: [{ content: text, parameters: { outputDimensionality: 512 } }],
    }),
  });

  if (!resp.ok) {
    const errTxt = await resp.text();
    throw new Error(`text-embedding-004 error ${resp.status}: ${errTxt}`);
  }

  const json = (await resp.json()) as any;
  const values: number[] = json?.predictions?.[0]?.embeddings?.values;
  if (!Array.isArray(values))
    throw new Error('No embeddings returned for text');
  return values;
}

/** Image embedding (Vertex: multimodalembedding@001, 512 dims) */
export async function embedImage(gcsUri: string): Promise<number[]> {
  const token = await getAccessToken();
  const url = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/${REGION}/publishers/google/models/multimodalembedding@001:predict`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      instances: [{ image: { gcsUri }, parameters: { dimension: 512 } }],
    }),
  });

  if (!resp.ok) {
    const errTxt = await resp.text();
    throw new Error(`multimodalembedding@001 error ${resp.status}: ${errTxt}`);
  }

  const json = (await resp.json()) as any;
  const values: number[] = json?.predictions?.[0]?.embeddings?.values;
  if (!Array.isArray(values))
    throw new Error('No embeddings returned for image');
  return values;
}

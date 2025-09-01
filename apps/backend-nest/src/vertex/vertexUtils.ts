import fetch from 'node-fetch';

const PROJECT = process.env.GCP_PROJECT!; // Your GCP project ID
const REGION = process.env.GCP_REGION || 'us-central1'; // Default region

// 🔑 Get an access token using gcloud CLI
// This calls your local gcloud installation.
// Not recommended in production (better to use service accounts), but handy for local dev.
async function getAccessToken(): Promise<string> {
  const { execSync } = await import('child_process');
  return execSync('gcloud auth print-access-token').toString().trim();
}

/**
 * 🔹 Text embedding
 * Model: text-embedding-004 (512 dims by default here)
 */
export async function embedText(text: string): Promise<number[]> {
  // REST endpoint for text-embedding-004
  const url = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/${REGION}/publishers/google/models/text-embedding-004:predict`;

  const token = await getAccessToken();

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`, // CLI-issued OAuth token
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      instances: [
        {
          content: text,
          parameters: { outputDimensionality: 512 }, // matches Pinecone config
        },
      ],
    }),
  });

  const json = await resp.json();
  return json.predictions[0].embeddings.values;
}

/**
 * 🔹 Image embedding
 * Model: multimodalembedding@001 (512 dims)
 */
export async function embedImage(gcsUri: string): Promise<number[]> {
  // REST endpoint for multimodal embeddings
  const url = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/${REGION}/publishers/google/models/multimodalembedding@001:predict`;

  const token = await getAccessToken();

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      instances: [
        {
          image: { gcsUri }, // 👈 must be gs:// path, not public https://
          parameters: { dimension: 512 },
        },
      ],
    }),
  });

  const json = await resp.json();
  return json.predictions[0].embeddings.values;
}

//////////////////

// import fetch from 'node-fetch';

// const PROJECT = process.env.GCP_PROJECT!;
// const REGION = process.env.GCP_REGION || 'us-central1';

// // Auth token from gcloud
// async function getAccessToken(): Promise<string> {
//   const { execSync } = await import('child_process');
//   return execSync('gcloud auth print-access-token').toString().trim();
// }

// /**
//  * Text embedding (text-embedding-004)
//  */
// export async function embedText(text: string): Promise<number[]> {
//   const url = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/${REGION}/publishers/google/models/text-embedding-004:predict`;

//   const token = await getAccessToken();

//   const resp = await fetch(url, {
//     method: 'POST',
//     headers: {
//       Authorization: `Bearer ${token}`,
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({
//       instances: [
//         {
//           content: text,
//           parameters: { outputDimensionality: 512 },
//         },
//       ],
//     }),
//   });

//   const json = await resp.json();
//   return json.predictions[0].embeddings.values;
// }

// /**
//  * Image embedding (multimodalembedding@001)
//  */
// export async function embedImage(gcsUri: string): Promise<number[]> {
//   const url = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/${REGION}/publishers/google/models/multimodalembedding@001:predict`;

//   const token = await getAccessToken();

//   const resp = await fetch(url, {
//     method: 'POST',
//     headers: {
//       Authorization: `Bearer ${token}`,
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({
//       instances: [
//         {
//           image: { gcsUri },
//           parameters: { dimension: 512 },
//         },
//       ],
//     }),
//   });

//   const json = await resp.json();
//   return json.predictions[0].embeddings.values;
// }

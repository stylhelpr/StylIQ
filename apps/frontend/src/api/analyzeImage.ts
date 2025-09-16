import {API_BASE_URL} from '../config/api';

export async function analyzeImage(body: {
  user_id: string;
  gsutil_uri: string;
  gender?: 'Male' | 'Female' | 'Unisex';
  dressCode?: string;
  season?: 'Spring' | 'Summer' | 'Fall' | 'Winter' | 'AllSeason';
}) {
  const res = await fetch(`${API_BASE_URL}/wardrobe/analyze`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  });
  if (!res.ok)
    throw new Error(`Analyze failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<{draft: Record<string, any>}>;
}

export async function autoCreateWithAI(payload: {
  user_id: string;
  image_url: string;
  gsutil_uri?: string;
  name?: string;
  object_key?: string;
}) {
  const res = await fetch(`${API_BASE_URL}/wardrobe/auto-create`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload),
  });
  if (!res.ok)
    throw new Error(`Auto-create failed: ${res.status} ${await res.text()}`);
  return res.json();
}

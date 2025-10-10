// productSearchClient.ts
const API_BASE_URL = process.env.API_BASE_URL || 'http://192.168.1.55:3001/api';

export async function searchProducts(query: string) {
  try {
    const res = await fetch(
      `${API_BASE_URL}/products/search?q=${encodeURIComponent(query)}`,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[Client] product search failed:', err);
    return [];
  }
}

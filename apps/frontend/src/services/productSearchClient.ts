// productSearchClient.ts
import {API_BASE_URL} from '../config/api';

export interface ProductResult {
  name: string;
  brand?: string;
  price?: string;
  image: string;
  shopUrl: string;
  source?: string;
}

export async function searchProducts(query: string) {
  try {
    // 🔄 Updated endpoint for Shop the Look
    const res = await fetch(
      `${API_BASE_URL}/products/shopby?q=${encodeURIComponent(query)}`,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[Client] product search failed:', err);
    return [];
  }
}

////////////////////

// // productSearchClient.ts
// import {API_BASE_URL} from '../config/api';

// export interface ProductResult {
//   name: string;
//   brand?: string;
//   price?: string;
//   image: string;
//   shopUrl: string;
//   source?: string;
// }

// export async function searchProducts(query: string) {
//   try {
//     const res = await fetch(
//       `${API_BASE_URL}/products/search?q=${encodeURIComponent(query)}`,
//     );
//     if (!res.ok) throw new Error(`HTTP ${res.status}`);
//     return await res.json();
//   } catch (err) {
//     console.error('[Client] product search failed:', err);
//     return [];
//   }
// }

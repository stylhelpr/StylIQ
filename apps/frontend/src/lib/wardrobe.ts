import {WardrobeItem} from '../types/wardrobe';
import {mapApiWardrobeItem} from './mappers';

const API = 'http://192.168.1.152:3001/api';

export async function listWardrobe(userId: string): Promise<WardrobeItem[]> {
  const r = await fetch(
    `${API}/wardrobe?user_id=${encodeURIComponent(userId)}`,
  );
  if (!r.ok) throw new Error(await r.text());
  const data = await r.json();
  return Array.isArray(data) ? data.map(mapApiWardrobeItem) : [];
}

export async function createWardrobeItem(payload: any): Promise<WardrobeItem> {
  const r = await fetch(`${API}/wardrobe`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(await r.text());
  const data = await r.json();
  return mapApiWardrobeItem(data.item);
}

export async function searchText(
  userId: string,
  q: string,
  topK = 20,
): Promise<any[]> {
  const r = await fetch(`${API}/wardrobe/search-text`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({user_id: userId, q, topK}),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function updateWardrobeItem(
  itemId: string,
  patch: any,
): Promise<WardrobeItem> {
  const r = await fetch(`${API}/wardrobe/${itemId}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error(await r.text());
  const data = await r.json();
  return mapApiWardrobeItem(data.item);
}

//////////////

// // apps/frontend/src/lib/api/wardrobe.ts
// const API = 'http://192.168.1.81:3001/api';

// export async function createWardrobeItem(payload: any) {
//   const r = await fetch(`${API}/wardrobe`, {
//     method: 'POST',
//     headers: {'Content-Type': 'application/json'},
//     body: JSON.stringify(payload),
//   });
//   if (!r.ok) throw new Error(await r.text());
//   return r.json();
// }

// export async function updateWardrobeItem(itemId: string, patch: any) {
//   const r = await fetch(`${API}/wardrobe/${itemId}`, {
//     method: 'PUT',
//     headers: {'Content-Type': 'application/json'},
//     body: JSON.stringify(patch),
//   });
//   if (!r.ok) throw new Error(await r.text());
//   return r.json();
// }

// export async function listWardrobe(userId: string) {
//   const r = await fetch(
//     `${API}/wardrobe?user_id=${encodeURIComponent(userId)}`,
//   );
//   if (!r.ok) throw new Error(await r.text());
//   return r.json();
// }

// export async function searchText(userId: string, q: string, topK = 20) {
//   const r = await fetch(`${API}/wardrobe/search-text`, {
//     method: 'POST',
//     headers: {'Content-Type': 'application/json'},
//     body: JSON.stringify({user_id: userId, q, topK}),
//   });
//   if (!r.ok) throw new Error(await r.text());
//   return r.json();
// }

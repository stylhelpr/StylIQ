import {API_BASE_URL} from '../config/api';

export async function postWardrobeItem({
  userId,
  image_url,
  objectKey,
  gsutilUri,
  name,
  category,
  color,
  subcategory,
  material,
  fit,
  size,
  brand,
  tags,
}: {
  userId: string;
  image_url: string;
  objectKey: string;
  gsutilUri: string;
  name: string;
  category: string;
  color: string;
  subcategory?: string;
  material?: string;
  fit?: string;
  size?: string;
  brand?: string;
  tags: string[];
}) {
  const payload = {
    user_id: userId,
    image_url,
    object_key: objectKey,
    gsutil_uri: gsutilUri,
    name,
    main_category: category,
    subcategory: subcategory ?? null,
    color,
    material: material ?? null,
    fit: fit ?? null,
    size: size ?? null,
    brand: brand ?? null,
    metadata: {},
    width: null,
    height: null,
    tags,
  };

  const r = await fetch(`${API_BASE_URL}/wardrobe`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

//////////////

// // api/postWardrobeItem.ts
// import {API_BASE_URL} from '../config/api';

// export async function postWardrobeItem({
//   userId,
//   image_url,
//   objectKey,
//   name,
//   category,
//   color,
//   tags,
// }: {
//   userId: string;
//   image_url: string;
//   objectKey: string;
//   name: string;
//   category: string;
//   color: string;
//   tags: string[];
// }) {
//   const payload = {
//     user_id: userId,
//     image_url,
//     object_key: objectKey,
//     gsutil_uri: null, // 🔹 placeholder for now
//     name,
//     main_category: category,
//     subcategory: null,
//     color,
//     material: null,
//     fit: null,
//     size: null,
//     brand: null,
//     metadata: {},
//     width: null,
//     height: null,
//     tags,
//   };

//   const r = await fetch(`${API_BASE_URL}/wardrobe`, {
//     method: 'POST',
//     headers: {'Content-Type': 'application/json'},
//     body: JSON.stringify(payload),
//   });
//   if (!r.ok) throw new Error(await r.text());
//   return r.json();
// }

///////////

// // utils/postWardrobeItem.ts
// import {API_BASE_URL} from '../config/api';

// export async function postWardrobeItem({
//   userId,
//   image_url,
//   objectKey,
//   name,
//   category,
//   color,
//   tags,
// }: {
//   userId: string;
//   image_url: string;
//   objectKey: string;
//   name: string;
//   category: string;
//   color: string;
//   tags: string[];
// }) {
//   if (!userId || !/^[0-9a-fA-F\-]{36}$/.test(userId)) {
//     throw new Error(`❌ Invalid or missing UUID: ${userId}`);
//   }

//   const payload = {
//     user_id: userId,
//     image_url,
//     object_key: objectKey,
//     name,
//     main_category: category,
//     color,
//     tags,
//   };

//   console.log('📦 Sending wardrobe item payload:', payload);

//   const res = await fetch(`${API_BASE_URL}/upload/complete`, {
//     method: 'POST',
//     headers: {'Content-Type': 'application/json'},
//     body: JSON.stringify(payload),
//   });

//   if (!res.ok) {
//     const errorText = await res.text();
//     console.error(`❌ Upload failed ${res.status}:`, errorText);
//     throw new Error(`Upload failed: ${res.status} ${errorText}`);
//   }

//   return res.json();
// }

/////////////

// import {Platform} from 'react-native';

// const API_BASE_URL =
//   Platform.OS === 'android'
//     ? 'http://10.0.2.2:3001/api'
//     : 'http://localhost:3001/api';

// export async function postWardrobeItem({
//   userId,
//   image_url,
//   objectKey,
//   name,
//   category,
//   color,
//   tags,
// }: {
//   userId: string;
//   image_url: string;
//   objectKey: string;
//   name: string;
//   category: string;
//   color: string;
//   tags: string[];
// }) {
//   if (!userId || !/^[0-9a-fA-F\-]{36}$/.test(userId)) {
//     throw new Error(`❌ Invalid or missing UUID: ${userId}`);
//   }

//   const payload = {
//     user_id: userId,
//     image_url,
//     object_key: objectKey, // ✅ REQUIRED by backend
//     name,
//     main_category: category,
//     color,
//     tags,
//   };

//   console.log('📦 Sending wardrobe item payload:', payload);

//   const res = await fetch(`${API_BASE_URL}/upload/complete`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify(payload),
//   });

//   if (!res.ok) {
//     const errorText = await res.text();
//     console.error(`❌ Upload failed ${res.status}:`, errorText);
//     throw new Error(`Upload failed: ${res.status}`);
//   }

//   return await res.json();
// }

///////////////

// import {Platform} from 'react-native';

// const API_BASE_URL =
//   Platform.OS === 'android'
//     ? 'http://10.0.2.2:3001/api'
//     : 'http://localhost:3001/api';

// export async function postWardrobeItem({
//   userId,
//   image_url,
//   name,
//   category,
//   color,
//   tags,
// }: {
//   userId: string; // ✅ Must be the UUID, not Auth0 sub
//   image_url: string;
//   name: string;
//   category: string;
//   color: string;
//   tags: string[];
// }) {
//   // 🧠 Safety check
//   if (!userId || !/^[0-9a-fA-F\-]{36}$/.test(userId)) {
//     throw new Error(`❌ Invalid or missing UUID: ${userId}`);
//   }

//   const payload = {
//     user_id: userId,
//     image_url,
//     name,
//     main_category: category,
//     color,
//     tags,
//   };

//   console.log('📦 Sending wardrobe item payload:', payload);

//   const res = await fetch(`${API_BASE_URL}/upload/complete`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify(payload),
//   });

//   if (!res.ok) {
//     const errorText = await res.text();
//     console.error(`❌ Upload failed ${res.status}:`, errorText);
//     throw new Error(`Upload failed: ${res.status}`);
//   }

//   return await res.json();
// }

///////////

// import {Platform} from 'react-native';

// const API_BASE_URL =
//   Platform.OS === 'android'
//     ? 'http://10.0.2.2:3001/api'
//     : 'http://localhost:3001/api';

// export async function postWardrobeItem({
//   userId,
//   image_url,
//   name,
//   category,
//   color,
//   tags,
// }: {
//   userId: string; // ✅ Must be the UUID, not Auth0 sub
//   image_url: string; // This is the full GCS public URL
//   name: string;
//   category: string;
//   color: string;
//   tags: string[];
// }) {
//   // 🧠 Safety check
//   if (!userId || !/^[0-9a-fA-F\-]{36}$/.test(userId)) {
//     throw new Error(`❌ Invalid or missing UUID: ${userId}`);
//   }

//   // 🪄 Extract GCS object key from full public URL
//   const object_key = image_url.split('/stylhelpr-dev-bucket/')[1];

//   const payload = {
//     user_id: userId,
//     object_key,
//     name,
//     main_category: category,
//     color,
//     tags,
//   };

//   console.log('📦 Sending wardrobe item payload:', payload);

//   const res = await fetch(`${API_BASE_URL}/upload/complete`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify(payload),
//   });

//   if (!res.ok) {
//     const errorText = await res.text();
//     console.error(`❌ Upload failed ${res.status}:`, errorText);
//     throw new Error(`Upload failed: ${res.status}`);
//   }

//   return await res.json();
// }

///////////

// import {Platform} from 'react-native';

// const API_BASE_URL =
//   Platform.OS === 'android'
//     ? 'http://10.0.2.2:3001/api'
//     : 'http://localhost:3001/api';

// export async function postWardrobeItem({
//   userId,
//   image_url,
//   name,
//   category,
//   color,
//   tags,
// }: {
//   userId: string; // ✅ Must be the UUID, not Auth0 sub
//   image_url: string;
//   name: string;
//   category: string;
//   color: string;
//   tags: string[];
// }) {
//   // 🧠 Safety check
//   if (!userId || !/^[0-9a-fA-F\-]{36}$/.test(userId)) {
//     throw new Error(`❌ Invalid or missing UUID: ${userId}`);
//   }

//   const payload = {
//     user_id: userId,
//     image_url,
//     name,
//     main_category: category,
//     color,
//     tags,
//   };

//   console.log('📦 Sending wardrobe item payload:', payload);

//   const res = await fetch(`${API_BASE_URL}/upload/complete`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify(payload),
//   });

//   if (!res.ok) {
//     const errorText = await res.text();
//     console.error(`❌ Upload failed ${res.status}:`, errorText);
//     throw new Error(`Upload failed: ${res.status}`);
//   }

//   return await res.json();
// }

//////////////

// import {Platform} from 'react-native';

// const API_BASE_URL =
//   Platform.OS === 'android'
//     ? 'http://10.0.2.2:3001/api'
//     : 'http://localhost:3001/api';

// export async function postWardrobeItem({
//   userId,
//   image_url,
//   name,
//   category,
//   color,
//   tags,
// }: {
//   userId: string;
//   image_url: string;
//   name: string;
//   category: string;
//   color: string;
//   tags: string[];
// }) {
//   const res = await fetch(`${API_BASE_URL}/upload/complete`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({
//       user_id: userId,
//       image_url,
//       name,
//       main_category: category,
//       color,
//       tags,
//     }),
//   });

//   if (!res.ok) {
//     throw new Error(`Upload failed: ${res.status}`);
//   }

//   return await res.json();
// }

/////////////////

// import {Platform} from 'react-native';

// const API_BASE_URL =
//   Platform.OS === 'android'
//     ? 'http://10.0.2.2:3001/api'
//     : 'http://localhost:3001/api';

// export async function postWardrobeItem({
//   userId,
//   image_url,
//   name,
//   category,
//   color,
//   tags,
// }: {
//   userId: string;
//   image_url: string;
//   name: string;
//   category: string;
//   color: string;
//   tags: string[];
// }) {
//   const res = await fetch(`${API_BASE_URL}/upload/complete`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({
//       user_id: userId,
//       image_url,
//       name,
//       main_category: category,
//       color,
//       tags,
//     }),
//   });

//   if (!res.ok) {
//     throw new Error(`Upload failed: ${res.status}`);
//   }

//   return await res.json();
// }

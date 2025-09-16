// scripts/bulkDeleteWardrobe.mjs
// Run:
// USER_ID=2e7b4297-72e4-4152-90bb-f00432c88ab7 \
// API_BASE_URL=http://192.168.1.81:3001/api \
// node scripts/bulkDeleteWardrobe.mjs

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';
const USER_ID = process.env.USER_ID || '';

if (!USER_ID) {
  console.error(
    '❌ Missing USER_ID env.\nExample:\nUSER_ID=<uuid> API_BASE_URL=http://192.168.1.81:3001/api node scripts/bulkDeleteWardrobe.mjs',
  );
  process.exit(1);
}

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  const body = await res.text();
  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status} ${res.statusText}\nURL: ${url}\nBody: ${body}`,
    );
  }
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

(async function run() {
  console.log(`API_BASE_URL=${API_BASE_URL}`);
  console.log(`USER_ID=${USER_ID}`);

  console.log('🔎 Listing wardrobe items…');
  const items = await fetchJson(
    `${API_BASE_URL}/wardrobe?user_id=${encodeURIComponent(USER_ID)}`,
  );
  if (!Array.isArray(items) || items.length === 0) {
    console.log('✅ No items to delete. Done.');
    return;
  }

  console.log(
    `Found ${items.length} items. Deleting via API (DB + Pinecone + GCS)…`,
  );
  for (const it of items) {
    const payload = {
      item_id: it.id,
      user_id: it.user_id,
      image_url: it.image_url,
    };
    try {
      await fetchJson(`${API_BASE_URL}/wardrobe`, {
        method: 'DELETE',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
      });
      console.log(`✔ Deleted ${it.id} (${it.name ?? 'no-name'})`);
    } catch (e) {
      console.error(`❌ Failed ${it.id}: ${e.message}`);
    }
  }

  console.log('🎉 Bulk delete complete.');
})().catch(err => {
  console.error('❌ Script error:', err?.message || err);
  process.exit(1);
});

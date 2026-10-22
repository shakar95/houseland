import 'dotenv/config';
import { CANONICAL_SLEMANI_NEIGHBORHOODS } from './clean-slemani-neighborhoods.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dauxpyyuppqcxxhvfyrk.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhdXhweXl1cHBxY3h4aHZmeXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDM4NzAsImV4cCI6MjA5NTM3OTg3MH0.B2IDoSokrnBb7Zfmoc4IxwgQi4poP5esa7sE0Nc2E-4';

async function getAdminToken(): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ email: 'admin@houseland.iq', password: 'HouselandAdmin2026!' }),
  });
  if (!res.ok) throw new Error(`Admin login failed: ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

async function purge() {
  console.log('🔑 Getting admin token...');
  const token = await getAdminToken();
  const headers = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
  };

  const canonicalNames = new Set(CANONICAL_SLEMANI_NEIGHBORHOODS.map((c) => c.name));
  console.log(`Curated canonical neighborhoods: ${canonicalNames.size}`);

  // Fetch all neighborhoods currently in DB
  let all = [];
  let page = 0;
  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/neighborhoods?select=id,name&limit=1000&offset=${page * 1000}`,
      { headers: { apikey: SUPABASE_ANON_KEY } }
    );
    const batch = await res.json();
    if (!batch.length) break;
    all.push(...batch);
    if (batch.length < 1000) break;
    page++;
  }
  console.log(`Total in DB right now: ${all.length}`);

  const toDelete = all.filter((n) => !canonicalNames.has(n.name));
  console.log(`Rows to delete (junk OSM/non-canonical): ${toDelete.length}`);

  // Delete in chunks of 50 via PostgREST in operator `id=in.(...)`
  const chunkSize = 50;
  let deletedCount = 0;
  for (let i = 0; i < toDelete.length; i += chunkSize) {
    const chunk = toDelete.slice(i, i + chunkSize);
    const idList = chunk.map((c) => c.id).join(',');
    const delRes = await fetch(`${SUPABASE_URL}/rest/v1/neighborhoods?id=in.(${idList})`, {
      method: 'DELETE',
      headers,
    });
    if (delRes.ok) {
      deletedCount += chunk.length;
      process.stdout.write(`Deleted ${deletedCount}/${toDelete.length}\r`);
    } else {
      console.error(`Failed to delete chunk: ${await delRes.text()}`);
    }
  }

  console.log(`\n✅ Successfully deleted ${deletedCount} non-canonical / junk rows!`);

  // Verify remaining count
  const verifyRes = await fetch(`${SUPABASE_URL}/rest/v1/neighborhoods?select=id,name`, {
    headers: { apikey: SUPABASE_ANON_KEY },
  });
  const remaining = await verifyRes.json();
  console.log(`Remaining pristine Sulaymaniyah neighborhoods in DB: ${remaining.length}`);
}

purge().catch(console.error);

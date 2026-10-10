import fs from 'fs';
import path from 'path';

const API_URL = 'https://houseland-2kbm.onrender.com';
const SUPABASE_URL = 'https://dauxpyyuppqcxxhvfyrk.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhdXhweXl1cHBxY3h4aHZmeXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDM4NzAsImV4cCI6MjA5NTM3OTg3MH0.B2IDoSokrnBb7Zfmoc4IxwgQi4poP5esa7sE0Nc2E-4';

async function getAdminToken(): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email: 'admin@houseland.iq',
      password: 'HouselandAdmin2026!',
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to login as admin: ${await res.text()}`);
  }

  const data = await res.json();
  return data.access_token;
}

function cleanLandmark(description: string): string | null {
  const m = description.match(/ناونیشان\s*[:\-]+\s*([^\r\n]+)/);
  if (!m) return null;
  const raw = m[1].split(/(?:[\r\n]|[\u200e\u200f\s]*ڕووبەر)/)[0];
  const cleaned = raw.replace(/[\u200e\u200f\u202a-\u202e]/g, '').trim();
  return cleaned || null;
}

async function updateLandmark(code: string, nearestLandmark: string, token: string) {
  const res = await fetch(`${API_URL}/api/properties/${encodeURIComponent(code)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      nearestLandmark,
    }),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return await res.json();
}

async function main() {
  console.log('🚀 دەستکرا بە نوێکردنەوەی ناونیشانی نزیک (nearestLandmark)...');
  const posts = JSON.parse(fs.readFileSync('houseland_posts.json', 'utf-8'));
  const token = await getAdminToken();
  console.log('✅ لۆگینی ئەدمین سەرکەوتوو بوو!\n');

  let updated = 0;
  for (const post of posts) {
    if (!post.code || !post.description) continue;
    const landmark = cleanLandmark(post.description);
    if (!landmark) continue;

    try {
      await updateLandmark(post.code, landmark, token);
      updated++;
      console.log(`✅ [${updated}] کۆدی #${post.code} -> ناونیشانی نزیک: ${landmark}`);
    } catch (err: any) {
      console.error(`⚠️ هەڵە لە کۆد #${post.code}:`, err.message);
    }
  }

  console.log(`\n🎉 سەرجەم ${updated} موڵک بە ناونیشانی نزیک نوێکرانەوە!`);
}

main().catch(console.error);


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

  const data: any = await res.json();
  return data.access_token;
}

async function main() {
  console.log('🧹 لۆگینی ئەدمین دەکرێت...');
  const token = await getAdminToken();

  console.log('📡 هێنانی هەموو موڵکەکان...');
  const res = await fetch(`${API_URL}/api/properties?limit=500`);
  const json: any = await res.json();
  const properties = json.data || [];

  console.log(`📦 پشکنینی ${properties.length} موڵک بۆ پاککردنەوەی لینکی ڤیدیۆی هەڵە...`);

  let cleared = 0;
  for (const p of properties) {
    if (
      p.videoLink &&
      (p.videoLink === 'https://www.facebook.com/reel/' ||
        p.videoLink === 'https://www.facebook.com/reel' ||
        p.videoLink.endsWith('/reel/') ||
        p.videoLink.endsWith('/reel'))
    ) {
      await fetch(`${API_URL}/api/properties/${encodeURIComponent(p.code)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ videoLink: '' }),
      });
      cleared++;
      console.log(`✅ [${cleared}] کۆدی #${p.code} لینکی ڤیدیۆی هەڵە لێی سڕایەوە.`);
    }
  }

  console.log(`🎉 سەرکەوتووانە لە ${cleared} موڵک لینکی ساختەی ڤیدیۆ لابرا!`);
}

main().catch(console.error);

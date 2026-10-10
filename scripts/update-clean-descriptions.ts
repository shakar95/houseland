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

async function updatePropertyData(code: string, data: any, token: string) {
  const res = await fetch(`${API_URL}/api/properties/${encodeURIComponent(code)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return await res.json();
}

async function main() {
  console.log('====================================================');
  console.log('✨ Houseland Clean Descriptions & Types Updater دەستیپێکرد');
  console.log('====================================================\n');

  const possiblePaths = [
    path.resolve(process.cwd(), 'houseland_clean_descriptions.json'),
    path.resolve(process.env.USERPROFILE || '', 'Downloads', 'houseland_clean_descriptions.json'),
  ];

  let filePath = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      filePath = p;
      break;
    }
  }

  if (!filePath) {
    console.error('❌ فایلی houseland_clean_descriptions.json نەدۆزرایەوە!');
    process.exit(1);
  }

  console.log(`📂 خوێندنەوەی فایل لە: ${filePath}`);
  const items = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  console.log('🔑 لۆگینی ئەدمین دەکرێت...');
  const token = await getAdminToken();
  console.log('✅ لۆگینی ئەدمین سەرکەوتوو بوو!\n');

  let updated = 0;
  for (const item of items) {
    if (!item.code) continue;

    const TYPE_NAMES_KU: Record<string, string> = {
      HOUSE: 'خانوو',
      LAND: 'زەوی',
      APARTMENT: 'شوقە',
      SHOP: 'دوکان',
      VILLA: 'ڤێلا',
      FARM: 'کێڵگە',
      COMMERCIAL: 'بینای بازرگانی',
    };

    const propType = item.propertyType || 'HOUSE';
    const typeKu = TYPE_NAMES_KU[propType] || 'خانوو';

    const updateBody: any = {
      propertyType: propType,
      description: item.description,
    };
    if (item.nearestLandmark) {
      updateBody.nearestLandmark = item.nearestLandmark;
    }

    // Set elegant Kurdish title
    let loc = item.neighborhood || '';
    if (!loc && item.nearestLandmark) {
      loc = item.nearestLandmark.split('-')[0].trim();
    }
    if (loc) {
      updateBody.title = `${typeKu} — ${loc}`;
    } else {
      updateBody.title = typeKu;
    }

    try {
      await updatePropertyData(item.code, updateBody, token);
      updated++;
      console.log(`✅ [${updated}] کۆدی #${item.code} نوێکرایەوە -> جۆر: ${typeKu} (${propType}) | ناونیشان: ${updateBody.title}`);
    } catch (err: any) {
      console.error(`⚠️ هەڵە لە کۆد #${item.code}:`, err.message);
    }
  }

  console.log(`\n🎉 سەرجەم ${updated} موڵک بە دەقی ڕێک و جۆری دروست نوێکرانەوە!`);
}

main().catch(console.error);

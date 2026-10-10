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

function cleanAndFormatPostText(raw: string): string {
  if (!raw) return '';

  const indices = [raw.indexOf('﷽'), raw.indexOf('#نوسینگەی_هاوسلاند'), raw.indexOf('نوسینگەی')].filter(
    (x) => x !== -1
  );
  const minIdx = indices.length > 0 ? Math.min(...indices) : 0;
  let text = raw.slice(minIdx);

  // Cut off Facebook footer
  const endIdx = text.search(/See less|No photo description|Photos from ‎کۆمپانیای|m\.me/);
  if (endIdx !== -1) {
    text = text.slice(0, endIdx);
  }

  // Also cut off comments if any
  const commentIdx = text.search(/View more comments|Comment as|LikeReply/);
  if (commentIdx !== -1) {
    text = text.slice(0, commentIdx);
  }

  // Remove invisible Unicode formatting characters
  text = text.replace(/[\u200e\u200f\u202a-\u202e]/g, '').trim();

  // Add line breaks before standard post sections so every property has crisp multiline formatting
  const sectionDelimiters = [
    '﷽',
    '#نوسینگەی_هاوسلاند',
    '#کۆدی_ژمارە',
    'ناونیشان :-',
    'ڕووبەر :-',
    'پێشی :-',
    'ڕووی :-',
    'شەقام :-',
    '#ئەم_خانووە :-',
    '#ئەم_زەوییە :-',
    '#ئەم_بینایە :-',
    '#ئەم_دوکانە :-',
    '#ئەم_موڵکە :-',
    'نهۆمی یەکەم :-',
    'نهۆمی دووەم :-',
    'نهۆمی سێیەم :-',
    'نهۆمی چوارەم :-',
    'نهۆمی پێنجەم :-',
    'تێبینی :-',
    '#عربي:-',
    '#مساحە :-',
    '#الاتجاهات :-',
    'للاستفسار يرجي الاتصال',
    'بۆ زانیاری زیاتر دەتوانن پەیوەندی بکەن :-',
    'بۆ زانیاری زیاتر پەیوەندی بکەن :-',
    'بۆ زانیاری زیاتر',
    'لەگەڵ ڕێز و خۆشەویستیمان',
  ];

  for (const delimiter of sectionDelimiters) {
    const parts = text.split(delimiter);
    if (parts.length > 1) {
      text = parts.map((p) => p.trim()).join('\n' + delimiter + ' ');
    }
  }

  // Break phone numbers into neat separate lines
  text = text.replace(/([0-9]{4}\s*[0-9]{3}\s*[0-9]{4}\s*-\s*[^\n\r]+)/g, '\n📞 $1');

  // Clean double spaces and excess newlines
  text = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n\n');

  return text;
}

function detectAccuratePropertyType(raw: string): { propertyType: string; typeNameKu: string } {
  const indices = [raw.indexOf('﷽'), raw.indexOf('#نوسینگەی_هاوسلاند'), raw.indexOf('نوسینگەی')].filter(
    (x) => x !== -1
  );
  const minIdx = indices.length > 0 ? Math.min(...indices) : 0;
  const body = raw.slice(minIdx, minIdx + 300);

  // Extract headline between نوسینگەی_هاوسلاند and کۆدی_ژمارە
  const m = body.match(/(?:#نوسینگەی_هاوسلاند|نوسینگەی_هاوسلاند)\s*([^\n\r#]+?)(?:#|کۆدی_ژمارە)/);
  const headline = m ? m[1].trim() : '';

  if (/خانوو|خانووی/i.test(headline)) return { propertyType: 'HOUSE', typeNameKu: 'خانوو' };
  if (/زەوی|پارچە\s*زەوی/i.test(headline)) return { propertyType: 'LAND', typeNameKu: 'زەوی' };
  if (/شوقە|شوقەی/i.test(headline)) return { propertyType: 'APARTMENT', typeNameKu: 'شوقە' };
  if (/دوکان|دوکانی/i.test(headline)) return { propertyType: 'SHOP', typeNameKu: 'دوکان' };
  if (/باخ|ڤێلا/i.test(headline)) return { propertyType: 'VILLA', typeNameKu: 'ڤێلا' };
  if (/کێڵگە|مەزرەعە/i.test(headline)) return { propertyType: 'FARM', typeNameKu: 'کێڵگە' };
  if (/بینا|باڵەخانە/i.test(headline)) return { propertyType: 'COMMERCIAL', typeNameKu: 'بینای بازرگانی' };
  if (/بازرگانی/i.test(headline)) return { propertyType: 'COMMERCIAL', typeNameKu: 'بینای بازرگانی' };

  if (/زەوی/i.test(body)) return { propertyType: 'LAND', typeNameKu: 'زەوی' };
  if (/خانوو/i.test(body)) return { propertyType: 'HOUSE', typeNameKu: 'خانوو' };
  if (/شوقە/i.test(body)) return { propertyType: 'APARTMENT', typeNameKu: 'شوقە' };
  if (/دوکان/i.test(body)) return { propertyType: 'SHOP', typeNameKu: 'دوکان' };
  if (/بینا|باڵەخانە/i.test(body)) return { propertyType: 'COMMERCIAL', typeNameKu: 'بینای بازرگانی' };

  return { propertyType: 'HOUSE', typeNameKu: 'خانوو' };
}

async function main() {
  console.log('====================================================');
  console.log('✨ Houseland Clean Formatter & Accurate Categorizer');
  console.log('====================================================\n');

  const jsonPath = 'C:/Users/SHAKAROMER/Downloads/houseland_posts (4).json';
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ فایلی ${jsonPath} نەدۆزرایەوە!`);
    process.exit(1);
  }

  const rawPosts: any[] = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`📂 خوێندنەوەی ${rawPosts.length} پۆست لە فایلی دابەزێندراو...\n`);

  console.log('🔑 لۆگینی ئەدمین دەکرێت...');
  const token = await getAdminToken();
  console.log('✅ لۆگینی ئەدمین سەرکەوتوو بوو!\n');

  let updated = 0;
  for (const post of rawPosts) {
    if (!post.code) continue;

    const { propertyType, typeNameKu } = detectAccuratePropertyType(post.description || '');
    const cleanDesc = cleanAndFormatPostText(post.description || '');

    // Title construction
    let location = post.neighborhood || '';
    if (!location && post.nearestLandmark) {
      location = post.nearestLandmark.split('-')[0].trim();
    }
    const cleanTitle = location ? `${typeNameKu} — ${location}` : typeNameKu;

    const updateBody: any = {
      propertyType,
      title: cleanTitle,
      description: cleanDesc,
    };

    if (post.nearestLandmark) {
      updateBody.nearestLandmark = post.nearestLandmark;
    }

    try {
      await updatePropertyData(post.code, updateBody, token);
      updated++;
      console.log(
        `✅ [${updated}/${rawPosts.length}] کۆدی #${post.code} -> جۆر: ${typeNameKu} (${propertyType}) | ناونیشان: ${cleanTitle}`
      );
    } catch (err: any) {
      console.error(`⚠️ هەڵە لە کۆد #${post.code}:`, err.message);
    }
  }

  console.log(`\n🎉 بە تەواوی ${updated} پۆست بە سەرکەوتوویی نوێکرانەوە!`);
  console.log('✨ هەموو پۆستەکان جۆری دروست و دەقی ڕێکیان پێبەخشرا.');
}

main().catch(console.error);

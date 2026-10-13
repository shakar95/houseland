/**
 * Script to parse floor counts ("نهۆم" / "قات") from property descriptions
 * and update the `floors` field for each property.
 */

const API_URL = 'https://houseland-2kbm.onrender.com';
const SUPABASE_URL = 'https://dauxpyyuppqcxxhvfyrk.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhdXhweXl1cHBxY3h4aHZmeXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDM4NzAsImV4cCI6MjA5NTM3OTg3MH0.B2IDoSokrnBb7Zfmoc4IxwgQi4poP5esa7sE0Nc2E-4';

const kurdishNumberWords: Record<string, number> = {
  'یەک': 1,
  'یەك': 1,
  'دوو': 2,
  'دو': 2,
  'سێ': 3,
  'سئ': 3,
  'چوار': 4,
  'پێنج': 5,
  'شەش': 6,
  'حەوت': 7,
  'هەشت': 8,
  'نۆ': 9,
  'دە': 10,
  'یازدە': 11,
  'دوازدە': 12,
  'سیازدە': 13,
  'چواردە': 14,
  'پازدە': 15,
  'شازدە': 16,
  'حەڤدە': 17,
  'هەژدە': 18,
  'نۆزدە': 19,
  'بیست': 20,
};

const arabicNumberWords: Record<string, number> = {
  'واحد': 1,
  'واحدة': 1,
  'اثنين': 2,
  'اثنان': 2,
  'طابقين': 2,
  'طابقان': 2,
  'ثلاث': 3,
  'ثلاثة': 3,
  'اربع': 4,
  'أربع': 4,
  'اربعة': 4,
  'أربعة': 4,
  'خمس': 5,
  'خمسة': 5,
  'ست': 6,
  'ستة': 6,
  'سبع': 7,
  'سبعة': 7,
  'ثمان': 8,
  'ثماني': 8,
  'ثمانية': 8,
  'تسع': 9,
  'تسعة': 9,
  'عشر': 10,
  'عشرة': 10,
};

const ordinalWords: Record<string, number> = {
  'یەکەم': 1,
  'دووەم': 2,
  'دوەم': 2,
  'سێیەم': 3,
  'سێەم': 3,
  'چوارەم': 4,
  'پێنجەم': 5,
  'شەشەم': 6,
  'حەوتەم': 7,
  'هەشتەم': 8,
  'نۆیەم': 9,
  'دەیەم': 10,
  'الأول': 1,
  'الثاني': 2,
  'الثالث': 3,
  'الرابع': 4,
  'الخامس': 5,
  'السادس': 6,
  'السابع': 7,
  'الثامن': 8,
  'التاسع': 9,
  'العاشر': 10,
};

function normalizeDigits(str: string): string {
  const easternDigits: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  };
  return str.replace(/[٠-٩۰-۹]/g, (d) => easternDigits[d] || d);
}

export function extractFloorsFromDescription(text: string): { floors: number | null; matchedPhrase: string | null } {
  if (!text) return { floors: null, matchedPhrase: null };

  const norm = normalizeDigits(text);

  // 1a. Digits + (نهۆم|قات|طوابق?) -> e.g. "2 نهۆم", "3 قات", "4 طوابق"
  const digitMatch = norm.match(/(?:لە\s*)?(\d+)\s*(?:نهۆم|قات|طوابق?)/i);
  if (digitMatch) {
    const num = parseInt(digitMatch[1], 10);
    if (num > 0 && num < 100) {
      // Check if "و نیو" follows
      const hasHalf = /و\s*نیو/.test(norm.substring(digitMatch.index || 0, (digitMatch.index || 0) + 25));
      return { floors: hasHalf ? num + 1 : num, matchedPhrase: digitMatch[0] + (hasHalf ? ' و نیو' : '') };
    }
  }

  // 1b. (نهۆم|قات|طابق)\s*(?:ی|ێک|یک|ێك)?\s*(\d+) -> e.g. "نهۆمی 3", "قاتی 2", "طابق 4"
  const digitAfterMatch = norm.match(/(?:نهۆم|قات|طابق)\s*(?:ی|ێک|یک|ێك)?\s*(\d+)/i);
  if (digitAfterMatch) {
    const num = parseInt(digitAfterMatch[1], 10);
    if (num > 0 && num < 100) {
      return { floors: num, matchedPhrase: digitAfterMatch[0] };
    }
  }

  // 1c. Kurdish word numbers: e.g. "دوو نهۆم", "سێ قات", "پێنج نهۆم", "یەک نهۆم"
  const kurdishWordsPattern = Object.keys(kurdishNumberWords).join('|');
  const kwRegex = new RegExp(`(?:لە\\s*)?(${kurdishWordsPattern})\\s*(?:نهۆم|قات)`, 'i');
  const kwMatch = norm.match(kwRegex);
  if (kwMatch) {
    const num = kurdishNumberWords[kwMatch[1]];
    if (num) {
      const hasHalf = /و\s*نیو/.test(norm.substring(kwMatch.index || 0, (kwMatch.index || 0) + 30));
      return { floors: hasHalf ? num + 1 : num, matchedPhrase: kwMatch[0] + (hasHalf ? ' و نیو' : '') };
    }
  }

  // 1d. Arabic word numbers: e.g. "ثلاثة طوابق", "طابقين", "طابق واحد"
  if (/طابقين|طابقان/.test(norm)) {
    return { floors: 2, matchedPhrase: 'طابقين' };
  }
  const arabicWordsPattern = Object.keys(arabicNumberWords).join('|');
  const arRegex = new RegExp(`(${arabicWordsPattern})\\s*طوابق?`, 'i');
  const arMatch = norm.match(arRegex);
  if (arMatch) {
    const num = arabicNumberWords[arMatch[1]];
    if (num) return { floors: num, matchedPhrase: arMatch[0] };
  }

  // 2. Mention of apartment on specific floor or highest mentioned floor:
  // e.g. "نهۆمی سێیەم", "نهۆمی دووەم", "قاتی سێیەم", "الطابق الثالث"
  const ordinalPattern = Object.keys(ordinalWords).join('|');
  const ordRegex = new RegExp(`(?:نهۆم|قات|طابق)\\s*(?:ی|ەکە)?\\s*(${ordinalPattern})`, 'gi');
  const ordMatches = [...norm.matchAll(ordRegex)];
  if (ordMatches.length > 0) {
    let maxOrdinal = 0;
    let bestPhrase = '';
    for (const m of ordMatches) {
      const val = ordinalWords[m[1]];
      if (val && val > maxOrdinal) {
        maxOrdinal = val;
        bestPhrase = m[0];
      }
    }
    if (maxOrdinal > 0) {
      return { floors: maxOrdinal, matchedPhrase: `Highest mentioned: ${bestPhrase} (${maxOrdinal})` };
    }
  }

  return { floors: null, matchedPhrase: null };
}

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

async function updatePropertyFloors(code: string, floors: number, token: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/api/properties/${encodeURIComponent(code)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ floors }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`  ❌ Failed to update #${code}: ${errText}`);
    return false;
  }

  return true;
}

async function main() {
  console.log('========================================================');
  console.log('🏢 دەستکرا بە پشکنینی وەسفی موڵکەکان و نوێکردنەوەی ژمارەی نهۆم...');
  console.log('========================================================\n');

  console.log('🔑 لۆگین وەک ئەدمین بۆ وەرگرتنی تۆکن...');
  const token = await getAdminToken();
  console.log('✅ تۆکنی ئەدمین بە سەرکەوتوویی وەرگیرا.\n');

  console.log('📥 هێنانی سەرجەم موڵکەکان لە داتابەیس...');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/properties?select=id,code,title,floors,description&order=code.asc`, {
    headers: { apikey: SUPABASE_ANON_KEY },
  });
  if (!res.ok) throw new Error(`Supabase query failed: ${await res.text()}`);

  const properties = (await res.json()) as Array<{
    id: string;
    code: string;
    title: string;
    floors: number | null;
    description?: string | null;
  }>;

  console.log(`📊 کۆی گشتی موڵکەکان: ${properties.length}\n`);

  let updatedCount = 0;
  let alreadySetCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;

  for (let i = 0; i < properties.length; i++) {
    const p = properties[i];
    const { floors, matchedPhrase } = extractFloorsFromDescription(p.description || '');

    if (floors === null) {
      notFoundCount++;
      continue;
    }

    if (p.floors === floors) {
      alreadySetCount++;
      console.log(`[${i + 1}/${properties.length}] ⏭️ #${p.code}: پێشتر نهۆمی دانراوە (${floors}) — "${matchedPhrase}"`);
      continue;
    }

    console.log(`[${i + 1}/${properties.length}] 🔄 #${p.code} (${p.title}): نوێکردنەوە بۆ ${floors} نهۆم (دۆزرایەوە لە: "${matchedPhrase}")...`);
    const ok = await updatePropertyFloors(p.code, floors, token);
    if (ok) {
      updatedCount++;
    } else {
      errorCount++;
    }

    // Small delay to prevent rate limits
    await new Promise((resolve) => setTimeout(resolve, 80));
  }

  console.log('\n========================================================');
  console.log('🎉 ئەنجامی کۆتایی نوێکردنەوەی نهۆمەکان:');
  console.log(`   - کۆی گشتی موڵکەکان: ${properties.length}`);
  console.log(`   - سەرکەوتووانە نوێکرانەوە: ${updatedCount}`);
  console.log(`   - پێشتر ڕاست بوون: ${alreadySetCount}`);
  console.log(`   - بێ ئاماژە بە نهۆم (زەوی/باخ/دوکان): ${notFoundCount}`);
  if (errorCount > 0) {
    console.log(`   - هەڵەکان: ${errorCount}`);
  }
  console.log('========================================================');
}

main().catch(console.error);

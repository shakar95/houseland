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

async function loadExistingPropertiesMap(): Promise<Map<string, any>> {
  const map = new Map<string, any>();
  try {
    const res = await fetch(`${API_URL}/api/properties?limit=500`);
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data)) {
        json.data.forEach((p: any) => {
          if (p.code) map.set(p.code, p);
        });
      }
    }
  } catch {}
  return map;
}

function getBestPropertyImages(images: string[]): string[] {
  if (!Array.isArray(images) || images.length === 0) return [];
  const seen = new Set<string>();
  const filtered: string[] = [];

  // Sort: non-thumbnails first
  const sorted = [...images].sort((a, b) => {
    const aIsThumb = /s160x160|s100x100|s320x320|p32x32|p50x50/i.test(a) ? 1 : 0;
    const bIsThumb = /s160x160|s100x100|s320x320|p32x32|p50x50/i.test(b) ? 1 : 0;
    return aIsThumb - bIsThumb;
  });

  for (const url of sorted) {
    if (!url || typeof url !== 'string') continue;
    // Extract photo ID
    const m = url.match(/\/(\d+_\d+_\d+_n\.(?:jpg|png))/i);
    const id = m ? m[1] : url.split('?')[0];
    if (!seen.has(id)) {
      seen.add(id);
      filtered.push(url);
    }
    if (filtered.length >= 8) break;
  }
  return filtered;
}

async function uploadImagesToSupabase(imageUrls: string[], token: string): Promise<string[]> {
  try {
    const payloadBase64 = token.split('.')[1];
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
    const userId = payload.sub;

    const selectedUrls = getBestPropertyImages(imageUrls);
    if (selectedUrls.length === 0) return [];

    const uploadTasks = selectedUrls.map(async (imgUrl) => {
      try {
        const res = await fetch(imgUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          },
        });
        if (!res.ok) return null;
        const arrayBuf = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        if (buffer.length < 3000) return null;

        const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.jpg`;
        const storagePath = `${userId}/${filename}`;

        const uploadRes = await fetch(
          `${SUPABASE_URL}/storage/v1/object/property-images/${storagePath}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'image/jpeg',
            },
            body: buffer,
          }
        );

        if (uploadRes.ok) {
          return `${SUPABASE_URL}/storage/v1/object/public/property-images/${storagePath}`;
        }
      } catch {}
      return null;
    });

    const results = await Promise.all(uploadTasks);
    return results.filter((url): url is string => Boolean(url));
  } catch {
    return [];
  }
}

async function postProperty(propertyData: any, token: string) {
  const res = await fetch(`${API_URL}/api/properties`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(propertyData),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return await res.json();
}

async function updateProperty(code: string, data: any, token: string) {
  try {
    const res = await fetch(`${API_URL}/api/properties/${encodeURIComponent(code)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const TYPE_NAMES_KU: Record<string, string> = {
  HOUSE: 'خانوو',
  LAND: 'زەوی',
  APARTMENT: 'شوقە',
  SHOP: 'دوکان',
  VILLA: 'ڤێلا',
  FARM: 'کێڵگە',
  COMMERCIAL: 'بینای بازرگانی',
};

async function main() {
  console.log('====================================================');
  console.log('🚀 Houseland Properties Importer (2023 - 2026 Batch)');
  console.log('====================================================\n');

  // Look for houseland_all_posts*.json or houseland_posts*.json
  const downloadsDir = path.resolve(process.env.USERPROFILE || '', 'Downloads');
  const searchDirs = [process.cwd(), downloadsDir];
  const candidates: string[] = [];

  for (const dir of searchDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      for (const f of files) {
        if (
          f.endsWith('.json') &&
          (f.includes('houseland_all_posts') || f.includes('houseland_posts'))
        ) {
          candidates.push(path.join(dir, f));
        }
      }
    }
  }

  candidates.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

  if (candidates.length === 0) {
    console.error('❌ هیچ فایلێکی پۆست نەدۆزرایەوە لە فۆڵدەری پڕۆژە یان Downloads.');
    process.exit(1);
  }

  const filePath = candidates[0];
  console.log(`📂 خوێندنەوەی نوێترین فایل لە: ${filePath}`);
  const rawData = fs.readFileSync(filePath, 'utf-8');
  const posts = JSON.parse(rawData);

  if (!Array.isArray(posts) || posts.length === 0) {
    console.error('❌ فایلەکە هیچ پۆستێکی تێدا نییە.');
    process.exit(1);
  }

  console.log(`📦 سەرجەم ${posts.length} پۆست لە فایلەکەدا دۆزرایەوە.`);
  console.log('🔑 لۆگینی ئەدمین دەکرێت...');
  const token = await getAdminToken();
  console.log('✅ لۆگینی ئەدمین سەرکەوتوو بوو!');

  console.log('📡 هێنانی لیستی موڵکە کۆنەکانی ناو داتابەیس بۆ پشکنینی خێرا...');
  const existingMap = await loadExistingPropertiesMap();
  console.log(`⚡ ${existingMap.size} موڵک لە داتابەیسدا ناسرانەوە.\n`);

  let successCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];

    if (!post.code) {
      skippedCount++;
      continue;
    }

    const propType = post.propertyType || 'HOUSE';
    const typeKu = TYPE_NAMES_KU[propType] || 'خانوو';

    let location = post.neighborhood || '';
    if (!location && post.nearestLandmark) {
      location = post.nearestLandmark.split('-')[0].trim();
    }
    const cleanTitle = location ? `${typeKu} — ${location}` : typeKu;
    const cleanDesc = (post.description || '').replace(/See less/gi, '').trim();

    const existing = existingMap.get(post.code);
    if (existing) {
      // Update existing property
      const updateData: any = {
        title: cleanTitle,
        propertyType: propType,
        description: cleanDesc,
        nearestLandmark: post.nearestLandmark || undefined,
        videoLink: post.videoLink || undefined,
      };

      // If existing property had no images or only demo images, upload real images
      const existingImages = Array.isArray(existing.images) ? existing.images : [];
      const hasSupabaseImages = existingImages.some((img: string) => img.includes('supabase.co'));
      if (!hasSupabaseImages && Array.isArray(post.images) && post.images.length > 0) {
        let finalImages = await uploadImagesToSupabase(post.images, token);
        if (finalImages.length === 0) finalImages = getBestPropertyImages(post.images);
        if (finalImages.length > 0) updateData.images = finalImages;
      }

      await updateProperty(post.code, updateData, token);
      updatedCount++;
      console.log(`🔄 [${i + 1}/${posts.length}] کۆدی #${post.code} نوێکرایەوە -> ${cleanTitle}`);
      continue;
    }

    // Insert new property
    try {
      let finalImages: string[] = [];
      if (Array.isArray(post.images) && post.images.length > 0) {
        finalImages = await uploadImagesToSupabase(post.images, token);
      }
      if (finalImages.length === 0 && Array.isArray(post.images) && post.images.length > 0) {
        finalImages = getBestPropertyImages(post.images);
      }

      if (finalImages.length === 0 && !post.videoLink) {
        finalImages = [
          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
        ];
      }

      const payload = {
        code: post.code,
        title: cleanTitle,
        propertyType: propType,
        transactionType: post.transactionType || 'FOR_SALE',
        neighborhood: location || 'سلێمانی',
        nearestLandmark: post.nearestLandmark || null,
        areaSqm: Number(post.areaSqm) || 100,
        frontageMeters: post.frontageMeters ? Number(post.frontageMeters) : null,
        facing: post.facing || null,
        streetWidth: post.streetWidth ? Number(post.streetWidth) : null,
        price: Number(post.price) || 2,
        currency: 'USD',
        description: cleanDesc,
        videoLink: post.videoLink || null,
        images: finalImages,
        status: 'APPROVED',
      };

      await postProperty(payload, token);
      successCount++;
      existingMap.set(post.code, payload);
      console.log(`🎉 [${successCount} نوێ] کۆدی #${post.code} (${cleanTitle}) بە سەرکەوتوویی زیاد کرا!`);
    } catch (err: any) {
      console.error(`⚠️ هەڵە لە زیادکردنی کۆد #${post.code}:`, err.message);
    }
  }

  console.log('\n====================================================');
  console.log(`🏁 کۆتایی هات!`);
  console.log(`✨ سەرکەوتووانە: ${successCount} موڵکی نوێ زیادکران | ${updatedCount} موڵک نوێکرانەوە.`);
  console.log('====================================================');
}

main().catch(console.error);

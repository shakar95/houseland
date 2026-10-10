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

  const data: any = await res.json();
  return data.access_token;
}

// Uploads a single image to Supabase Storage under admin user directory
async function uploadSingleImage(
  imgUrl: string,
  userId: string,
  token: string
): Promise<string> {
  // If already hosted on Supabase, keep as-is
  if (imgUrl.includes('supabase.co')) {
    return imgUrl;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(imgUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return imgUrl;
    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    if (buffer.length < 3000) return ''; // ignore tiny spacer icons

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
    return imgUrl;
  } catch {
    return imgUrl;
  }
}

// Uploads all images for a property in parallel while preserving strictly the order (index 0 = cover)
async function uploadImagesPreservingOrder(
  imageUrls: string[],
  userId: string,
  token: string
): Promise<string[]> {
  const validUrls = imageUrls.filter(Boolean).slice(0, 8);
  if (validUrls.length === 0) return [];

  const uploadPromises = validUrls.map(async (url, idx) => {
    const finalUrl = await uploadSingleImage(url, userId, token);
    return { idx, finalUrl };
  });

  const results = await Promise.all(uploadPromises);
  results.sort((a, b) => a.idx - b.idx);
  return results.map((r) => r.finalUrl).filter(Boolean);
}

async function updatePropertyPhotos(code: string, data: any, token: string) {
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

async function main() {
  console.log('====================================================');
  console.log('🖼️ Houseland Accurate Photos Fast Parallel Sync');
  console.log('====================================================\n');

  const downloadsDir = path.resolve(process.env.USERPROFILE || '', 'Downloads');

  let filePath = '';
  if (fs.existsSync(downloadsDir)) {
    const candidates = fs
      .readdirSync(downloadsDir)
      .filter((f) => f.startsWith('houseland_accurate_photos') && f.endsWith('.json'))
      .map((f) => ({
        path: path.join(downloadsDir, f),
        mtime: fs.statSync(path.join(downloadsDir, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (candidates.length > 0) {
      filePath = candidates[0].path;
    }
  }

  if (!filePath) {
    const fallback = path.resolve(process.cwd(), 'houseland_accurate_photos.json');
    if (fs.existsSync(fallback)) filePath = fallback;
  }

  if (!filePath) {
    console.error('❌ فایلی houseland_accurate_photos.json نەدۆزرایەوە!');
    process.exit(1);
  }

  console.log(`📂 بەکارهێنانی تازەترین فایل: ${filePath}`);
  const items: any[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`📦 ژمارەی گشتی موڵکەکان: ${items.length}`);

  console.log('🔑 لۆگینی ئەدمین دەکرێت...');
  const token = await getAdminToken();
  const payloadBase64 = token.split('.')[1];
  const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
  const userId = payload.sub;
  console.log(`✅ لۆگین سەرکەوتوو بوو (Admin ID: ${userId})\n`);

  let updatedCount = 0;
  const CONCURRENCY = 4;

  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const chunk = items.slice(i, i + CONCURRENCY);

    await Promise.all(
      chunk.map(async (item, chunkIdx) => {
        const itemIndex = i + chunkIdx + 1;
        if (!item.code) return;

        let finalImages: string[] = [];
        if (Array.isArray(item.images) && item.images.length > 0) {
          finalImages = await uploadImagesPreservingOrder(item.images, userId, token);
        }

        const updatePayload: any = {};
        if (finalImages.length > 0) {
          updatePayload.images = finalImages;
        }
        if (item.videoLink) {
          updatePayload.videoLink = item.videoLink;
        } else {
          updatePayload.videoLink = '';
        }

        const success = await updatePropertyPhotos(item.code, updatePayload, token);
        if (success) {
          updatedCount++;
          console.log(
            `✅ [${itemIndex}/${items.length}] موڵکی #${item.code} نوێکرایەوە -> ${finalImages.length} وێنە (سەمبنەیل: وێنەی یەکەم)`
          );
        } else {
          console.log(`⚠️ کێشە لە نوێکردنەوەی موڵکی #${item.code}`);
        }
      })
    );
  }

  console.log(`\n🎉 هەموو موڵکەکان (${updatedCount} دانە) بە سەرکەوتوویی نوێکرانەوە!`);
}

main().catch(console.error);

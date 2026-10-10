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

async function uploadImagesInExactSequence(
  imageUrls: string[],
  token: string
): Promise<string[]> {
  try {
    const payloadBase64 = token.split('.')[1];
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
    const userId = payload.sub;

    const urlsToUpload = imageUrls.slice(0, 8);
    const uploadedUrls: string[] = [];

    for (const imgUrl of urlsToUpload) {
      try {
        const res = await fetch(imgUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          },
        });
        if (!res.ok) continue;
        const arrayBuf = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        if (buffer.length < 3000) continue;

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
          uploadedUrls.push(
            `${SUPABASE_URL}/storage/v1/object/public/property-images/${storagePath}`
          );
        }
      } catch {}
    }
    return uploadedUrls;
  } catch {
    return [];
  }
}

async function updatePropertyPhotos(code: string, data: any, token: string) {
  const res = await fetch(`${API_URL}/api/properties/${encodeURIComponent(code)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return res.ok;
}

async function main() {
  console.log('====================================================');
  console.log('🖼️ Houseland Accurate Photos Updater (Sequence Sync)');
  console.log('====================================================\n');

  const downloadsDir = path.resolve(process.env.USERPROFILE || '', 'Downloads');
  const possiblePaths = [
    path.join(downloadsDir, 'houseland_accurate_photos.json'),
    path.resolve(process.cwd(), 'houseland_accurate_photos.json'),
  ];

  let filePath = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      filePath = p;
      break;
    }
  }

  if (!filePath) {
    console.error('❌ فایلی houseland_accurate_photos.json نەدۆزرایەوە!');
    process.exit(1);
  }

  console.log(`📂 خوێندنەوەی فایل لە: ${filePath}`);
  const items: any[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`📦 ژمارەی موڵکەکان: ${items.length}`);

  console.log('🔑 لۆگینی ئەدمین دەکرێت...');
  const token = await getAdminToken();
  console.log('✅ لۆگینی ئەدمین سەرکەوتوو بوو!\n');

  let updated = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.code) continue;

    console.log(`📸 [${i + 1}/${items.length}] ئەپلۆدکردنی وێنەکانی کۆدی #${item.code} بە ڕیزبەندی دروست...`);

    let finalImages: string[] = [];
    if (Array.isArray(item.images) && item.images.length > 0) {
      finalImages = await uploadImagesInExactSequence(item.images, token);
    }
    if (finalImages.length === 0 && Array.isArray(item.images) && item.images.length > 0) {
      finalImages = item.images.slice(0, 8);
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
      updated++;
      console.log(`✅ [${updated}] کۆدی #${item.code} نوێکرایەوە -> سەمبنەیل: وێنەی یەکەمی موڵکەکە`);
    } else {
      console.log(`⚠️ نەتوانرا کۆدی #${item.code} نوێ بکرێتەوە.`);
    }
  }

  console.log(`\n🎉 سەرکەوتووانە وێنەی ${updated} موڵک بە تەواوی و بە ڕیزبەندی ڕاستەقینە نوێکرانەوە!`);
}

main().catch(console.error);

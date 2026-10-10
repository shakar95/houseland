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

async function uploadImagesToSupabase(imageUrls: string[], token: string): Promise<string[]> {
  try {
    const payloadBase64 = token.split('.')[1];
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
    const userId = payload.sub;

    const uploadedUrls: string[] = [];
    for (const imgUrl of imageUrls) {
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
      } catch {
        /* skip */
      }
    }
    return uploadedUrls;
  } catch {
    return [];
  }
}

async function updatePropertyPhotos(
  code: string,
  images: string[],
  videoLink: string | null,
  nearestLandmark: string | null,
  token: string
) {
  const updateBody: any = {
    images,
    videoLink: videoLink || undefined,
  };
  if (nearestLandmark) {
    updateBody.nearestLandmark = nearestLandmark;
  }

  const res = await fetch(`${API_URL}/api/properties/${encodeURIComponent(code)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updateBody),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return await res.json();
}

async function main() {
  console.log('====================================================');
  console.log('🔄 Houseland Photos Updater دەستیپێکرد');
  console.log('====================================================\n');

  const possiblePaths = [
    path.resolve(process.cwd(), 'houseland_photos.json'),
    path.resolve(process.env.USERPROFILE || '', 'Downloads', 'houseland_photos.json'),
    path.resolve(process.cwd(), 'houseland_posts.json'),
    path.resolve(process.env.USERPROFILE || '', 'Downloads', 'houseland_posts.json'),
  ];

  let filePath = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      filePath = p;
      break;
    }
  }

  if (!filePath) {
    console.error('❌ هیچ کام لە فایلەکانی houseland_photos.json یان houseland_posts.json نەدۆزرانەوە!');
    process.exit(1);
  }

  console.log(`📂 خوێندنەوەی فایل لە: ${filePath}`);
  const posts = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  console.log('🔑 لۆگینی ئەدمین دەکرێت...');
  const token = await getAdminToken();
  console.log('✅ لۆگینی ئەدمین سەرکەوتوو بوو!\n');

  let updatedCount = 0;

  for (const post of posts) {
    if (!post.code) continue;

    const rawImages: string[] = Array.isArray(post.images) ? post.images : [];
    if (rawImages.length === 0 && !post.videoLink) continue;

    console.log(`📸 داونلۆد و ئەپلۆدکردنی ${rawImages.length} وێنە بۆ کۆدی #${post.code}...`);
    let finalImages = await uploadImagesToSupabase(rawImages.slice(0, 10), token);
    if (finalImages.length === 0 && rawImages.length > 0) {
      finalImages = rawImages.slice(0, 10);
    }

    if (finalImages.length > 0 || post.videoLink || post.nearestLandmark) {
      try {
        await updatePropertyPhotos(
          post.code,
          finalImages,
          post.videoLink || null,
          post.nearestLandmark || null,
          token
        );
        updatedCount++;
        console.log(`✅ [${updatedCount}] وێنە و ناونیشانی کۆدی #${post.code} بە سەرکەوتوویی نوێکرانەوە!`);
      } catch (err: any) {
        console.error(`⚠️ هەڵە لە نوێکردنەوەی کۆد #${post.code}:`, err.message);
      }
    }
  }

  console.log('\n====================================================');
  console.log(`🏁 تەواو بوو! وێنەکانی ${updatedCount} موڵک بە سەرکەوتوویی نوێکرانەوە.`);
  console.log('====================================================');
}

main().catch(console.error);

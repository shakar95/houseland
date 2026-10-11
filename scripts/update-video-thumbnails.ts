import fs from 'fs';
import path from 'path';

const API_URL = 'https://houseland-2kbm.onrender.com';
const SUPABASE_URL = 'https://dauxpyyuppqcxxhvfyrk.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhdXhweXl1cHBxY3h4aHZmeXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDM4NzAsImV4cCI6MjA5NTM3OTg3MH0.B2IDoSokrnBb7Zfmoc4IxwgQi4poP5esa7sE0Nc2E-4';

async function getAdminToken(): Promise<{ token: string; userId: string }> {
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
  const token = data.access_token;
  const payloadBase64 = token.split('.')[1];
  const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
  return { token, userId: payload.sub };
}

async function uploadPosterToSupabase(
  filePath: string,
  code: string,
  userId: string,
  token: string
): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const storagePath = `${userId}/video-poster-${code}-${Date.now()}.jpg`;

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

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Upload failed for #${code}: ${uploadRes.status} ${errText}`);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/property-images/${storagePath}`;
}

async function updateProperty(code: string, payload: any, token: string) {
  const res = await fetch(`${API_URL}/api/properties/${encodeURIComponent(code)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`PATCH failed for #${code}: ${res.status} ${errText}`);
  }
  return await res.json();
}

async function main() {
  console.log('====================================================');
  console.log('🎬 Updating Video Thumbnails (Exact First Shot Sync)');
  console.log('====================================================\n');

  const { token, userId } = await getAdminToken();
  console.log(`🔑 Logged in as Admin (${userId})\n`);

  const posterDir = path.resolve(process.cwd(), 'scratch-video-posters');
  const videoProps = [
    {
      code: '7102',
      videoLink: 'https://www.facebook.com/reel/1065268599542961/',
      file: path.join(posterDir, '7102-poster.jpg'),
    },
    {
      code: '6750',
      videoLink: 'https://www.facebook.com/reel/2267084210810455/',
      file: path.join(posterDir, '6750-poster.jpg'),
    },
    {
      code: '6993',
      videoLink: 'https://www.facebook.com/reel/1515873150292500/',
      file: path.join(posterDir, '6993-poster.jpg'),
    },
  ];

  for (const item of videoProps) {
    console.log(`📸 Uploading authentic first shot for #${item.code}...`);
    const publicUrl = await uploadPosterToSupabase(item.file, item.code, userId, token);
    console.log(`✅ Uploaded #${item.code} poster: ${publicUrl}`);

    console.log(`💾 Updating DB record for #${item.code}...`);
    await updateProperty(
      item.code,
      {
        images: [publicUrl],
        thumbnailUrl: publicUrl,
        imageCount: 0,
        videoLink: item.videoLink,
      },
      token
    );
    console.log(`🎉 Property #${item.code} updated with authentic video first-shot thumbnail!\n`);
  }

  console.log('====================================================');
  console.log('✨ All video thumbnails updated successfully!');
  console.log('====================================================');
}

main().catch(console.error);

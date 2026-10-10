import { db } from '../db/index.js';
import { properties } from '../db/schema.js';
import { eq, or, sql } from 'drizzle-orm';

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

type CachedBuffer = {
  buffer: Buffer;
  contentType: string;
  expiresAt: number;
};

const bufferCache = new Map<string, CachedBuffer>();
const MAX_CACHE_SIZE = 300;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function fetchVideoThumbnailBuffer(
  rawUrl: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const url = decodeHtmlEntities(rawUrl.trim());
  if (!url) return null;

  const now = Date.now();
  const cached = bufferCache.get(url);
  if (cached && cached.expiresAt > now) {
    return { buffer: cached.buffer, contentType: cached.contentType };
  }

  // If it's an expired fbcdn.net link, attempt to find the original property videoLink
  if (url.includes('fbcdn.net')) {
    try {
      const sample = url.slice(0, 60);
      const [match] = await db
        .select({ videoLink: properties.videoLink })
        .from(properties)
        .where(
          or(
            eq(properties.thumbnailUrl, url),
            sql`${properties.images}::text LIKE ${'%' + sample + '%'}`
          )
        )
        .limit(1);
      if (match?.videoLink) {
        return fetchVideoThumbnailBuffer(match.videoLink);
      }
    } catch {
      /* ignore lookup error */
    }
  }

  let imageUrl: string | null = null;

  // 1. YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i
  );
  if (ytMatch?.[1]) {
    imageUrl = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  }

  // 2. Facebook / Instagram / TikTok — fetch Open Graph image via crawler User-Agent
  if (!imageUrl && /facebook\.com|fb\.watch|instagram\.com|tiktok\.com/i.test(url)) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent':
            'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const html = await res.text();
      const og =
        html.match(/property=["']og:image["']\s+content=["']([^"']+)["']/i)?.[1] ||
        html.match(/content=["']([^"']+)["']\s+property=["']og:image["']/i)?.[1] ||
        html.match(/property=["']og:image:secure_url["']\s+content=["']([^"']+)["']/i)?.[1] ||
        html.match(/content=["']([^"']+)["']\s+property=["']og:image:secure_url["']/i)?.[1];
      if (og?.startsWith('http')) {
        imageUrl = decodeHtmlEntities(og);
      }
    } catch {
      /* ignore */
    }
  }

  // If input URL itself is already an image link (e.g. Unsplash or direct image)
  if (!imageUrl && /^https?:\/\/.+\.(jpg|jpeg|png|webp)/i.test(url)) {
    imageUrl = url;
  }

  if (!imageUrl) return null;

  // Fetch the image binary on the server (avoids browser Referer blocking and CORS)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const imgRes = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });
    clearTimeout(timeout);

    if (!imgRes.ok) return null;

    const arrayBuf = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';

    if (bufferCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = bufferCache.keys().next().value;
      if (oldestKey) bufferCache.delete(oldestKey);
    }
    bufferCache.set(url, { buffer, contentType, expiresAt: now + CACHE_TTL_MS });

    return { buffer, contentType };
  } catch {
    return null;
  }
}

/** Resolve a poster/thumbnail URL to store for a property.
 * Instead of storing a fragile, expiring fbcdn link, return our proxy endpoint URL.
 */
export async function resolveVideoThumbnail(
  videoUrl: string | null | undefined
): Promise<string | null> {
  if (!videoUrl?.trim()) return null;
  const url = videoUrl.trim();

  const yt =
    url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i)?.[1] ??
    null;
  if (yt) return `https://img.youtube.com/vi/${yt}/hqdefault.jpg`;

  if (/facebook\.com|fb\.watch|instagram\.com|tiktok\.com/i.test(url)) {
    return `/api/video-thumbnail?url=${encodeURIComponent(url)}`;
  }

  return null;
}

export { decodeHtmlEntities };

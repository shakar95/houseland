import { decodeMediaUrl } from './videoPrefetch';

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

export const FALLBACK_PROPERTY_IMAGE =
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800';

export function isRealVideoUrl(videoLink?: string | null): boolean {
  if (!videoLink || typeof videoLink !== 'string') return false;
  const clean = videoLink.trim().replace(/\/+$/, '');
  if (/facebook\.com\/(?:reel|videos|watch)$/i.test(clean)) return false;
  return /facebook\.com\/(?:reel\/\d+|[^\/]+\/videos\/\d+|watch\/?\?v=\d+)|youtube\.com|youtu\.be/i.test(clean);
}

export function resolveThumbnailUrl(
  rawUrl: string | null | undefined,
  videoLink?: string | null
): string {
  const url = rawUrl ? decodeMediaUrl(rawUrl.trim()) : null;

  // 1. If we have a stable uploaded photo (e.g. Supabase storage or external image not from Facebook)
  if (url && !url.includes('fbcdn.net') && !url.includes('facebook.com')) {
    if (url.startsWith('/api/')) {
      return `${API_BASE}${url}`;
    }
    return url;
  }

  // 2. If property has a genuine video link (with a real ID), route through our server proxy
  if (isRealVideoUrl(videoLink)) {
    const cleanVideo = videoLink!.trim();
    const ytMatch = cleanVideo.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i
    );
    if (ytMatch?.[1]) {
      return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
    }
    return `${API_BASE}/api/video-thumbnail?url=${encodeURIComponent(cleanVideo)}`;
  }

  // 3. If there is a fbcdn.net link without videoLink, pass through proxy
  if (url && url.includes('fbcdn.net')) {
    return `${API_BASE}/api/video-thumbnail?url=${encodeURIComponent(url)}`;
  }

  return FALLBACK_PROPERTY_IMAGE;
}

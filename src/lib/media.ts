import { decodeMediaUrl } from './videoPrefetch';

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

export const FALLBACK_PROPERTY_IMAGE =
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800';

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

  // 2. If property has a video link, route through our server proxy to fetch and cache a permanent thumbnail
  if (videoLink?.trim()) {
    const cleanVideo = videoLink.trim();
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

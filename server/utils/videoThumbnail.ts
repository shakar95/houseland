function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

/** Resolve a poster/thumbnail image URL from a property video link. */
export async function resolveVideoThumbnail(videoUrl: string | null | undefined): Promise<string | null> {
  if (!videoUrl?.trim()) return null;
  const url = videoUrl.trim();

  const yt =
    url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i)?.[1] ??
    null;
  if (yt) return `https://img.youtube.com/vi/${yt}/hqdefault.jpg`;

  // Facebook / Instagram / TikTok — try Open Graph image
  if (/facebook\.com|fb\.watch|instagram\.com|tiktok\.com/i.test(url)) {
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
      if (og?.startsWith('http')) return decodeHtmlEntities(og);
    } catch {
      /* ignore */
    }
  }

  return null;
}

export { decodeHtmlEntities };

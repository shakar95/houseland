import { parseVideoLink } from '@/lib/videoEmbed';

const resolvedCache = new Map<string, string>();
const warmed = new Set<string>();
const warmHost = typeof document !== 'undefined' ? document.createElement('div') : null;

if (warmHost && typeof document !== 'undefined') {
  warmHost.setAttribute('aria-hidden', 'true');
  warmHost.style.cssText =
    'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden';
  document.documentElement.appendChild(warmHost);
}

export function getResolvedVideoUrl(url: string): string | undefined {
  return resolvedCache.get(url);
}

/** Resolve share shortlinks and warm the embed iframe so playback starts instantly. */
export async function prefetchPropertyVideo(rawUrl: string | null | undefined) {
  const url = rawUrl?.trim();
  if (!url || warmed.has(url)) return;
  warmed.add(url);

  let resolved = url;
  if (url.includes('facebook.com/share/') || url.includes('fb.watch/')) {
    try {
      const res = await fetch(`/api/resolve-video-url?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (data?.resolvedUrl) {
        resolved = data.resolvedUrl;
        resolvedCache.set(url, resolved);
        resolvedCache.set(resolved, resolved);
      }
    } catch {
      /* keep original */
    }
  } else {
    resolvedCache.set(url, url);
  }

  // Preload poster-less embed so CDN/iframe session is hot
  if (!warmHost) return;
  const embed = parseVideoLink(resolved, 'reel', true);
  if (!embed.embedHtml) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = embed.embedHtml;
  warmHost.replaceChildren(wrap);
}

export function decodeMediaUrl(url: string): string {
  return url.replace(/&amp;/gi, '&').replace(/&quot;/gi, '"');
}

export type VideoAspect = 'video' | 'reel' | 'square';

export interface VideoEmbed {
  provider: 'youtube' | 'tiktok' | 'facebook' | 'instagram' | 'unknown';
  embedHtml: string | null;
  originalUrl: string;
}

function iframeClass(aspect: VideoAspect): string {
  if (aspect === 'reel') return 'property-gallery-video-iframe';
  if (aspect === 'square') return 'w-full aspect-square max-w-md mx-auto rounded-xl';
  return 'w-full aspect-video rounded-xl';
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractTikTokId(url: string): string | null {
  const m = url.match(/tiktok\.com\/@[\w.]+\/video\/(\d+)/);
  return m ? m[1] : null;
}

function cleanFacebookUrl(raw: string): string {
  try {
    let u = raw.trim();
    // Normalize mobile and subdomain hosts
    u = u.replace(/^https?:\/\/(?:m|mobile|web|touch)\.facebook\.com/i, 'https://www.facebook.com');
    const parsed = new URL(u);
    // Remove typical tracking parameters that break Facebook plugin
    const trackingParams = ['mibextid', 'ref', 'rdid', 'sfnsn', 'fs', 's', 'extid', '__tn__', 'locale', '_rdr', 'startTime'];
    trackingParams.forEach((p) => parsed.searchParams.delete(p));

    const reelMatch = parsed.pathname.match(/\/reel\/(\d+)/);
    if (reelMatch) {
      return `https://www.facebook.com/reel/${reelMatch[1]}/`;
    }

    const watchMatch = parsed.searchParams.get('v');
    if (watchMatch && /^\d+$/.test(watchMatch)) {
      return `https://www.facebook.com/watch/?v=${watchMatch}`;
    }

    let res = parsed.toString();
    if (!res.endsWith('/') && !res.includes('?')) {
      res += '/';
    }
    return res;
  } catch {
    return raw.trim();
  }
}

function extractFacebookEmbed(url: string): string | null {
  if (url.includes('facebook.com') || url.includes('fb.watch')) {
    const cleaned = cleanFacebookUrl(url);
    return encodeURIComponent(cleaned);
  }
  return null;
}

function extractInstagramId(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:p|reel|tv)\/([\w-]+)/);
  return m ? m[1] : null;
}

export function parseVideoLink(url: string, aspect: VideoAspect = 'video'): VideoEmbed {
  const trimmed = url.trim();
  const cls = iframeClass(aspect);
  if (!trimmed) {
    return { provider: 'unknown', embedHtml: null, originalUrl: url };
  }

  const ytId = extractYouTubeId(trimmed);
  if (ytId) {
    const src =
      aspect === 'reel'
        ? `https://www.youtube.com/embed/${ytId}?playsinline=1`
        : `https://www.youtube.com/embed/${ytId}`;
    return {
      provider: 'youtube',
      originalUrl: trimmed,
      embedHtml: `<iframe class="${cls}" src="${src}" title="Video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`,
    };
  }

  const ttId = extractTikTokId(trimmed);
  if (ttId) {
    return {
      provider: 'tiktok',
      originalUrl: trimmed,
      embedHtml: `<iframe class="${cls}" src="https://www.tiktok.com/embed/v2/${ttId}" title="TikTok" frameborder="0" allowfullscreen></iframe>`,
    };
  }

  const fbUrl = extractFacebookEmbed(trimmed);
  if (fbUrl) {
    return {
      provider: 'facebook',
      originalUrl: trimmed,
      embedHtml: `<iframe class="${cls}" src="https://www.facebook.com/plugins/video.php?href=${fbUrl}&show_text=false" title="Facebook" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowfullscreen="true" scrolling="no"></iframe>`,
    };
  }

  const igId = extractInstagramId(trimmed);
  if (igId) {
    const igPath = trimmed.includes('/reel/') ? 'reel' : 'p';
    return {
      provider: 'instagram',
      originalUrl: trimmed,
      embedHtml: `<iframe class="${cls}" src="https://www.instagram.com/${igPath}/${igId}/embed" title="Instagram" frameborder="0" allowfullscreen></iframe>`,
    };
  }

  return { provider: 'unknown', embedHtml: null, originalUrl: trimmed };
}

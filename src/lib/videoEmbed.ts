export interface VideoEmbed {
  provider: 'youtube' | 'tiktok' | 'facebook' | 'instagram' | 'unknown';
  embedHtml: string | null;
  originalUrl: string;
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

function extractFacebookEmbed(url: string): string | null {
  if (url.includes('facebook.com') || url.includes('fb.watch')) {
    return encodeURIComponent(url);
  }
  return null;
}

function extractInstagramId(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:p|reel|tv)\/([\w-]+)/);
  return m ? m[1] : null;
}

export function parseVideoLink(url: string): VideoEmbed {
  const trimmed = url.trim();
  if (!trimmed) {
    return { provider: 'unknown', embedHtml: null, originalUrl: url };
  }

  const ytId = extractYouTubeId(trimmed);
  if (ytId) {
    return {
      provider: 'youtube',
      originalUrl: trimmed,
      embedHtml: `<iframe class="w-full aspect-video rounded-xl" src="https://www.youtube.com/embed/${ytId}" title="Video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`,
    };
  }

  const ttId = extractTikTokId(trimmed);
  if (ttId) {
    return {
      provider: 'tiktok',
      originalUrl: trimmed,
      embedHtml: `<iframe class="w-full aspect-[9/16] max-h-[600px] mx-auto rounded-xl" src="https://www.tiktok.com/embed/v2/${ttId}" title="TikTok" frameborder="0" allowfullscreen></iframe>`,
    };
  }

  const fbUrl = extractFacebookEmbed(trimmed);
  if (fbUrl) {
    return {
      provider: 'facebook',
      originalUrl: trimmed,
      embedHtml: `<iframe class="w-full aspect-video rounded-xl" src="https://www.facebook.com/plugins/video.php?href=${fbUrl}&show_text=false&width=560" title="Facebook" frameborder="0" allowfullscreen></iframe>`,
    };
  }

  const igId = extractInstagramId(trimmed);
  if (igId) {
    return {
      provider: 'instagram',
      originalUrl: trimmed,
      embedHtml: `<iframe class="w-full aspect-square max-w-md mx-auto rounded-xl" src="https://www.instagram.com/p/${igId}/embed" title="Instagram" frameborder="0" allowfullscreen></iframe>`,
    };
  }

  return { provider: 'unknown', embedHtml: null, originalUrl: trimmed };
}

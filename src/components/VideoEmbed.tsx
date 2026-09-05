import { useState, useEffect } from 'react';
import { parseVideoLink, type VideoAspect } from '@/lib/videoEmbed';
import { ExternalLink } from 'lucide-react';

type Props = {
  url: string;
  aspect?: VideoAspect;
  className?: string;
};

export function VideoEmbed({ url, aspect = 'video', className }: Props) {
  const [currentUrl, setCurrentUrl] = useState(url);

  useEffect(() => {
    setCurrentUrl(url);
    if (!url) return;

    if (url.includes('facebook.com/share/') || url.includes('fb.watch/')) {
      fetch(`/api/resolve-video-url?url=${encodeURIComponent(url)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.resolvedUrl && data.resolvedUrl !== url) {
            setCurrentUrl(data.resolvedUrl);
          }
        })
        .catch(() => {});
    }
  }, [url]);

  const embed = parseVideoLink(currentUrl, aspect);
  if (!embed.embedHtml) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-xl bg-royal-800/80 px-4 py-2 text-sm text-gold-400 hover:text-gold-300 transition"
      >
        <ExternalLink className="h-4 w-4" />
        <span>Watch video</span>
      </a>
    );
  }
  return (
    <div className="relative flex items-center justify-center w-full h-full">
      <div
        className={className ?? (aspect === 'reel' ? 'property-gallery-video-wrap' : 'w-full h-full')}
        dangerouslySetInnerHTML={{ __html: embed.embedHtml }}
      />
      {embed.provider === 'facebook' && (
        <a
          href={currentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-3 end-3 z-30 pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-royal-950/90 px-3 py-1.5 text-xs font-semibold text-white shadow-md backdrop-blur-md border border-white/25 hover:bg-[#1877F2] hover:border-[#1877F2] transition-all"
        >
          <ExternalLink className="h-3.5 w-3.5 text-gold-400" />
          <span>سەیرکردن لە فەیسبووک</span>
        </a>
      )}
    </div>
  );
}

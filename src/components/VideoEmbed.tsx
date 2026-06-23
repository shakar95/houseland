import { parseVideoLink, type VideoAspect } from '@/lib/videoEmbed';

type Props = {
  url: string;
  aspect?: VideoAspect;
  className?: string;
};

export function VideoEmbed({ url, aspect = 'video', className }: Props) {
  const embed = parseVideoLink(url, aspect);
  if (!embed.embedHtml) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="text-gold-400 underline">
        Watch video
      </a>
    );
  }
  return (
    <div
      className={className ?? (aspect === 'reel' ? 'property-gallery-video-wrap' : undefined)}
      dangerouslySetInnerHTML={{ __html: embed.embedHtml }}
    />
  );
}

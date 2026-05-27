import { parseVideoLink } from '@/lib/videoEmbed';

export function VideoEmbed({ url }: { url: string }) {
  const embed = parseVideoLink(url);
  if (!embed.embedHtml) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="text-gold-400 underline">
        Watch video
      </a>
    );
  }
  return <div dangerouslySetInnerHTML={{ __html: embed.embedHtml }} />;
}

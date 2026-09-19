import { decodeHtmlEntities } from './videoThumbnail.js';

/** Sync denormalized listing media fields from the images array. */
export function syncPropertyMedia(images: string[], videoThumbnail?: string | null) {
  const urls = images.filter(Boolean).map((u) => decodeHtmlEntities(u.trim()));
  const thumbRaw = urls[0] ?? videoThumbnail ?? null;
  const thumbnailUrl = thumbRaw ? decodeHtmlEntities(thumbRaw) : null;
  return {
    // Persist video poster into images so listing cards always have a displayable URL
    images: urls.length ? urls : thumbnailUrl ? [thumbnailUrl] : [],
    thumbnailUrl,
    imageCount: urls.length,
  };
}

export function toPublicListingCard<
  T extends {
    thumbnailUrl?: string | null;
    imageCount?: number;
    images?: string[];
  },
>(p: T) {
  const { thumbnailUrl, imageCount, images: _images, ...rest } = p;
  const count = imageCount ?? p.images?.filter(Boolean).length ?? 0;
  const rawThumb = thumbnailUrl ?? p.images?.find(Boolean) ?? null;
  const thumb = rawThumb ? decodeHtmlEntities(rawThumb) : null;
  return {
    ...rest,
    images: thumb ? [thumb] : [],
    imageCount: count,
  };
}

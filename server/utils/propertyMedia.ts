/** Sync denormalized listing media fields from the images array. */
export function syncPropertyMedia(images: string[]) {
  const urls = images.filter(Boolean);
  return {
    images: urls,
    thumbnailUrl: urls[0] ?? null,
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
  const thumb = thumbnailUrl ?? p.images?.find(Boolean) ?? null;
  return {
    ...rest,
    images: thumb ? [thumb] : [],
    imageCount: count,
  };
}

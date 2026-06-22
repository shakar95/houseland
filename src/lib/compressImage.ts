const DEFAULT_MAX_WIDTH = 1920;
const DEFAULT_MAX_HEIGHT = 1920;
const DEFAULT_QUALITY = 0.82;

export async function compressImageFile(
  file: File,
  options?: { maxWidth?: number; maxHeight?: number; quality?: number },
): Promise<Blob> {
  const maxWidth = options?.maxWidth ?? DEFAULT_MAX_WIDTH;
  const maxHeight = options?.maxHeight ?? DEFAULT_MAX_HEIGHT;
  const quality = options?.quality ?? DEFAULT_QUALITY;

  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Canvas not supported');
  }

  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
      'image/jpeg',
      quality,
    );
  });
}

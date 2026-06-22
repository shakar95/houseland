import { compressImageFile } from './compressImage';
import { supabase, supabaseConfigured } from './supabase';

export const PROPERTY_IMAGES_BUCKET = 'property-images';
export const MAX_PROPERTY_IMAGES = 8;
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export async function uploadPropertyImages(files: File[]): Promise<string[]> {
  if (!supabaseConfigured) {
    throw new Error('STORAGE_NOT_CONFIGURED');
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('NOT_AUTHENTICATED');
  }

  const urls: string[] = [];

  for (const file of files) {
    const compressed = await compressImageFile(file);
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.jpg`;
    const path = `${user.id}/${filename}`;

    const { error } = await supabase.storage
      .from(PROPERTY_IMAGES_BUCKET)
      .upload(path, compressed, {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
        upsert: false,
      });

    if (error) {
      if (error.message.toLowerCase().includes('bucket')) {
        throw new Error('STORAGE_BUCKET_MISSING');
      }
      throw new Error(error.message);
    }

    const { data } = supabase.storage.from(PROPERTY_IMAGES_BUCKET).getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  return urls;
}

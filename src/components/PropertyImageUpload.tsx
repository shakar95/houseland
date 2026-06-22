import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { MAX_IMAGE_BYTES, MAX_PROPERTY_IMAGES } from '@/lib/uploadPropertyImages';

type Preview = {
  id: string;
  file: File;
  url: string;
};

type Props = {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  error?: string;
};

export function PropertyImageUpload({ files, onChange, disabled, error }: Props) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    const next = files.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      file,
      url: URL.createObjectURL(file),
    }));
    setPreviews(next);
    return () => {
      next.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [files]);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming?.length || disabled) return;
    setLocalError('');

    const accepted = Array.from(incoming).filter((f) => f.type.startsWith('image/'));
    if (!accepted.length) return;

    const tooLarge = accepted.find((f) => f.size > MAX_IMAGE_BYTES);
    if (tooLarge) {
      setLocalError(t.submit.imageTooLarge);
      return;
    }

    const merged = [...files, ...accepted].slice(0, MAX_PROPERTY_IMAGES);
    if (files.length + accepted.length > MAX_PROPERTY_IMAGES) {
      setLocalError(t.submit.imageLimit);
    }
    onChange(merged);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeAt = (index: number) => {
    if (disabled) return;
    onChange(files.filter((_, i) => i !== index));
    setLocalError('');
  };

  const displayError = error || localError;

  return (
    <div className="space-y-3">
      <div>
        <label className="filter-label">{t.submit.imagesLabel}</label>
        <p className="mt-1 text-sm text-royal-300">{t.submit.imagesHint}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {previews.map((preview, index) => (
          <div key={preview.id} className="relative aspect-square overflow-hidden rounded-xl border border-royal-800/80 bg-royal-900/50">
            <img src={preview.url} alt="" className="h-full w-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="absolute top-1.5 end-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm"
                aria-label={t.submit.removeImage}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}

        {files.length < MAX_PROPERTY_IMAGES && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-royal-700/80 bg-royal-900/30 text-royal-300 transition hover:border-gold-400/50 hover:text-gold-300 disabled:opacity-50"
          >
            <ImagePlus className="h-6 w-6" />
            <span className="px-2 text-center text-xs">{t.submit.addImages}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      {displayError && <p className="text-sm text-red-300">{displayError}</p>}
    </div>
  );
}

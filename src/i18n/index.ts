import type { Lang, TranslationDict } from './types';
import ku from './locales/ku';
import ar from './locales/ar';
import en from './locales/en';
import { DEMO_PROPERTIES } from './demoProperties';
import { normalizeKurdishOrthography } from '../lib/kurdishText';

export type { Lang, TranslationDict };

function deepNormalizeStrings<T>(value: T): T {
  if (typeof value === 'string') return normalizeKurdishOrthography(value) as T;
  if (Array.isArray(value)) return value.map((v) => deepNormalizeStrings(v)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = deepNormalizeStrings(v);
    return out as T;
  }
  return value;
}

const dictionaries: Record<Lang, TranslationDict> = {
  ku: deepNormalizeStrings(ku),
  ar: deepNormalizeStrings(ar),
  en,
};

export const LANG_STORAGE_KEY = 'houseland-lang';
export const DEFAULT_LANG: Lang = 'ku';

export function isRtl(lang: Lang) {
  return lang === 'ku' || lang === 'ar';
}

export function getDictionary(lang: Lang): TranslationDict {
  return dictionaries[lang] ?? dictionaries.ku;
}

export function getPropertyTitle(code: string, lang: Lang, fallback: string) {
  const demo = DEMO_PROPERTIES[code];
  if (demo) {
    const isOriginal = fallback === demo.title.en || fallback === demo.title.ku || fallback === demo.title.ar;
    if (isOriginal || !fallback) {
      const raw = demo.title[lang] ?? fallback;
      return lang === 'en' ? raw : normalizeKurdishOrthography(raw);
    }
  }
  return lang === 'en' ? fallback : normalizeKurdishOrthography(fallback);
}

export function getPropertyDescription(code: string, lang: Lang, fallback: string) {
  const demo = DEMO_PROPERTIES[code];
  if (demo) {
    const isOriginal = fallback === demo.description.en || fallback === demo.description.ku || fallback === demo.description.ar;
    if (isOriginal || !fallback) {
      const raw = demo.description[lang] ?? fallback;
      return lang === 'en' ? raw : normalizeKurdishOrthography(raw);
    }
  }
  return lang === 'en' ? fallback : normalizeKurdishOrthography(fallback);
}

export function labelEnum(lang: Lang, value: string) {
  const dict = getDictionary(lang);
  return dict.enums[value] ?? value.replace(/_/g, ' ');
}

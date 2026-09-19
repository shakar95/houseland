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
  const raw = DEMO_PROPERTIES[code]?.title[lang] ?? fallback;
  return lang === 'en' ? raw : normalizeKurdishOrthography(raw);
}

export function getPropertyDescription(code: string, lang: Lang, fallback: string) {
  const raw = DEMO_PROPERTIES[code]?.description[lang] ?? fallback;
  return lang === 'en' ? raw : normalizeKurdishOrthography(raw);
}

export function labelEnum(lang: Lang, value: string) {
  const dict = getDictionary(lang);
  return dict.enums[value] ?? value.replace(/_/g, ' ');
}

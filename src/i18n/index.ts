import type { Lang, TranslationDict } from './types';
import ku from './locales/ku';
import ar from './locales/ar';
import en from './locales/en';
import { DEMO_PROPERTIES } from './demoProperties';

export type { Lang, TranslationDict };

const dictionaries: Record<Lang, TranslationDict> = { ku, ar, en };

export const LANG_STORAGE_KEY = 'houseland-lang';
export const DEFAULT_LANG: Lang = 'ku';

export function isRtl(lang: Lang) {
  return lang === 'ku' || lang === 'ar';
}

export function getDictionary(lang: Lang): TranslationDict {
  return dictionaries[lang] ?? dictionaries.ku;
}

export function getPropertyTitle(code: string, lang: Lang, fallback: string) {
  return DEMO_PROPERTIES[code]?.title[lang] ?? fallback;
}

export function getPropertyDescription(code: string, lang: Lang, fallback: string) {
  return DEMO_PROPERTIES[code]?.description[lang] ?? fallback;
}

export function labelEnum(lang: Lang, value: string) {
  const dict = getDictionary(lang);
  return dict.enums[value] ?? value.replace(/_/g, ' ');
}

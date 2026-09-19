import type { Lang } from '@/i18n';

/** Known cities/districts in Sulaymaniyah governorate (and nearby). */
export const CITIES = [
  {
    id: 'sulaymaniyah',
    en: 'Sulaymaniyah',
    ku: 'سلێمانی',
    ar: 'السليمانية',
  },
  {
    id: 'chamchamal',
    en: 'Chamchamal',
    ku: 'چەمچەماڵ',
    ar: 'چمچمال',
  },
  {
    id: 'kalar',
    en: 'Kalar',
    ku: 'کەلار',
    ar: 'كلار',
  },
  {
    id: 'ranya',
    en: 'Ranya',
    ku: 'ڕانیە',
    ar: 'رانية',
  },
  {
    id: 'penjwen',
    en: 'Penjwen',
    ku: 'پێنجوێن',
    ar: 'بنجوين',
  },
  {
    id: 'dukan',
    en: 'Dukan',
    ku: 'دووکان',
    ar: 'دوكان',
  },
  {
    id: 'said_sadiq',
    en: 'Said Sadiq',
    ku: 'سەید سادق',
    ar: 'سيد صادق',
  },
  {
    id: 'halabja',
    en: 'Halabja',
    ku: 'هەڵەبجە',
    ar: 'حلبجة',
  },
] as const;

export type CityId = (typeof CITIES)[number]['id'];

export const DEFAULT_CITY_ID: CityId = 'sulaymaniyah';

export function getCityLabel(cityId: string | null | undefined, lang: Lang): string {
  const city = CITIES.find((c) => c.id === cityId) ?? CITIES.find((c) => c.id === DEFAULT_CITY_ID)!;
  if (lang === 'en') return city.en;
  if (lang === 'ar') return city.ar;
  return city.ku;
}

export function isCityId(value: string): value is CityId {
  return CITIES.some((c) => c.id === value);
}

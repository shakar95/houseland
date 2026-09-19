import type { Lang } from '@/i18n';

/** Eastern Arabic / Kurdish-Arabic digits (٠-٩) */
const EASTERN_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'] as const;

export function usesEasternDigits(lang: Lang): boolean {
  return lang === 'ku' || lang === 'ar';
}

/** Convert Western digits in a string/number to localized digits for ku/ar. */
export function toLocalizedDigits(value: number | string, lang: Lang): string {
  const str = String(value);
  if (!usesEasternDigits(lang)) return str;
  return str.replace(/\d/g, (d) => EASTERN_DIGITS[Number(d)]);
}

/** @deprecated Use toLocalizedDigits(value, 'ku') */
export function toKuDigits(value: number | string): string {
  return toLocalizedDigits(value, 'ku');
}

/** Normalize Eastern digits (and Persian ۶۶ variants) back to Western for parsing. */
export function fromLocalizedDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - '٠'.charCodeAt(0)))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - '۰'.charCodeAt(0)));
}

/** Parse a number that may contain Eastern/Persian digits. */
export function parseLocalizedNumber(value: string): number {
  const normalized = fromLocalizedDigits(value).replace(/,/g, '').trim();
  if (!normalized) return NaN;
  return Number(normalized);
}

/**
 * Format a number for display in the active language.
 * ku/ar → Eastern digits (٠١٢…) with grouping; en → Western.
 */
export function formatNumber(
  value: number,
  lang: Lang,
  options?: Intl.NumberFormatOptions,
): string {
  if (!Number.isFinite(value)) return toLocalizedDigits('0', lang);

  // Always format with en-US first (reliable grouping), then localize digits.
  // Some runtimes' `ar` locale still emits Western digits.
  const formatted = new Intl.NumberFormat('en-US', options).format(value);
  if (!usesEasternDigits(lang)) return formatted;

  // Prefer Arabic thousands separator for RTL languages
  return toLocalizedDigits(formatted.replace(/,/g, '٬'), lang);
}

/**
 * Local Sulaymaniyah market USD wording (Kurdish):
 * 1 دۆلار = $1 · 1 وەرەقە = $100 · 1 دەفتەر = $10,000
 */
export function formatKurdishUsd(price: number): string {
  const amount = Math.round(Math.abs(Number(price) || 0));
  if (amount === 0) return `${toLocalizedDigits(0, 'ku')} دۆلار`;

  const daftar = Math.floor(amount / 10_000);
  const afterDaftar = amount % 10_000;

  if (daftar > 0 && afterDaftar === 5_000) {
    return `${toLocalizedDigits(daftar, 'ku')} دەفتەر و نیو`;
  }

  const parts: string[] = [];

  if (daftar > 0) {
    parts.push(`${toLocalizedDigits(daftar, 'ku')} دەفتەر`);
  }

  const waraqa = Math.floor(afterDaftar / 100);
  const dollars = afterDaftar % 100;

  if (waraqa > 0) {
    parts.push(`${toLocalizedDigits(waraqa, 'ku')} وەرەقە`);
  }

  if (dollars > 0) {
    parts.push(`${toLocalizedDigits(dollars, 'ku')} دۆلار`);
  }

  if (parts.length === 0) {
    parts.push(`${toLocalizedDigits(amount, 'ku')} دۆلار`);
  }

  return parts.join(' و ');
}

export function formatPrice(price: number, currency: string, lang: Lang = 'en') {
  if (lang === 'ku' && currency === 'USD') {
    return formatKurdishUsd(price);
  }

  const formatted = formatNumber(price, lang);
  if (currency === 'IQD') {
    return lang === 'ar' ? `${formatted} د.ع` : `${formatted} IQD`;
  }
  // Keep $ on the start for LTR; for RTL scripts put number first for readability
  if (usesEasternDigits(lang)) {
    return `${formatted} $`;
  }
  return `$${formatted}`;
}

export function formatCountLabel(template: string, count: number, lang: Lang = 'en') {
  return template.replace('{{count}}', formatNumber(count, lang));
}

export function pickCountLabel(
  count: number,
  singular: string,
  plural: string,
  lang: Lang = 'en',
) {
  return formatCountLabel(count === 1 ? singular : plural, count, lang);
}

export function labelEnum(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

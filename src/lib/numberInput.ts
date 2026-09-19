import { parseLocalizedNumber } from '@/lib/format';

/**
 * Parse number-input text that may contain Eastern/Persian digits.
 * Returns `undefined` for empty, otherwise a finite number (or NaN if invalid).
 */
export function readNumberInput(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const n = parseLocalizedNumber(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

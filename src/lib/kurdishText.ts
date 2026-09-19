/**
 * Normalize Arabic-script letters to Kurdish/Sorani forms so fonts join correctly.
 * e.g. Arabic ك (U+0643) → Kurdish ک (U+06A9), ي → ی, ة → ە where appropriate.
 */
export function normalizeKurdishOrthography(text: string): string {
  return text
    .replace(/\u0643/g, '\u06A9') // ك → ک
    .replace(/\u064A/g, '\u06CC') // ي → ی
    .replace(/\u0649/g, '\u06CC') // ى → ی
    .replace(/\u0629/g, '\u06D5'); // ة → ە
}

/**
 * Calculates the Levenshtein distance between two strings.
 * This is the minimum number of single-character edits (insertions, deletions, or substitutions)
 * required to change one word into the other.
 */
export function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[a.length][b.length];
}

/**
 * Normalizes a neighborhood name to make comparisons more robust.
 * E.g. "Pasha 25", "Pasha City 25", "pasha-25"
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF\s]/g, '') // Keep letters, numbers, and Arabic/Kurdish chars
    .replace(/\b(city|town|block|sector)\b/g, '') // Remove common filler words
    .trim()
    .replace(/\s+/g, ' '); // Compress spaces
}

/**
 * Returns true if two strings are considered similar enough to be a potential duplicate.
 */
export function isSimilarName(a: string, b: string): boolean {
  const normA = normalizeName(a);
  const normB = normalizeName(b);
  
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  
  // If one contains the other and length difference is small
  if (normA.includes(normB) || normB.includes(normA)) {
    return Math.abs(normA.length - normB.length) <= 5;
  }
  
  const distance = levenshtein(normA, normB);
  const maxLength = Math.max(normA.length, normB.length);
  
  // E.g. if length is 10, distance 2 is acceptable (80% match)
  return distance <= 2 || (distance / maxLength) <= 0.25;
}

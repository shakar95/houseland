export function parseFilterList(value?: string): string[] {
  if (!value || value === 'all') return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

export function joinFilterList(values: string[]): string | undefined {
  return values.length > 0 ? values.join(',') : undefined;
}

export function toggleFilterList(values: string[], item: string): string[] {
  return values.includes(item) ? values.filter((v) => v !== item) : [...values, item];
}

export function formatFilterListLabel(
  values: string[],
  fallback: string,
  format: (value: string) => string = (v) => v,
): string {
  if (values.length === 0) return fallback;
  return values.map(format).join(', ');
}

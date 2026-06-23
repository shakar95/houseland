export function formatPrice(price: number, currency: string) {
  const sym = currency === 'IQD' ? 'IQD ' : '$';
  const formatted = new Intl.NumberFormat('en-US').format(price);
  return currency === 'IQD' ? `${formatted} ${sym.trim()}` : `${sym}${formatted}`;
}

export function formatCountLabel(template: string, count: number) {
  return template.replace('{{count}}', String(count));
}

export function pickCountLabel(count: number, singular: string, plural: string) {
  return formatCountLabel(count === 1 ? singular : plural, count);
}

export function labelEnum(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

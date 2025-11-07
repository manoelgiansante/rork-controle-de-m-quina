export function normalizeDecimal(value: string): string {
  if (!value) return value;
  return value.replace(',', '.');
}

export function parseDecimal(value: string): number {
  if (!value) return 0;
  const normalized = normalizeDecimal(value);
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

export function formatDecimal(value: number, decimals: number = 1): string {
  return value.toFixed(decimals).replace('.', ',');
}

export function formatLiters(liters: number): string {
  return `${formatDecimal(liters, 1)} L`;
}

export function formatHours(hours: number): string {
  return `${formatDecimal(hours, 1)}h`;
}

export function validateDecimalInput(value: string): boolean {
  if (!value) return true;
  const normalized = normalizeDecimal(value);
  return /^\d+([.,]\d{0,3})?$/.test(normalized);
}

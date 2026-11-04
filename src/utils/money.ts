/**
 * Central money helpers. Amounts are integer paise (₹1 = 100 paise) everywhere;
 * conversion from user input is done on strings so no binary floating-point is involved.
 */

const AMOUNT_PATTERN = /^(-?)(\d+)(?:\.(\d{1,2}))?$/;

/**
 * Parses a user-entered rupee amount ("1,250.5") into integer paise. Returns null for invalid input.
 * Negative amounts ("-500") are only accepted with `allowNegative`.
 */
export function rupeesToPaise(input: string, { allowNegative = false } = {}): number | null {
  const match = AMOUNT_PATTERN.exec(input.replaceAll(',', '').trim());
  if (!match) return null;

  const [, sign, whole = '0', fraction = ''] = match;
  if (sign && !allowNegative) return null;
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(paise)) return null;
  return sign && paise !== 0 ? -paise : paise;
}

/** Formats paise for editing in an input, e.g. 125050 -> "1250.50". */
export function paiseToRupeeString(paise: number): string {
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  return `${sign}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

const formatters = new Map<string, Intl.NumberFormat>();

/** Formats paise for display, e.g. 12505000 -> "₹1,25,050.00" (en-IN grouping for INR). */
export function formatMoney(paise: number, currency = 'INR'): string {
  const locale = currency === 'INR' ? 'en-IN' : undefined;
  const key = `${locale}:${currency}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2 });
    formatters.set(key, formatter);
  }
  // Display only: dividing an integer by 100 is exact enough for rendering two decimals.
  return formatter.format(paise / 100);
}

const compactFormatters = new Map<string, Intl.NumberFormat>();

/** Short form for axis ticks and tight spaces: ₹12K, ₹1.2L, ₹2.5Cr (Indian units for INR). Display only. */
export function formatMoneyCompact(paise: number, currency = 'INR'): string {
  let formatter = compactFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : undefined, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    });
    compactFormatters.set(currency, formatter);
  }
  return formatter.format(paise / 100);
}

/** The currency's symbol, e.g. "₹" for INR, for input adornments. */
export function currencySymbol(currency = 'INR'): string {
  const locale = currency === 'INR' ? 'en-IN' : undefined;
  const parts = new Intl.NumberFormat(locale, { style: 'currency', currency }).formatToParts(0);
  return parts.find((part) => part.type === 'currency')?.value ?? currency;
}

/** Sums paise amounts exactly; throws rather than silently losing precision. */
export function sumPaise(amounts: readonly number[]): number {
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  if (!Number.isSafeInteger(total)) throw new RangeError('Total exceeds safe integer range');
  return total;
}

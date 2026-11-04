import { currencySymbol, formatMoney, paiseToRupeeString, rupeesToPaise, sumPaise } from './money';

describe('rupeesToPaise', () => {
  it.each([
    ['80000', 8_000_000],
    ['1,250.5', 125_050],
    ['0.1', 10],
    ['0.29', 29],
    [' 12.00 ', 1_200],
  ])('converts %p to %p paise without float error', (input, expected) => {
    expect(rupeesToPaise(input)).toBe(expected);
  });

  it.each(['', 'abc', '1.234', '-5', '1.2.3', '.5'])('rejects invalid input %p', (input) => {
    expect(rupeesToPaise(input)).toBeNull();
  });
});

describe('paiseToRupeeString', () => {
  it('round-trips with rupeesToPaise', () => {
    expect(paiseToRupeeString(125_050)).toBe('1250.50');
    expect(paiseToRupeeString(5)).toBe('0.05');
    expect(paiseToRupeeString(-1_000)).toBe('-10.00');
    expect(rupeesToPaise(paiseToRupeeString(987_654))).toBe(987_654);
  });
});

describe('formatMoney', () => {
  it('uses Indian digit grouping for INR', () => {
    expect(formatMoney(12_505_000)).toBe('₹1,25,050.00');
  });
});

describe('negative amounts', () => {
  it('are rejected unless allowed', () => {
    expect(rupeesToPaise('-500')).toBeNull();
    expect(rupeesToPaise('-500', { allowNegative: true })).toBe(-50_000);
    expect(rupeesToPaise('-0.05', { allowNegative: true })).toBe(-5);
    expect(rupeesToPaise('-0', { allowNegative: true })).toBe(0);
  });
});

describe('sumPaise', () => {
  it('adds integer paise exactly where float rupees would drift', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(sumPaise([10, 20])).toBe(30);
    expect(sumPaise([])).toBe(0);
  });

  it('throws past the safe integer range', () => {
    expect(() => sumPaise([Number.MAX_SAFE_INTEGER, 1])).toThrow(RangeError);
  });
});

describe('currencySymbol', () => {
  it('returns the symbol for INR', () => {
    expect(currencySymbol('INR')).toBe('₹');
  });
});

import { describe, it, expect } from 'vitest';
import { convertFromUsd, convertToUsd, formatCurrency } from './currency';

describe('currency utilities', () => {
  it('converts USD to target currencies correctly', () => {
    expect(convertFromUsd(100, 'USD')).toBe(100);
    expect(convertFromUsd(10, 'UZS')).toBe(126500);
    expect(convertFromUsd(10, 'JPY')).toBe(1500);
    expect(convertFromUsd(10, 'RUB')).toBe(920);
  });

  it('converts target currencies back to USD', () => {
    expect(convertToUsd(100, 'USD')).toBe(100);
    expect(convertToUsd(126500, 'UZS')).toBe(10);
    expect(convertToUsd(1500, 'JPY')).toBe(10);
    expect(convertToUsd(920, 'RUB')).toBe(10);
  });

  it('handles edge cases safely without crashing', () => {
    expect(convertFromUsd(NaN, 'USD')).toBe(0);
    // @ts-expect-error test invalid currency fallback
    expect(convertFromUsd(100, 'INVALID')).toBe(100);
    // @ts-expect-error test invalid currency fallback
    expect(convertToUsd(100, 'INVALID')).toBe(100);
  });

  it('formats currency strings properly', () => {
    const formattedUsd = formatCurrency(100, 'USD', 'en');
    expect(formattedUsd).toContain('$100.00');

    const formattedJpy = formatCurrency(100, 'JPY', 'ja');
    expect(formattedJpy).toContain('15,000');
  });
});


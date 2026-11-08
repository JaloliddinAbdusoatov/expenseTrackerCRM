export type CurrencyCode = "USD" | "UZS" | "JPY" | "RUB";

const LOCALE_BY_LANGUAGE: Record<string, string> = {
  ru: "ru-RU",
  en: "en-US",
  ja: "ja-JP",
};

// Base currency in storage is USD.
const RATE_FROM_USD: Record<CurrencyCode, number> = {
  USD: 1,
  UZS: 12650,
  JPY: 150,
  RUB: 92,
};

export function convertFromUsd(amount: number, targetCurrency: CurrencyCode = "USD") {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const rate = RATE_FROM_USD[targetCurrency] ?? 1;
  return safeAmount * rate;
}

export function convertToUsd(amount: number, sourceCurrency: CurrencyCode = "USD") {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const rate = RATE_FROM_USD[sourceCurrency] || 1;
  return safeAmount / rate;
}

export function formatCurrency(
  amount: number,
  currency: CurrencyCode = "USD",
  language = "en",
) {
  const locale = LOCALE_BY_LANGUAGE[language] || "en-US";
  const converted = convertFromUsd(amount, currency);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
    minimumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(converted);
}

export const currencyOptions: Array<{ value: CurrencyCode; label: string }> = [
  { value: "USD", label: "US Dollar (USD)" },
  { value: "UZS", label: "Uzbek so'm (UZS)" },
  { value: "JPY", label: "Japanese Yen (JPY)" },
  { value: "RUB", label: "Russian Ruble (RUB)" },
];

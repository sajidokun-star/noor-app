import type { Language, WaqtKey } from '../types/islamic';

export const WAQT_LABELS: Record<WaqtKey, { en: string; bn: string }> = {
  fajr: { en: 'Fajr', bn: 'ফজর' },
  dhuhr: { en: 'Dhuhr', bn: 'যোহর' },
  asr: { en: 'Asr', bn: 'আসর' },
  maghrib: { en: 'Maghrib', bn: 'মাগরিব' },
  isha: { en: 'Isha', bn: 'ইশা' },
};

export const EXTRA_TIME_LABELS = {
  sahri: { en: 'Sahri Ends', bn: 'সাহরি শেষ' },
  sunrise: { en: 'Sunrise', bn: 'সূর্যোদয়' },
  ishraq: { en: 'Ishraq', bn: 'ইশরাক' },
  iftar: { en: 'Iftar', bn: 'ইফতার' },
  tahajjud: { en: 'Tahajjud', bn: 'তাহাজ্জুদ' },
};

export function t(lang: Language, en: string, bn: string): string {
  return lang === 'bn' ? bn : en;
}

export function toBengaliDigits(input: string | number): string {
  const digits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(input).replace(/\d/g, (d) => digits[Number(d)] ?? d);
}

export function formatNum(lang: Language, val: string | number): string {
  return lang === 'bn' ? toBengaliDigits(val) : String(val);
}

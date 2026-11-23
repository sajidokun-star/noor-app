import type { DailyPrayerTimes } from '../types/islamic';
import {
  buildDailyPrayerTimesFromRaw,
  buildOfflinePrayerTimes,
  formatDateKey,
  gregorianToHijri,
  HIJRI_MONTHS_BN,
  HIJRI_MONTHS_EN,
} from './calculations';

export interface StripDayItem {
  date: Date;
  dateKey: string;
  offsetFromToday: number;
  labelEn: string;
  labelBn: string;
  dayShortEn: string;
  dayShortBn: string;
  dayNumber: number;
  hijriDay: number;
  hijriMonthNameEn: string;
  hijriMonthNameBn: string;
}

const WEEKDAYS_SHORT_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_SHORT_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];

/**
 * Builds a 7-day strip starting at Yesterday (-1), Today (0), Tomorrow (+1), through +5.
 */
export function buildSevenDayStrip(
  anchorDate: Date = new Date(),
  hijriOffset: number = 0
): StripDayItem[] {
  const items: StripDayItem[] = [];
  const baseYear = anchorDate.getFullYear();
  const baseMonth = anchorDate.getMonth();
  const baseDay = anchorDate.getDate();

  for (let offset = -1; offset <= 5; offset++) {
    const d = new Date(baseYear, baseMonth, baseDay + offset);
    const hijri = gregorianToHijri(d, hijriOffset);
    const weekday = d.getDay();

    let labelEn = WEEKDAYS_SHORT_EN[weekday];
    let labelBn = WEEKDAYS_SHORT_BN[weekday];
    if (offset === -1) {
      labelEn = 'Yesterday';
      labelBn = 'গতকাল';
    } else if (offset === 0) {
      labelEn = 'Today';
      labelBn = 'আজ';
    } else if (offset === 1) {
      labelEn = 'Tomorrow';
      labelBn = 'আগামীকাল';
    }

    items.push({
      date: d,
      dateKey: formatDateKey(d),
      offsetFromToday: offset,
      labelEn,
      labelBn,
      dayShortEn: WEEKDAYS_SHORT_EN[weekday],
      dayShortBn: WEEKDAYS_SHORT_BN[weekday],
      dayNumber: d.getDate(),
      hijriDay: hijri.day,
      hijriMonthNameEn: hijri.monthNameEn,
      hijriMonthNameBn: hijri.monthNameBn,
    });
  }

  return items;
}

export interface MonthlyPrayerDayRow {
  date: Date;
  dateKey: string;
  dayNumber: number;
  hijriDay: number;
  hijriLabelEn: string;
  hijriLabelBn: string;
  timings: DailyPrayerTimes;
}

export interface AladhanCalendarEntry {
  timings?: {
    Imsak?: string;
    Fajr?: string;
    Sunrise?: string;
    Dhuhr?: string;
    Asr?: string;
    Maghrib?: string;
    Isha?: string;
  };
  date?: {
    readable?: string;
    gregorian?: {
      date?: string; // DD-MM-YYYY
    };
    hijri?: {
      day?: string;
      month?: { number?: number; en?: string };
      year?: string;
    };
  };
}

/**
 * Parses Aladhan /v1/calendar monthly API array into keyed MonthlyPrayerDayRow items.
 */
export function parseAladhanCalendarResponse(
  entries: AladhanCalendarEntry[],
  year: number,
  monthZeroIndexed: number,
  hijriOffset: number = 0
): Record<string, MonthlyPrayerDayRow> {
  const map: Record<string, MonthlyPrayerDayRow> = {};

  for (const entry of entries) {
    const rawTimings = entry?.timings;
    const gregStr = entry?.date?.gregorian?.date;
    if (!rawTimings?.Fajr || !rawTimings?.Dhuhr || !rawTimings?.Asr || !rawTimings?.Maghrib || !rawTimings?.Isha) {
      continue;
    }

    let dayNum = 1;
    let resolvedYear = year;
    let resolvedMonth = monthZeroIndexed;

    if (gregStr && /^\d{2}-\d{2}-\d{4}$/.test(gregStr)) {
      const [dd, mm, yyyy] = gregStr.split('-').map(Number);
      dayNum = dd;
      resolvedMonth = mm - 1;
      resolvedYear = yyyy;
    }

    const d = new Date(resolvedYear, resolvedMonth, dayNum);
    const key = formatDateKey(d);
    const localHijri = gregorianToHijri(d, hijriOffset);

    const apiHijriDay = Number(entry?.date?.hijri?.day);
    const apiHijriMonthNum = Number(entry?.date?.hijri?.month?.number);
    const apiHijriYear = Number(entry?.date?.hijri?.year);
    const useApiHijri =
      hijriOffset === 0 &&
      Number.isFinite(apiHijriDay) &&
      apiHijriDay > 0 &&
      Number.isFinite(apiHijriMonthNum) &&
      apiHijriMonthNum >= 1 &&
      apiHijriMonthNum <= 12;

    const hDay = useApiHijri ? apiHijriDay : localHijri.day;
    const hMonthIdx = useApiHijri ? apiHijriMonthNum - 1 : localHijri.month - 1;
    const hYear = useApiHijri && Number.isFinite(apiHijriYear) ? apiHijriYear : localHijri.year;

    const hijriLabelEn = `${hDay} ${HIJRI_MONTHS_EN[hMonthIdx]} ${hYear} AH`;
    const hijriLabelBn = `${hDay} ${HIJRI_MONTHS_BN[hMonthIdx]} ${hYear}`;

    const readable =
      entry?.date?.readable ??
      d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

    const built = buildDailyPrayerTimesFromRaw(
      {
        Fajr: rawTimings.Fajr,
        Sunrise: rawTimings.Sunrise ?? '06:00',
        Dhuhr: rawTimings.Dhuhr,
        Asr: rawTimings.Asr,
        Maghrib: rawTimings.Maghrib,
        Isha: rawTimings.Isha,
      },
      readable,
      'aladhan',
      hijriLabelEn
    );

    map[key] = {
      date: d,
      dateKey: key,
      dayNumber: dayNum,
      hijriDay: hDay,
      hijriLabelEn,
      hijriLabelBn,
      timings: built,
    };
  }

  return map;
}

/**
 * Generates a deterministic full-month offline prayer schedule for any (year, month).
 * Guarantees Yesterday, Today, Tomorrow, and every day of the month work offline.
 */
export function buildMonthlyOfflineSchedule(
  year: number,
  monthZeroIndexed: number,
  hijriOffset: number = 0
): Record<string, MonthlyPrayerDayRow> {
  const daysInMonth = new Date(year, monthZeroIndexed + 1, 0).getDate();
  const map: Record<string, MonthlyPrayerDayRow> = {};

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthZeroIndexed, day);
    const key = formatDateKey(d);
    const h = gregorianToHijri(d, hijriOffset);
    const timings = buildOfflinePrayerTimes(d);
    const hijriLabelEn = `${h.day} ${h.monthNameEn} ${h.year} AH`;
    const hijriLabelBn = `${h.day} ${h.monthNameBn} ${h.year}`;

    map[key] = {
      date: d,
      dateKey: key,
      dayNumber: day,
      hijriDay: h.day,
      hijriLabelEn,
      hijriLabelBn,
      timings: {
        ...timings,
        hijriApiLabel: hijriLabelEn,
      },
    };
  }

  return map;
}

/**
 * Safely resolves a local Date from a YYYY-MM-DD dateKey or serialized date value.
 */
export function parseRowDate(dateKey: string, rawDate?: unknown): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    const [y, m, d] = dateKey.split('-').map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
  }
  if (rawDate instanceof Date && !Number.isNaN(rawDate.getTime())) {
    return rawDate;
  }
  if (typeof rawDate === 'string' || typeof rawDate === 'number') {
    const parsed = new Date(rawDate);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

/**
 * Re-hydrates JSON-deserialized MonthlyPrayerDayRow maps from localStorage,
 * ensuring every row.date is restored as a valid Date instance.
 */
export function hydrateCachedMonthlySchedule(
  raw: unknown
): Record<string, MonthlyPrayerDayRow> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }

  const out: Record<string, MonthlyPrayerDayRow> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!val || typeof val !== 'object') continue;
    const row = val as Partial<MonthlyPrayerDayRow>;
    if (!row.timings || typeof row.timings !== 'object') continue;
    const dateKey = typeof row.dateKey === 'string' && row.dateKey ? row.dateKey : key;
    const dateObj = parseRowDate(dateKey, row.date);

    out[key] = {
      date: dateObj,
      dateKey,
      dayNumber: typeof row.dayNumber === 'number' ? row.dayNumber : dateObj.getDate(),
      hijriDay: typeof row.hijriDay === 'number' ? row.hijriDay : 1,
      hijriLabelEn: typeof row.hijriLabelEn === 'string' ? row.hijriLabelEn : '',
      hijriLabelBn: typeof row.hijriLabelBn === 'string' ? row.hijriLabelBn : '',
      timings: row.timings as DailyPrayerTimes,
    };
  }

  return out;
}


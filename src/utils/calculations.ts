import type { AppPersistedState, DailyPrayerTimes, WaqtKey } from '../types/islamic';

const KAABA_LAT = 21.422487;
const KAABA_LNG = 39.826206;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Great-circle initial bearing from (lat, lng) toward Kaaba in Makkah [0, 360).
 */
export function calculateQiblaBearing(lat: number, lng: number): number {
  const phi1 = toRad(lat);
  const phi2 = toRad(KAABA_LAT);
  const dLambda = toRad(KAABA_LNG - lng);

  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);

  const bearing = (toDeg(Math.atan2(y, x)) + 360) % 360;
  return Number(bearing.toFixed(1));
}

/**
 * Haversine distance in kilometers from (lat, lng) to Kaaba in Makkah.
 */
export function calculateDistanceToKaabaKm(lat: number, lng: number): number {
  const R = 6371;
  const dLat = toRad(KAABA_LAT - lat);
  const dLng = toRad(KAABA_LNG - lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat)) *
      Math.cos(toRad(KAABA_LAT)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function getCompassCardinal(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.round((((deg % 360) + 360) % 360) / 22.5) % 16;
  return dirs[idx];
}

export function cleanApiTime(raw: string): string {
  const match = raw.match(/(\d{1,2}):(\d{2})/);
  if (!match) return '00:00';
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = cleanApiTime(hhmm).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(totalMinutes: number): string {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function addMinutesToTime(hhmm: string, deltaMinutes: number): string {
  return minutesToTime(timeToMinutes(hhmm) + deltaMinutes);
}

export function formatTime12h(hhmm: string): string {
  const [hStr, mStr] = cleanApiTime(hhmm).split(':');
  const h = Number(hStr);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${suffix}`;
}

/**
 * Estimates the beginning of the last third of the night (Tahajjud recommended window).
 */
export function calculateTahajjudStart(maghrib: string, fajr: string): string {
  const maghribMin = timeToMinutes(maghrib);
  let fajrMin = timeToMinutes(fajr);
  if (fajrMin <= maghribMin) {
    fajrMin += 1440;
  }
  const nightDuration = fajrMin - maghribMin;
  const lastThirdStart = maghribMin + Math.round((nightDuration * 2) / 3);
  return minutesToTime(lastThirdStart);
}

export function buildDailyPrayerTimesFromRaw(
  timings: {
    Fajr: string;
    Sunrise: string;
    Dhuhr: string;
    Asr: string;
    Maghrib: string;
    Isha: string;
  },
  dateLabel: string,
  source: 'aladhan' | 'offline',
  hijriApiLabel?: string
): DailyPrayerTimes {
  const fajr = cleanApiTime(timings.Fajr);
  const sunrise = cleanApiTime(timings.Sunrise);
  const dhuhr = cleanApiTime(timings.Dhuhr);
  const asr = cleanApiTime(timings.Asr);
  const maghrib = cleanApiTime(timings.Maghrib);
  const isha = cleanApiTime(timings.Isha);

  return {
    fajr,
    sunrise,
    dhuhr,
    asr,
    maghrib,
    isha,
    sahri: addMinutesToTime(fajr, -1),
    iftar: maghrib,
    ishraq: addMinutesToTime(sunrise, 15),
    tahajjud: calculateTahajjudStart(maghrib, fajr),
    dateLabel,
    hijriApiLabel,
    source,
  };
}

/**
 * Deterministic seasonal Dhaka fallback timings so the app remains accurate offline.
 */
export function buildOfflinePrayerTimes(date: Date = new Date()): DailyPrayerTimes {
  const month = date.getMonth(); // 0..11
  // Approximate seasonal shift across Bangladesh calendar
  const winterCurve = Math.cos(((month - 0) / 12) * Math.PI * 2); // +1 Jan, -1 Jul
  const fajr = minutesToTime(300 + Math.round(winterCurve * 25)); // ~04:35 - 05:25
  const sunrise = minutesToTime(345 + Math.round(winterCurve * 35)); // ~05:10 - 06:20
  const dhuhr = '12:02';
  const asr = minutesToTime(935 - Math.round(winterCurve * 25)); // ~15:10 - 16:00
  const maghrib = minutesToTime(1080 - Math.round(winterCurve * 42)); // ~17:18 - 18:42
  const isha = minutesToTime(1155 - Math.round(winterCurve * 40)); // ~18:35 - 19:55

  return buildDailyPrayerTimesFromRaw(
    {
      Fajr: fajr,
      Sunrise: sunrise,
      Dhuhr: dhuhr,
      Asr: asr,
      Maghrib: maghrib,
      Isha: isha,
    },
    date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
    'offline'
  );
}

export interface NextPrayerInfo {
  key: WaqtKey;
  time: string;
  remainingSeconds: number;
  countdownFormatted: string;
  isTomorrow: boolean;
}

export function getNextPrayerCountdown(
  times: DailyPrayerTimes,
  now: Date = new Date()
): NextPrayerInfo {
  const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const ordered: { key: WaqtKey; time: string }[] = [
    { key: 'fajr', time: times.fajr },
    { key: 'dhuhr', time: times.dhuhr },
    { key: 'asr', time: times.asr },
    { key: 'maghrib', time: times.maghrib },
    { key: 'isha', time: times.isha },
  ];

  for (const item of ordered) {
    const targetSec = timeToMinutes(item.time) * 60;
    if (targetSec > nowSeconds) {
      const diff = targetSec - nowSeconds;
      return {
        key: item.key,
        time: item.time,
        remainingSeconds: diff,
        countdownFormatted: formatDurationSeconds(diff),
        isTomorrow: false,
      };
    }
  }

  // Next is tomorrow's Fajr
  const fajrSec = timeToMinutes(times.fajr) * 60;
  const diff = 86400 - nowSeconds + fajrSec;
  return {
    key: 'fajr',
    time: times.fajr,
    remainingSeconds: diff,
    countdownFormatted: formatDurationSeconds(diff),
    isTomorrow: true,
  };
}

export function formatDurationSeconds(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// =============================================================================
// Hijri Calendar Conversion (Kuwaiti / Tabular Islamic Arithmetic + Offset)
// =============================================================================

export const HIJRI_MONTHS_EN = [
  'Muharram',
  'Safar',
  'Rabi al-Awwal',
  'Rabi al-Thani',
  'Jumada al-Ula',
  'Jumada al-Thani',
  'Rajab',
  'Sha\'ban',
  'Ramadan',
  'Shawwal',
  'Dhul Qi\'dah',
  'Dhul Hijjah',
];

export const HIJRI_MONTHS_BN = [
  'মুহররম',
  'সফর',
  'রবিউল আউয়াল',
  'রবিউস সানি',
  'জুমাদাল উলা',
  'জুমাদাস সানি',
  'রজব',
  'শাবান',
  'রমজান',
  'শাওয়াল',
  'জিলকদ',
  'জিলহজ',
];

export interface HijriDate {
  day: number;
  month: number; // 1..12
  year: number;
  monthNameEn: string;
  monthNameBn: string;
}

/**
 * Converts a Gregorian Date + moon-sighting day offset (-2..+2) into a Hijri date
 * using the standard Kuwaiti astronomical algorithm.
 */
export function gregorianToHijri(date: Date, offsetDays: number = 0): HijriDate {
  const shifted = new Date(date.getFullYear(), date.getMonth(), date.getDate() + offsetDays);
  let day = shifted.getDate();
  let month = shifted.getMonth();
  let year = shifted.getFullYear();

  let m = month + 1;
  let y = year;
  if (m < 3) {
    y -= 1;
    m += 12;
  }

  let a = Math.floor(y / 100);
  let b = 2 - a + Math.floor(a / 4);
  if (y < 1583) b = 0;
  if (y === 1582) {
    if (m > 10) b = -10;
    if (m === 10) {
      b = 0;
      if (day > 4) b = -10;
    }
  }

  const jd =
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    b -
    1524;

  b = 0;
  if (jd > 2299160) {
    a = Math.floor((jd - 1867216.25) / 36524.25);
    b = 1 + a - Math.floor(a / 4);
  }

  const bb = jd + b + 1524;
  let cc = Math.floor((bb - 122.1) / 365.25);
  const dd = Math.floor(365.25 * cc);
  const ee = Math.floor((bb - dd) / 30.6001);
  day = bb - dd - Math.floor(30.6001 * ee);
  month = ee - 1;
  if (ee > 13) {
    cc += 1;
    month = ee - 13;
  }
  year = cc - 4716;

  const iyear = 10631 / 30;
  const epochastro = 1948084;
  const shift1 = 8.01 / 60;

  let z = jd - epochastro;
  const cyc = Math.floor(z / 10631);
  z = z - 10631 * cyc;
  const j = Math.floor((z - shift1) / iyear);
  const iy = 30 * cyc + j;
  z = z - Math.floor(j * iyear + shift1);
  let im = Math.floor((z + 28.5001) / 29.5);
  if (im === 13) im = 12;
  const id = z - Math.floor(29.5001 * im - 29);

  const safeMonth = Math.max(1, Math.min(12, im));
  const safeDay = Math.max(1, Math.min(30, id));

  return {
    day: safeDay,
    month: safeMonth,
    year: iy,
    monthNameEn: HIJRI_MONTHS_EN[safeMonth - 1],
    monthNameBn: HIJRI_MONTHS_BN[safeMonth - 1],
  };
}

export interface IslamicEvent {
  id: string;
  hijriMonth: number; // 1..12 or 0 for monthly Ayyam al-Beed
  hijriDay: number;
  titleEn: string;
  titleBn: string;
  subtitleEn: string;
  subtitleBn: string;
  daysUntil: number;
}

export function getUpcomingIslamicEvents(
  referenceDate: Date = new Date(),
  hijriOffset: number = 0
): IslamicEvent[] {
  const baseEvents = [
    {
      id: 'ramadan',
      hijriMonth: 9,
      hijriDay: 1,
      titleEn: 'Start of Ramadan',
      titleBn: 'পবিত্র রমজান শুরু',
      subtitleEn: '1 Ramadan · Month of Fasting & Quran',
      subtitleBn: '১ রমজান · সিয়াম ও কুরআনের মাস',
    },
    {
      id: 'laylatul_qadr',
      hijriMonth: 9,
      hijriDay: 27,
      titleEn: 'Laylatul Qadr (27th Night)',
      titleBn: 'লাইলাতুল কদর (২৭তম রাত)',
      subtitleEn: 'Last 10 Odd Nights of Ramadan',
      subtitleBn: 'রমজানের শেষ দশকের বিজোড় রাত',
    },
    {
      id: 'eid_fitr',
      hijriMonth: 10,
      hijriDay: 1,
      titleEn: 'Eid ul-Fitr',
      titleBn: 'ঈদুল ফিতর',
      subtitleEn: '1 Shawwal · Festival of Breaking the Fast',
      subtitleBn: '১ শাওয়াল · আনন্দ ও শোকরানা উৎসব',
    },
    {
      id: 'arafah',
      hijriMonth: 12,
      hijriDay: 9,
      titleEn: 'Day of Arafah',
      titleBn: 'আরাফার দিন',
      subtitleEn: '9 Dhul Hijjah · Recommended Fast',
      subtitleBn: '৯ জিলহজ · ফজিলতপূর্ণ নফল রোজা',
    },
    {
      id: 'eid_adha',
      hijriMonth: 12,
      hijriDay: 10,
      titleEn: 'Eid ul-Adha',
      titleBn: 'ঈদুল আযহা',
      subtitleEn: '10 Dhul Hijjah · Festival of Sacrifice',
      subtitleBn: '১০ জিলহজ · কুরবানির ঈদ',
    },
    {
      id: 'ashura',
      hijriMonth: 1,
      hijriDay: 10,
      titleEn: 'Day of Ashura',
      titleBn: 'পবিত্র আশুরা',
      subtitleEn: '10 Muharram · Fast on 9th & 10th or 10th & 11th',
      subtitleBn: '১০ মুহররম · ৯ ও ১০ অথবা ১০ ও ১১ তারিখে রোজা',
    },
  ];

  // Scan forward up to 360 days to find exact upcoming occurrences
  const foundMap = new Map<string, number>();
  let nextBeedDays: number | null = null;

  for (let d = 0; d <= 360; d++) {
    const probe = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate() + d
    );
    const h = gregorianToHijri(probe, hijriOffset);

    if (nextBeedDays === null && (h.day === 13 || h.day === 14 || h.day === 15)) {
      nextBeedDays = d;
    }

    for (const ev of baseEvents) {
      if (!foundMap.has(ev.id) && h.month === ev.hijriMonth && h.day === ev.hijriDay) {
        foundMap.set(ev.id, d);
      }
    }
  }

  const results: IslamicEvent[] = baseEvents.map((ev) => ({
    ...ev,
    daysUntil: foundMap.get(ev.id) ?? 354,
  }));

  results.push({
    id: 'ayyam_al_beed',
    hijriMonth: 0,
    hijriDay: 13,
    titleEn: 'Ayyam al-Beed (White Days)',
    titleBn: 'আইয়্যামে বীজ (১৩-১৫ হিজরি)',
    subtitleEn: '13th, 14th & 15th of every Hijri month',
    subtitleBn: 'প্রতি হিজরি মাসের ১৩, ১৪ ও ১৫ তারিখ রোজা',
    daysUntil: nextBeedDays ?? 15,
  });

  return results.sort((a, b) => a.daysUntil - b.daysUntil);
}

// =============================================================================
// Zakat Calculator
// =============================================================================

export interface ZakatInput {
  cashAndBank: number;
  goldValue: number;
  silverValue: number;
  businessInventory: number;
  investments: number;
  receivables: number;
  liabilities: number;
  nisabThreshold: number;
}

export interface ZakatResult {
  totalAssets: number;
  totalLiabilities: number;
  netWealth: number;
  nisabThreshold: number;
  eligible: boolean;
  zakatPayable: number;
}

export function calculateZakat(input: ZakatInput): ZakatResult {
  const safe = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
  const totalAssets =
    safe(input.cashAndBank) +
    safe(input.goldValue) +
    safe(input.silverValue) +
    safe(input.businessInventory) +
    safe(input.investments) +
    safe(input.receivables);
  const totalLiabilities = safe(input.liabilities);
  const netWealth = Math.max(0, totalAssets - totalLiabilities);
  const nisabThreshold = safe(input.nisabThreshold);
  const eligible = nisabThreshold > 0 ? netWealth >= nisabThreshold : netWealth > 0;
  const zakatPayable = eligible ? Number((netWealth * 0.025).toFixed(2)) : 0;

  return {
    totalAssets,
    totalLiabilities,
    netWealth,
    nisabThreshold,
    eligible,
    zakatPayable,
  };
}

// =============================================================================
// Miras (Islamic Inheritance Faraid) Calculator
// =============================================================================

export interface MirasInput {
  totalEstate: number;
  spouse: 'none' | 'husband' | 'wife';
  fatherAlive: boolean;
  motherAlive: boolean;
  sons: number;
  daughters: number;
}

export interface MirasShareRow {
  heirKey: 'husband' | 'wife' | 'father' | 'mother' | 'sons' | 'daughters';
  count: number;
  fractionLabel: string;
  percentage: number;
  amount: number;
}

export interface MirasResult {
  totalEstate: number;
  rows: MirasShareRow[];
  totalAllocatedPercentage: number;
  awlApplied: boolean;
  raddApplied: boolean;
  unallocatedRemainder: number;
}

/**
 * Calculates Sunni Faraid shares for primary heirs: Spouse, Parents, Sons, Daughters.
 * Handles fixed shares (Ashab al-Furud), residuary Asabah distribution (2:1 male:female),
 * Awl proportional reduction if fixed shares exceed 100%, and Radd/Baitul-Mal remainder notes.
 */
export function calculateMiras(input: MirasInput): MirasResult {
  const estate = Number.isFinite(input.totalEstate) && input.totalEstate > 0 ? input.totalEstate : 0;
  const sons = Math.max(0, Math.floor(input.sons));
  const daughters = Math.max(0, Math.floor(input.daughters));
  const hasChildren = sons > 0 || daughters > 0;

  const fixedShares: { key: MirasShareRow['heirKey']; count: number; share: number; label: string }[] = [];

  // 1. Spouse fixed share
  if (input.spouse === 'husband') {
    const share = hasChildren ? 1 / 4 : 1 / 2;
    fixedShares.push({ key: 'husband', count: 1, share, label: hasChildren ? '1/4' : '1/2' });
  } else if (input.spouse === 'wife') {
    const share = hasChildren ? 1 / 8 : 1 / 4;
    fixedShares.push({ key: 'wife', count: 1, share, label: hasChildren ? '1/8' : '1/4' });
  }

  // 2. Mother fixed share
  if (input.motherAlive) {
    // 1/6 if deceased has children; 1/3 if no children (special Umariyyatayn case if only spouse + both parents)
    if (hasChildren) {
      fixedShares.push({ key: 'mother', count: 1, share: 1 / 6, label: '1/6' });
    } else if (input.fatherAlive && input.spouse !== 'none') {
      const spouseShare = input.spouse === 'husband' ? 1 / 2 : 1 / 4;
      const rem = 1 - spouseShare;
      fixedShares.push({ key: 'mother', count: 1, share: rem / 3, label: '1/3 of remainder' });
    } else {
      fixedShares.push({ key: 'mother', count: 1, share: 1 / 3, label: '1/3' });
    }
  }

  // 3. Father fixed share (1/6 if sons exist; 1/6 + Asabah if only daughters; pure Asabah if no children)
  let fatherFixed = 0;
  if (input.fatherAlive && hasChildren) {
    fatherFixed = 1 / 6;
    fixedShares.push({ key: 'father', count: 1, share: fatherFixed, label: sons > 0 ? '1/6' : '1/6 + Asabah' });
  }

  // 4. Daughters fixed share ONLY when there are NO sons
  if (daughters > 0 && sons === 0) {
    const dShare = daughters === 1 ? 1 / 2 : 2 / 3;
    fixedShares.push({
      key: 'daughters',
      count: daughters,
      share: dShare,
      label: daughters === 1 ? '1/2' : '2/3',
    });
  }

  const fixedSum = fixedShares.reduce((acc, item) => acc + item.share, 0);
  let awlApplied = false;
  let raddApplied = false;

  const finalMap = new Map<MirasShareRow['heirKey'], { count: number; share: number; label: string }>();

  if (fixedSum > 1 + 1e-9) {
    // Awl: proportionally scale down all fixed shares so sum === 1
    awlApplied = true;
    for (const item of fixedShares) {
      finalMap.set(item.key, {
        count: item.count,
        share: item.share / fixedSum,
        label: `${item.label} (Awl)`,
      });
    }
  } else {
    for (const item of fixedShares) {
      finalMap.set(item.key, { ...item });
    }

    let remainder = Math.max(0, 1 - fixedSum);

    // Residuary (Asabah) distribution
    if (remainder > 1e-9) {
      if (sons > 0) {
        const units = sons * 2 + daughters;
        const unitShare = remainder / units;
        finalMap.set('sons', {
          count: sons,
          share: unitShare * sons * 2,
          label: daughters > 0 ? 'Asabah (2:1)' : 'Asabah',
        });
        if (daughters > 0) {
          finalMap.set('daughters', {
            count: daughters,
            share: unitShare * daughters,
            label: 'Asabah (2:1)',
          });
        }
        remainder = 0;
      } else if (input.fatherAlive) {
        const existing = finalMap.get('father');
        finalMap.set('father', {
          count: 1,
          share: (existing?.share ?? 0) + remainder,
          label: existing ? '1/6 + Asabah' : 'Asabah',
        });
        remainder = 0;
      } else {
        // Radd to blood relatives (Mother / Daughters) excluding spouse
        const bloodKeys: MirasShareRow['heirKey'][] = ['mother', 'daughters'];
        const bloodSum = bloodKeys.reduce((acc, k) => acc + (finalMap.get(k)?.share ?? 0), 0);
        if (bloodSum > 0) {
          raddApplied = true;
          for (const k of bloodKeys) {
            const existing = finalMap.get(k);
            if (existing) {
              const extra = remainder * (existing.share / bloodSum);
              finalMap.set(k, {
                count: existing.count,
                share: existing.share + extra,
                label: `${existing.label} + Radd`,
              });
            }
          }
          remainder = 0;
        }
      }
    }
  }

  const rows: MirasShareRow[] = [];
  const order: MirasShareRow['heirKey'][] = ['husband', 'wife', 'father', 'mother', 'sons', 'daughters'];

  for (const key of order) {
    const entry = finalMap.get(key);
    if (entry && entry.share > 0) {
      const pct = Number((entry.share * 100).toFixed(2));
      rows.push({
        heirKey: key,
        count: entry.count,
        fractionLabel: entry.label,
        percentage: pct,
        amount: Number((estate * entry.share).toFixed(2)),
      });
    }
  }

  const totalPct = Number(rows.reduce((acc, r) => acc + r.percentage, 0).toFixed(2));
  const allocatedSum = rows.reduce((acc, r) => acc + r.amount, 0);
  const unallocatedRemainder = estate > 0 ? Math.max(0, Number((estate - allocatedSum).toFixed(2))) : 0;

  return {
    totalEstate: estate,
    rows,
    totalAllocatedPercentage: totalPct,
    awlApplied,
    raddApplied,
    unallocatedRemainder,
  };
}

// =============================================================================
// JSON Backup Validation
// =============================================================================

export function parseAndValidateBackup(
  rawJson: string,
  defaults: AppPersistedState
): { ok: true; state: AppPersistedState } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'Invalid backup structure: expected a JSON object.' };
    }

    const merged: AppPersistedState = {
      ...defaults,
      ...parsed,
      location: {
        ...defaults.location,
        ...(parsed.location && typeof parsed.location === 'object' ? parsed.location : {}),
      },
      qazaCounts: {
        ...defaults.qazaCounts,
        ...(parsed.qazaCounts && typeof parsed.qazaCounts === 'object' ? parsed.qazaCounts : {}),
      },
      notifications: {
        ...defaults.notifications,
        ...(parsed.notifications && typeof parsed.notifications === 'object'
          ? parsed.notifications
          : {}),
        azanWaqtAlerts: {
          ...defaults.notifications.azanWaqtAlerts,
          ...(parsed.notifications?.azanWaqtAlerts &&
          typeof parsed.notifications.azanWaqtAlerts === 'object'
            ? parsed.notifications.azanWaqtAlerts
            : {}),
        },
      },
      profile: {
        ...defaults.profile,
        ...(parsed.profile && typeof parsed.profile === 'object' ? parsed.profile : {}),
        accounts: Array.isArray(parsed.profile?.accounts)
          ? parsed.profile.accounts
          : defaults.profile.accounts,
      },
      ramadan: {
        ...defaults.ramadan,
        ...(parsed.ramadan && typeof parsed.ramadan === 'object' ? parsed.ramadan : {}),
        fastingDays: Array.isArray(parsed.ramadan?.fastingDays)
          ? parsed.ramadan.fastingDays
          : defaults.ramadan.fastingDays,
        taraweehLogs:
          parsed.ramadan?.taraweehLogs && typeof parsed.ramadan.taraweehLogs === 'object'
            ? parsed.ramadan.taraweehLogs
            : defaults.ramadan.taraweehLogs,
        lastTenNightsChecklist:
          parsed.ramadan?.lastTenNightsChecklist &&
          typeof parsed.ramadan.lastTenNightsChecklist === 'object'
            ? parsed.ramadan.lastTenNightsChecklist
            : defaults.ramadan.lastTenNightsChecklist,
        dailyTimelineChecklist:
          parsed.ramadan?.dailyTimelineChecklist &&
          typeof parsed.ramadan.dailyTimelineChecklist === 'object'
            ? parsed.ramadan.dailyTimelineChecklist
            : defaults.ramadan.dailyTimelineChecklist,
      },
      seerahCompletedIds: Array.isArray(parsed.seerahCompletedIds)
        ? parsed.seerahCompletedIds
        : defaults.seerahCompletedIds,
      prayerChecklist:
        parsed.prayerChecklist && typeof parsed.prayerChecklist === 'object'
          ? parsed.prayerChecklist
          : defaults.prayerChecklist,
      tasbihCounts:
        parsed.tasbihCounts && typeof parsed.tasbihCounts === 'object'
          ? parsed.tasbihCounts
          : defaults.tasbihCounts,
      quranBookmarks: Array.isArray(parsed.quranBookmarks) ? parsed.quranBookmarks : defaults.quranBookmarks,
      hadithBookmarks: Array.isArray(parsed.hadithBookmarks) ? parsed.hadithBookmarks : defaults.hadithBookmarks,
      customDhikrs: Array.isArray(parsed.customDhikrs) ? parsed.customDhikrs : defaults.customDhikrs,
      eventReminders: Array.isArray(parsed.eventReminders) ? parsed.eventReminders : defaults.eventReminders,
      zakatHistory: Array.isArray(parsed.zakatHistory) ? parsed.zakatHistory : defaults.zakatHistory,
    };

    if (merged.language !== 'en' && merged.language !== 'bn') {
      merged.language = defaults.language;
    }
    if (merged.theme !== 'dark' && merged.theme !== 'light') {
      merged.theme = defaults.theme;
    }

    return { ok: true, state: merged };
  } catch {
    return { ok: false, error: 'Malformed JSON file.' };
  }
}

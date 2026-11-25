import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass as CompassIcon,
  LocateFixed,
  MapPin,
  Minus,
  Navigation,
  Plus,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type {
  AppPersistedState,
  DailyPrayerTimes,
  LocationState,
  QazaCounts,
  WaqtKey,
} from '../types/islamic';
import type { AppRoute } from '../utils/routes';
import {
  calculateDistanceToKaabaKm,
  calculateQiblaBearing,
  formatDateKey,
  formatTime12h,
  getCompassCardinal,
  getNextPrayerCountdown,
  getUpcomingIslamicEvents,
  gregorianToHijri,
  HIJRI_MONTHS_BN,
  HIJRI_MONTHS_EN,
} from '../utils/calculations';
import {
  buildMonthlyOfflineSchedule,
  buildSevenDayStrip,
  hydrateCachedMonthlySchedule,
  parseAladhanCalendarResponse,
  parseRowDate,
  type MonthlyPrayerDayRow,
} from '../utils/prayerCalendar';
import {
  buildMonthlyIslamicCalendar,
  type CalendarCellMeta,
  type IslamicMarkerKind,
} from '../utils/islamicCalendar';
import {
  clampTiltOffset,
  isQiblaAligned,
  normalizeAngle,
  shortestAngleDelta,
  stepSmoothedHeading,
} from '../utils/compass';
import { EXTRA_TIME_LABELS, formatNum, t, WAQT_LABELS } from '../utils/i18n';
import { PageHeader } from './PageHeader';
import { DailyIbadahCard } from './DailyIbadahCard';
import { IOSRow, IOSSection } from './IOSSettingsPrimitives';
import { SpacedTime } from './SpacedTime';

const CITY_PRESETS: LocationState[] = [
  { lat: 23.8103, lng: 90.4125, labelEn: 'Dhaka, Bangladesh', labelBn: 'ঢাকা, বাংলাদেশ', isGps: false },
  { lat: 22.3569, lng: 91.7832, labelEn: 'Chittagong, Bangladesh', labelBn: 'চট্টগ্রাম, বাংলাদেশ', isGps: false },
  { lat: 24.8949, lng: 91.8687, labelEn: 'Sylhet, Bangladesh', labelBn: 'সিলেট, বাংলাদেশ', isGps: false },
  { lat: 21.4225, lng: 39.8262, labelEn: 'Makkah, Saudi Arabia', labelBn: 'মক্কা, সৌদি আরব', isGps: false },
  { lat: 24.4672, lng: 39.6112, labelEn: 'Madinah, Saudi Arabia', labelBn: 'মদিনা, সৌদি আরব', isGps: false },
  { lat: 51.5072, lng: -0.1276, labelEn: 'London, UK', labelBn: 'লন্ডন, যুক্তরাজ্য', isGps: false },
  { lat: 40.7128, lng: -74.006, labelEn: 'New York, USA', labelBn: 'নিউ ইয়র্ক, যুক্তরাষ্ট্র', isGps: false },
];

const WAQT_ORDER: WaqtKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const QAZA_KEYS: (keyof QazaCounts)[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'witr'];

// 1. PRAYER TIMES PAGE (#/prayer)
export const PrayerTimesPage: React.FC<{
  state: AppPersistedState;
  prayerTimes: DailyPrayerTimes;
  now: Date;
  onUpdateState: (
    updater: Partial<AppPersistedState> | ((prev: AppPersistedState) => AppPersistedState)
  ) => void;
  onNavigate: (route: AppRoute) => void;
}> = ({ state, prayerTimes, now, onUpdateState, onNavigate }) => {
  const lang = state.language;
  const todayKey = formatDateKey(now);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);
  const [viewMonth, setViewMonth] = useState<{ year: number; month: number }>({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const [apiMonthRows, setApiMonthRows] = useState<Record<string, MonthlyPrayerDayRow>>({});
  const [monthLoading, setMonthLoading] = useState(false);

  const sevenDayStrip = useMemo(
    () => buildSevenDayStrip(now, state.hijriOffset),
    [now.getFullYear(), now.getMonth(), now.getDate(), state.hijriOffset]
  );

  // Offline monthly deterministic schedule always ready immediately
  const offlineMonthRows = useMemo(
    () => buildMonthlyOfflineSchedule(viewMonth.year, viewMonth.month, state.hijriOffset),
    [viewMonth.year, viewMonth.month, state.hijriOffset]
  );

  // Also ensure strip dates falling outside viewMonth have deterministic fallback
  const stripFallbackRows = useMemo(() => {
    const cache: Record<string, MonthlyPrayerDayRow> = {};
    for (const item of sevenDayStrip) {
      const mKey = `${item.date.getFullYear()}-${item.date.getMonth()}`;
      if (!cache[mKey]) {
        Object.assign(
          cache,
          buildMonthlyOfflineSchedule(item.date.getFullYear(), item.date.getMonth(), state.hijriOffset)
        );
      }
    }
    return cache;
  }, [sevenDayStrip, state.hijriOffset]);

  // Fetch & cache Aladhan full monthly prayer calendar for current viewMonth
  useEffect(() => {
    let active = true;
    const { year, month } = viewMonth;
    const apiMonth = month + 1;
    const cacheKey = `noor_prayer_cal_${year}_${apiMonth}_${state.location.lat.toFixed(
      2
    )}_${state.location.lng.toFixed(2)}_${state.calculationMethod}_${state.asrJuristic}`;

    try {
      const cached = window.localStorage.getItem(cacheKey);
      if (cached) {
        const hydrated = hydrateCachedMonthlySchedule(JSON.parse(cached));
        if (Object.keys(hydrated).length > 0) {
          setApiMonthRows((prev) => ({ ...prev, ...hydrated }));
        }
      }
    } catch {
      // ignore storage errors
    }

    const controller = new AbortController();
    setMonthLoading(true);
    const url = `https://api.aladhan.com/v1/calendar/${year}/${apiMonth}?latitude=${state.location.lat}&longitude=${state.location.lng}&method=${state.calculationMethod}&school=${state.asrJuristic}`;

    fetch(url, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('calendar error'))))
      .then((json) => {
        if (!active || !Array.isArray(json?.data)) return;
        const parsed = parseAladhanCalendarResponse(json.data, year, month, state.hijriOffset);
        if (Object.keys(parsed).length > 0) {
          setApiMonthRows((prev) => ({ ...prev, ...parsed }));
          try {
            window.localStorage.setItem(cacheKey, JSON.stringify(parsed));
          } catch {
            // ignore quota errors
          }
        }
      })
      .catch(() => {
        // offline fallback already populated
      })
      .finally(() => {
        if (active) setMonthLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    viewMonth.year,
    viewMonth.month,
    state.location.lat,
    state.location.lng,
    state.calculationMethod,
    state.asrJuristic,
    state.hijriOffset,
  ]);

  const mergedMonthRows = useMemo(() => {
    const keys = Object.keys(offlineMonthRows).sort();
    return keys.map((k) => apiMonthRows[k] ?? offlineMonthRows[k]);
  }, [offlineMonthRows, apiMonthRows]);

  const isSelectedToday = selectedDateKey === todayKey;
  const selectedRow =
    apiMonthRows[selectedDateKey] ??
    offlineMonthRows[selectedDateKey] ??
    stripFallbackRows[selectedDateKey];

  const activeTimes: DailyPrayerTimes = isSelectedToday
    ? prayerTimes
    : selectedRow?.timings ?? prayerTimes;

  const selectedDateObj = useMemo(() => {
    if (isSelectedToday) return now;
    const [y, m, d] = selectedDateKey.split('-').map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
    return now;
  }, [isSelectedToday, selectedDateKey, now]);

  const activeHijri = gregorianToHijri(selectedDateObj, state.hijriOffset);
  const nextPrayer = getNextPrayerCountdown(activeTimes, now);

  const shiftMonth = (delta: number) => {
    setViewMonth((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const selectDateAndSyncMonth = (dateKey: string, dateObj: Date) => {
    setSelectedDateKey(dateKey);
    if (dateObj.getFullYear() !== viewMonth.year || dateObj.getMonth() !== viewMonth.month) {
      setViewMonth({ year: dateObj.getFullYear(), month: dateObj.getMonth() });
    }
  };

  const requestGpsLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus(t(lang, 'Geolocation is not supported by your browser.', 'ব্রাউজারে জিপিএস সাপোর্ট নেই।'));
      return;
    }
    setGpsStatus(t(lang, 'Detecting coordinates...', 'অবস্থান নির্ণয় করা হচ্ছে...'));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lng = Number(pos.coords.longitude.toFixed(4));
        onUpdateState({
          location: {
            lat,
            lng,
            labelEn: `GPS (${lat}, ${lng})`,
            labelBn: `জিপিএস (${lat}, ${lng})`,
            isGps: true,
          },
        });
        setGpsStatus(t(lang, 'Location updated via GPS.', 'জিপিএস অবস্থান আপডেট হয়েছে।'));
      },
      () => {
        setGpsStatus(
          t(lang, 'Location permission denied. Using selected city.', 'অনুমতি পাওয়া যায়নি। নির্বাচিত শহর ব্যবহৃত হচ্ছে।')
        );
      },
      { timeout: 8000 }
    );
  };

  const viewMonthHeading = new Date(viewMonth.year, viewMonth.month, 1).toLocaleDateString(
    lang === 'bn' ? 'bn-BD' : 'en-US',
    { month: 'long', year: 'numeric' }
  );

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <PageHeader
        lang={lang}
        title={t(lang, 'Prayer Times', 'নামাজের সময়সূচি')}
        subtitle={`${lang === 'bn' ? state.location.labelBn : state.location.labelEn} · ${activeTimes.dateLabel}`}
        onNavigate={onNavigate}
      />

      {/* Location, Asr School & Azan Settings Toolbar */}
      <div className="rounded-3xl bg-white/90 dark:bg-[#09090B] backdrop-blur-md border border-stone-200/80 dark:border-white/10 p-4 sm:p-5 space-y-4 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">
              {t(lang, 'City', 'শহর')}:
              <select
                value={
                  CITY_PRESETS.find((c) => c.labelEn === state.location.labelEn)?.labelEn ?? 'custom'
                }
                onChange={(e) => {
                  const found = CITY_PRESETS.find((c) => c.labelEn === e.target.value);
                  if (found) onUpdateState({ location: found });
                }}
                className="ml-2 bg-[#F4F1EA] dark:bg-black border border-stone-200/80 dark:border-white/15 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white"
              >
                {CITY_PRESETS.map((city) => (
                  <option key={city.labelEn} value={city.labelEn}>
                    {lang === 'bn' ? city.labelBn : city.labelEn}
                  </option>
                ))}
                {state.location.isGps && (
                  <option value="custom">{state.location.labelEn}</option>
                )}
              </select>
            </label>

            <button
              type="button"
              onClick={requestGpsLocation}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-[#F4F1EA] dark:bg-black hover:bg-stone-200/70 dark:hover:bg-white/5 text-xs font-medium text-emerald-700 dark:text-emerald-400 border border-stone-200/80 dark:border-white/15"
            >
              <LocateFixed className="w-3.5 h-3.5" aria-hidden="true" />
              {t(lang, 'Use GPS', 'জিপিএস অবস্থান')}
            </button>

            <button
              type="button"
              onClick={() => onNavigate('notifications')}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-[#F4F1EA] dark:bg-black hover:bg-stone-200/70 dark:hover:bg-white/5 text-xs font-medium text-amber-700 dark:text-amber-300 border border-emerald-500/30"
            >
              <Bell className="w-3.5 h-3.5" aria-hidden="true" />
              {t(lang, 'Azan Alarm & Alerts', 'আজান অ্যালার্ট')}
            </button>
          </div>

          <div className="flex items-center gap-1 bg-[#F4F1EA] dark:bg-black p-1 rounded-xl border border-stone-200/80 dark:border-white/10">
            <button
              type="button"
              onClick={() => onUpdateState({ asrJuristic: 1 })}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${
                state.asrJuristic === 1
                  ? 'bg-emerald-500 text-black font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {t(lang, 'Hanafi Asr', 'হানাফী আসর')}
            </button>
            <button
              type="button"
              onClick={() => onUpdateState({ asrJuristic: 0 })}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${
                state.asrJuristic === 0
                  ? 'bg-emerald-500 text-black font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {t(lang, 'Standard Asr', 'শাফী/জুমহুর')}
            </button>
          </div>
        </div>
        {gpsStatus && <p className="text-xs text-zinc-500 dark:text-zinc-400">{gpsStatus}</p>}
      </div>

      {/* Horizontal 7-Day Date Strip (Yesterday, Today, Tomorrow + Upcoming) */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
            {t(lang, 'Select Date (7-Day Quick Strip)', 'তারিখ নির্বাচন করুন (৭ দিনের সময়সূচি)')}
          </h2>
          {!isSelectedToday && (
            <button
              type="button"
              data-testid="jump-to-today-btn"
              onClick={() => selectDateAndSyncMonth(todayKey, now)}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              {t(lang, 'Back to Today', 'আজে ফিরে যান')}
            </button>
          )}
        </div>
        <div
          className="grid grid-cols-7 gap-1.5 sm:gap-2 w-full"
          data-testid="seven-day-strip"
        >
          {sevenDayStrip.map((item) => {
            const active = selectedDateKey === item.dateKey;
            const isTodayCell = item.offsetFromToday === 0;
            return (
              <button
                key={item.dateKey}
                type="button"
                data-testid={`strip-day-${item.dateKey}`}
                aria-pressed={active}
                onClick={() => selectDateAndSyncMonth(item.dateKey, item.date)}
                className={`min-w-0 rounded-2xl border px-1 py-2.5 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-[0.97] ${
                  active
                    ? 'bg-emerald-500 border-emerald-400 text-black font-semibold shadow-xs'
                    : isTodayCell
                    ? 'bg-emerald-500/12 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                    : 'bg-white/90 dark:bg-[#09090B] backdrop-blur-md border-stone-200/80 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:border-emerald-500/40'
                }`}
              >
                <span className="text-[10px] truncate max-w-full px-0.5 leading-tight">
                  {lang === 'bn' ? item.labelBn : item.labelEn}
                </span>
                <span className="text-sm sm:text-base font-bold font-mono-num leading-[1.5]">
                  {formatNum(lang, item.dayNumber)}
                </span>
                <span
                  className={`text-[9px] font-mono-num ${
                    active ? 'text-black/75' : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {formatNum(lang, item.hijriDay)} {lang === 'bn' ? 'হি.' : 'H'}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Selected Date Hero + 5-Waqt Timetable */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="noor-hero-card lg:col-span-5 rounded-3xl bg-white/90 dark:bg-[#09090B] backdrop-blur-md border border-stone-200/80 dark:border-white/10 p-6 flex flex-col justify-between gap-4 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span>
                {isSelectedToday
                  ? t(lang, 'Next Prayer', 'পরবর্তী নামাজ')
                  : t(lang, 'Selected Date Timetable', 'নির্বাচিত তারিখের সময়সূচি')}
              </span>
              <span className="font-medium text-emerald-700 dark:text-emerald-400">
                {activeTimes.source === 'aladhan'
                  ? t(lang, 'Aladhan Live', 'আলাধান লাইভ')
                  : t(lang, 'Offline Schedule', 'অফলাইন সময়সূচি')}
              </span>
            </div>

            {isSelectedToday ? (
              <>
                <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mt-1">
                  {WAQT_LABELS[nextPrayer.key][lang]}
                </h2>
                <p className="text-lg text-amber-600 dark:text-amber-400">
                  <SpacedTime value={formatTime12h(nextPrayer.time)} lang={lang} colonSize="md" />
                </p>
              </>
            ) : (
              <>
                <h2
                  data-testid="selected-date-heading"
                  className="text-2xl font-bold text-zinc-900 dark:text-white mt-1"
                >
                  {selectedDateObj.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </h2>
                <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                  {formatNum(lang, activeHijri.day)}{' '}
                  {lang === 'bn' ? activeHijri.monthNameBn : activeHijri.monthNameEn}{' '}
                  {formatNum(lang, activeHijri.year)} {t(lang, 'AH', 'হিজরি')}
                </p>
              </>
            )}
          </div>

          <div className="pt-4 border-t border-black/[0.07] dark:border-white/10">
            {isSelectedToday ? (
              <>
                <p className="text-xs text-zinc-500">{t(lang, 'Countdown', 'বাকি সময়')}</p>
                <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400 font-timer tracking-wider mt-1 leading-[1.6] pt-0.5">
                  <SpacedTime value={nextPrayer.countdownFormatted} lang={lang} colonSize="lg" />
                </p>
              </>
            ) : (
              <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                <span>
                  {t(lang, 'Sahri / Fajr', 'সাহরি / ফজর')}:{' '}
                  <strong className="text-zinc-900 dark:text-white">
                    <SpacedTime value={formatTime12h(activeTimes.sahri)} lang={lang} />
                  </strong>
                </span>
                <span>
                  {t(lang, 'Iftar / Maghrib', 'ইফতার')}:{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    <SpacedTime value={formatTime12h(activeTimes.iftar)} lang={lang} />
                  </strong>
                </span>
              </div>
            )}
          </div>
        </div>

        <div
          data-testid="active-day-waqt-list"
          className="lg:col-span-7 rounded-3xl bg-white/90 dark:bg-[#1C1C1E] backdrop-blur-md border border-stone-200/80 dark:border-white/[0.08] overflow-hidden divide-y divide-stone-200/70 dark:divide-white/10 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none"
        >
          {WAQT_ORDER.map((waqt) => {
            const isNext = isSelectedToday && nextPrayer.key === waqt;
            return (
              <div
                key={waqt}
                className={`px-5 py-4 flex items-center justify-between ${
                  isNext ? 'bg-emerald-500/10' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm sm:text-base font-medium ${
                      isNext
                        ? 'text-emerald-700 dark:text-emerald-300 font-semibold'
                        : 'text-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    {WAQT_LABELS[waqt][lang]}
                  </span>
                  {isNext && (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      · {t(lang, 'Up Next', 'আসন্ন')}
                    </span>
                  )}
                </div>
                <span
                  data-testid={`waqt-time-${waqt}`}
                  className="text-base text-zinc-900 dark:text-white font-semibold"
                >
                  <SpacedTime value={formatTime12h(activeTimes[waqt])} lang={lang} />
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Extra Timings (Sahri, Sunrise, Ishraq, Iftar, Tahajjud) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(
          [
            { key: 'sahri', time: activeTimes.sahri },
            { key: 'sunrise', time: activeTimes.sunrise },
            { key: 'ishraq', time: activeTimes.ishraq },
            { key: 'iftar', time: activeTimes.iftar },
            { key: 'tahajjud', time: activeTimes.tahajjud },
          ] as const
        ).map((item) => (
          <div
            key={item.key}
            className="rounded-2xl bg-white/90 dark:bg-[#09090B] backdrop-blur-md border border-stone-200/80 dark:border-white/10 p-4 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none"
          >
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{EXTRA_TIME_LABELS[item.key][lang]}</p>
            <p className="text-lg font-semibold text-amber-700 dark:text-amber-300 mt-1">
              <SpacedTime value={formatTime12h(item.time)} lang={lang} />
            </p>
          </div>
        ))}
      </div>

      {/* Full Monthly Prayer Timetable Table */}
      <section
        data-testid="monthly-prayer-table"
        className="rounded-3xl bg-white/90 dark:bg-[#09090B] backdrop-blur-md border border-stone-200/80 dark:border-white/10 p-4 sm:p-6 space-y-4 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white inline-flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              {t(lang, 'Full Monthly Prayer Timetable', 'সম্পূর্ণ মাসিক নামাজের সময়সূচি')}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {viewMonthHeading}
              {monthLoading ? ` · ${t(lang, 'Updating...', 'আপডেট হচ্ছে...')}` : ''} ·{' '}
              {t(lang, 'Tap any date row to preview full timetable above', 'যেকোনো তারিখে ট্যাপ করে বিস্তারিত সময় দেখুন')}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label={t(lang, 'Previous Month', 'পূর্ববর্তী মাস')}
              className="w-9 h-9 rounded-xl bg-[#F4F1EA] dark:bg-white/5 hover:bg-stone-200/70 dark:hover:bg-white/10 flex items-center justify-center text-zinc-700 dark:text-zinc-200"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMonth({ year: now.getFullYear(), month: now.getMonth() })}
              className="px-3 h-9 rounded-xl bg-[#F4F1EA] dark:bg-white/5 hover:bg-stone-200/70 dark:hover:bg-white/10 text-xs font-medium text-zinc-700 dark:text-zinc-200"
            >
              {t(lang, 'This Month', 'চলতি মাস')}
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label={t(lang, 'Next Month', 'পরবর্তী মাস')}
              className="w-9 h-9 rounded-xl bg-[#F4F1EA] dark:bg-white/5 hover:bg-stone-200/70 dark:hover:bg-white/10 flex items-center justify-center text-zinc-700 dark:text-zinc-200"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="w-full overflow-x-auto rounded-2xl border border-stone-200/80 dark:border-white/[0.08]">
          <table className="w-full min-w-[560px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F7F4EC] dark:bg-[#1C1C1E] text-zinc-600 dark:text-zinc-400 border-b border-stone-200/80 dark:border-white/[0.08]">
                <th className="py-2.5 px-3 font-semibold">{t(lang, 'Date', 'তারিখ')}</th>
                <th className="py-2.5 px-2.5 font-semibold">{t(lang, 'Sahri', 'সাহরি')}</th>
                <th className="py-2.5 px-2.5 font-semibold">{WAQT_LABELS.fajr[lang]}</th>
                <th className="py-2.5 px-2.5 font-semibold">{WAQT_LABELS.dhuhr[lang]}</th>
                <th className="py-2.5 px-2.5 font-semibold">{WAQT_LABELS.asr[lang]}</th>
                <th className="py-2.5 px-2.5 font-semibold">{t(lang, 'Maghrib / Iftar', 'ইফতার')}</th>
                <th className="py-2.5 px-3 font-semibold">{WAQT_LABELS.isha[lang]}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
              {mergedMonthRows.map((row) => {
                const isSelected = row.dateKey === selectedDateKey;
                const isTodayRow = row.dateKey === todayKey;
                const rowDate =
                  row.date instanceof Date && !Number.isNaN(row.date.getTime())
                    ? row.date
                    : parseRowDate(row.dateKey, row.date);
                return (
                  <tr
                    key={row.dateKey}
                    data-testid={`month-row-${row.dateKey}`}
                    onClick={() => selectDateAndSyncMonth(row.dateKey, rowDate)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-500/15 font-semibold'
                        : isTodayRow
                        ? 'bg-amber-500/10'
                        : 'hover:bg-black/[0.025] dark:hover:bg-white/[0.03]'
                    }`}
                  >
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-mono-num text-zinc-900 dark:text-white">
                        {formatNum(lang, row.dayNumber)}{' '}
                        {rowDate.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { month: 'short' })}
                      </span>
                      <span className="block text-[10px] text-zinc-500 font-normal">
                        {lang === 'bn' ? row.hijriLabelBn : row.hijriLabelEn}
                      </span>
                    </td>
                    <td className="py-2.5 px-2.5 text-amber-700 dark:text-amber-300 whitespace-nowrap">
                      <SpacedTime value={formatTime12h(row.timings.sahri)} lang={lang} />
                    </td>
                    <td className="py-2.5 px-2.5 text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                      <SpacedTime value={formatTime12h(row.timings.fajr)} lang={lang} />
                    </td>
                    <td className="py-2.5 px-2.5 text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                      <SpacedTime value={formatTime12h(row.timings.dhuhr)} lang={lang} />
                    </td>
                    <td className="py-2.5 px-2.5 text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                      <SpacedTime value={formatTime12h(row.timings.asr)} lang={lang} />
                    </td>
                    <td className="py-2.5 px-2.5 text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      <SpacedTime value={formatTime12h(row.timings.maghrib)} lang={lang} />
                    </td>
                    <td className="py-2.5 px-3 text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                      <SpacedTime value={formatTime12h(row.timings.isha)} lang={lang} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

// 2. NATIVE APPLE IPHONE QIBLA COMPASS PAGE (#/qibla)
const DIAL_TICKS = Array.from({ length: 180 }, (_, idx) => idx * 2); // every 2 degrees (360° precision)
const DEGREE_LABELS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

export const QiblaPage: React.FC<{
  state: AppPersistedState;
  onNavigate: (route: AppRoute) => void;
}> = ({ state, onNavigate }) => {
  const lang = state.language;
  const [sensorActive, setSensorActive] = useState(false);
  const [sensorError, setSensorError] = useState<string | null>(null);
  const [tilt, setTilt] = useState<{ beta: number; gamma: number }>({ beta: 0, gamma: 0 });

  // Target vs smoothed heading for 60fps requestAnimationFrame dial interpolation
  const targetHeadingRef = useRef<number>(0);
  const smoothedHeadingRef = useRef<number>(0);
  const [displayHeading, setDisplayHeading] = useState<number>(0);
  const [manualInputHeading, setManualInputHeading] = useState<number>(0);

  // Pointer drag rotation tracking
  const dialRef = useRef<SVGSVGElement | null>(null);
  const dragStateRef = useRef<{ active: boolean; lastAngle: number }>({ active: false, lastAngle: 0 });
  const prevAlignedRef = useRef<boolean>(false);

  const qiblaBearing = useMemo(
    () => calculateQiblaBearing(state.location.lat, state.location.lng),
    [state.location.lat, state.location.lng]
  );
  const distanceKm = useMemo(
    () => calculateDistanceToKaabaKm(state.location.lat, state.location.lng),
    [state.location.lat, state.location.lng]
  );

  // 60fps requestAnimationFrame shortest-angle smoothing loop
  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      const curr = smoothedHeadingRef.current;
      const target = targetHeadingRef.current;
      const next = stepSmoothedHeading(curr, target, 0.24);
      if (Math.abs(shortestAngleDelta(curr, next)) >= 0.02) {
        smoothedHeadingRef.current = next;
        setDisplayHeading(next);
      } else if (curr !== target) {
        smoothedHeadingRef.current = target;
        setDisplayHeading(target);
      }
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  // Device orientation listener (iOS webkitCompassHeading + Android alpha + tilt beta/gamma)
  useEffect(() => {
    if (!sensorActive) return;

    const handleOrientation = (ev: DeviceOrientationEvent) => {
      const anyEv = ev as DeviceOrientationEvent & { webkitCompassHeading?: number };
      if (typeof anyEv.webkitCompassHeading === 'number') {
        targetHeadingRef.current = normalizeAngle(anyEv.webkitCompassHeading);
      } else if (typeof ev.alpha === 'number') {
        targetHeadingRef.current = normalizeAngle(360 - ev.alpha);
      }
      if (typeof ev.beta === 'number' && typeof ev.gamma === 'number') {
        setTilt({ beta: ev.beta, gamma: ev.gamma });
      }
    };

    window.addEventListener('deviceorientationabsolute', handleOrientation as EventListener);
    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation as EventListener);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [sensorActive]);

  const roundedHeading = Math.round(normalizeAngle(displayHeading)) % 360;
  const aligned = isQiblaAligned(displayHeading, qiblaBearing, 2);
  const deltaFromQibla = shortestAngleDelta(displayHeading, qiblaBearing);
  const tiltOffset = clampTiltOffset(tilt.beta, tilt.gamma, 13);

  // Haptic pulse once when entering the ±2° Qibla lock-in zone
  useEffect(() => {
    if (aligned && !prevAlignedRef.current) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(35);
      }
    }
    prevAlignedRef.current = aligned;
  }, [aligned]);

  const enableCompassSensor = async () => {
    setSensorError(null);
    const devOrient = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (devOrient && typeof devOrient.requestPermission === 'function') {
      try {
        const permission = await devOrient.requestPermission();
        if (permission !== 'granted') {
          setSensorError(
            t(
              lang,
              'Compass permission denied. Rotate the dial or use the manual slider below.',
              'কম্পাস অনুমতি পাওয়া যায়নি। ডায়াল ঘোরান অথবা নিচের স্লাইডার ব্যবহার করুন।'
            )
          );
          return;
        }
      } catch {
        setSensorError(
          t(lang, 'Orientation sensor unavailable on this browser.', 'এই ব্রাউজারে সেন্সর সাপোর্ট করছে না।')
        );
        return;
      }
    }
    setSensorActive(true);
  };

  const setManualHeadingImmediate = (deg: number) => {
    const normalized = normalizeAngle(deg);
    setSensorActive(false);
    targetHeadingRef.current = normalized;
    setManualInputHeading(Math.round(normalized));
  };

  // Interactive Touch/Mouse Dial Dragging
  const getPointerAngle = (clientX: number, clientY: number) => {
    const el = dialRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      active: true,
      lastAngle: getPointerAngle(e.clientX, e.clientY),
    };
    setSensorActive(false);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragStateRef.current.active) return;
    const nextAngle = getPointerAngle(e.clientX, e.clientY);
    const diff = shortestAngleDelta(dragStateRef.current.lastAngle, nextAngle);
    dragStateRef.current.lastAngle = nextAngle;
    const updated = normalizeAngle(targetHeadingRef.current - diff);
    targetHeadingRef.current = updated;
    setManualInputHeading(Math.round(updated));
  };

  const handlePointerUp = () => {
    dragStateRef.current.active = false;
  };

  const formattedLat = `${Math.abs(state.location.lat).toFixed(4)}° ${state.location.lat >= 0 ? 'N' : 'S'}`;
  const formattedLng = `${Math.abs(state.location.lng).toFixed(4)}° ${state.location.lng >= 0 ? 'E' : 'W'}`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        lang={lang}
        title={t(lang, 'Qibla Compass', 'কিবলা কম্পাস')}
        subtitle={lang === 'bn' ? state.location.labelBn : state.location.labelEn}
        onNavigate={onNavigate}
      />

      {/* Native Apple iPhone Compass Canvas */}
      <section className="rounded-3xl bg-white/90 dark:bg-[#09090B] backdrop-blur-md border border-stone-200/80 dark:border-white/10 p-5 sm:p-8 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none flex flex-col items-center space-y-6">
        {/* Top Live Status Pill-free Clean Readout */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <span
              data-testid="qibla-alignment-status"
              className={`text-xs font-semibold tracking-wide transition-colors ${
                aligned
                  ? 'text-[#1E8E3E] dark:text-[#34C759]'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              {aligned
                ? t(lang, 'Aligned with Qibla', 'কিবলা সঠিক দিকে আছে')
                : t(
                    lang,
                    `${deltaFromQibla > 0 ? 'Turn Right' : 'Turn Left'} ${formatNum(lang, Math.round(Math.abs(deltaFromQibla)))}° toward Kaaba`,
                    `কাবার দিকে ${deltaFromQibla > 0 ? 'ডানে' : 'বামে'} ${formatNum(lang, Math.round(Math.abs(deltaFromQibla)))}° ঘুরুন`
                  )}
            </span>
          </div>

          <div
            data-testid="compass-heading-readout"
            className="text-5xl sm:text-6xl font-light tracking-tight text-zinc-900 dark:text-white font-tabular"
          >
            {formatNum(lang, roundedHeading)}°{' '}
            <span className="font-normal text-zinc-500 dark:text-zinc-400">
              {getCompassCardinal(roundedHeading)}
            </span>
          </div>
        </div>

        {/* High-DPI Interactive Apple Compass SVG Dial */}
        <div className="relative w-[290px] h-[290px] sm:w-[336px] sm:h-[336px] select-none touch-none flex items-center justify-center">
          <svg
            ref={dialRef}
            viewBox="0 0 320 320"
            data-testid="apple-qibla-dial"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            role="img"
            aria-label={`Apple-style Qibla compass, heading ${roundedHeading} degrees, Qibla at ${qiblaBearing} degrees`}
            className="w-full h-full cursor-grab active:cursor-grabbing"
          >
            <defs>
              <radialGradient id="qiblaLockGlow" cx="50%" cy="15%" r="60%">
                <stop offset="0%" stopColor="#34C759" stopOpacity={aligned ? '0.32' : '0'} />
                <stop offset="100%" stopColor="#34C759" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="kaabaGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDE68A" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
            </defs>

            {/* Dial Base */}
            <circle
              cx="160"
              cy="160"
              r="152"
              className="fill-[#F9F9FB] dark:fill-[#000000] stroke-black/[0.08] dark:stroke-white/[0.12]"
              strokeWidth="1.5"
            />

            {/* Alignment Cone at 12 o'clock when within ±2° */}
            <path
              d="M160 160 L134 22 A140 140 0 0 1 186 22 Z"
              fill="url(#qiblaLockGlow)"
              className="transition-opacity duration-200"
            />

            {/* Fixed Top 12 o'clock Lubber Line */}
            <line
              x1="160"
              y1="4"
              x2="160"
              y2="34"
              stroke={aligned ? '#34C759' : undefined}
              className={aligned ? '' : 'stroke-zinc-900 dark:stroke-white'}
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Rotating 360° Dial Group */}
            <g transform={`rotate(${-displayHeading} 160 160)`}>
              {/* 360° Tick Marks (every 2 degrees) */}
              {DIAL_TICKS.map((deg) => {
                const isMajor = deg % 30 === 0;
                const isMid = !isMajor && deg % 10 === 0;
                const y1 = 22;
                const y2 = isMajor ? 36 : isMid ? 31 : 27;
                return (
                  <line
                    key={deg}
                    x1="160"
                    y1={y1}
                    x2="160"
                    y2={y2}
                    transform={`rotate(${deg} 160 160)`}
                    stroke={deg === 0 ? '#FF3B30' : undefined}
                    className={
                      deg === 0
                        ? ''
                        : isMajor
                        ? 'stroke-zinc-800 dark:stroke-white'
                        : isMid
                        ? 'stroke-zinc-500 dark:stroke-zinc-400'
                        : 'stroke-zinc-300 dark:stroke-zinc-700'
                    }
                    strokeWidth={isMajor ? '2' : isMid ? '1.3' : '0.9'}
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Vibrant Red True North Triangle at 0° */}
              <polygon points="160,10 154,21 166,21" fill="#FF3B30" />

              {/* Outer Degree Labels (0, 30, 60...) — stay upright at any dial rotation */}
              {DEGREE_LABELS.map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const lx = 160 + 109 * Math.sin(rad);
                const ly = 160 - 109 * Math.cos(rad);
                return (
                  <text
                    key={`lbl-${deg}`}
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="central"
                    transform={`rotate(${displayHeading} ${lx} ${ly})`}
                    fontSize="10.5"
                    fontWeight={deg === 0 ? '700' : '500'}
                    fill={deg === 0 ? '#FF3B30' : undefined}
                    className={deg === 0 ? '' : 'fill-zinc-500 dark:fill-zinc-400 font-tabular'}
                  >
                    {deg}
                  </text>
                );
              })}

              {/* Cardinal Letters (N, E, S, W) — stay upright at any dial rotation */}
              {(
                [
                  { label: 'N', deg: 0, isNorth: true },
                  { label: 'E', deg: 90, isNorth: false },
                  { label: 'S', deg: 180, isNorth: false },
                  { label: 'W', deg: 270, isNorth: false },
                ] as const
              ).map((c) => {
                const rad = (c.deg * Math.PI) / 180;
                const cxPos = 160 + 84 * Math.sin(rad);
                const cyPos = 160 - 84 * Math.cos(rad);
                return (
                  <text
                    key={c.label}
                    x={cxPos}
                    y={cyPos}
                    textAnchor="middle"
                    dominantBaseline="central"
                    transform={`rotate(${displayHeading} ${cxPos} ${cyPos})`}
                    fontSize={c.isNorth ? '17' : '15'}
                    fontWeight={c.isNorth ? '700' : '600'}
                    fill={c.isNorth ? '#FF3B30' : undefined}
                    className={c.isNorth ? '' : 'fill-zinc-800 dark:fill-zinc-200'}
                  >
                    {c.label}
                  </text>
                );
              })}

              {/* Qibla Bearing Vector & Glowing Kaaba Badge pinned at qiblaBearing */}
              <g transform={`rotate(${qiblaBearing} 160 160)`}>
                {/* Directional Qibla Ray */}
                <line
                  x1="160"
                  y1="126"
                  x2="160"
                  y2="34"
                  stroke={aligned ? '#34C759' : '#10B981'}
                  strokeWidth={aligned ? '3' : '2.2'}
                  strokeDasharray={aligned ? undefined : '4 4'}
                  strokeLinecap="round"
                />

                {/* Arrowhead near bezel */}
                <polygon
                  points="160,24 154,36 166,36"
                  fill={aligned ? '#34C759' : '#F59E0B'}
                />

                {/* Kaaba Emblem Badge seated cleanly between center rings & cardinal ring */}
                <g transform={`translate(160, 102) rotate(${displayHeading - qiblaBearing})`}>
                  <circle
                    cx="0"
                    cy="0"
                    r="13.5"
                    fill={aligned ? '#34C759' : '#18181B'}
                    stroke={aligned ? '#FFFFFF' : 'url(#kaabaGoldGrad)'}
                    strokeWidth="2"
                  />
                  {/* Miniature Kaaba Glyph */}
                  <rect
                    x="-5.5"
                    y="-5.5"
                    width="11"
                    height="11"
                    rx="1.5"
                    fill="#09090B"
                    stroke="#FDE68A"
                    strokeWidth="1.1"
                  />
                  <line x1="-5.5" y1="-1.8" x2="5.5" y2="-1.8" stroke="#F59E0B" strokeWidth="1.7" />
                </g>
              </g>
            </g>

            {/* Center Concentric Level Rings & Crosshair (+) */}
            <circle
              cx="160"
              cy="160"
              r="34"
              fill="none"
              className="stroke-black/[0.1] dark:stroke-white/[0.14]"
              strokeWidth="1"
            />
            <circle
              cx="160"
              cy="160"
              r="18"
              fill="none"
              stroke={aligned ? '#34C759' : undefined}
              className={aligned ? '' : 'stroke-black/[0.14] dark:stroke-white/[0.2]'}
              strokeWidth="1"
            />
            <line
              x1="149"
              y1="160"
              x2="171"
              y2="160"
              className="stroke-zinc-400 dark:stroke-zinc-500"
              strokeWidth="1"
            />
            <line
              x1="160"
              y1="149"
              x2="160"
              y2="171"
              className="stroke-zinc-400 dark:stroke-zinc-500"
              strokeWidth="1"
            />

            {/* Live Tilt Level Bubble */}
            <circle
              cx={160 + tiltOffset.x}
              cy={160 + tiltOffset.y}
              r="5.5"
              fill={
                aligned
                  ? '#34C759'
                  : tiltOffset.levelOk
                  ? '#10B981'
                  : 'rgba(161, 161, 170, 0.7)'
              }
              className="transition-colors duration-150"
            />
          </svg>
        </div>

        {/* Sensor & Quick Align Controls */}
        <div className="w-full max-w-md space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={enableCompassSensor}
              data-testid="enable-compass-sensor-btn"
              className={`px-4 py-2.5 min-h-[44px] rounded-2xl text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
                sensorActive
                  ? 'bg-[#34C759]/20 text-emerald-700 dark:text-[#34C759] border border-[#34C759]/45'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black'
              }`}
            >
              <Navigation className="w-4 h-4" />
              {sensorActive
                ? t(lang, 'Live Compass Sensor Active', 'লাইভ কম্পাস সেন্সর সক্রিয়')
                : t(lang, 'Enable Live Sensor', 'লাইভ সেন্সর চালু করুন')}
            </button>

            <button
              type="button"
              onClick={() => setManualHeadingImmediate(qiblaBearing)}
              data-testid="snap-qibla-btn"
              className="px-4 py-2.5 min-h-[44px] rounded-2xl bg-[#F4F1EA] dark:bg-[#1C1C1E] border border-stone-200/80 dark:border-white/10 hover:border-emerald-500/45 text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5"
            >
              <CompassIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              {t(lang, 'Preview Qibla Alignment', 'সঠিক কিবলা দেখুন')}
            </button>
          </div>

          {sensorError && (
            <p className="text-xs text-center text-amber-600 dark:text-amber-400">{sensorError}</p>
          )}

          {/* Smooth Manual Heading Slider Fallback */}
          <div className="rounded-2xl bg-[#F7F4EC] dark:bg-[#1C1C1E] border border-stone-200/80 dark:border-white/[0.08] p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
              <label htmlFor="manual-compass-slider">
                {t(lang, 'Drag Dial or Rotate Heading', 'ডায়াল ঘোরান অথবা কোণ পরিবর্তন করুন')}
              </label>
              <span className="font-mono-num font-semibold text-zinc-900 dark:text-zinc-200">
                {formatNum(lang, sensorActive ? roundedHeading : manualInputHeading)}°
              </span>
            </div>
            <input
              id="manual-compass-slider"
              data-testid="manual-compass-slider"
              type="range"
              min={0}
              max={359}
              value={sensorActive ? roundedHeading : manualInputHeading}
              onChange={(e) => setManualHeadingImmediate(Number(e.target.value))}
              className="w-full accent-[#34C759]"
            />
          </div>
        </div>
      </section>

      {/* Apple Compass Style Telemetry Section */}
      <IOSSection
        title={t(lang, 'Compass Telemetry', 'কিবলা ও অবস্থান তথ্য')}
        footer={t(
          lang,
          'Hold your device flat so the level bubble stays centered, then turn until the Kaaba badge locks at 12 o’clock.',
          'ফোনটি সমতলে রেখে ঘোরান; কাবার চিহ্নটি উপরের ১২টার দাগে এলে সবুজ আলো জ্বলে কিবলা নিশ্চিত করবে।'
        )}
      >
        <IOSRow
          icon={<CompassIcon className="w-4 h-4" />}
          iconBg="bg-[#34C759]"
          title={t(lang, 'Qibla Direction', 'কিবলার দিক')}
          value={`${formatNum(lang, qiblaBearing)}° ${getCompassCardinal(qiblaBearing)}`}
        />
        <IOSRow
          icon={<Navigation className="w-4 h-4" />}
          iconBg="bg-amber-500"
          title={t(lang, 'Distance to Holy Kaaba', 'কাবা শরীফ থেকে দূরত্ব')}
          value={`${formatNum(lang, distanceKm.toLocaleString())} km`}
        />
        <IOSRow
          icon={<MapPin className="w-4 h-4" />}
          iconBg="bg-[#007AFF]"
          title={lang === 'bn' ? state.location.labelBn : state.location.labelEn}
          value={`${formattedLat}, ${formattedLng}`}
        />
      </IOSSection>
    </div>
  );
};

// 3. PRAYER & QAZA TRACKER PAGE (#/tracker)
export const TrackerPage: React.FC<{
  state: AppPersistedState;
  prayerTimes: DailyPrayerTimes;
  now: Date;
  onToggleWaqt: (dateKey: string, waqt: WaqtKey) => void;
  onUpdateState: (
    updater: Partial<AppPersistedState> | ((prev: AppPersistedState) => AppPersistedState)
  ) => void;
  onNavigate: (route: AppRoute) => void;
}> = ({ state, prayerTimes, now, onToggleWaqt, onUpdateState, onNavigate }) => {
  const lang = state.language;
  const dateKey = formatDateKey(now);
  const todayChecklist = state.prayerChecklist[dateKey] ?? {
    fajr: false,
    dhuhr: false,
    asr: false,
    maghrib: false,
    isha: false,
  };

  const updateQaza = (key: keyof QazaCounts, delta: number) => {
    onUpdateState((prev) => ({
      ...prev,
      qazaCounts: {
        ...prev.qazaCounts,
        [key]: Math.max(0, prev.qazaCounts[key] + delta),
      },
    }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        lang={lang}
        title={t(lang, 'Prayer & Qaza Tracker', 'নামাজ ও কাজা ট্র্যাকার')}
        subtitle={t(
          lang,
          'Track your daily 5 prayers and manage owed Qaza prayers offline.',
          'দৈনিক ৫ ওয়াক্ত নামাজ এবং বকেয়া কাজা নামাজ হিসাব রাখুন।'
        )}
        onNavigate={onNavigate}
      />

      <DailyIbadahCard state={state} now={now} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 rounded-3xl bg-white/90 dark:bg-[#1C1C1E] backdrop-blur-md border border-stone-200/80 dark:border-white/[0.08] p-6 space-y-4 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              {t(lang, 'Daily 5-Waqt Tracker', 'দৈনিক ৫ ওয়াক্ত নামাজ চেকলিস্ট')}
            </h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono-num">{dateKey}</span>
          </div>

          <div className="divide-y divide-stone-200/70 dark:divide-white/10">
            {WAQT_ORDER.map((waqt) => {
              const done = todayChecklist[waqt];
              return (
                <button
                  key={waqt}
                  type="button"
                  onClick={() => onToggleWaqt(dateKey, waqt)}
                  aria-pressed={done}
                  className="w-full py-3.5 flex items-center justify-between text-left min-h-[52px]"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">{WAQT_LABELS[waqt][lang]}</p>
                    <p className="text-xs text-zinc-500">
                      <SpacedTime value={formatTime12h(prayerTimes[waqt])} lang={lang} />
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 ${
                      done
                        ? 'bg-[#34C759] text-black font-semibold'
                        : 'bg-[#F4F1EA] dark:bg-black text-zinc-600 dark:text-zinc-400 border border-stone-200/80 dark:border-white/10'
                    }`}
                  >
                    {done && <Check className="w-3.5 h-3.5" />}
                    {done ? t(lang, 'Prayed', 'আদায় হয়েছে') : t(lang, 'Mark Done', 'চিহ্নিত করুন')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-6 rounded-3xl bg-white/90 dark:bg-[#1C1C1E] backdrop-blur-md border border-stone-200/80 dark:border-white/[0.08] p-6 space-y-4 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                {t(lang, 'Qaza Prayer Counter', 'কাজা নামাজ হিসাব')}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {t(
                  lang,
                  'Track missed prayers and decrement as you make them up.',
                  'বকেয়া কাজা নামাজ যোগ করুন এবং আদায় হলে কমিয়ে নিন।'
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateState({
                  qazaCounts: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, witr: 0 },
                })
              }
              aria-label="Reset Qaza counts"
              className="p-2.5 rounded-xl bg-[#F4F1EA] dark:bg-white/5 hover:bg-stone-200/70 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="divide-y divide-stone-200/70 dark:divide-white/10">
            {QAZA_KEYS.map((key) => {
              const label = key === 'witr' ? t(lang, 'Witr', 'বিতর') : WAQT_LABELS[key][lang];
              const count = state.qazaCounts[key];
              return (
                <div key={key} className="py-3 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{label}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Decrement ${label} Qaza`}
                      onClick={() => updateQaza(key, -1)}
                      className="w-10 h-10 rounded-xl bg-[#F4F1EA] dark:bg-white/5 hover:bg-stone-200/70 dark:hover:bg-white/10 flex items-center justify-center text-zinc-700 dark:text-zinc-200"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span
                      className="w-12 text-center font-mono-num text-base font-semibold text-amber-700 dark:text-amber-300"
                      data-testid={`qaza-count-${key}`}
                    >
                      {formatNum(lang, count)}
                    </span>
                    <button
                      type="button"
                      aria-label={`Increment ${label} Qaza`}
                      onClick={() => updateQaza(key, 1)}
                      className="w-10 h-10 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-emerald-300"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateQaza(key, 5)}
                      className="px-2.5 h-10 rounded-xl bg-[#F4F1EA] dark:bg-white/5 hover:bg-stone-200/70 dark:hover:bg-white/10 text-xs font-mono-num text-zinc-700 dark:text-zinc-300"
                    >
                      +5
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// 4. HIJRI CALENDAR & EVENTS PAGE (#/calendar)
type CalendarCategoryFilter = 'all' | 'fasting' | 'eid_major' | 'sunnah';

function getMarkerDotClass(kind: IslamicMarkerKind): string {
  switch (kind) {
    case 'eid':
      return 'bg-amber-400';
    case 'ramadan':
    case 'qadr':
      return 'bg-emerald-500';
    case 'major_fast':
      return 'bg-rose-500';
    case 'white_day':
      return 'bg-amber-500';
    case 'sunnah_fast':
      return 'bg-sky-500';
    case 'jumuah':
      return 'bg-emerald-400';
  }
}

function cellMatchesFilter(cell: CalendarCellMeta, filter: CalendarCategoryFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'fasting') {
    return cell.markers.some((m) =>
      ['ramadan', 'major_fast', 'white_day', 'sunnah_fast'].includes(m.kind)
    );
  }
  if (filter === 'eid_major') {
    return cell.markers.some((m) => ['eid', 'ramadan', 'qadr', 'major_fast'].includes(m.kind));
  }
  if (filter === 'sunnah') {
    return cell.markers.some((m) => ['white_day', 'sunnah_fast', 'jumuah'].includes(m.kind));
  }
  return true;
}

export const CalendarPage: React.FC<{
  state: AppPersistedState;
  now: Date;
  onUpdateState: (
    updater: Partial<AppPersistedState> | ((prev: AppPersistedState) => AppPersistedState)
  ) => void;
  onNavigate: (route: AppRoute) => void;
}> = ({ state, now, onUpdateState, onNavigate }) => {
  const lang = state.language;
  const hijriToday = gregorianToHijri(now, state.hijriOffset);
  const upcomingEvents = useMemo(
    () => getUpcomingIslamicEvents(now, state.hijriOffset),
    [now, state.hijriOffset]
  );

  const [viewMonth, setViewMonth] = useState<{ year: number; month: number }>({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const [selectedDayNum, setSelectedDayNum] = useState<number>(now.getDate());
  const [categoryFilter, setCategoryFilter] = useState<CalendarCategoryFilter>('all');

  const monthlyGrid = useMemo(
    () => buildMonthlyIslamicCalendar(viewMonth.year, viewMonth.month, state.hijriOffset, now),
    [viewMonth.year, viewMonth.month, state.hijriOffset, now]
  );

  const selectedCell: CalendarCellMeta =
    monthlyGrid.cells.find((c) => c.gregorianDay === selectedDayNum) ?? monthlyGrid.cells[0];

  const shiftMonth = (delta: number) => {
    setViewMonth((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
    setSelectedDayNum(1);
  };

  const viewMonthDate = new Date(viewMonth.year, viewMonth.month, 1);
  const viewMonthHijriStart = gregorianToHijri(viewMonthDate, state.hijriOffset);
  const viewMonthHijriEnd = gregorianToHijri(
    new Date(viewMonth.year, viewMonth.month + 1, 0),
    state.hijriOffset
  );

  const toggleReminder = (reminderKey: string) => {
    onUpdateState((prev) => {
      const exists = prev.eventReminders.includes(reminderKey);
      return {
        ...prev,
        eventReminders: exists
          ? prev.eventReminders.filter((id) => id !== reminderKey)
          : [...prev.eventReminders, reminderKey],
      };
    });
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <PageHeader
        lang={lang}
        title={t(lang, 'Hijri Calendar & Islamic Events', 'হিজরি ক্যালেন্ডার ও ইসলামিক দিবস')}
        subtitle={t(
          lang,
          'Interactive Hijri + Gregorian grid with Eid, Ramadan, Ashura, Arafah, Ayyam al-Beed, and Sunnah fasting insights.',
          'ঈদ, রমজান, লাইলাতুল কদর, আশুরা, আরাফা, আইয়্যামে বীজ ও সুন্নাহ রোজার বিস্তারিত হিজরি-গ্রেগরিয়ান ক্যালেন্ডার।'
        )}
        onNavigate={onNavigate}
      />

      {/* Hijri Today + Moon Sighting Offset */}
      <div className="rounded-3xl bg-white/90 dark:bg-[#1C1C1E] backdrop-blur-md border border-stone-200/80 dark:border-white/[0.08] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t(lang, 'Adjusted Hijri Date', 'সমন্বিত হিজরি তারিখ')}
          </p>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
            {formatNum(lang, hijriToday.day)}{' '}
            {lang === 'bn' ? hijriToday.monthNameBn : hijriToday.monthNameEn}{' '}
            {formatNum(lang, hijriToday.year)} {t(lang, 'AH', 'হিজরি')}
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            {now.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <div className="space-y-1.5">
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
            {t(lang, 'Moon-Sighting Adjustment (Days)', 'চাঁদ দেখার তারিখ সমন্বয় (দিন)')}
          </span>
          <div className="flex items-center gap-1 bg-[#F4F1EA] dark:bg-black p-1 rounded-xl border border-stone-200/80 dark:border-white/10">
            {[-2, -1, 0, 1, 2].map((offset) => (
              <button
                key={offset}
                type="button"
                onClick={() => onUpdateState({ hijriOffset: offset })}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono-num min-w-[40px] ${
                  state.hijriOffset === offset
                    ? 'bg-emerald-500 text-black font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {offset > 0 ? `+${offset}` : offset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/90 dark:bg-[#09090B] backdrop-blur-md border border-stone-200/80 dark:border-white/10 overflow-x-auto shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
        {(
          [
            { id: 'all', en: 'All Days', bn: 'সকল দিবস' },
            { id: 'fasting', en: 'Fasting Days', bn: 'নফল ও ফরজ রোজা' },
            { id: 'eid_major', en: 'Eid & Major Nights', bn: 'ঈদ ও মহিমান্বিত রাত' },
            { id: 'sunnah', en: 'Sunnah & Jumu’ah', bn: 'সুন্নাহ ও জুমআ' },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            type="button"
            data-testid={`cal-filter-${f.id}`}
            onClick={() => setCategoryFilter(f.id)}
            className={`px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition-colors ${
              categoryFilter === f.id
                ? 'bg-emerald-500 text-black font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            {lang === 'bn' ? f.bn : f.en}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Monthly Hijri + Gregorian Grid */}
        <div className="lg:col-span-7 rounded-3xl bg-white/90 dark:bg-[#1C1C1E] backdrop-blur-md border border-stone-200/80 dark:border-white/[0.08] p-4 sm:p-5 space-y-4 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                {viewMonthDate.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                {lang === 'bn'
                  ? `${HIJRI_MONTHS_BN[viewMonthHijriStart.month - 1]} – ${HIJRI_MONTHS_BN[viewMonthHijriEnd.month - 1]} ${formatNum(lang, viewMonthHijriEnd.year)}`
                  : `${HIJRI_MONTHS_EN[viewMonthHijriStart.month - 1]} – ${HIJRI_MONTHS_EN[viewMonthHijriEnd.month - 1]} ${viewMonthHijriEnd.year} AH`}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                data-testid="cal-prev-month"
                aria-label={t(lang, 'Previous Month', 'পূর্ববর্তী মাস')}
                onClick={() => shiftMonth(-1)}
                className="w-9 h-9 rounded-xl bg-[#F4F1EA] dark:bg-black hover:bg-stone-200/70 dark:hover:bg-white/10 flex items-center justify-center text-zinc-700 dark:text-zinc-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                data-testid="cal-today-btn"
                onClick={() => {
                  setViewMonth({ year: now.getFullYear(), month: now.getMonth() });
                  setSelectedDayNum(now.getDate());
                }}
                className="px-3 h-9 rounded-xl bg-[#F4F1EA] dark:bg-black hover:bg-stone-200/70 dark:hover:bg-white/10 text-xs font-medium text-zinc-800 dark:text-zinc-200"
              >
                {t(lang, 'Today', 'আজ')}
              </button>
              <button
                type="button"
                data-testid="cal-next-month"
                aria-label={t(lang, 'Next Month', 'পরবর্তী মাস')}
                onClick={() => shiftMonth(1)}
                className="w-9 h-9 rounded-xl bg-[#F4F1EA] dark:bg-black hover:bg-stone-200/70 dark:hover:bg-white/10 flex items-center justify-center text-zinc-700 dark:text-zinc-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center text-xs text-zinc-500">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-1 font-medium">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {Array.from({ length: monthlyGrid.leadingEmptyDays }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-14 sm:h-16" />
            ))}
            {monthlyGrid.cells.map((cell) => {
              const selected = selectedCell?.gregorianDay === cell.gregorianDay;
              const matches = cellMatchesFilter(cell, categoryFilter);
              const isEidOrMajor = cell.primaryKind === 'eid' || cell.primaryKind === 'major_fast';
              const isWhite = cell.markers.some((m) => m.kind === 'white_day');
              return (
                <button
                  key={cell.gregorianDay}
                  type="button"
                  data-testid={`cal-day-${cell.gregorianDay}`}
                  onClick={() => setSelectedDayNum(cell.gregorianDay)}
                  aria-pressed={selected}
                  className={`h-14 sm:h-16 rounded-xl border p-1.5 flex flex-col justify-between text-left transition-all ${
                    !matches ? 'opacity-35' : ''
                  } ${
                    selected
                      ? 'ring-2 ring-emerald-500 bg-emerald-500/18 border-emerald-500 text-zinc-900 dark:text-white'
                      : cell.isToday
                      ? 'bg-emerald-500/12 border-emerald-500/50 text-zinc-900 dark:text-white'
                      : isEidOrMajor
                      ? 'bg-amber-500/14 border-amber-500/45 text-amber-950 dark:text-amber-100'
                      : isWhite
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-100'
                      : cell.isFriday
                      ? 'bg-emerald-500/[0.06] border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      : 'bg-[#F7F4EC] dark:bg-black border-stone-200/80 dark:border-white/10 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="w-full flex items-center justify-between gap-1">
                    <span className="text-xs font-mono-num font-semibold">
                      {formatNum(lang, cell.gregorianDay)}
                    </span>
                    {cell.markers.length > 0 && (
                      <span className="flex items-center gap-0.5">
                        {cell.markers.slice(0, 2).map((m) => (
                          <span
                            key={m.id}
                            className={`w-1.5 h-1.5 rounded-full ${getMarkerDotClass(m.kind)}`}
                            aria-hidden="true"
                          />
                        ))}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono-num text-zinc-500 dark:text-zinc-400 self-end">
                    {formatNum(lang, cell.hijri.day)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Color Legend */}
          <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-zinc-600 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              {t(lang, 'Eid & Qadr', 'ঈদ ও কদর')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              {t(lang, 'Ashura / Arafah / Barat', 'আশুরা / আরাফা / শবে বরাত')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {t(lang, 'Ayyam al-Beed (13-15)', 'আইয়্যামে বীজ (১৩-১৫)')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              {t(lang, 'Mon/Thu Sunnah Fast', 'সোম/বৃহঃ সুন্নাহ রোজা')}
            </span>
          </div>
        </div>

        {/* Right: Selected Date Significance Card + Upcoming Islamic Events */}
        <div className="lg:col-span-5 space-y-5">
          {selectedCell && (
            <section
              data-testid="cal-selected-detail"
              className="rounded-3xl bg-white/90 dark:bg-[#1C1C1E] backdrop-blur-md border border-emerald-500/35 p-5 space-y-3 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {t(lang, 'Selected Date Insight', 'নির্বাচিত তারিখের বিবরণ')}
                  </p>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white mt-0.5">
                    {formatNum(lang, selectedCell.hijri.day)}{' '}
                    {lang === 'bn'
                      ? selectedCell.hijri.monthNameBn
                      : selectedCell.hijri.monthNameEn}{' '}
                    {formatNum(lang, selectedCell.hijri.year)} {t(lang, 'AH', 'হিজরি')}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {selectedCell.date.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                {selectedCell.markers[0] && (
                  <button
                    type="button"
                    data-testid="cal-detail-reminder-btn"
                    onClick={() => toggleReminder(selectedCell.markers[0].reminderKey)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 border transition-colors ${
                      state.eventReminders.includes(selectedCell.markers[0].reminderKey)
                        ? 'bg-amber-500 text-black border-amber-400 font-semibold'
                        : 'bg-[#F4F1EA] dark:bg-black border-stone-200/80 dark:border-white/10 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <Bell className="w-3.5 h-3.5" />
                    {state.eventReminders.includes(selectedCell.markers[0].reminderKey)
                      ? t(lang, 'Reminded', 'রিমাইন্ডার চালু')
                      : t(lang, 'Remind', 'স্মরণ রাখুন')}
                  </button>
                )}
              </div>

              {selectedCell.markers.length > 0 ? (
                <div className="space-y-2.5">
                  {selectedCell.markers.map((marker) => (
                    <div
                      key={marker.id}
                      className="rounded-2xl bg-[#F7F4EC] dark:bg-black border border-stone-200/80 dark:border-white/10 p-3.5 space-y-1.5"
                    >
                      <p className="text-xs font-bold text-amber-700 dark:text-amber-300 inline-flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                        {lang === 'bn' ? marker.titleBn : marker.titleEn}
                      </p>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                        {lang === 'bn' ? marker.significanceBn : marker.significanceEn}
                      </p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed pt-1 border-t border-stone-200/70 dark:border-white/[0.06]">
                        <strong>{t(lang, 'Sunnah Deeds:', 'করণীয় আমল:')}</strong>{' '}
                        {lang === 'bn' ? marker.recommendedDeedBn : marker.recommendedDeedEn}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed bg-[#F7F4EC] dark:bg-black rounded-2xl p-3.5">
                  {t(
                    lang,
                    'Blessed ordinary day for consistent 5 daily prayers, Quran recitation, and gratitude Dhikr.',
                    'দৈনিক ৫ ওয়াক্ত নামাজ, কুরআন তিলাওয়াত, যিকির ও হালাল উপার্জনের মাধ্যমে আল্লাহর সন্তুষ্টি অর্জনের দিন।'
                  )}
                </p>
              )}
            </section>
          )}

          <div className="rounded-3xl bg-white/90 dark:bg-[#1C1C1E] backdrop-blur-md border border-stone-200/80 dark:border-white/[0.08] p-5 space-y-3 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
              {t(lang, 'Upcoming Islamic Events', 'আসন্ন ইসলামিক দিবসসমূহ')}
            </h3>
            <div className="divide-y divide-stone-200/70 dark:divide-white/10">
              {upcomingEvents.map((ev) => {
                const reminded = state.eventReminders.includes(ev.id);
                return (
                  <div key={ev.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                        {lang === 'bn' ? ev.titleBn : ev.titleEn}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        {lang === 'bn' ? ev.subtitleBn : ev.subtitleEn}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-xs font-mono-num text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {ev.daysUntil === 0
                          ? t(lang, 'Today', 'আজ')
                          : `${formatNum(lang, ev.daysUntil)}${t(lang, 'd', ' দিন')}`}
                      </span>
                      <button
                        type="button"
                        aria-label={`Toggle reminder for ${ev.titleEn}`}
                        aria-pressed={reminded}
                        onClick={() => toggleReminder(ev.id)}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                          reminded
                            ? 'bg-amber-400/20 text-amber-600 dark:text-amber-300'
                            : 'bg-[#F4F1EA] dark:bg-white/5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                        }`}
                      >
                        <Bell className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

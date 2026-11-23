import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  Check,
  Clock,
  Flame,
  Moon,
  Plus,
  Sparkles,
  Sun,
} from 'lucide-react';
import type { AppPersistedState, DailyPrayerTimes } from '../types/islamic';
import type { AppRoute } from '../utils/routes';
import { formatTime12h } from '../utils/calculations';
import {
  buildRamadanSchedule,
  calculateKhatamPlan,
  getSahriIftarCountdown,
} from '../utils/ramadan';
import { formatNum, t } from '../utils/i18n';
import { PageHeader } from './PageHeader';
import { SpacedTime } from './SpacedTime';

const LAST_TEN_CHECKLIST_ITEMS = [
  {
    id: 'qadr_dua',
    en: 'Recite Laylatul Qadr Dua ("Allahumma innaka Afuwwun...")',
    bn: 'লাইলাতুল কদরের দোয়া পাঠ ("আল্লাহুম্মা ইন্নাকা আফুউন...")',
  },
  {
    id: 'tahajjud_qiyam',
    en: 'Pray Qiyam al-Layl / Tahajjud in last third of night',
    bn: 'রাতের শেষ তৃতীয়াংশে তাহাজ্জুদ ও কিয়ামুল লাইল আদায়',
  },
  {
    id: 'nightly_sadaqah',
    en: 'Give daily charity (even a small amount) every odd night',
    bn: 'শেষ দশকের প্রতি বিজোড় রাতে সামর্থ্য অনুযায়ী সদকা করা',
  },
  {
    id: 'quran_reflection',
    en: 'Recite & reflect on at least 100 Ayahs with meaning',
    bn: 'অর্থসহ কমপক্ষে ১০০টি আয়াত তিলাওয়াত ও অনুধাবন করা',
  },
  {
    id: 'istighfar_dhikr',
    en: '100× Istighfar & Salawat upon Prophet Muhammad (ﷺ)',
    bn: '১০০ বার ইস্তিগফার এবং নবী (ﷺ)-এর ওপর দরুদ পাঠ',
  },
];

const DAILY_TIMELINE_ACTIVITIES = [
  {
    id: 'sahri_suhoor',
    timeEn: 'Pre-Dawn',
    timeBn: 'সাহরির সময়',
    titleEn: 'Wake for Suhoor & Sincere Fasting Niyyah',
    titleBn: 'সাহরি গ্রহণ ও রোজার খাঁটি নিয়ত',
  },
  {
    id: 'fajr_quran',
    timeEn: 'Dawn',
    timeBn: 'ফজর',
    titleEn: 'Fajr Salah + Morning Adhkar & Quran Juz',
    titleBn: 'ফজরের নামাজ, সকালের যিকির ও কুরআন তিলাওয়াত',
  },
  {
    id: 'dhuhr_charity',
    timeEn: 'Midday',
    timeBn: 'যোহর',
    titleEn: 'Dhuhr in Congregation + Daily Charity / Kindness',
    titleBn: 'যোহরের নামাজ ও দৈনিক সদকা বা উত্তম আচরণ',
  },
  {
    id: 'asr_dua',
    timeEn: 'Late Afternoon',
    timeBn: 'আসর',
    titleEn: 'Asr Salah + Evening Tasbih & Istighfar',
    titleBn: 'আসরের নামাজ ও সন্ধ্যার তাসবীহ-ইস্তিগফার',
  },
  {
    id: 'iftar_maghrib',
    timeEn: 'Sunset',
    timeBn: 'মাগরিব / ইফতার',
    titleEn: 'Accepted Dua Before Iftar & Break Fast with Dates',
    titleBn: 'ইফতারের পূর্বে দোয়া, খেজুর-পানিতে ইফতার ও মাগরিব',
  },
  {
    id: 'taraweeh_qiyam',
    timeEn: 'Night',
    timeBn: 'রাত / তারাবীহ',
    titleEn: 'Isha, Taraweeh & Nightly Reflection',
    titleBn: 'ইশা, তারাবীহ নামাজ ও আত্মসমালোচনা',
  },
];

const RAMADAN_DUAS = [
  {
    id: 'sehri',
    titleEn: 'Intention for Fasting (Sahri)',
    titleBn: 'রোজার নিয়ত (সাহরি)',
    arabic: 'نَوَيْتُ أَنْ أَصُومَ غَدًا مِّنْ شَهْرِ رَمَضَانَ الْمُبَارَكِ فَرْضًا لَّكَ يَا اللَّهُ فَتَقَبَّلْ مِنِّي إِنَّكَ أَنْتَ السَّمِيعُ الْعَلِيمُ',
    en: 'I intend to observe tomorrow’s obligatory fast in the blessed month of Ramadan for Your sake, O Allah; accept it from me.',
    bn: 'হে আল্লাহ! আমি আপনার সন্তুষ্টির উদ্দেশ্যে পবিত্র রমজান মাসের আগামীকালের ফরজ রোজা রাখার নিয়ত করছি; অতএব আমার পক্ষ থেকে তা কবুল করুন।',
  },
  {
    id: 'iftar',
    titleEn: 'Dua at Breaking the Fast (Iftar)',
    titleBn: 'ইফতারের মাসনূন দোয়া',
    arabic: 'ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ، وَثَبَتَ الأَجْرُ إِنْ شَاءَ اللَّهُ',
    en: 'The thirst has gone, the veins are quenched, and the reward is confirmed, if Allah wills. (Abu Dawud 2357)',
    bn: 'পিপাসা দূর হয়েছে, শিরা-উপশিরা সিক্ত হয়েছে এবং ইনশাআল্লাহ সওয়াব নির্ধারিত হয়ে গেছে। (আবু দাউদ ২৩৫৭)',
  },
  {
    id: 'qadr',
    titleEn: 'Laylatul Qadr Supplication',
    titleBn: 'লাইলাতুল কদরের বিশেষ দোয়া',
    arabic: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي',
    en: 'O Allah, You are Pardoning and love to pardon, so pardon me. (Tirmidhi 3513)',
    bn: 'হে আল্লাহ! নিশ্চয়ই আপনি ক্ষমাশীল, ক্ষমা করতে ভালোবাসেন; অতএব আমাকে ক্ষমা করে দিন। (তিরমিযী ৩৫১৩)',
  },
];

const RamadanLanternsSvg: React.FC = () => (
  <svg
    viewBox="0 0 180 90"
    className="w-36 sm:w-44 h-auto shrink-0 select-none pointer-events-none"
    aria-hidden="true"
  >
    <defs>
      <radialGradient id="ramadanGlow1" cx="50%" cy="55%" r="50%">
        <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.48" />
        <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="ramadanGlow2" cx="50%" cy="55%" r="50%">
        <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
      </radialGradient>
    </defs>
    {/* Glow Halos */}
    <circle cx="52" cy="54" r="30" fill="url(#ramadanGlow1)" />
    <circle cx="128" cy="46" r="24" fill="url(#ramadanGlow2)" />

    {/* Hanging Strings */}
    <line x1="52" y1="0" x2="52" y2="22" stroke="#F59E0B" strokeWidth="1.5" strokeOpacity="0.7" />
    <line x1="128" y1="0" x2="128" y2="16" stroke="#10B981" strokeWidth="1.5" strokeOpacity="0.7" />
    <line x1="92" y1="0" x2="92" y2="30" stroke="#FDE68A" strokeWidth="1" strokeOpacity="0.5" />

    {/* Crescent Moon in Center */}
    <path
      d="M92 31 C86 31 82 36 82 42 C82 48 86 53 92 53 C88.5 51 87 46.8 87 42 C87 37.2 88.5 33 92 31 Z"
      fill="#FDE68A"
    />

    {/* Left Warm Amber Lantern */}
    <path d="M44 26 L60 26 L65 36 L61 66 L52 74 L43 66 L39 36 Z" fill="#18181B" stroke="#F59E0B" strokeWidth="1.6" />
    <path d="M46 36 L58 36 L56 62 L52 67 L48 62 Z" fill="#F59E0B" fillOpacity="0.75" />
    <circle cx="52" cy="23" r="3" fill="none" stroke="#F59E0B" strokeWidth="1.4" />

    {/* Right Emerald Lantern */}
    <path d="M121 20 L135 20 L139 29 L136 55 L128 62 L120 55 L117 29 Z" fill="#18181B" stroke="#10B981" strokeWidth="1.5" />
    <path d="M123 29 L133 29 L131 52 L128 56 L125 52 Z" fill="#10B981" fillOpacity="0.75" />
    <circle cx="128" cy="17" r="2.5" fill="none" stroke="#10B981" strokeWidth="1.3" />
  </svg>
);

function calculateRozaStreak(fastingDays: number[]): number {
  if (!fastingDays.length) return 0;
  const sorted = [...new Set(fastingDays)].sort((a, b) => a - b);
  let best = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      current += 1;
      if (current > best) best = current;
    } else {
      current = 1;
    }
  }
  return best;
}

export const RamadanPage: React.FC<{
  state: AppPersistedState;
  prayerTimes: DailyPrayerTimes;
  now: Date;
  onUpdateState: (
    updater: Partial<AppPersistedState> | ((prev: AppPersistedState) => AppPersistedState)
  ) => void;
  onNavigate: (route: AppRoute) => void;
}> = ({ state, prayerTimes, now, onUpdateState, onNavigate }) => {
  const lang = state.language;
  const ramadan = state.ramadan;
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [showCalendarTable, setShowCalendarTable] = useState<boolean>(false);

  const sahriIftar = useMemo(
    () => getSahriIftarCountdown(prayerTimes, now),
    [prayerTimes, now]
  );

  const khatamPlan = useMemo(
    () => calculateKhatamPlan(ramadan.khatamPagesRead, ramadan.khatamTargetDays, 604),
    [ramadan.khatamPagesRead, ramadan.khatamTargetDays]
  );

  const schedule = useMemo(
    () => buildRamadanSchedule(prayerTimes.sahri, prayerTimes.iftar),
    [prayerTimes.sahri, prayerTimes.iftar]
  );

  const rozaStreak = useMemo(
    () => calculateRozaStreak(ramadan.fastingDays),
    [ramadan.fastingDays]
  );

  const toggleFastDay = (day: number) => {
    onUpdateState((prev) => {
      const exists = prev.ramadan.fastingDays.includes(day);
      const nextDays = exists
        ? prev.ramadan.fastingDays.filter((d) => d !== day)
        : [...prev.ramadan.fastingDays, day].sort((a, b) => a - b);
      return {
        ...prev,
        ramadan: {
          ...prev.ramadan,
          fastingDays: nextDays,
        },
      };
    });
  };

  const setDayTaraweeh = (day: number, rakahs: 0 | 8 | 20) => {
    onUpdateState((prev) => ({
      ...prev,
      ramadan: {
        ...prev.ramadan,
        taraweehLogs: {
          ...prev.ramadan.taraweehLogs,
          [day]: rakahs,
        },
      },
    }));
  };

  const toggleLastTenItem = (id: string) => {
    onUpdateState((prev) => ({
      ...prev,
      ramadan: {
        ...prev.ramadan,
        lastTenNightsChecklist: {
          ...prev.ramadan.lastTenNightsChecklist,
          [id]: !prev.ramadan.lastTenNightsChecklist[id],
        },
      },
    }));
  };

  const toggleDailyTimelineItem = (id: string) => {
    onUpdateState((prev) => {
      const currentMap = prev.ramadan.dailyTimelineChecklist ?? {};
      return {
        ...prev,
        ramadan: {
          ...prev.ramadan,
          dailyTimelineChecklist: {
            ...currentMap,
            [id]: !currentMap[id],
          },
        },
      };
    });
  };

  const updateKhatamPages = (pages: number) => {
    const clamped = Math.max(0, Math.min(604, Math.floor(pages || 0)));
    onUpdateState((prev) => ({
      ...prev,
      ramadan: {
        ...prev.ramadan,
        khatamPagesRead: clamped,
      },
    }));
  };

  const updateRemainingDays = (days: number) => {
    const clamped = Math.max(1, Math.min(30, Math.floor(days || 1)));
    onUpdateState((prev) => ({
      ...prev,
      ramadan: {
        ...prev.ramadan,
        khatamTargetDays: clamped,
      },
    }));
  };

  const totalTaraweehNights = Object.values(ramadan.taraweehLogs).filter((v) => v > 0).length;
  const selectedTaraweeh = ramadan.taraweehLogs[selectedDay] ?? 0;
  const timelineMap = ramadan.dailyTimelineChecklist ?? {};
  const timelineDoneCount = DAILY_TIMELINE_ACTIVITIES.filter((item) => Boolean(timelineMap[item.id])).length;

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <PageHeader
        lang={lang}
        title={t(lang, 'Ramadan Dashboard', 'পবিত্র রমজান ড্যাশবোর্ড')}
        subtitle={t(
          lang,
          'Daily Sahri & Iftar countdown, Roza & Taraweeh tracker, Quran Khatam calculator, and Daily Ramadan Activity checklist.',
          'দৈনিক সাহরি ও ইফতার কাউন্টডাউন, রোজা ও তারাবীহ ট্র্যাকার, কুরআন খতম ক্যালকুলেটর ও দৈনিক আমল তালিকা।'
        )}
        onNavigate={onNavigate}
      />

      {/* Warm Lantern-Lit Header Banner + Live Sahri & Iftar Countdown */}
      <section className="rounded-3xl bg-gradient-to-br from-amber-500/12 via-white/90 to-emerald-500/10 dark:from-[#1A1307] dark:via-[#09090B] dark:to-[#041812] backdrop-blur-md border border-amber-500/30 p-5 sm:p-7 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1.5">
                {sahriIftar.target === 'iftar' ? (
                  <Sun className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                )}
                {sahriIftar.target === 'iftar'
                  ? t(lang, 'Countdown to Today’s Iftar', 'আজকের ইফতারের বাকি সময়')
                  : t(lang, 'Countdown to Sahri Ends', 'সাহরির শেষ সময়ের বাকি')}
              </span>
              <span
                data-testid="ramadan-roza-streak"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl bg-amber-500/15 border border-amber-500/35 text-[11px] font-semibold text-amber-700 dark:text-amber-300 font-mono-num"
              >
                <Flame className="w-3 h-3 text-amber-500" aria-hidden="true" />
                {t(lang, `Roza Streak: ${rozaStreak}d`, `রোজা ধারাবাহিকতা: ${formatNum(lang, rozaStreak)} দিন`)}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <span
                data-testid="ramadan-countdown"
                className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white"
              >
                <SpacedTime value={sahriIftar.countdownFormatted} lang={lang} colonSize="lg" />
              </span>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                ({t(lang, 'Target', 'সময়')}:{' '}
                <SpacedTime value={formatTime12h(sahriIftar.targetTime)} lang={lang} colonSize="md" />)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 max-w-md">
              <div className="rounded-2xl bg-white/90 dark:bg-black/70 backdrop-blur-md border border-stone-200/80 dark:border-white/10 p-3.5 shadow-[0_2px_10px_-2px_rgba(16,24,40,0.04)] dark:shadow-none">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {t(lang, 'Sahri Ends', 'সাহরি শেষ')}
                </p>
                <p className="text-base sm:text-lg font-semibold text-amber-600 dark:text-amber-300 mt-0.5">
                  <SpacedTime value={formatTime12h(prayerTimes.sahri)} lang={lang} colonSize="md" />
                </p>
              </div>
              <div className="rounded-2xl bg-white/90 dark:bg-black/70 backdrop-blur-md border border-stone-200/80 dark:border-white/10 p-3.5 shadow-[0_2px_10px_-2px_rgba(16,24,40,0.04)] dark:shadow-none">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {t(lang, 'Iftar Time', 'ইফতার')}
                </p>
                <p className="text-base sm:text-lg font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  <SpacedTime value={formatTime12h(prayerTimes.iftar)} lang={lang} colonSize="md" />
                </p>
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center justify-center">
            <RamadanLanternsSvg />
          </div>
        </div>
      </section>

      {/* Daily Ramadan Activity Timeline Checklist */}
      <section
        data-testid="ramadan-daily-timeline"
        className="rounded-3xl bg-white/90 dark:bg-[#09090B] backdrop-blur-md border border-stone-200/80 dark:border-white/10 p-5 sm:p-6 space-y-4 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white inline-flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              {t(lang, 'Daily Ramadan Activity Timeline', 'দৈনিক রমজান আমল টাইমলাইন')}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t(
                lang,
                'Check off your daily worship flow from Suhoor through Taraweeh.',
                'সাহরি থেকে তারাবীহ পর্যন্ত প্রতিদিনের আমলগুলো চিহ্নিত করে রাখুন।'
              )}
            </p>
          </div>
          <span
            data-testid="ramadan-timeline-progress"
            className="text-xs font-mono-num font-semibold text-emerald-700 dark:text-emerald-400"
          >
            {formatNum(lang, timelineDoneCount)}/{formatNum(lang, DAILY_TIMELINE_ACTIVITIES.length)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {DAILY_TIMELINE_ACTIVITIES.map((item) => {
            const checked = Boolean(timelineMap[item.id]);
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`ramadan-timeline-${item.id}`}
                aria-pressed={checked}
                onClick={() => toggleDailyTimelineItem(item.id)}
                className={`rounded-2xl border p-3.5 text-left flex items-center justify-between gap-3 transition-colors min-h-[54px] ${
                  checked
                    ? 'bg-emerald-500/12 border-emerald-500/45 text-zinc-900 dark:text-white'
                    : 'bg-[#F7F4EC] dark:bg-black border-stone-200/80 dark:border-white/10 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                    {lang === 'bn' ? item.timeBn : item.timeEn}
                  </p>
                  <p className="text-xs sm:text-sm font-medium leading-snug">
                    {lang === 'bn' ? item.titleBn : item.titleEn}
                  </p>
                </div>
                <span
                  className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${
                    checked
                      ? 'bg-emerald-500 border-emerald-500 text-black'
                      : 'border-zinc-400 dark:border-zinc-600'
                  }`}
                >
                  {checked && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 30-Day Fasting (Roza) & Taraweeh Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-7 rounded-3xl bg-white/90 dark:bg-[#09090B] backdrop-blur-md border border-stone-200/80 dark:border-white/10 p-5 sm:p-6 space-y-4 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                {t(lang, '30-Day Fasting (Roza) & Taraweeh', '৩০ দিনের রোজা ও তারাবীহ ট্র্যাকার')}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {t(
                  lang,
                  'Tap a Ramadan day to mark fast completed & log Taraweeh Rakahs below.',
                  'রোজা সম্পন্ন হলে দিনে ট্যাপ করুন এবং নিচে তারাবীহর রাকাত নির্বাচন করুন।'
                )}
              </p>
            </div>
            <span
              data-testid="fasting-count-readout"
              className="text-xs font-semibold font-mono-num text-emerald-700 dark:text-emerald-400"
            >
              {formatNum(lang, ramadan.fastingDays.length)}/{formatNum(lang, 30)}{' '}
              {t(lang, 'Fasts', 'রোজা')} · {formatNum(lang, totalTaraweehNights)}{' '}
              {t(lang, 'Taraweeh', 'তারাবীহ')}
            </span>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
            {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
              const fasted = ramadan.fastingDays.includes(day);
              const taraweeh = ramadan.taraweehLogs[day] ?? 0;
              const isSelected = selectedDay === day;
              return (
                <button
                  key={day}
                  type="button"
                  data-testid={`ramadan-day-btn-${day}`}
                  onClick={() => {
                    setSelectedDay(day);
                    toggleFastDay(day);
                  }}
                  aria-pressed={fasted}
                  className={`min-h-[54px] rounded-2xl border px-1.5 py-2 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-[0.96] ${
                    fasted
                      ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-700 dark:text-emerald-300'
                      : 'bg-[#F7F4EC] dark:bg-black border-stone-200/80 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:border-emerald-500/40'
                  } ${isSelected ? 'ring-2 ring-amber-400/70' : ''}`}
                >
                  <span className="text-xs font-bold font-mono-num flex items-center gap-1">
                    {formatNum(lang, day)}
                    {fasted && <Check className="w-3 h-3" aria-hidden="true" />}
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono-num">
                    {taraweeh > 0 ? `${formatNum(lang, taraweeh)}R` : day >= 21 && day % 2 === 1 ? '★' : '—'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Taraweeh Rakah Selector for Selected Day */}
          <div className="pt-3 border-t border-black/[0.06] dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {t(lang, `Day ${selectedDay} Taraweeh:`, `রমজান ${formatNum(lang, selectedDay)} তারাবীহ:`)}
            </span>
            <div className="flex items-center gap-1.5">
              {([0, 8, 20] as const).map((rakahs) => (
                <button
                  key={rakahs}
                  type="button"
                  data-testid={`taraweeh-${rakahs}-btn`}
                  onClick={() => setDayTaraweeh(selectedDay, rakahs)}
                  className={`px-3 py-1.5 min-h-[38px] rounded-xl text-xs font-medium border transition-colors ${
                    selectedTaraweeh === rakahs
                      ? 'bg-amber-500 text-black font-semibold border-amber-400'
                      : 'bg-[#F7F4EC] dark:bg-black border-stone-200/80 dark:border-white/10 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {rakahs === 0
                    ? t(lang, 'None', 'পড়া হয়নি')
                    : `${formatNum(lang, rakahs)} ${t(lang, 'Rakahs', 'রাকাত')}`}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Quran Khatam Daily Page Calculator */}
        <section className="lg:col-span-5 rounded-3xl bg-white/90 dark:bg-[#09090B] backdrop-blur-md border border-stone-200/80 dark:border-white/10 p-5 sm:p-6 space-y-4 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white inline-flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              {t(lang, 'Quran Khatam Planner', 'কুরআন খতম ক্যালকুলেটর')}
            </h2>
            <span
              data-testid="khatam-percent"
              className="text-xs font-semibold font-mono-num text-amber-600 dark:text-amber-300"
            >
              {formatNum(lang, khatamPlan.percentComplete)}%
            </span>
          </div>

          <div className="w-full h-2.5 rounded-full bg-[#EFECE3] dark:bg-black overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${khatamPlan.percentComplete}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
              <span>{t(lang, 'Pages Read (of 604)', 'পঠিত পৃষ্ঠা (৬০৪ এর মধ্যে)')}</span>
              <input
                type="number"
                min={0}
                max={604}
                value={ramadan.khatamPagesRead}
                onChange={(e) => updateKhatamPages(Number(e.target.value))}
                data-testid="khatam-pages-input"
                className="w-full h-11 px-3 rounded-xl bg-[#F7F4EC] dark:bg-black border border-stone-200/80 dark:border-white/15 text-sm font-mono-num text-zinc-900 dark:text-white"
              />
            </label>

            <label className="block space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
              <span>{t(lang, 'Days Left', 'বাকি দিন')}</span>
              <input
                type="number"
                min={1}
                max={30}
                value={ramadan.khatamTargetDays}
                onChange={(e) => updateRemainingDays(Number(e.target.value))}
                data-testid="khatam-days-input"
                className="w-full h-11 px-3 rounded-xl bg-[#F7F4EC] dark:bg-black border border-stone-200/80 dark:border-white/15 text-sm font-mono-num text-zinc-900 dark:text-white"
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-[#F7F4EC] dark:bg-black border border-stone-200/80 dark:border-white/10 p-3">
              <p className="text-[11px] text-zinc-500">{t(lang, 'Remaining', 'বাকি পৃষ্ঠা')}</p>
              <p className="text-base font-bold text-zinc-900 dark:text-white font-mono-num mt-0.5">
                {formatNum(lang, khatamPlan.remainingPages)}
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3">
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                {t(lang, 'Pages / Day', 'দৈনিক লক্ষ্য')}
              </p>
              <p
                data-testid="khatam-daily-target"
                className="text-base font-bold text-emerald-700 dark:text-emerald-300 font-mono-num mt-0.5"
              >
                {formatNum(lang, khatamPlan.pagesPerDay)}
              </p>
            </div>
            <div className="rounded-2xl bg-[#F7F4EC] dark:bg-black border border-stone-200/80 dark:border-white/10 p-3">
              <p className="text-[11px] text-zinc-500">{t(lang, 'Per Waqt', 'প্রতি ওয়াক্তে')}</p>
              <p className="text-base font-bold text-amber-600 dark:text-amber-300 font-mono-num mt-0.5">
                {formatNum(lang, khatamPlan.pagesPerPrayer)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="khatam-add-4-btn"
              onClick={() => updateKhatamPages(ramadan.khatamPagesRead + 4)}
              className="flex-1 min-h-[42px] px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold inline-flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              {t(lang, '+4 Pages', '+৪ পৃষ্ঠা')}
            </button>
            <button
              type="button"
              onClick={() => updateKhatamPages(ramadan.khatamPagesRead + 20)}
              className="flex-1 min-h-[42px] px-3 py-2 rounded-xl bg-[#F4F1EA] dark:bg-white/5 hover:bg-stone-200/70 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-200 text-xs font-semibold inline-flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              {t(lang, '+20 Pages (1 Juz)', '+২০ পৃষ্ঠা (১ পারা)')}
            </button>
          </div>
        </section>
      </div>

      {/* Last 10 Nights (Laylatul Qadr) Checklist & Ramadan Duas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="rounded-3xl bg-white/90 dark:bg-[#09090B] backdrop-blur-md border border-stone-200/80 dark:border-white/10 p-5 sm:p-6 space-y-4 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" aria-hidden="true" />
            {t(lang, 'Last 10 Nights (Laylatul Qadr) Checklist', 'শেষ দশক ও লাইলাতুল কদর আমল')}
          </h2>
          <div className="space-y-2.5">
            {LAST_TEN_CHECKLIST_ITEMS.map((item) => {
              const checked = Boolean(ramadan.lastTenNightsChecklist[item.id]);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleLastTenItem(item.id)}
                  aria-pressed={checked}
                  className={`w-full text-left rounded-2xl border p-3.5 flex items-center gap-3 transition-colors min-h-[48px] ${
                    checked
                      ? 'bg-emerald-500/12 border-emerald-500/45 text-zinc-900 dark:text-white'
                      : 'bg-[#F7F4EC] dark:bg-black border-stone-200/80 dark:border-white/10 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                      checked
                        ? 'bg-emerald-500 border-emerald-500 text-black'
                        : 'border-zinc-400 dark:border-zinc-600'
                    }`}
                  >
                    {checked && <Check className="w-3 h-3" aria-hidden="true" />}
                  </span>
                  <span className="text-sm">{lang === 'bn' ? item.bn : item.en}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl bg-white/90 dark:bg-[#09090B] backdrop-blur-md border border-stone-200/80 dark:border-white/10 p-5 sm:p-6 space-y-4 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white inline-flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            {t(lang, 'Essential Ramadan Duas', 'রমজানের গুরুত্বপূর্ণ দোয়া')}
          </h2>
          <div className="space-y-3">
            {RAMADAN_DUAS.map((d) => (
              <div
                key={d.id}
                className="rounded-2xl bg-[#F7F4EC] dark:bg-black border border-stone-200/80 dark:border-white/10 p-4 space-y-2"
              >
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                  {lang === 'bn' ? d.titleBn : d.titleEn}
                </p>
                <p className="font-quran text-xl text-right text-zinc-900 dark:text-zinc-100">
                  {d.arabic}
                </p>
                <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {lang === 'bn' ? d.bn : d.en}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Expandable 30-Day Ramadan Calendar */}
      <section className="rounded-3xl bg-white/90 dark:bg-[#09090B] backdrop-blur-md border border-stone-200/80 dark:border-white/10 p-5 sm:p-6 space-y-4 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white inline-flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            {t(lang, '30-Day Ramadan Sahri & Iftar Schedule', '৩০ দিনের সাহরি ও ইফতার ক্যালেন্ডার')}
          </h2>
          <button
            type="button"
            onClick={() => setShowCalendarTable((v) => !v)}
            className="px-3.5 py-2 min-h-[40px] rounded-xl bg-[#F4F1EA] dark:bg-white/5 hover:bg-stone-200/70 dark:hover:bg-white/10 text-xs font-medium text-zinc-800 dark:text-zinc-200"
          >
            {showCalendarTable
              ? t(lang, 'Hide 30-Day Table', 'তালিকা লুকান')
              : t(lang, 'View All 30 Days', '৩০ দিনের সময়সূচি দেখুন')}
          </button>
        </div>

        {showCalendarTable && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {schedule.map((item) => (
              <div
                key={item.ramadanDay}
                className={`rounded-2xl border px-3.5 py-2.5 flex items-center justify-between text-xs ${
                  item.isOddLastTen
                    ? 'bg-amber-500/10 border-amber-500/35'
                    : 'bg-[#F7F4EC] dark:bg-black border-stone-200/80 dark:border-white/10'
                }`}
              >
                <span className="font-semibold text-zinc-900 dark:text-white font-mono-num">
                  {t(lang, `Ramadan ${item.ramadanDay}`, `রমজান ${formatNum(lang, item.ramadanDay)}`)}
                </span>
                <span className="text-zinc-600 dark:text-zinc-300">
                  <SpacedTime value={formatTime12h(item.sahri)} lang={lang} /> /{' '}
                  <strong className="text-emerald-700 dark:text-emerald-400">
                    <SpacedTime value={formatTime12h(item.iftar)} lang={lang} />
                  </strong>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

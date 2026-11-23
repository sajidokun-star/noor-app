import React, { useEffect, useRef, useState } from 'react';
import { Flame, Sparkles } from 'lucide-react';
import type { AppPersistedState } from '../types/islamic';
import type { AppRoute } from '../utils/routes';
import { calculateDailyIbadahProgress } from '../utils/ibadahProgress';
import { formatNum, t } from '../utils/i18n';

interface DailyIbadahCardProps {
  state: AppPersistedState;
  now: Date;
  onNavigate?: (route: AppRoute) => void;
  compact?: boolean;
}

export const DailyIbadahCard: React.FC<DailyIbadahCardProps> = ({
  state,
  now,
  onNavigate,
  compact = false,
}) => {
  const lang = state.language;
  const summary = calculateDailyIbadahProgress(state, now);

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - summary.prayerPercent / 100);

  const prevPercentRef = useRef<number>(summary.prayerPercent);
  const [pulseEpoch, setPulseEpoch] = useState<number>(0);
  const [pulseDirection, setPulseDirection] = useState<'up' | 'down' | 'idle'>('idle');

  useEffect(() => {
    const prev = prevPercentRef.current;
    if (summary.prayerPercent !== prev) {
      setPulseDirection(summary.prayerPercent > prev ? 'up' : 'down');
      setPulseEpoch((n) => n + 1);
      prevPercentRef.current = summary.prayerPercent;
    }
  }, [summary.prayerPercent]);

  const growClass =
    pulseDirection === 'up' && pulseEpoch > 0
      ? pulseEpoch % 2 === 1
        ? 'ibadah-ring-grow-a'
        : 'ibadah-ring-grow-b'
      : '';

  const percentPopClass =
    pulseDirection === 'up' && pulseEpoch > 0
      ? pulseEpoch % 2 === 1
        ? 'ibadah-percent-pop-a'
        : 'ibadah-percent-pop-b'
      : '';

  const ringStroke = summary.prayerPercent === 100 ? '#F59E0B' : '#10B981';

  const ringCssVars = {
    '--ring-circumference': `${circumference}`,
    '--ring-offset': `${dashOffset}`,
  } as React.CSSProperties;

  return (
    <section
      data-testid="daily-ibadah-progress-card"
      className={`rounded-3xl bg-white/90 dark:bg-[#09090B] backdrop-blur-md border border-emerald-500/25 ${
        compact ? 'p-4 sm:p-5' : 'p-5 sm:p-6'
      } shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none`}
    >
      <div className="flex items-center gap-4 sm:gap-5">
        {/* Circular CSS-Animated Completion Ring */}
        <div
          data-testid="daily-ibadah-ring-wrap"
          className={`relative w-20 h-20 sm:w-22 sm:h-22 shrink-0 flex items-center justify-center ibadah-ring-svg ${growClass}`}
        >
          <svg
            viewBox="0 0 88 88"
            className={`w-full h-full -rotate-90 overflow-visible ${
              summary.prayerPercent === 100 ? 'ibadah-ring-complete' : ''
            }`}
            aria-hidden="true"
          >
            {/* Base track circle */}
            <circle
              cx="44"
              cy="44"
              r={radius}
              fill="none"
              className="stroke-[#E5E7EB] dark:stroke-white/10"
              strokeWidth="7.5"
            />

            {/* Soft luminous aura arc synced with stroke-dashoffset */}
            <circle
              cx="44"
              cy="44"
              r={radius}
              fill="none"
              stroke={ringStroke}
              strokeOpacity={summary.prayerPercent > 0 ? 0.28 : 0}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={ringCssVars}
              className="ibadah-ring-glow-arc"
            />

            {/* Main growing progress arc */}
            <circle
              data-testid="daily-ibadah-ring-arc"
              cx="44"
              cy="44"
              r={radius}
              fill="none"
              stroke={ringStroke}
              strokeWidth="7.5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={ringCssVars}
              className="ibadah-ring-arc"
            />

            {/* Expanding CSS SVG ripple wave on prayer completion increment */}
            {pulseDirection === 'up' && pulseEpoch > 0 && (
              <circle
                key={`ripple-${pulseEpoch}`}
                cx="44"
                cy="44"
                r={radius}
                fill="none"
                stroke={ringStroke}
                className="ibadah-ring-ripple pointer-events-none"
              />
            )}
          </svg>
          <span
            data-testid="daily-ibadah-percent"
            className={`absolute text-base sm:text-lg font-bold text-zinc-900 dark:text-white font-mono-num leading-[1.6] pt-0.5 ${percentPopClass}`}
          >
            {formatNum(lang, summary.prayerPercent)}%
          </span>
        </div>

        {/* Progress Copy, Linear Bar & Sub-goals */}
        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" aria-hidden="true" />
                {t(lang, 'Daily Ibadah Tracker', 'দৈনিক ইবাদত ও আমল')}
              </p>
              <h2
                data-testid="daily-ibadah-headline"
                className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white leading-snug"
              >
                {lang === 'bn'
                  ? `আজকের নামাজ ও আমল: ${formatNum(lang, summary.prayerPercent)}% সম্পন্ন`
                  : `Today's Worship: ${summary.prayerPercent}% Completed`}
              </h2>
            </div>

            <span
              data-testid="daily-ibadah-streak"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/12 border border-amber-500/30 text-[11px] font-semibold text-amber-700 dark:text-amber-300 font-mono-num whitespace-nowrap"
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
              {lang === 'bn'
                ? `ধারাবাহিকতা: ${formatNum(lang, summary.streakDays)} দিন`
                : `Streak: ${summary.streakDays} ${summary.streakDays === 1 ? 'Day' : 'Days'}`}
            </span>
          </div>

          {/* Linear Progress Bar */}
          <div className="w-full h-2.5 rounded-full bg-[#EFECE3] dark:bg-black border border-stone-200/80 dark:border-white/[0.07] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                summary.prayerPercent === 100
                  ? 'bg-gradient-to-r from-emerald-500 to-amber-400'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${summary.prayerPercent}%` }}
            />
          </div>

          {/* Sub-metrics Row */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] sm:text-xs text-zinc-600 dark:text-zinc-400">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono-num">
              <span>
                {t(lang, 'Salah', 'নামাজ')}:{' '}
                <strong className="text-zinc-900 dark:text-zinc-100">
                  {formatNum(lang, summary.completedPrayers)}/{formatNum(lang, summary.totalPrayers)}
                </strong>
              </span>
              <span>
                {t(lang, 'Tasbih', 'তাসবীহ')}:{' '}
                <strong className="text-emerald-700 dark:text-emerald-400">
                  {formatNum(lang, summary.tasbihCount)}/{formatNum(lang, summary.tasbihTarget)}
                </strong>
              </span>
              <span>
                {t(lang, 'Quran', 'কুরআন')}:{' '}
                <strong className="text-amber-700 dark:text-amber-300">
                  {formatNum(lang, summary.quranAyahsRead)} {t(lang, 'Ayahs', 'আয়াত')}
                </strong>
              </span>
            </div>

            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('tracker')}
                className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold"
              >
                {t(lang, 'Open Tracker →', 'বিস্তারিত দেখুন →')}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

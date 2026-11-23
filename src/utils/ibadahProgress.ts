import type { AppPersistedState, WaqtKey } from '../types/islamic';
import { formatDateKey } from './calculations';
import { calculatePrayerStreak } from './accounts';

const WAQT_ORDER: WaqtKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export interface DailyIbadahSummary {
  completedPrayers: number;
  totalPrayers: number;
  prayerPercent: number; // 0..100 in 20% steps
  tasbihCount: number;
  tasbihTarget: number;
  tasbihPercent: number; // 0..100
  quranAyahsRead: number;
  holisticPercent: number; // weighted: 80% 5-waqt + 10% tasbih + 10% quran goal
  streakDays: number;
  isAllPrayersDone: boolean;
}

/**
 * Calculates daily 5-Waqt Namaz completion percentage (20% per prayer: 0%-100%),
 * plus Tasbih & Quran reading indicators and consecutive streak count.
 */
export function calculateDailyIbadahProgress(
  state: Pick<
    AppPersistedState,
    'prayerChecklist' | 'tasbihCounts' | 'selectedDhikrId' | 'tasbihTarget' | 'ayahsReadCount'
  >,
  now: Date = new Date()
): DailyIbadahSummary {
  const dateKey = formatDateKey(now);
  const todayChecklist = state.prayerChecklist[dateKey];

  const completedPrayers = todayChecklist
    ? WAQT_ORDER.filter((w) => Boolean(todayChecklist[w])).length
    : 0;

  const totalPrayers = 5;
  const prayerPercent = Math.round((completedPrayers / totalPrayers) * 100);

  const tasbihCount = state.tasbihCounts[state.selectedDhikrId] ?? 0;
  const tasbihTarget = Math.max(1, state.tasbihTarget || 33);
  const tasbihPercent = Math.min(100, Math.round((tasbihCount / tasbihTarget) * 100));

  const quranAyahsRead = Math.max(0, state.ayahsReadCount ?? 0);
  const quranGoalRatio = Math.min(1, quranAyahsRead / 10);

  const holisticPercent = Math.min(
    100,
    Math.round((completedPrayers / totalPrayers) * 80 + (tasbihPercent / 100) * 10 + quranGoalRatio * 10)
  );

  const streak = calculatePrayerStreak(state.prayerChecklist, now);

  return {
    completedPrayers,
    totalPrayers,
    prayerPercent,
    tasbihCount,
    tasbihTarget,
    tasbihPercent,
    quranAyahsRead,
    holisticPercent,
    streakDays: streak.activeDaysStreak,
    isAllPrayersDone: completedPrayers === totalPrayers,
  };
}

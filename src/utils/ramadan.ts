import type { DailyPrayerTimes } from '../types/islamic';
import { formatDurationSeconds, timeToMinutes } from './calculations';

export interface KhatamPlan {
  totalPages: number;
  pagesRead: number;
  remainingPages: number;
  remainingDays: number;
  pagesPerDay: number;
  pagesPerPrayer: number;
  percentComplete: number;
}

export function calculateKhatamPlan(
  pagesReadInput: number,
  remainingDaysInput: number,
  totalPages: number = 604
): KhatamPlan {
  const safeTotal = Math.max(1, totalPages);
  const pagesRead = Math.max(0, Math.min(safeTotal, Math.floor(pagesReadInput || 0)));
  const remainingDays = Math.max(1, Math.min(30, Math.floor(remainingDaysInput || 1)));
  const remainingPages = Math.max(0, safeTotal - pagesRead);
  const pagesPerDay = remainingPages === 0 ? 0 : Math.ceil(remainingPages / remainingDays);
  const pagesPerPrayer = pagesPerDay === 0 ? 0 : Number((pagesPerDay / 5).toFixed(1));
  const percentComplete = Math.round((pagesRead / safeTotal) * 100);

  return {
    totalPages: safeTotal,
    pagesRead,
    remainingPages,
    remainingDays,
    pagesPerDay,
    pagesPerPrayer,
    percentComplete,
  };
}

export interface RamadanDaySchedule {
  ramadanDay: number;
  sahri: string;
  iftar: string;
  isOddLastTen: boolean;
}

export function buildRamadanSchedule(
  baseSahri: string,
  baseIftar: string
): RamadanDaySchedule[] {
  const sahriMin = timeToMinutes(baseSahri);
  const iftarMin = timeToMinutes(baseIftar);
  const days: RamadanDaySchedule[] = [];

  for (let day = 1; day <= 30; day++) {
    // Realistic gradual solar progression across a 30-day lunar month
    const shiftMin = Math.round((day - 15) * 0.6);
    const daySahriMin = ((sahriMin - shiftMin) % 1440 + 1440) % 1440;
    const dayIftarMin = ((iftarMin + shiftMin) % 1440 + 1440) % 1440;

    const formatMin = (m: number) =>
      `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

    days.push({
      ramadanDay: day,
      sahri: formatMin(daySahriMin),
      iftar: formatMin(dayIftarMin),
      isOddLastTen: day >= 21 && day % 2 === 1,
    });
  }

  return days;
}

export interface SahriIftarStatus {
  target: 'sahri' | 'iftar';
  targetTime: string;
  countdownFormatted: string;
}

export function getSahriIftarCountdown(
  times: DailyPrayerTimes,
  now: Date = new Date()
): SahriIftarStatus {
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const sahriSec = timeToMinutes(times.sahri) * 60;
  const iftarSec = timeToMinutes(times.iftar) * 60;

  if (nowSec < sahriSec) {
    return {
      target: 'sahri',
      targetTime: times.sahri,
      countdownFormatted: formatDurationSeconds(sahriSec - nowSec),
    };
  }
  if (nowSec < iftarSec) {
    return {
      target: 'iftar',
      targetTime: times.iftar,
      countdownFormatted: formatDurationSeconds(iftarSec - nowSec),
    };
  }
  return {
    target: 'sahri',
    targetTime: times.sahri,
    countdownFormatted: formatDurationSeconds(86400 - nowSec + sahriSec),
  };
}

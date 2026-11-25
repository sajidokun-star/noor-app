import type {
  DailyPrayerTimes,
  HadithItem,
  Language,
  MuazzinId,
  NotificationSettings,
  WaqtKey,
} from '../types/islamic';
import { cleanApiTime, formatDateKey } from './calculations';

export interface MuazzinOption {
  id: MuazzinId;
  nameEn: string;
  nameBn: string;
  /**
   * Candidate MP3 sources, tried in order until one plays. Put licensed Adhan files in
   * `public/audio/adhan/` (first entry) for the most reliable, offline-capable playback;
   * the remote URL is the fallback.
   */
  sources: string[];
}

export const MUAZZIN_OPTIONS: MuazzinOption[] = [
  {
    id: 'makkah',
    nameEn: 'Makkah (Al-Haram)',
    nameBn: 'মক্কা (মসজিদুল হারাম)',
    sources: ['/audio/adhan/makkah.mp3', 'https://www.islamcan.com/audio/adhan/azan1.mp3'],
  },
  {
    id: 'madinah',
    nameEn: 'Madinah (Al-Nabawi)',
    nameBn: 'মদিনা (মসজিদে নববী)',
    sources: ['/audio/adhan/madinah.mp3', 'https://www.islamcan.com/audio/adhan/azan2.mp3'],
  },
  {
    id: 'mishary',
    nameEn: 'Mishary Rashid Alafasy',
    nameBn: 'মিশারি রশিদ আল-আফাসি',
    sources: ['/audio/adhan/mishary.mp3', 'https://www.islamcan.com/audio/adhan/azan6.mp3'],
  },
];

export interface TriggeredPrayerMatch {
  waqt: WaqtKey;
  triggerKey: string;
  timeHHMM: string;
}

const WAQT_KEYS: WaqtKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

/**
 * Pure check returning the prayer waqt if `now` matches the exact HH:MM of an enabled
 * prayer alert and has not yet fired today for that waqt.
 */
export function shouldTriggerPrayerAlert(
  prayerTimes: DailyPrayerTimes,
  now: Date,
  settings: NotificationSettings
): TriggeredPrayerMatch | null {
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const currentHHMM = `${hh}:${mm}`;
  const todayKey = formatDateKey(now);

  for (const waqt of WAQT_KEYS) {
    if (!settings.azanWaqtAlerts[waqt]) continue;
    const targetHHMM = cleanApiTime(prayerTimes[waqt]);
    if (targetHHMM === currentHHMM) {
      const triggerKey = `${todayKey}:${waqt}`;
      if (settings.lastTriggeredPrayerKey === triggerKey) {
        return null;
      }
      return { waqt, triggerKey, timeHHMM: targetHHMM };
    }
  }
  return null;
}

/**
 * Checks whether a periodic Daily Hadith alert should trigger based on elapsed minutes.
 */
export function shouldTriggerPeriodicHadith(
  now: Date,
  settings: NotificationSettings
): boolean {
  if (!settings.dailyHadithAlerts) return false;
  if (!settings.lastHadithSentAt) return false;
  const lastMs = Date.parse(settings.lastHadithSentAt);
  if (!Number.isFinite(lastMs)) return false;
  const intervalMs = Math.max(15, settings.hadithIntervalMinutes || 240) * 60 * 1000;
  return now.getTime() - lastMs >= intervalMs;
}

/**
 * Picks an authentic Hadith deterministically by day/offset for push notifications.
 */
export function pickDailyHadithForNotification(
  collection: HadithItem[],
  date: Date = new Date(),
  offset: number = 0
): HadithItem {
  const idx = (date.getDate() + date.getMonth() + offset) % collection.length;
  return collection[Math.abs(idx)];
}

export function buildPrayerNotificationCopy(
  waqt: WaqtKey,
  lang: Language,
  timeLabel: string
): { title: string; body: string } {
  const names: Record<WaqtKey, { en: string; bn: string }> = {
    fajr: { en: 'Fajr', bn: 'ফজর' },
    dhuhr: { en: 'Dhuhr', bn: 'যোহর' },
    asr: { en: 'Asr', bn: 'আসর' },
    maghrib: { en: 'Maghrib', bn: 'মাগরিব' },
    isha: { en: 'Isha', bn: 'ইশা' },
  };
  if (lang === 'bn') {
    return {
      title: `নামাজের সময় হয়েছে — ${names[waqt].bn}`,
      body: `${names[waqt].bn} ওয়াক্ত (${timeLabel}) শুরু হয়েছে। হায়্যা আলাস-সালাহ।`,
    };
  }
  return {
    title: `Time for ${names[waqt].en} Prayer`,
    body: `${names[waqt].en} time (${timeLabel}) has begun. Hayya 'alas-Salah.`,
  };
}

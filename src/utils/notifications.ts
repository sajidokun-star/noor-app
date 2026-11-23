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
  audioUrl: string | null;
}

export const MUAZZIN_OPTIONS: MuazzinOption[] = [
  {
    id: 'makkah',
    nameEn: 'Makkah (Al-Haram)',
    nameBn: 'মক্কা (মসজিদুল হারাম)',
    audioUrl: 'https://www.islamcan.com/audio/adhan/azan1.mp3',
  },
  {
    id: 'madinah',
    nameEn: 'Madinah (Al-Nabawi)',
    nameBn: 'মদিনা (মসজিদে নববী)',
    audioUrl: 'https://www.islamcan.com/audio/adhan/azan2.mp3',
  },
  {
    id: 'mishary',
    nameEn: 'Mishary Rashid Alafasy',
    nameBn: 'মিশারি রশিদ আল-আফাসি',
    audioUrl: 'https://www.islamcan.com/audio/adhan/azan6.mp3',
  },
  {
    id: 'chime',
    nameEn: 'Gentle Harmonic Chime (Offline)',
    nameBn: 'সফট হারমোনিক চাইম (অফলাইন)',
    audioUrl: null,
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

/**
 * Plays a calm, spiritual Web Audio harmonic chime fallback when Azan MP3 cannot autoplay
 * or when offline chime mode is selected.
 */
export function playAzanFallbackChime(): () => void {
  if (typeof window === 'undefined') return () => {};
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return () => {};

  let stopped = false;
  const ctx = new AudioCtx();
  // Hijaz-inspired gentle ascending modal notes (D4, Eb4, F#4, G4, A4, F#4, D4)
  const notes = [293.66, 311.13, 369.99, 392.0, 440.0, 369.99, 293.66];
  const timers: number[] = [];

  notes.forEach((freq, i) => {
    const id = window.setTimeout(() => {
      if (stopped || ctx.state === 'closed') return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.15);
    }, i * 520);
    timers.push(id);
  });

  return () => {
    stopped = true;
    timers.forEach((t) => window.clearTimeout(t));
    if (ctx.state !== 'closed') {
      ctx.close().catch(() => {});
    }
  };
}

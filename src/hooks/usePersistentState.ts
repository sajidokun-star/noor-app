import { useCallback, useEffect, useState } from 'react';
import type { AppPersistedState } from '../types/islamic';
import { parseAndValidateBackup } from '../utils/calculations';

const STORAGE_KEY = 'noor_islamic_companion_v1';

export const DEFAULT_APP_STATE: AppPersistedState = {
  version: 1,
  language: 'en',
  theme: 'dark',
  location: {
    lat: 23.8103,
    lng: 90.4125,
    labelEn: 'Dhaka, Bangladesh',
    labelBn: 'ঢাকা, বাংলাদেশ',
    isGps: false,
  },
  calculationMethod: 1, // University of Islamic Sciences, Karachi
  asrJuristic: 1, // Hanafi default for Bangladesh/South Asia
  quranFontSize: 32,
  quranTranslationMode: 'both',
  tajweedEnabled: true,
  quranRepeatCount: 1,
  lastRead: null,
  quranBookmarks: [],
  hadithBookmarks: [],
  prayerChecklist: {},
  qazaCounts: {
    fajr: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
    witr: 0,
  },
  tasbihCounts: {},
  tasbihLifetimeTotal: 0,
  tasbihTarget: 33,
  tasbihSound: true,
  tasbihHaptic: true,
  selectedDhikrId: 'subhanallah',
  customDhikrs: [],
  hijriOffset: 0,
  eventReminders: ['ramadan', 'arafah'],
  zakatHistory: [],
  quizBestScore: 0,
  ayahsReadCount: 0,
  notifications: {
    permissionGranted: false,
    audioUnlocked: false,
    azanWaqtAlerts: {
      fajr: true,
      dhuhr: true,
      asr: true,
      maghrib: true,
      isha: true,
    },
    playAzanAudio: true,
    muazzin: 'makkah',
    dailyHadithAlerts: false,
    hadithIntervalMinutes: 240,
  },
  profile: {
    activeAccountId: null,
    accounts: [],
    guestName: 'Guest Believer',
    guestAvatarId: 'crescent',
  },
  ramadan: {
    fastingDays: [],
    taraweehLogs: {},
    khatamPagesRead: 0,
    khatamTargetDays: 30,
    lastTenNightsChecklist: {},
    dailyTimelineChecklist: {},
  },
  seerahCompletedIds: [],
};

function loadInitialState(): AppPersistedState {
  if (typeof window === 'undefined') return DEFAULT_APP_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_APP_STATE;
    const res = parseAndValidateBackup(raw, DEFAULT_APP_STATE);
    return res.ok ? res.state : DEFAULT_APP_STATE;
  } catch {
    return DEFAULT_APP_STATE;
  }
}

export function usePersistentState() {
  const [state, setState] = useState<AppPersistedState>(loadInitialState);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors gracefully
    }
  }, [state]);

  const updateState = useCallback(
    (updater: Partial<AppPersistedState> | ((prev: AppPersistedState) => AppPersistedState)) => {
      setState((prev) => (typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }));
    },
    []
  );

  const exportBackupJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `noor-islamic-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [state]);

  const importBackupJson = useCallback((rawText: string) => {
    const res = parseAndValidateBackup(rawText, DEFAULT_APP_STATE);
    if (!res.ok) {
      return { ok: false as const, error: res.error };
    }
    setState(res.state);
    return { ok: true as const };
  }, []);

  const resetAllData = useCallback(() => {
    setState(DEFAULT_APP_STATE);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return {
    state,
    updateState,
    exportBackupJson,
    importBackupJson,
    resetAllData,
  };
}

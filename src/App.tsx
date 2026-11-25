import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bell,
  BookOpen,
  CircleDot,
  Clock,
  Home,
  LayoutGrid,
  Moon,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { DailyPrayerTimes, WaqtKey } from './types/islamic';
import { usePersistentState } from './hooks/usePersistentState';
import {
  buildDailyPrayerTimesFromRaw,
  buildOfflinePrayerTimes,
  formatDateKey,
  formatTime12h,
} from './utils/calculations';
import { t } from './utils/i18n';
import { type AppRoute, parseHashToRoute, routeToHash } from './utils/routes';
import { HADITH_COLLECTION } from './data/hadithAndFiqh';
import {
  buildPrayerNotificationCopy,
  MUAZZIN_OPTIONS,
  pickDailyHadithForNotification,
  shouldTriggerPeriodicHadith,
  shouldTriggerPrayerAlert,
} from './utils/notifications';
import { getActiveDisplayIdentity } from './utils/accounts';
import { installAudioUnlock, playSourceChain, releaseAudio, unlockAudio } from './utils/audioManager';
import { showAppNotification } from './utils/pwa';
import { NoorLogo, UserAvatarBadge } from './components/NoorLogo';
import { SplashScreen } from './components/SplashScreen';
import { HomeView } from './components/HomeView';
import { QuranView } from './components/QuranView';
import {
  CalendarPage,
  PrayerTimesPage,
  QiblaPage,
  TrackerPage,
} from './components/PrayerPages';
import {
  DuaPage,
  FiqhPage,
  HadithPage,
  RuqyahPage,
  TasbihPage,
} from './components/KnowledgePages';
import {
  BackupPage,
  CardMakerPage,
  MirasPage,
  NearbyPage,
  QuizPage,
  ToolsHubPage,
  ZakatPage,
} from './components/ToolPages';
import { NotificationsPage } from './components/NotificationsPage';
import { ProfilePage } from './components/ProfilePage';
import { RamadanPage } from './components/RamadanPage';
import { SeerahPage } from './components/SeerahPage';
import { AIAssistantPage } from './components/AIAssistantPage';

export default function App() {
  const { state, updateState, exportBackupJson, importBackupJson, resetAllData } =
    usePersistentState();
  const lang = state.language;
  const theme = state.theme;
  const isFancy = theme === 'fancy';
  // Fancy Mode is a dark variant: it keeps the `dark` class so every dark: utility applies,
  // then `html.fancy` (see index.css) re-skins surfaces and accents.
  const isDark = theme !== 'light';

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.classList.toggle('fancy', isFancy);
    root.dataset.theme = theme;
    root.lang = lang;
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isFancy ? '#2D0C38' : isDark ? '#000000' : '#F4F1EA');
    }
  }, [theme, isDark, isFancy, lang]);

  // Unlock the shared audio element on the first user gesture (required by iOS Safari),
  // and open the right page when a notification is tapped while the app is already open.
  useEffect(() => {
    const removeUnlock = installAudioUnlock();
    const onSwMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; url?: string } | undefined;
      if (data?.type === 'noor:navigate' && typeof data.url === 'string') {
        const hash = new URL(data.url, window.location.origin).hash;
        if (hash) window.location.hash = hash;
      }
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', onSwMessage);
    }
    return () => {
      removeUnlock();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', onSwMessage);
      }
    };
  }, []);

  const [showSplash, setShowSplash] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('autostart') !== '1';
  });
  const handleFinishSplash = useCallback(() => setShowSplash(false), []);

  const [route, setRoute] = useState<AppRoute>(() =>
    typeof window !== 'undefined' ? parseHashToRoute(window.location.hash) : 'home'
  );
  const [quranJump, setQuranJump] = useState<{ surahNumber: number; ayahNumber: number } | null>(
    null
  );

  const [now, setNow] = useState<Date>(() => new Date());
  const [prayerTimes, setPrayerTimes] = useState<DailyPrayerTimes>(() =>
    buildOfflinePrayerTimes(new Date())
  );

  // Azan audio & notification alerts state
  const [isAzanPlaying, setIsAzanPlaying] = useState(false);
  const [azanIssue, setAzanIssue] = useState<'needs-tap' | 'failed' | null>(null);
  const [activeAzanBanner, setActiveAzanBanner] = useState<{
    title: string;
    body: string;
  } | null>(null);
  const [activeHadithToast, setActiveHadithToast] = useState<{
    title: string;
    body: string;
  } | null>(null);

  const identity = useMemo(() => getActiveDisplayIdentity(state.profile), [state.profile]);

  // Sync browser hash navigation (back/forward buttons & direct hash links)
  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseHashToRoute(window.location.hash));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [route]);

  const navigateTo = useCallback((nextRoute: AppRoute) => {
    setRoute(nextRoute);
    const targetHash = routeToHash(nextRoute);
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const handleContinueReading = useCallback(() => {
    if (!state.lastRead) return;
    setQuranJump({
      surahNumber: state.lastRead.surahNumber,
      ayahNumber: state.lastRead.ayahNumber,
    });
    navigateTo('quran');
  }, [state.lastRead, navigateTo]);

  // Live 1-second tick for prayer countdown & alert checks
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Fetch Aladhan Prayer Times whenever location, date, or juristic school changes
  const dateKey = formatDateKey(now);
  useEffect(() => {
    let active = true;
    const cacheKey = `noor_prayer_${dateKey}_${state.location.lat}_${state.location.lng}_${state.calculationMethod}_${state.asrJuristic}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setPrayerTimes(JSON.parse(cached));
        return;
      }
    } catch {
      // ignore
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const url = `https://api.aladhan.com/v1/timings/${timestamp}?latitude=${state.location.lat}&longitude=${state.location.lng}&method=${state.calculationMethod}&school=${state.asrJuristic}`;

    fetch(url)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Aladhan error'))))
      .then((json) => {
        if (!active || !json?.data?.timings) return;
        const raw = json.data.timings;
        const readableDate =
          json.data?.date?.readable ??
          now.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
        const hijriObj = json.data?.date?.hijri;
        const hijriLabel = hijriObj
          ? `${hijriObj.day} ${hijriObj.month?.en ?? ''} ${hijriObj.year} AH`
          : undefined;

        const built = buildDailyPrayerTimesFromRaw(raw, readableDate, 'aladhan', hijriLabel);
        setPrayerTimes(built);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(built));
        } catch {
          // ignore
        }
      })
      .catch(() => {
        if (active) {
          setPrayerTimes(buildOfflinePrayerTimes(new Date()));
        }
      });

    return () => {
      active = false;
    };
  }, [
    dateKey,
    state.location.lat,
    state.location.lng,
    state.calculationMethod,
    state.asrJuristic,
  ]);

  const stopAzanAudioOnly = useCallback(() => {
    releaseAudio('azan');
  }, []);

  const stopAzan = useCallback(() => {
    stopAzanAudioOnly();
    setIsAzanPlaying(false);
    setAzanIssue(null);
    setActiveAzanBanner(null);
  }, [stopAzanAudioOnly]);

  // Plays the selected Muazzin's real recorded Azan on the single shared audio element.
  // Anything already playing (previous Azan, Quran, Ruqyah) is stopped first, so two
  // sounds can never overlap. There is no synthetic/oscillator fallback.
  const playAzanAlarm = useCallback(() => {
    setAzanIssue(null);
    if (!state.notifications.playAzanAudio) {
      stopAzanAudioOnly();
      setIsAzanPlaying(true);
      return;
    }
    const muazzin =
      MUAZZIN_OPTIONS.find((m) => m.id === state.notifications.muazzin) ?? MUAZZIN_OPTIONS[0];
    setIsAzanPlaying(true);
    playSourceChain('azan', muazzin.sources, () => setIsAzanPlaying(false), {
      onEnded: () => setIsAzanPlaying(false),
      onBlocked: () => setAzanIssue('needs-tap'),
      onFailed: () => {
        setIsAzanPlaying(false);
        setAzanIssue('failed');
      },
    });
  }, [stopAzanAudioOnly, state.notifications.playAzanAudio, state.notifications.muazzin]);

  const sendBrowserNotification = useCallback(
    (title: string, body: string, targetRoute?: AppRoute) => {
      void showAppNotification({
        title,
        body,
        tag: targetRoute ? `noor-${targetRoute}` : undefined,
        hash: targetRoute ? routeToHash(targetRoute) : undefined,
      });
    },
    []
  );

  const triggerPrayerAzan = useCallback(
    (waqt: WaqtKey) => {
      const timeLabel = formatTime12h(prayerTimes[waqt]);
      const copy = buildPrayerNotificationCopy(waqt, lang, timeLabel);
      setActiveAzanBanner(copy);
      sendBrowserNotification(copy.title, copy.body, 'prayer');
      playAzanAlarm();
    },
    [prayerTimes, lang, sendBrowserNotification, playAzanAlarm]
  );

  const triggerTestAzan = useCallback(() => {
    triggerPrayerAzan('fajr');
  }, [triggerPrayerAzan]);

  const triggerHadithAlert = useCallback(() => {
    const picked = pickDailyHadithForNotification(
      HADITH_COLLECTION,
      new Date(),
      Math.floor(Date.now() / 1000) % HADITH_COLLECTION.length
    );
    const title =
      lang === 'bn'
        ? `দৈনিক সহীহ হাদীস · ${picked.bookBn} (${picked.reference})`
        : `Daily Authentic Hadith · ${picked.bookEn} (${picked.reference})`;
    const body = lang === 'bn' ? picked.bengali : picked.english;
    setActiveHadithToast({ title, body });
    sendBrowserNotification(title, body, 'hadith');
    updateState((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        lastHadithSentAt: new Date().toISOString(),
      },
    }));
  }, [lang, sendBrowserNotification, updateState]);

  const requestNotificationPermissions = useCallback(async () => {
    // Unlock the shared audio element inside this user gesture (needed on iOS Safari)
    unlockAudio();

    if (typeof window === 'undefined' || !('Notification' in window)) {
      updateState((prev) => ({
        ...prev,
        notifications: { ...prev.notifications, audioUnlocked: true },
      }));
      return 'unsupported' as const;
    }

    try {
      const result = await Notification.requestPermission();
      updateState((prev) => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          audioUnlocked: true,
          permissionGranted: result === 'granted',
        },
      }));
      return result;
    } catch {
      return 'denied' as const;
    }
  }, [updateState]);

  // Background interval evaluator for 5-Waqt Prayer Azan & Periodic Hadith notifications
  useEffect(() => {
    const prayerMatch = shouldTriggerPrayerAlert(prayerTimes, now, state.notifications);
    if (prayerMatch) {
      updateState((prev) => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          lastTriggeredPrayerKey: prayerMatch.triggerKey,
        },
      }));
      triggerPrayerAzan(prayerMatch.waqt);
      return;
    }

    if (shouldTriggerPeriodicHadith(now, state.notifications)) {
      triggerHadithAlert();
    }
  }, [
    now,
    prayerTimes,
    state.notifications,
    updateState,
    triggerPrayerAzan,
    triggerHadithAlert,
  ]);

  useEffect(() => {
    return () => {
      releaseAudio('azan');
    };
  }, []);

  const handleToggleWaqt = (targetDateKey: string, waqt: WaqtKey) => {
    updateState((prev) => {
      const existing = prev.prayerChecklist[targetDateKey] ?? {
        fajr: false,
        dhuhr: false,
        asr: false,
        maghrib: false,
        isha: false,
      };
      return {
        ...prev,
        prayerChecklist: {
          ...prev.prayerChecklist,
          [targetDateKey]: {
            ...existing,
            [waqt]: !existing[waqt],
          },
        },
      };
    });
  };

  // Bottom Navigation Bar: Home, Quran, Prayer, Tasbih, All Tools
  const primaryNavItems: {
    id: AppRoute;
    en: string;
    bn: string;
    icon: typeof Home;
  }[] = [
    { id: 'home', en: 'Home', bn: 'হোম', icon: Home },
    { id: 'quran', en: 'Quran', bn: 'কুরআন', icon: BookOpen },
    { id: 'prayer', en: 'Prayer', bn: 'নামাজ', icon: Clock },
    { id: 'tasbih', en: 'Tasbih', bn: 'তাসবীহ', icon: CircleDot },
    { id: 'tools', en: 'All Tools', bn: 'সকল টুলস', icon: LayoutGrid },
  ];

  const isNavItemActive = (itemId: AppRoute) => {
    if (itemId === 'tools') {
      return (
        route === 'tools' ||
        !['home', 'quran', 'prayer', 'tasbih'].includes(route)
      );
    }
    return route === itemId;
  };

  const anyAlertActive =
    Object.values(state.notifications.azanWaqtAlerts).some(Boolean) ||
    state.notifications.dailyHadithAlerts;

  return (
    <div className="relative min-h-dvh w-full max-w-full overflow-x-hidden noor-light-atmosphere dark:bg-black text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors duration-200">
      {/* Subtle Light-Mode Islamic Geometric Lattice Overlay */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-none opacity-[0.03] dark:hidden z-0"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="noorLightLattice"
            width="72"
            height="72"
            patternUnits="userSpaceOnUse"
          >
            <rect
              x="18"
              y="18"
              width="36"
              height="36"
              fill="none"
              stroke="#059669"
              strokeWidth="0.9"
            />
            <rect
              x="18"
              y="18"
              width="36"
              height="36"
              transform="rotate(45 36 36)"
              fill="none"
              stroke="#B45309"
              strokeWidth="0.9"
            />
            <circle cx="36" cy="36" r="6" fill="none" stroke="#059669" strokeWidth="0.7" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#noorLightLattice)" />
      </svg>

      {/* Fancy Mode: warm golden lantern glow + subtle gold Islamic geometric lattice (hidden in other themes) */}
      <div className="noor-fancy-glow" aria-hidden="true" />
      <svg className="noor-fancy-lattice" aria-hidden="true">
        <defs>
          <pattern id="noorFancyLattice" width="72" height="72" patternUnits="userSpaceOnUse">
            <rect x="18" y="18" width="36" height="36" fill="none" stroke="#F5B942" strokeWidth="0.8" />
            <rect
              x="18"
              y="18"
              width="36"
              height="36"
              transform="rotate(45 36 36)"
              fill="none"
              stroke="#F5B942"
              strokeWidth="0.8"
            />
            <circle cx="36" cy="36" r="6" fill="none" stroke="#F5B942" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#noorFancyLattice)" />
      </svg>

      {/* Animated Splash Screen */}
      <AnimatePresence>
        {showSplash && (
          <SplashScreen lang={lang} onFinish={handleFinishSplash} />
        )}
      </AnimatePresence>

      {/* 3-Zone Top Bar */}
      <header className="noor-glass-bar sticky top-0 z-30 min-h-[52px] md:h-16 pt-safe bg-[#F4F1EA]/85 dark:bg-black/95 backdrop-blur-md border-b border-stone-200/80 dark:border-white/10">
        <div className="max-w-7xl mx-auto h-[52px] md:h-16 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-6">
          {/* Zone 1: Custom SVG NoorLogo + Brand Title */}
          <button
            type="button"
            onClick={() => navigateTo('home')}
            className="inline-flex items-center gap-2 text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-emerald-500"
          >
            <NoorLogo size={24} />
            <span>{t(lang, 'Noor', 'নূর')}</span>
          </button>

          {/* Zone 2: Desktop Single-Line Navigation Links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium"
          >
            {primaryNavItems.map((item) => {
              const active = isNavItemActive(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`py-1.5 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
                    active
                      ? 'text-emerald-700 dark:text-emerald-400 border-emerald-600 dark:border-emerald-400'
                      : 'text-zinc-600 dark:text-zinc-400 border-transparent hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {lang === 'bn' ? item.bn : item.en}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Theme Toggle + Notification Bell + User Avatar + EN/BN Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                updateState({
                  theme: theme === 'light' ? 'dark' : theme === 'dark' ? 'fancy' : 'light',
                })
              }
              data-testid="theme-toggle-btn"
              aria-label={
                theme === 'light'
                  ? t(lang, 'Switch to AMOLED Dark Mode', 'ডার্ক মোড চালু করুন')
                  : theme === 'dark'
                  ? t(lang, 'Switch to Fancy Mode', 'ফ্যান্সি মোড চালু করুন')
                  : t(lang, 'Switch to Light Mode', 'লাইট মোড চালু করুন')
              }
              className="noor-press w-9 h-9 rounded-xl bg-white/90 dark:bg-[#0B0B0D] border border-stone-200/80 dark:border-white/10 hover:border-stone-300 dark:hover:border-white/25 text-zinc-700 dark:text-amber-300 flex items-center justify-center transition-colors shadow-[0_2px_8px_rgba(16,24,40,0.05)] dark:shadow-none"
            >
              {theme === 'light' ? (
                <Sun className="w-4 h-4" aria-hidden="true" />
              ) : theme === 'dark' ? (
                <Moon className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Sparkles className="w-4 h-4" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={() => navigateTo('notifications')}
              data-testid="header-bell-btn"
              aria-label={t(lang, 'Azan & Hadith Notifications', 'আজান ও হাদীস নোটিফিকেশন')}
              className={`relative w-9 h-9 rounded-xl border flex items-center justify-center transition-colors shadow-[0_2px_8px_rgba(16,24,40,0.05)] dark:shadow-none ${
                route === 'notifications' || isAzanPlaying
                  ? 'bg-emerald-50/90 dark:bg-emerald-500/20 border-emerald-500/40 dark:border-emerald-500/50 text-emerald-700 dark:text-emerald-300'
                  : 'bg-white/90 dark:bg-[#0B0B0D] border-stone-200/80 dark:border-white/10 hover:border-stone-300 dark:hover:border-white/25 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <Bell className="w-4 h-4" aria-hidden="true" />
              {anyAlertActive && (
                <span
                  className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400"
                  aria-hidden="true"
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => navigateTo('profile')}
              data-testid="header-profile-btn"
              aria-label={t(lang, 'Account & Profile', 'অ্যাকাউন্ট ও প্রোফাইল')}
              className={`p-0.5 rounded-full border transition-colors ${
                route === 'profile'
                  ? 'border-emerald-600 dark:border-emerald-400'
                  : 'border-stone-300/80 dark:border-white/15 hover:border-emerald-500/50'
              }`}
            >
              <UserAvatarBadge avatarId={identity.avatarId} size="sm" />
            </button>

            <button
              type="button"
              onClick={() => updateState({ language: lang === 'en' ? 'bn' : 'en' })}
              data-testid="language-toggle"
              aria-label={
                lang === 'en' ? 'Switch language to Bengali' : 'Switch language to English'
              }
              className="px-2.5 sm:px-3 py-1.5 min-h-[36px] rounded-xl bg-white/90 dark:bg-[#0B0B0D] hover:bg-white dark:hover:bg-white/10 border border-stone-200/80 dark:border-white/15 text-xs font-semibold text-emerald-700 dark:text-emerald-300 whitespace-nowrap shrink-0 transition-colors shadow-[0_2px_8px_rgba(16,24,40,0.05)] dark:shadow-none"
            >
              {lang === 'en' ? 'বাংলা' : 'English'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content with Smooth Page-Transition Animations */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-24 md:pb-12 overflow-x-hidden">
        {/* Active Azan Alarm In-App Control Banner */}
        <AnimatePresence>
          {activeAzanBanner && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              data-testid="active-azan-banner"
              className="mb-5 rounded-2xl bg-white/90 dark:bg-[#0B0B0D] backdrop-blur-md border border-amber-500/45 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-[0_0_25px_rgba(245,158,11,0.12)]"
            >
              <div className="space-y-0.5 min-w-0">
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                  {activeAzanBanner.title}
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-300">{activeAzanBanner.body}</p>
                {azanIssue === 'failed' && (
                  <p className="text-[11px] text-red-600 dark:text-red-300">
                    {t(
                      lang,
                      'Azan audio could not be loaded. Check your connection or add Adhan files to public/audio/adhan.',
                      'আজানের অডিও লোড হয়নি। ইন্টারনেট সংযোগ দেখুন।'
                    )}
                  </p>
                )}
              </div>
              {azanIssue === 'needs-tap' && (
                <button
                  type="button"
                  onClick={playAzanAlarm}
                  data-testid="banner-play-azan-btn"
                  className="noor-press px-4 py-2 min-h-[40px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white dark:text-black font-semibold text-xs inline-flex items-center gap-1.5 self-start sm:self-center shrink-0"
                >
                  <Volume2 className="w-4 h-4" />
                  {t(lang, 'Tap to play Azan', 'আজান শুনতে ট্যাপ করুন')}
                </button>
              )}
              <button
                type="button"
                onClick={stopAzan}
                data-testid="banner-stop-azan-btn"
                className="px-4 py-2 min-h-[40px] rounded-xl bg-amber-500 hover:bg-amber-400 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-black font-semibold text-xs inline-flex items-center gap-1.5 self-start sm:self-center shrink-0"
              >
                <VolumeX className="w-4 h-4" />
                {t(lang, 'Mute / Stop Azan', 'আজান বন্ধ করুন')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Daily Hadith Push Toast (Click opens Hadith Page) */}
        <AnimatePresence>
          {activeHadithToast && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              data-testid="hadith-notification-banner"
              className="mb-5 rounded-2xl bg-white/90 dark:bg-[#0B0B0D] backdrop-blur-md border border-emerald-500/40 p-4 flex items-start justify-between gap-3 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none"
            >
              <button
                type="button"
                onClick={() => {
                  setActiveHadithToast(null);
                  navigateTo('hadith');
                }}
                className="text-left flex-1 min-w-0 space-y-1"
              >
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" aria-hidden="true" />
                  {activeHadithToast.title}
                </p>
                <p className="text-sm text-zinc-800 dark:text-zinc-200 line-clamp-2">
                  {activeHadithToast.body}
                </p>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                  {t(lang, 'Tap to open Hadith collection →', 'সম্পূর্ণ হাদীস পড়তে ট্যাপ করুন →')}
                </p>
              </button>
              <button
                type="button"
                onClick={() => setActiveHadithToast(null)}
                aria-label={t(lang, 'Dismiss alert', 'বন্ধ করুন')}
                className="w-8 h-8 rounded-lg bg-[#F4F1EA] dark:bg-black border border-stone-200/80 dark:border-white/10 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={route}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{
              y: { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 },
              opacity: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
            }}
          >
            {route === 'home' && (
              <HomeView
                state={state}
                prayerTimes={prayerTimes}
                now={now}
                onNavigate={navigateTo}
                onContinueReading={handleContinueReading}
                onToggleWaqt={handleToggleWaqt}
              />
            )}

            {route === 'quran' && (
              <QuranView
                state={state}
                initialJump={quranJump}
                onClearJump={() => setQuranJump(null)}
                onUpdateState={updateState}
              />
            )}

            {route === 'prayer' && (
              <PrayerTimesPage
                state={state}
                prayerTimes={prayerTimes}
                now={now}
                onUpdateState={updateState}
                onNavigate={navigateTo}
              />
            )}

            {route === 'qibla' && <QiblaPage state={state} onNavigate={navigateTo} />}

            {route === 'tracker' && (
              <TrackerPage
                state={state}
                prayerTimes={prayerTimes}
                now={now}
                onToggleWaqt={handleToggleWaqt}
                onUpdateState={updateState}
                onNavigate={navigateTo}
              />
            )}

            {route === 'calendar' && (
              <CalendarPage
                state={state}
                now={now}
                onUpdateState={updateState}
                onNavigate={navigateTo}
              />
            )}

            {route === 'hadith' && (
              <HadithPage state={state} onUpdateState={updateState} onNavigate={navigateTo} />
            )}

            {route === 'fiqh' && <FiqhPage state={state} onNavigate={navigateTo} />}

            {route === 'dua' && <DuaPage state={state} onNavigate={navigateTo} />}

            {route === 'tasbih' && (
              <TasbihPage state={state} onUpdateState={updateState} onNavigate={navigateTo} />
            )}

            {route === 'ruqyah' && <RuqyahPage state={state} onNavigate={navigateTo} />}

            {route === 'zakat' && (
              <ZakatPage state={state} onUpdateState={updateState} onNavigate={navigateTo} />
            )}

            {route === 'miras' && <MirasPage state={state} onNavigate={navigateTo} />}

            {route === 'nearby' && <NearbyPage state={state} onNavigate={navigateTo} />}

            {route === 'quiz' && (
              <QuizPage state={state} onUpdateState={updateState} onNavigate={navigateTo} />
            )}

            {route === 'card-maker' && <CardMakerPage state={state} onNavigate={navigateTo} />}

            {route === 'notifications' && (
              <NotificationsPage
                state={state}
                prayerTimes={prayerTimes}
                isAzanPlaying={isAzanPlaying}
                onRequestPermissions={requestNotificationPermissions}
                onTriggerTestAzan={triggerTestAzan}
                onStopAzan={stopAzan}
                onTriggerTestHadith={triggerHadithAlert}
                onUpdateState={updateState}
                onNavigate={navigateTo}
              />
            )}

            {route === 'profile' && (
              <ProfilePage
                state={state}
                onUpdateState={updateState}
                onExportJson={exportBackupJson}
                onImportJson={importBackupJson}
                onResetData={resetAllData}
                onNavigate={navigateTo}
              />
            )}

            {route === 'backup' && (
              <BackupPage
                state={state}
                onExportJson={exportBackupJson}
                onImportJson={importBackupJson}
                onResetData={resetAllData}
                onNavigate={navigateTo}
              />
            )}

            {route === 'ramadan' && (
              <RamadanPage
                state={state}
                prayerTimes={prayerTimes}
                now={now}
                onUpdateState={updateState}
                onNavigate={navigateTo}
              />
            )}

            {route === 'seerah' && (
              <SeerahPage
                state={state}
                onUpdateState={updateState}
                onNavigate={navigateTo}
              />
            )}

            {route === 'ai-assistant' && (
              <AIAssistantPage state={state} onNavigate={navigateTo} />
            )}

            {route === 'tools' && <ToolsHubPage state={state} onNavigate={navigateTo} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation Bar (Home, Quran, Prayer, Tasbih, All Tools) */}
      <nav
        aria-label="Mobile bottom navigation"
        className="noor-glass-bar md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 pb-safe bg-[#F4F1EA]/90 dark:bg-black/95 backdrop-blur-md border-t border-stone-200/80 dark:border-white/10 grid grid-cols-5 items-center"
      >
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const active = isNavItemActive(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigateTo(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
                active
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <span className="relative w-12 h-7 flex items-center justify-center">
                {active && (
                  <motion.span
                    layoutId="noor-nav-pill"
                    className="absolute inset-0 rounded-full bg-emerald-500/15"
                    transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                    aria-hidden="true"
                  />
                )}
                <motion.span
                  className="relative flex items-center justify-center"
                  animate={{ scale: active ? 1.08 : 1 }}
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 22 }}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </motion.span>
              </span>
              <span className="text-[10px] font-medium whitespace-nowrap">
                {lang === 'bn' ? item.bn : item.en}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

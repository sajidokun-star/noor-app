import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bookmark,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  Info,
  Languages,
  Minus,
  Palette,
  Pause,
  Play,
  Plus,
  Repeat,
  Search,
  SkipBack,
  SkipForward,
  Sparkles,
  X,
} from 'lucide-react';
import { claimAudio, releaseAudio } from '../utils/audioManager';
import type {
  AppPersistedState,
  AyahEntry,
  QuranBookmark,
  QuranWordItem,
  SurahMeta,
} from '../types/islamic';
import {
  BENGALI_SURAH_NAMES,
  FALLBACK_FATIHA_AYAHS,
  FALLBACK_SURAHS,
} from '../data/surahFallback';
import { formatNum, t } from '../utils/i18n';
import {
  getTajweedTextClass,
  parseTajweedText,
  stripTajweedMarkup,
  TAJWEED_LEGEND,
} from '../utils/tajweed';
import { sanitizeTafsirHtml, synthesizeAyahCoreLesson } from '../utils/ayahReflection';
import {
  buildFallbackWordsFromArabic,
  countArabicStats,
  FATIHA_WORDS_BY_AYAH,
  parseQuranComWordsResponse,
} from '../utils/wordByWord';
import { OrnateEndRosette } from './OrnateEndRosette';

interface QuranViewProps {
  state: AppPersistedState;
  initialJump?: { surahNumber: number; ayahNumber: number } | null;
  onClearJump?: () => void;
  onUpdateState: (
    updater: Partial<AppPersistedState> | ((prev: AppPersistedState) => AppPersistedState)
  ) => void;
}

interface DualTafsirData {
  bn: string;
  en: string;
  bnSource: string;
  enSource: string;
}

const SURAH_LIST_CACHE_KEY = 'noor_surah_list_cache_v1';

export const QuranView: React.FC<QuranViewProps> = ({
  state,
  initialJump,
  onClearJump,
  onUpdateState,
}) => {
  const lang = state.language;
  const [surahs, setSurahs] = useState<SurahMeta[]>(() => {
    try {
      const cached = localStorage.getItem(SURAH_LIST_CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return FALLBACK_SURAHS;
  });

  const [selectedSurah, setSelectedSurah] = useState<SurahMeta | null>(null);
  const [ayahs, setAyahs] = useState<AyahEntry[]>([]);
  const [loadingSurah, setLoadingSurah] = useState(false);
  const [surahError, setSurahError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'surahs' | 'bookmarks'>('surahs');
  const [showTajweedGuide, setShowTajweedGuide] = useState(false);

  // Expanded Ayah Tafsir & Core Lesson state
  const [tafsirCache, setTafsirCache] = useState<Record<string, DualTafsirData>>({});
  const [expandedAyahNum, setExpandedAyahNum] = useState<number | null>(null);
  const [loadingTafsirAyah, setLoadingTafsirAyah] = useState<number | null>(null);

  // Word-by-Word & Grammar state
  const [wordsMap, setWordsMap] = useState<Record<string, QuranWordItem[]>>(() => ({
    ...FATIHA_WORDS_BY_AYAH,
  }));
  const [wordModeAyahs, setWordModeAyahs] = useState<Record<number, boolean>>({});
  const [selectedWordMap, setSelectedWordMap] = useState<Record<number, number>>({});
  const [loadingWordsForSurah, setLoadingWordsForSurah] = useState<number | null>(null);

  // Audio & Hifz state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingAyahIndex, setPlayingAyahIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [remainingRepeats, setRemainingRepeats] = useState<number>(0);
  const [hifzRangeStart, setHifzRangeStart] = useState<number>(1);
  const [hifzRangeEnd, setHifzRangeEnd] = useState<number>(7);
  const [hifzRangeActive, setHifzRangeActive] = useState(false);

  const repeatCount = state.quranRepeatCount ?? 1;

  // Fetch all 114 Surahs once
  useEffect(() => {
    let active = true;
    fetch('https://api.alquran.cloud/v1/surah')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Network error'))))
      .then((json) => {
        if (!active || !Array.isArray(json?.data)) return;
        const mapped: SurahMeta[] = json.data.map(
          (s: {
            number: number;
            name: string;
            englishName: string;
            englishNameTranslation: string;
            numberOfAyahs: number;
            revelationType: string;
          }) => ({
            number: s.number,
            name: s.name,
            englishName: s.englishName,
            englishNameTranslation: s.englishNameTranslation,
            bengaliName: BENGALI_SURAH_NAMES[s.number] ?? s.englishName,
            numberOfAyahs: s.numberOfAyahs,
            revelationType: s.revelationType,
          })
        );
        setSurahs(mapped);
        try {
          localStorage.setItem(SURAH_LIST_CACHE_KEY, JSON.stringify(mapped));
        } catch {
          // ignore
        }
      })
      .catch(() => {
        // Fallback already populated
      });
    return () => {
      active = false;
    };
  }, []);

  // Support jumping directly to lastRead / bookmark from Home
  useEffect(() => {
    if (!initialJump) return;
    const found =
      surahs.find((s) => s.number === initialJump.surahNumber) ??
      FALLBACK_SURAHS.find((s) => s.number === initialJump.surahNumber);
    if (found) {
      openSurah(found, initialJump.ayahNumber);
      onClearJump?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialJump, surahs.length]);

  const recordLastRead = (surah: SurahMeta, ayahNumber: number) => {
    onUpdateState((prev) => {
      const changed =
        !prev.lastRead ||
        prev.lastRead.surahNumber !== surah.number ||
        prev.lastRead.ayahNumber !== ayahNumber;
      return {
        ...prev,
        ayahsReadCount: changed ? (prev.ayahsReadCount ?? 0) + 1 : prev.ayahsReadCount ?? 0,
        lastRead: {
          surahNumber: surah.number,
          surahNameEn: surah.englishName,
          surahNameBn: surah.bengaliName,
          surahNameAr: surah.name,
          ayahNumber,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  };

  // Load Surah verses with quran-tajweed edition
  const openSurah = async (surah: SurahMeta, jumpToAyah?: number) => {
    stopAudio();
    setSelectedSurah(surah);
    setExpandedAyahNum(jumpToAyah ?? null);
    setWordModeAyahs({});
    setSelectedWordMap({});
    setSurahError(null);
    setHifzRangeStart(1);
    setHifzRangeEnd(surah.numberOfAyahs);
    setHifzRangeActive(false);

    recordLastRead(surah, jumpToAyah ?? 1);

    const cacheKey = `noor_surah_tajweed_v2_${surah.number}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as AyahEntry[];
        setAyahs(parsed);
        if (jumpToAyah) {
          const target = parsed.find((a) => a.numberInSurah === jumpToAyah);
          if (target) fetchDualTafsir(surah.number, target);
          setTimeout(() => {
            document
              .getElementById(`ayah-${jumpToAyah}`)
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 150);
        }
        return;
      }
    } catch {
      // ignore
    }

    setLoadingSurah(true);
    try {
      const res = await fetch(
        `https://api.alquran.cloud/v1/surah/${surah.number}/editions/quran-tajweed,bn.bengali,en.sahih,ar.alafasy`
      );
      if (!res.ok) throw new Error('Failed to load Surah');
      const json = await res.json();
      const editions = json?.data;
      if (!Array.isArray(editions) || editions.length < 3) {
        throw new Error('Incomplete editions');
      }

      const tajweedAyahs = editions[0]?.ayahs ?? [];
      const bnAyahs = editions[1]?.ayahs ?? [];
      const enAyahs = editions[2]?.ayahs ?? [];
      const audioAyahs = editions[3]?.ayahs ?? [];

      const combined: AyahEntry[] = tajweedAyahs.map(
        (a: { number: number; numberInSurah: number; text: string }, idx: number) => ({
          number: a.number,
          numberInSurah: a.numberInSurah,
          arabic: stripTajweedMarkup(a.text),
          tajweedRaw: a.text,
          bengali: bnAyahs[idx]?.text ?? '',
          english: enAyahs[idx]?.text ?? '',
          audioUrl:
            audioAyahs[idx]?.audio ??
            `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${a.number}.mp3`,
        })
      );

      setAyahs(combined);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(combined));
      } catch {
        // ignore storage full
      }
      if (jumpToAyah) {
        const target = combined.find((a) => a.numberInSurah === jumpToAyah);
        if (target) fetchDualTafsir(surah.number, target);
        setTimeout(() => {
          document
            .getElementById(`ayah-${jumpToAyah}`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
    } catch {
      if (surah.number === 1) {
        setAyahs(FALLBACK_FATIHA_AYAHS);
      } else {
        setAyahs([]);
        setSurahError(
          t(
            lang,
            'Could not fetch Surah from Al-Quran Cloud. Check your internet connection and retry.',
            'ইন্টারনেট সংযোগ না থাকায় সূরাটি লোড করা যায়নি। পুনরায় চেষ্টা করুন।'
          )
        );
      }
    } finally {
      setLoadingSurah(false);
    }
  };

  const fetchDualTafsir = async (surahNum: number, ayah: AyahEntry) => {
    const key = `${surahNum}:${ayah.numberInSurah}`;
    if (tafsirCache[key]) return;

    setLoadingTafsirAyah(ayah.numberInSurah);

    let bnText = '';
    let enText = '';

    await Promise.all([
      // Bengali Tafsir (Tafsir Abu Bakr Zakaria - Quran.com API v4)
      fetch(`https://api.quran.com/api/v4/tafsirs/166/by_ayah/${surahNum}:${ayah.numberInSurah}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.tafsir?.text) {
            bnText = sanitizeTafsirHtml(d.tafsir.text);
          }
        })
        .catch(() => {}),
      // English Tafsir (Ibn Kathir Abridged - Quran.com API v4)
      fetch(`https://api.quran.com/api/v4/tafsirs/169/by_ayah/${surahNum}:${ayah.numberInSurah}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.tafsir?.text) {
            enText = sanitizeTafsirHtml(d.tafsir.text);
          }
        })
        .catch(() => {}),
    ]);

    const fallbackBn =
      ayah.bengali ||
      'এই আয়াতের অর্থ ও শিক্ষা গভীরভাবে অনুধাবন করুন এবং দৈনন্দিন জীবনে তা বাস্তবায়ন করুন।';
    const fallbackEn =
      enText ||
      ayah.tafsir ||
      ayah.english ||
      'Reflect carefully on the guidance and wisdom revealed in this verse.';

    setTafsirCache((prev) => ({
      ...prev,
      [key]: {
        bn: bnText || fallbackBn,
        en: fallbackEn,
        bnSource: bnText
          ? 'তাফসীর আবু বকর যাকারিয়া'
          : 'অনুবাদ ও সংক্ষিপ্ত ব্যাখ্যা',
        enSource: enText ? 'Tafsir Ibn Kathir' : 'Concise Commentary',
      },
    }));
    setLoadingTafsirAyah(null);
  };

  const handleAyahExpand = (ayah: AyahEntry) => {
    if (!selectedSurah) return;
    recordLastRead(selectedSurah, ayah.numberInSurah);
    if (expandedAyahNum === ayah.numberInSurah) {
      setExpandedAyahNum(null);
      return;
    }
    setExpandedAyahNum(ayah.numberInSurah);
    fetchDualTafsir(selectedSurah.number, ayah);
  };

  const fetchChapterWords = async (surahNumber: number) => {
    if (surahNumber === 1) {
      setWordsMap((prev) => ({ ...FATIHA_WORDS_BY_AYAH, ...prev }));
      return;
    }

    const storageKey = `noor_surah_words_v1_${surahNumber}`;
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached) as Record<string, QuranWordItem[]>;
        if (parsed && Object.keys(parsed).length > 0) {
          setWordsMap((prev) => ({ ...prev, ...parsed }));
          return;
        }
      }
    } catch {
      // ignore storage errors
    }

    setLoadingWordsForSurah(surahNumber);
    try {
      const enUrl = `https://api.quran.com/api/v4/verses/by_chapter/${surahNumber}?words=true&word_fields=text_uthmani,transliteration,translation,root_word&per_page=300`;
      const bnUrl = `https://api.quran.com/api/v4/verses/by_chapter/${surahNumber}?language=bn&words=true&word_fields=text_uthmani,transliteration,translation,root_word&per_page=300`;

      const [enRes, bnRes] = await Promise.all([
        fetch(enUrl).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(bnUrl).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      if (Array.isArray(enRes?.verses)) {
        const parsed = parseQuranComWordsResponse(enRes.verses, bnRes?.verses);
        setWordsMap((prev) => ({ ...prev, ...parsed }));
        try {
          localStorage.setItem(storageKey, JSON.stringify(parsed));
        } catch {
          // ignore storage quota errors
        }
      }
    } finally {
      setLoadingWordsForSurah((curr) => (curr === surahNumber ? null : curr));
    }
  };

  const handleToggleWordMode = (ayah: AyahEntry) => {
    if (!selectedSurah) return;
    const ayahNum = ayah.numberInSurah;
    const nextOpen = !wordModeAyahs[ayahNum];
    setWordModeAyahs((prev) => ({ ...prev, [ayahNum]: nextOpen }));

    if (nextOpen) {
      setSelectedWordMap((prev) => (prev[ayahNum] ? prev : { ...prev, [ayahNum]: 1 }));
      const key = `${selectedSurah.number}:${ayahNum}`;
      if (!wordsMap[key]) {
        fetchChapterWords(selectedSurah.number);
      }
    }
  };

  // Audio playback logic
  const stopAudio = () => {
    releaseAudio('quran');
    setIsPlaying(false);
    setPlayingAyahIndex(null);
  };

  const playAyahAtIndex = (index: number, initialRepeatOverride?: number) => {
    if (index < 0 || index >= ayahs.length) {
      stopAudio();
      return;
    }
    const targetAyah = ayahs[index];
    if (selectedSurah) {
      recordLastRead(selectedSurah, targetAyah.numberInSurah);
    }
    // Claim the single shared audio element: stops any Azan/Ruqyah/previous ayah first.
    const audio = claimAudio('quran', () => {
      setIsPlaying(false);
      setPlayingAyahIndex(null);
    });
    audioRef.current = audio;
    audio.src = targetAyah.audioUrl;
    setPlayingAyahIndex(index);
    setRemainingRepeats(initialRepeatOverride ?? repeatCount - 1);
    setIsPlaying(true);

    audio.play().catch(() => {
      setIsPlaying(false);
    });
  };

  const togglePlayPause = () => {
    if (!audioRef.current || playingAyahIndex === null) {
      if (ayahs.length > 0) {
        const startIdx = hifzRangeActive ? Math.max(0, hifzRangeStart - 1) : 0;
        playAyahAtIndex(startIdx);
      }
      return;
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      if (playingAyahIndex === null) return;
      if (repeatCount === 999) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      if (remainingRepeats > 0) {
        setRemainingRepeats((r) => r - 1);
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }

      const nextIdx = playingAyahIndex + 1;
      if (hifzRangeActive) {
        const endIdx = Math.min(ayahs.length - 1, hifzRangeEnd - 1);
        const startIdx = Math.max(0, hifzRangeStart - 1);
        if (nextIdx <= endIdx) {
          playAyahAtIndex(nextIdx);
        } else {
          playAyahAtIndex(startIdx);
        }
      } else if (nextIdx < ayahs.length) {
        playAyahAtIndex(nextIdx);
      } else {
        setIsPlaying(false);
        setPlayingAyahIndex(null);
      }
    };

    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  });

  useEffect(() => {
    return () => {
      releaseAudio('quran');
    };
  }, []);

  const filteredSurahs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return surahs;
    return surahs.filter(
      (s) =>
        String(s.number) === q ||
        s.englishName.toLowerCase().includes(q) ||
        s.englishNameTranslation.toLowerCase().includes(q) ||
        s.bengaliName.toLowerCase().includes(q) ||
        s.name.includes(q)
    );
  }, [surahs, searchQuery]);

  const surahStats = useMemo(() => {
    return ayahs.reduce(
      (acc, a) => {
        const s = countArabicStats(a.arabic);
        return { words: acc.words + s.words, letters: acc.letters + s.letters };
      },
      { words: 0, letters: 0 }
    );
  }, [ayahs]);

  const isBookmarked = (surahNumber: number, ayahNumber: number) =>
    state.quranBookmarks.some(
      (b) => b.surahNumber === surahNumber && b.ayahNumber === ayahNumber
    );

  const toggleBookmark = (ayah: AyahEntry) => {
    if (!selectedSurah) return;
    onUpdateState((prev) => {
      const exists = prev.quranBookmarks.some(
        (b) =>
          b.surahNumber === selectedSurah.number &&
          b.ayahNumber === ayah.numberInSurah
      );
      if (exists) {
        return {
          ...prev,
          quranBookmarks: prev.quranBookmarks.filter(
            (b) =>
              !(
                b.surahNumber === selectedSurah.number &&
                b.ayahNumber === ayah.numberInSurah
              )
          ),
        };
      }
      const next: QuranBookmark = {
        surahNumber: selectedSurah.number,
        surahNameEn: selectedSurah.englishName,
        surahNameAr: selectedSurah.name,
        ayahNumber: ayah.numberInSurah,
        arabic: ayah.arabic,
        translationEn: ayah.english,
        translationBn: ayah.bengali,
        savedAt: new Date().toISOString(),
      };
      return {
        ...prev,
        quranBookmarks: [next, ...prev.quranBookmarks],
      };
    });
  };

  // Surah Reader View
  if (selectedSurah) {
    const currentPlayingAyah =
      playingAyahIndex !== null ? ayahs[playingAyahIndex] : null;

    return (
      <div className="space-y-6 animate-panel w-full max-w-full overflow-x-hidden">
        {/* Top Surah Header & Controls */}
        <div className="rounded-3xl bg-white/90 backdrop-blur-md dark:bg-[#09090B] border border-stone-200/80 dark:border-white/10 p-4 sm:p-6 space-y-5 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => {
                stopAudio();
                setSelectedSurah(null);
              }}
              className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white min-h-[44px] px-3 rounded-xl bg-[#F4F1EA] dark:bg-white/5 hover:bg-black/[0.07] dark:hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              {t(lang, 'All Surahs', 'সকল সূরা')}
            </button>

            <div className="text-center flex-1 min-w-[160px]">
              <h1 className="text-lg sm:text-2xl font-bold text-zinc-900 dark:text-white">
                {formatNum(lang, selectedSurah.number)}.{' '}
                {lang === 'bn' ? selectedSurah.bengaliName : selectedSurah.englishName}
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                {selectedSurah.name} · {selectedSurah.revelationType} ·{' '}
                {formatNum(lang, selectedSurah.numberOfAyahs)}{' '}
                {t(lang, 'Ayahs', 'আয়াত')}
                {surahStats.words > 0 && (
                  <>
                    {' '}
                    ·{' '}
                    <span data-testid="surah-word-letter-stats" className="font-mono-num">
                      {formatNum(lang, surahStats.words)} {t(lang, 'Words', 'শব্দ')} ·{' '}
                      {formatNum(lang, surahStats.letters)} {t(lang, 'Letters', 'অক্ষর')}
                    </span>
                  </>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={togglePlayPause}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors whitespace-nowrap"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Play className="w-4 h-4" aria-hidden="true" />
              )}
              {isPlaying
                ? t(lang, 'Pause', 'বিরতি')
                : t(lang, 'Play Surah', 'তিলাওয়াত শুনুন')}
            </button>
          </div>

          {/* Reader Settings Bar: Font Size, Translation Language, Hifz Loop */}
          <div className="pt-4 border-t border-black/[0.07] dark:border-white/10 grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
            {/* Arabic Font Size */}
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                {t(lang, 'Noorani Size', 'নূরানী ফন্ট')}:{' '}
                <strong className="text-zinc-900 dark:text-zinc-200 font-mono-num">
                  {state.quranFontSize}px
                </strong>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Decrease Arabic font size"
                  onClick={() =>
                    onUpdateState((p) => ({
                      ...p,
                      quranFontSize: Math.max(22, p.quranFontSize - 2),
                    }))
                  }
                  className="w-9 h-9 rounded-lg bg-[#F4F1EA] dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-zinc-800 dark:text-zinc-200"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="Increase Arabic font size"
                  onClick={() =>
                    onUpdateState((p) => ({
                      ...p,
                      quranFontSize: Math.min(48, p.quranFontSize + 2),
                    }))
                  }
                  className="w-9 h-9 rounded-lg bg-[#F4F1EA] dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-zinc-800 dark:text-zinc-200"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Translation Mode */}
            <div className="flex items-center gap-1 bg-[#F4F1EA] dark:bg-black/70 p-1 rounded-xl border border-stone-200/80 dark:border-white/10 overflow-x-auto">
              {(
                [
                  { id: 'both', en: 'Both', bn: 'উভয়' },
                  { id: 'bn', en: 'Bengali', bn: 'বাংলা' },
                  { id: 'en', en: 'English', bn: 'ইংরেজি' },
                  { id: 'none', en: 'Arabic', bn: 'শুধু আরবি' },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onUpdateState({ quranTranslationMode: mode.id })}
                  className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    state.quranTranslationMode === mode.id
                      ? 'bg-emerald-500 text-black font-semibold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  {lang === 'bn' ? mode.bn : mode.en}
                </button>
              ))}
            </div>

            {/* Hifz Loop Controls */}
            <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <Repeat className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" aria-hidden="true" />
                <span>{t(lang, 'Hifz Repeat', 'হিফজ পুনরাবৃত্তি')}:</span>
              </div>
              <div className="flex items-center gap-1">
                {([1, 3, 5, 999] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onUpdateState({ quranRepeatCount: r })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono-num transition-colors ${
                      repeatCount === r
                        ? 'bg-amber-400 text-black font-semibold'
                        : 'bg-[#F4F1EA] dark:bg-white/5 text-zinc-700 dark:text-zinc-300 hover:bg-black/10 dark:hover:bg-white/10'
                    }`}
                  >
                    {r === 999 ? '∞' : `${r}x`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Noorani Tajweed Controls + Guide Button + Hifz Range */}
          <div className="pt-3 border-t border-black/[0.07] dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-pressed={state.tajweedEnabled}
                data-testid="tajweed-toggle-btn"
                onClick={() => onUpdateState({ tajweedEnabled: !state.tajweedEnabled })}
                className={`inline-flex items-center gap-2 px-3 py-2 min-h-[40px] rounded-xl text-xs font-medium border transition-colors ${
                  state.tajweedEnabled
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                    : 'bg-[#F4F1EA] dark:bg-white/5 border-stone-200/80 dark:border-white/10 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <Palette className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {t(lang, 'Tajweed Colors', 'তাজবিদ কালার')}:{' '}
                  {state.tajweedEnabled ? t(lang, 'ON', 'চালু') : t(lang, 'OFF', 'বন্ধ')}
                </span>
              </button>

              <button
                type="button"
                aria-expanded={showTajweedGuide}
                data-testid="tajweed-guide-btn"
                onClick={() => setShowTajweedGuide((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-[#F4F1EA] dark:bg-white/5 hover:bg-black/[0.07] dark:hover:bg-white/10 border border-stone-200/80 dark:border-white/10 text-xs font-medium text-amber-700 dark:text-amber-300 transition-colors"
              >
                <Info className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t(lang, 'Tajweed Color Guide', 'তাজবিদ কালার নির্দেশিকা')}</span>
              </button>
            </div>

            {ayahs.length > 1 && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <label className="inline-flex items-center gap-2 cursor-pointer text-zinc-800 dark:text-zinc-200">
                  <input
                    type="checkbox"
                    checked={hifzRangeActive}
                    onChange={(e) => setHifzRangeActive(e.target.checked)}
                    className="accent-emerald-500 w-4 h-4"
                  />
                  <span>{t(lang, 'Hifz Range', 'হিফজ লুপ')}</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={ayahs.length}
                    value={hifzRangeStart}
                    onChange={(e) =>
                      setHifzRangeStart(
                        Math.max(1, Math.min(ayahs.length, Number(e.target.value) || 1))
                      )
                    }
                    aria-label="Hifz range start ayah"
                    className="w-14 bg-[#F4F1EA] dark:bg-black border border-stone-200/80 dark:border-white/15 rounded-lg px-2 py-1 text-zinc-900 dark:text-zinc-100 font-mono-num"
                  />
                  <span>–</span>
                  <input
                    type="number"
                    min={1}
                    max={ayahs.length}
                    value={hifzRangeEnd}
                    onChange={(e) =>
                      setHifzRangeEnd(
                        Math.max(1, Math.min(ayahs.length, Number(e.target.value) || ayahs.length))
                      )
                    }
                    aria-label="Hifz range end ayah"
                    className="w-14 bg-[#F4F1EA] dark:bg-black border border-stone-200/80 dark:border-white/15 rounded-lg px-2 py-1 text-zinc-900 dark:text-zinc-100 font-mono-num"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Expandable Tajweed Color Guide Legend */}
          <AnimatePresence>
            {showTajweedGuide && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div
                  data-testid="tajweed-guide-panel"
                  className="pt-4 border-t border-black/[0.07] dark:border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                >
                  {TAJWEED_LEGEND.map((item) => (
                    <div
                      key={item.rule}
                      className="rounded-2xl bg-[#F7F4EC] dark:bg-black/70 border border-stone-200/80 dark:border-white/10 p-3 flex items-start gap-3"
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full mt-1 shrink-0 ${item.swatchClass}`}
                        aria-hidden="true"
                      />
                      <div className="space-y-0.5">
                        <p className={`text-xs font-semibold ${item.textClass}`}>
                          {lang === 'bn' ? item.labelBn : item.labelEn}
                        </p>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                          {lang === 'bn' ? item.descBn : item.descEn}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sticky Audio Mini-Bar when active */}
        {playingAyahIndex !== null && currentPlayingAyah && (
          <div className="rounded-2xl bg-white/90 backdrop-blur-md dark:bg-black border border-emerald-500/45 px-4 py-3 flex items-center justify-between gap-4 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                {lang === 'bn' ? selectedSurah.bengaliName : selectedSurah.englishName} ·{' '}
                {t(lang, 'Ayah', 'আয়াত')} {formatNum(lang, currentPlayingAyah.numberInSurah)}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {t(lang, 'Reciter: Mishary Rashid Alafasy', 'ক্বারী: মিশারি রশিদ আল-আফাসি')}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                aria-label="Previous Ayah"
                onClick={() => playAyahAtIndex(Math.max(0, playingAyahIndex - 1))}
                className="w-10 h-10 rounded-xl bg-[#F4F1EA] dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-zinc-800 dark:text-zinc-200"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label={isPlaying ? 'Pause recitation' : 'Resume recitation'}
                onClick={togglePlayPause}
                className="w-10 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center text-black"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                type="button"
                aria-label="Next Ayah"
                onClick={() =>
                  playAyahAtIndex(Math.min(ayahs.length - 1, playingAyahIndex + 1))
                }
                className="w-10 h-10 rounded-xl bg-[#F4F1EA] dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-zinc-800 dark:text-zinc-200"
              >
                <SkipForward className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Stop audio"
                onClick={stopAudio}
                className="w-10 h-10 rounded-xl bg-[#F4F1EA] dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-zinc-500 dark:text-zinc-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Loading / Error / Ayahs */}
        {loadingSurah ? (
          <div className="rounded-3xl bg-white/90 backdrop-blur-md dark:bg-[#09090B] border border-stone-200/80 dark:border-white/10 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none p-10 text-center text-zinc-500 dark:text-zinc-400">
            {t(
              lang,
              'Loading Noorani Tajweed Surah...',
              'নূরানী তাজবিদ কুরআন লোড হচ্ছে...'
            )}
          </div>
        ) : surahError ? (
          <div className="rounded-3xl bg-white/90 backdrop-blur-md dark:bg-[#09090B] border border-red-500/30 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none p-8 text-center space-y-4">
            <p className="text-sm text-red-600 dark:text-red-300">{surahError}</p>
            <button
              type="button"
              onClick={() => openSurah(selectedSurah)}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-black text-sm font-semibold"
            >
              {t(lang, 'Retry', 'পুনরায় চেষ্টা করুন')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedSurah.number !== 1 && selectedSurah.number !== 9 && (
              <div className="text-center py-4">
                <p className="font-quran text-3xl sm:text-4xl text-amber-700 dark:text-amber-200/95">
                  بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                </p>
              </div>
            )}

            <p className="text-xs text-zinc-500 text-center">
              {t(
                lang,
                'Tap any Ayah card to view Bengali & English Tafsir and "What Allah Wants Us to Understand".',
                'যেকোনো আয়াতে ট্যাপ করে বাংলা ও ইংরেজি তাফসীর এবং "আল্লাহ আমাদের কী বোঝাতে চেয়েছেন" দেখুন।'
              )}
            </p>

            {ayahs.map((ayah, idx) => {
              const activePlay = playingAyahIndex === idx;
              const bookmarked = isBookmarked(selectedSurah.number, ayah.numberInSurah);
              const isExpanded = expandedAyahNum === ayah.numberInSurah;
              const tafsirKey = `${selectedSurah.number}:${ayah.numberInSurah}`;
              const tafsirData = tafsirCache[tafsirKey];
              const coreLesson = synthesizeAyahCoreLesson(
                selectedSurah.number,
                ayah.numberInSurah,
                ayah.english,
                ayah.bengali
              );

              const tajweedSegments = parseTajweedText(ayah.tajweedRaw || ayah.arabic);
              const isWordMode = !!wordModeAyahs[ayah.numberInSurah];
              const ayahWords =
                wordsMap[tafsirKey] ?? buildFallbackWordsFromArabic(ayah.arabic, tafsirKey);
              const selectedWordPos = selectedWordMap[ayah.numberInSurah] ?? ayahWords[0]?.position ?? 1;
              const selectedWord =
                ayahWords.find((w) => w.position === selectedWordPos) ?? ayahWords[0] ?? null;
              const ayahStats = countArabicStats(ayah.arabic);

              return (
                <article
                  key={ayah.number}
                  id={`ayah-${ayah.numberInSurah}`}
                  data-testid={`ayah-card-${ayah.numberInSurah}`}
                  className={`rounded-3xl border transition-all duration-200 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none ${
                    activePlay
                      ? 'bg-white/90 backdrop-blur-md dark:bg-[#09090B] border-emerald-500/60 shadow-[0_0_24px_rgba(16,185,129,0.14)]'
                      : isExpanded || isWordMode
                      ? 'bg-white/90 backdrop-blur-md dark:bg-[#09090B] border-emerald-500/45 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                      : 'bg-white/90 backdrop-blur-md dark:bg-[#09090B] border-stone-200/80 dark:border-white/10 hover:border-stone-300 dark:hover:border-white/25'
                  }`}
                >
                  {/* Header Actions Bar */}
                  <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-black/[0.06] dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-mono-num text-zinc-500 dark:text-zinc-400">
                      {formatNum(lang, selectedSurah.number)}:
                      {formatNum(lang, ayah.numberInSurah)}
                    </span>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          activePlay && isPlaying
                            ? togglePlayPause()
                            : playAyahAtIndex(idx)
                        }
                        aria-label={`Play Ayah ${ayah.numberInSurah}`}
                        className="min-h-[40px] px-2.5 sm:px-3 rounded-xl bg-[#F4F1EA] dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xs font-medium text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5"
                      >
                        {activePlay && isPlaying ? (
                          <Pause className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Play className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        )}
                        <span>{t(lang, 'Listen', 'শুনুন')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleWordMode(ayah)}
                        aria-expanded={isWordMode}
                        data-testid={`wbw-btn-${ayah.numberInSurah}`}
                        className={`min-h-[40px] px-2.5 sm:px-3 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                          isWordMode
                            ? 'bg-amber-500 text-black font-semibold'
                            : 'bg-[#F4F1EA] dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-200'
                        }`}
                      >
                        <Languages className="w-3.5 h-3.5" />
                        <span>{t(lang, 'Word-by-Word', 'শব্দে শব্দে')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAyahExpand(ayah)}
                        aria-expanded={isExpanded}
                        data-testid={`tafsir-btn-${ayah.numberInSurah}`}
                        className={`min-h-[40px] px-2.5 sm:px-3 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                          isExpanded
                            ? 'bg-emerald-500 text-black font-semibold'
                            : 'bg-[#F4F1EA] dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-200'
                        }`}
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{t(lang, 'Tafsir & Lesson', 'তাফসীর ও শিক্ষা')}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleBookmark(ayah)}
                        aria-label={`Bookmark Ayah ${ayah.numberInSurah}`}
                        aria-pressed={bookmarked}
                        className={`min-h-[40px] w-10 rounded-xl flex items-center justify-center transition-colors ${
                          bookmarked
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300'
                            : 'bg-[#F4F1EA] dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400'
                        }`}
                      >
                        <Bookmark
                          className="w-4 h-4"
                          fill={bookmarked ? 'currentColor' : 'none'}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Tactile Clickable Ayah Body */}
                  <button
                    type="button"
                    onClick={() => handleAyahExpand(ayah)}
                    className="w-full text-left px-5 sm:px-6 py-5 active:scale-[0.992] transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-emerald-500 rounded-b-3xl"
                  >
                    {/* Color-Coded Noorani Arabic Text + Ornate Rosette End Marker */}
                    <p
                      className="font-quran text-right font-medium"
                      style={{ fontSize: `${state.quranFontSize}px` }}
                    >
                      {tajweedSegments.map((seg, sIdx) => (
                        <span
                          key={sIdx}
                          className={getTajweedTextClass(seg.rule, state.tajweedEnabled)}
                        >
                          {seg.text}
                        </span>
                      ))}
                      <OrnateEndRosette number={ayah.numberInSurah} label={`Ayah ${ayah.numberInSurah}`} />
                    </p>

                    {state.quranTranslationMode !== 'none' && (
                      <div className="space-y-2.5 pt-4 mt-3 border-t border-black/[0.06] dark:border-white/5">
                        {(state.quranTranslationMode === 'both' ||
                          state.quranTranslationMode === 'bn') && (
                          <p className="text-sm sm:text-base text-zinc-900 dark:text-zinc-200 leading-relaxed">
                            {ayah.bengali}
                          </p>
                        )}
                        {(state.quranTranslationMode === 'both' ||
                          state.quranTranslationMode === 'en') && (
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                            {ayah.english}
                          </p>
                        )}
                      </div>
                    )}
                  </button>

                  {/* Interactive Word-by-Word & Grammar Breakdown Panel */}
                  <AnimatePresence initial={false}>
                    {isWordMode && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div
                          data-testid={`wbw-panel-${ayah.numberInSurah}`}
                          className="px-4 sm:px-6 pb-5 pt-4 border-t border-amber-500/25 bg-amber-500/[0.03] dark:bg-amber-500/[0.04] space-y-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                              <Languages className="w-3.5 h-3.5" aria-hidden="true" />
                              {t(
                                lang,
                                'Word-by-Word & Grammar (Tap any Arabic word)',
                                'শব্দে শব্দে ও ব্যাকরণ (যেকোনো আরবি শব্দে ট্যাপ করুন)'
                              )}
                            </span>
                            <span className="text-xs font-mono-num text-zinc-500 dark:text-zinc-400">
                              {formatNum(lang, ayahStats.words)} {t(lang, 'Words', 'শব্দ')} ·{' '}
                              {formatNum(lang, ayahStats.letters)} {t(lang, 'Letters', 'অক্ষর')}
                            </span>
                          </div>

                          {loadingWordsForSurah === selectedSurah.number &&
                            !wordsMap[tafsirKey] && (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {t(
                                  lang,
                                  'Loading word lexicon & transliteration...',
                                  'শব্দার্থ ও উচ্চারণ লোড হচ্ছে...'
                                )}
                              </p>
                            )}

                          {/* RTL Clickable Arabic Word Chips */}
                          <div dir="rtl" className="flex flex-wrap gap-2">
                            {ayahWords.map((word) => {
                              const activeWord = selectedWord?.position === word.position;
                              return (
                                <button
                                  key={`${ayah.numberInSurah}-${word.position}`}
                                  type="button"
                                  data-testid={`wbw-word-${ayah.numberInSurah}-${word.position}`}
                                  onClick={() =>
                                    setSelectedWordMap((prev) => ({
                                      ...prev,
                                      [ayah.numberInSurah]: word.position,
                                    }))
                                  }
                                  className={`px-3 py-2 rounded-2xl border text-center transition-all min-w-[72px] ${
                                    activeWord
                                      ? 'bg-emerald-500/15 border-emerald-500 shadow-xs'
                                      : 'bg-white/90 dark:bg-black/70 border-stone-200/80 dark:border-white/10 hover:border-emerald-500/45'
                                  }`}
                                >
                                  <span className="block font-quran text-2xl leading-[1.8] text-zinc-900 dark:text-white">
                                    {word.arabic}
                                  </span>
                                  <span
                                    dir="ltr"
                                    className="block text-[11px] font-medium text-emerald-700 dark:text-emerald-300 mt-0.5 truncate max-w-[120px]"
                                  >
                                    {lang === 'bn' ? word.meaningBn : word.meaningEn}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Selected Word Grammar & Root Card */}
                          {selectedWord && (
                            <div
                              data-testid={`wbw-detail-${ayah.numberInSurah}`}
                              className="rounded-2xl bg-white/90 backdrop-blur-md dark:bg-[#09090B] border border-stone-200/80 dark:border-white/12 p-4 space-y-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] dark:border-white/10 pb-3">
                                <div>
                                  <p className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                    {t(lang, 'Transliteration', 'উচ্চারণ')}
                                  </p>
                                  <p className="text-sm sm:text-base font-semibold text-emerald-700 dark:text-emerald-300">
                                    {selectedWord.transliteration}
                                  </p>
                                </div>
                                <span className="font-quran text-3xl text-zinc-900 dark:text-white">
                                  {selectedWord.arabic}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                                <div className="rounded-xl bg-[#F7F4EC] dark:bg-black/60 p-3 space-y-1">
                                  <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                                    {t(lang, 'Word Meaning', 'শব্দের অর্থ')}
                                  </p>
                                  <p className="text-zinc-900 dark:text-zinc-100 font-medium">
                                    {selectedWord.meaningBn}
                                  </p>
                                  <p className="text-zinc-600 dark:text-zinc-400 text-xs">
                                    {selectedWord.meaningEn}
                                  </p>
                                </div>

                                <div className="rounded-xl bg-[#F7F4EC] dark:bg-black/60 p-3 space-y-1">
                                  <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                                    {t(lang, 'Arabic Root & Grammar', 'মূল শব্দ (Root) ও ব্যাকরণ')}
                                  </p>
                                  <p className="text-zinc-900 dark:text-zinc-100 font-semibold">
                                    {t(lang, 'Root:', 'মূল শব্দ:')}{' '}
                                    <span dir="rtl" className="font-arabic text-base text-amber-700 dark:text-amber-300">
                                      {selectedWord.rootArabic}
                                    </span>
                                  </p>
                                  <p className="text-zinc-700 dark:text-zinc-300 text-xs">
                                    {lang === 'bn' ? selectedWord.grammarBn : selectedWord.grammarEn}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Smooth Accordion Expansion: Core Lesson + Bengali & English Tafsir */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div
                          data-testid={`ayah-expanded-panel-${ayah.numberInSurah}`}
                          className="px-5 sm:px-6 pb-6 pt-4 border-t border-emerald-500/20 space-y-5"
                        >
                          {/* Highlighted Core Reflection: What Allah Wants Us to Understand */}
                          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 sm:p-5 space-y-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" aria-hidden="true" />
                                {t(
                                  lang,
                                  'What Allah Wants Us to Understand',
                                  'আল্লাহ আমাদের কী বোঝাতে চেয়েছেন'
                                )}
                              </span>
                              <span className="text-xs text-amber-700 dark:text-amber-300/90">
                                {lang === 'bn' ? coreLesson.themeBn : coreLesson.themeEn}
                              </span>
                            </div>
                            <p className="text-sm sm:text-base text-zinc-900 dark:text-zinc-100 leading-relaxed font-medium">
                              {lang === 'bn' ? coreLesson.bn : coreLesson.en}
                            </p>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                              {lang === 'bn' ? coreLesson.en : coreLesson.bn}
                            </p>
                          </div>

                          {/* Bengali & English Tafsir */}
                          {loadingTafsirAyah === ayah.numberInSurah && !tafsirData ? (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {t(
                                lang,
                                'Loading Bengali & English Tafsir...',
                                'বাংলা ও ইংরেজি তাফসীর লোড হচ্ছে...'
                              )}
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                                  বাংলা তাফসীর · {tafsirData?.bnSource ?? 'তাফসীর আবু বকর যাকারিয়া'}
                                </p>
                                <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-line max-h-60 overflow-y-auto pr-1">
                                  {tafsirData?.bn ?? ayah.bengali}
                                </p>
                              </div>
                              <div className="space-y-1.5 lg:border-l lg:border-black/[0.08] dark:lg:border-white/10 lg:pl-4">
                                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                  English Tafsir · {tafsirData?.enSource ?? 'Tafsir al-Jalalayn'}
                                </p>
                                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line max-h-60 overflow-y-auto pr-1">
                                  {tafsirData?.en ?? ayah.tafsir ?? ayah.english}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </article>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Directory & Bookmarks View
  return (
    <div className="space-y-6 animate-panel w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            {t(lang, 'Al-Quran & Noorani Tajweed', 'আল-কুরআন (নূরানী তাজবিদ ও তাফসীর)')}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
            {t(
              lang,
              'Indo-Pak Noorani script with color-coded Tajweed, Bengali & English Tafsir, and Hifz audio.',
              'রঙিন তাজবিদসহ নূরানী কুরআন, বাংলা ও ইংরেজি তাফসীর এবং হিফজ অডিও।'
            )}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/90 backdrop-blur-md dark:bg-[#09090B] border border-stone-200/80 dark:border-white/10 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none self-start">
          <button
            type="button"
            onClick={() => setActiveTab('surahs')}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === 'surahs'
                ? 'bg-emerald-500 text-black font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            {t(lang, 'All Surahs (114)', 'সকল সূরা (১১৪)')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bookmarks')}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === 'bookmarks'
                ? 'bg-emerald-500 text-black font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            {t(lang, 'Bookmarks', 'বুকমার্ক')} ({formatNum(lang, state.quranBookmarks.length)})
          </button>
        </div>
      </div>

      {/* Continue Reading Banner if lastRead exists */}
      {state.lastRead && activeTab === 'surahs' && (
        <button
          type="button"
          onClick={() => {
            const found =
              surahs.find((s) => s.number === state.lastRead!.surahNumber) ??
              FALLBACK_SURAHS[0];
            openSurah(found, state.lastRead!.ayahNumber);
          }}
          className="w-full rounded-3xl bg-white/90 backdrop-blur-md dark:bg-[#09090B] border border-emerald-500/40 hover:border-emerald-500 p-4 flex items-center justify-between gap-4 text-left shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none transition-colors"
        >
          <div className="space-y-0.5">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {t(lang, 'Continue Reading', 'পড়া চালিয়ে যান')}
            </p>
            <p className="text-base font-semibold text-zinc-900 dark:text-white">
              {formatNum(lang, state.lastRead.surahNumber)}.{' '}
              {lang === 'bn' ? state.lastRead.surahNameBn : state.lastRead.surahNameEn} ·{' '}
              {t(lang, 'Ayah', 'আয়াত')} {formatNum(lang, state.lastRead.ayahNumber)}
            </p>
          </div>
          <span className="font-arabic text-2xl text-amber-700 dark:text-amber-200">{state.lastRead.surahNameAr}</span>
        </button>
      )}

      {activeTab === 'surahs' ? (
        <>
          <div className="relative">
            <Search
              className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t(
                lang,
                'Search Surah by name or number (e.g. Yaseen, 36, Mulk)...',
                'সূরার নাম বা নম্বর দিয়ে খুঁজুন (যেমন: ইয়াসিন, 36, মুলক)...'
              )}
              aria-label={t(lang, 'Search Surah', 'সূরা খুঁজুন')}
              className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white/90 backdrop-blur-md dark:bg-[#09090B] border border-stone-200/80 dark:border-white/10 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredSurahs.map((surah) => (
              <button
                key={surah.number}
                type="button"
                onClick={() => openSurah(surah)}
                className="rounded-2xl bg-white/90 backdrop-blur-md dark:bg-[#09090B] border border-stone-200/80 dark:border-white/10 hover:border-emerald-500/45 p-4 text-left shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none transition-colors flex items-center justify-between gap-3 min-h-[76px]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="w-10 h-10 rounded-xl bg-[#F4F1EA] dark:bg-black border border-stone-200/80 dark:border-white/10 text-emerald-700 dark:text-emerald-400 font-mono-num text-sm font-semibold flex items-center justify-center shrink-0">
                    {formatNum(lang, surah.number)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                      {lang === 'bn' ? surah.bengaliName : surah.englishName}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">
                      {surah.englishNameTranslation} · {formatNum(lang, surah.numberOfAyahs)}{' '}
                      {t(lang, 'Ayahs', 'আয়াত')}
                    </p>
                  </div>
                </div>
                <span className="font-arabic text-xl text-amber-700 dark:text-amber-200/90 shrink-0">
                  {surah.name}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : state.quranBookmarks.length === 0 ? (
        <div className="rounded-3xl bg-white/90 backdrop-blur-md dark:bg-[#09090B] border border-stone-200/80 dark:border-white/10 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {t(
            lang,
            'No Ayahs bookmarked yet. Open any Surah and tap the bookmark icon on an Ayah.',
            'এখনো কোনো আয়াত বুকমার্ক করা হয়নি। যেকোনো সূরা খুলে আয়াতের বুকমার্ক আইকনে ট্যাপ করুন।'
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {state.quranBookmarks.map((bm) => (
            <div
              key={`${bm.surahNumber}:${bm.ayahNumber}`}
              className="rounded-3xl bg-white/90 backdrop-blur-md dark:bg-[#09090B] border border-stone-200/80 dark:border-white/10 p-5 space-y-3 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none"
            >
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>
                  {bm.surahNameEn} ({bm.surahNameAr}) · {t(lang, 'Ayah', 'আয়াত')}{' '}
                  {formatNum(lang, bm.ayahNumber)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const found = surahs.find((s) => s.number === bm.surahNumber);
                      if (found) openSurah(found, bm.ayahNumber);
                    }}
                    className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-medium"
                  >
                    {t(lang, 'Open Surah', 'সূরা খুলুন')}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateState((prev) => ({
                        ...prev,
                        quranBookmarks: prev.quranBookmarks.filter(
                          (item) =>
                            !(
                              item.surahNumber === bm.surahNumber &&
                              item.ayahNumber === bm.ayahNumber
                            )
                        ),
                      }))
                    }
                    className="text-zinc-500 hover:text-red-500 dark:hover:text-red-400"
                  >
                    {t(lang, 'Remove', 'মুছুন')}
                  </button>
                </div>
              </div>
              <p className="font-quran text-2xl text-right text-zinc-900 dark:text-zinc-100">{bm.arabic}</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {lang === 'bn' ? bm.translationBn : bm.translationEn}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

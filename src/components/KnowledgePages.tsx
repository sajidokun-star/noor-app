import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  HeartHandshake,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
} from 'lucide-react';
import { claimAudio, releaseAudio } from '../utils/audioManager';
import type {
  AppPersistedState,
  DhikrItem,
  DuaItem,
  FiqhItem,
  HadithItem,
} from '../types/islamic';
import type { AppRoute } from '../utils/routes';
import { HADITH_COLLECTION, FIQH_MASAIL } from '../data/hadithAndFiqh';
import { DEFAULT_DHIKR_LIST, MASNOON_DUAS, RUQYAH_ITEMS } from '../data/duasAndRuqyah';
import { formatNum, t } from '../utils/i18n';
import { PageHeader } from './PageHeader';
import { OrnateEndRosette } from './OrnateEndRosette';
import { IOSSection, IOSRow, IOSSwitch } from './IOSSettingsPrimitives';

const HADITH_CATEGORY_LABELS: Record<HadithItem['category'], { en: string; bn: string }> = {
  faith: { en: 'Faith', bn: 'ঈমান' },
  prayer: { en: 'Prayer', bn: 'নামাজ' },
  character: { en: 'Character', bn: 'আখলাক' },
  charity: { en: 'Charity', bn: 'সদকা' },
  knowledge: { en: 'Knowledge', bn: 'ইলম' },
  family: { en: 'Family', bn: 'পরিবার' },
};

// 1. HADITH PAGE (#/hadith)
export const HadithPage: React.FC<{
  state: AppPersistedState;
  onUpdateState: (
    updater: Partial<AppPersistedState> | ((prev: AppPersistedState) => AppPersistedState)
  ) => void;
  onNavigate: (route: AppRoute) => void;
}> = ({ state, onUpdateState, onNavigate }) => {
  const lang = state.language;
  const [hadithSearch, setHadithSearch] = useState('');
  const [hadithCategory, setHadithCategory] = useState<'all' | HadithItem['category']>('all');
  const [expandedHadithId, setExpandedHadithId] = useState<string | null>(null);
  const [focusedHadithId, setFocusedHadithId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredHadiths = useMemo(() => {
    const q = hadithSearch.trim().toLowerCase();
    return HADITH_COLLECTION.filter((h) => {
      if (hadithCategory !== 'all' && h.category !== hadithCategory) return false;
      if (!q) return true;
      return (
        h.english.toLowerCase().includes(q) ||
        h.bengali.toLowerCase().includes(q) ||
        h.bookEn.toLowerCase().includes(q) ||
        h.bookBn.toLowerCase().includes(q) ||
        h.reference.toLowerCase().includes(q)
      );
    });
  }, [hadithSearch, hadithCategory]);

  const focusedIndex = useMemo(
    () => (focusedHadithId ? filteredHadiths.findIndex((h) => h.id === focusedHadithId) : -1),
    [filteredHadiths, focusedHadithId]
  );
  const focusedHadith = focusedIndex >= 0 ? filteredHadiths[focusedIndex] : null;

  const handleCopyHadith = async (h: HadithItem) => {
    const body = `${h.arabic}\n\n${lang === 'bn' ? h.bengali : h.english}\n— ${
      lang === 'bn' ? h.bookBn : h.bookEn
    } (${h.reference})`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(body);
      }
      setCopiedId(h.id);
      window.setTimeout(() => setCopiedId((curr) => (curr === h.id ? null : curr)), 1800);
    } catch {
      // ignore clipboard errors gracefully
    }
  };

  const toggleBookmark = (hId: string) => {
    const saved = state.hadithBookmarks.includes(hId);
    onUpdateState((prev) => ({
      ...prev,
      hadithBookmarks: saved
        ? prev.hadithBookmarks.filter((id) => id !== hId)
        : [...prev.hadithBookmarks, hId],
    }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        lang={lang}
        title={t(lang, 'Authentic Hadith Collection', 'সহীহ হাদীস সংকলন')}
        subtitle={t(
          lang,
          'Sahih al-Bukhari, Sahih Muslim, and Jami at-Tirmidhi in Quran-matched Noorani Arabic with Focused Reader Mode & daily life application.',
          'সহীহ বুখারী, সহীহ মুসলিম ও তিরমিযী থেকে নূরানী আরবি ফন্টে হাদীস, ফোকাসড রিডার মোড ও জীবনে প্রয়োগ।'
        )}
        onNavigate={onNavigate}
      />

      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={hadithSearch}
            onChange={(e) => setHadithSearch(e.target.value)}
            placeholder={t(
              lang,
              'Search Hadith by keyword, Bukhari, Muslim...',
              'হাদীস খুঁজুন (শব্দ, বুখারী, মুসলিম)...'
            )}
            aria-label={t(lang, 'Search Hadith', 'হাদীস খুঁজুন')}
            className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white/90 backdrop-blur-md dark:bg-[#09090B] border border-stone-200/80 dark:border-white/10 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Synced Arabic Font Size Control (identical to QuranView) */}
        <div className="flex items-center justify-between gap-2.5 px-3.5 h-11 rounded-2xl bg-white/90 backdrop-blur-md dark:bg-[#09090B] border border-stone-200/80 dark:border-white/10 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none shrink-0">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
            {t(lang, 'Arabic Size', 'আরবি ফন্ট')}:{' '}
            <strong className="text-zinc-900 dark:text-zinc-200 font-mono-num">
              {state.quranFontSize}px
            </strong>
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Decrease Hadith Arabic font size"
              onClick={() =>
                onUpdateState((p) => ({
                  ...p,
                  quranFontSize: Math.max(22, p.quranFontSize - 2),
                }))
              }
              className="w-7 h-7 rounded-lg bg-[#F4F1EA] dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-zinc-700 dark:text-zinc-200"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              aria-label="Increase Hadith Arabic font size"
              onClick={() =>
                onUpdateState((p) => ({
                  ...p,
                  quranFontSize: Math.min(48, p.quranFontSize + 2),
                }))
              }
              className="w-7 h-7 rounded-lg bg-[#F4F1EA] dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-zinc-700 dark:text-zinc-200"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/90 backdrop-blur-md dark:bg-[#09090B] border border-stone-200/80 dark:border-white/10 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none overflow-x-auto">
          {(
            [
              { id: 'all', en: 'All', bn: 'সব' },
              { id: 'faith', en: 'Faith', bn: 'ঈমান' },
              { id: 'prayer', en: 'Prayer', bn: 'নামাজ' },
              { id: 'character', en: 'Character', bn: 'আখলাক' },
              { id: 'charity', en: 'Charity', bn: 'সদকা' },
              { id: 'knowledge', en: 'Knowledge', bn: 'ইলম' },
              { id: 'family', en: 'Family', bn: 'পরিবার' },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setHadithCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-colors ${
                hadithCategory === cat.id
                  ? 'bg-emerald-500 text-black font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {lang === 'bn' ? cat.bn : cat.en}
            </button>
          ))}
        </div>
      </div>

      {/* Focused Clean Hadith Reader Mode */}
      {focusedHadith ? (
        <section
          data-testid="hadith-focused-reader"
          className="rounded-3xl bg-white/90 backdrop-blur-md dark:bg-[#09090B] border border-emerald-500/40 p-5 sm:p-8 space-y-6 shadow-[0_4px_24px_rgba(16,185,129,0.08)] dark:shadow-none"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              data-testid="hadith-exit-focused-btn"
              onClick={() => setFocusedHadithId(null)}
              className="px-3.5 py-2 rounded-xl bg-[#F4F1EA] dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {t(lang, 'All Hadiths', 'সব হাদীস তালিকায় ফিরুন')}
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono-num text-zinc-500 dark:text-zinc-400">
                #{formatNum(lang, String(focusedIndex + 1).padStart(2, '0'))} /{' '}
                {formatNum(lang, filteredHadiths.length)}
              </span>

              <button
                type="button"
                data-testid="hadith-copy-btn"
                onClick={() => handleCopyHadith(focusedHadith)}
                aria-label={t(lang, 'Copy Hadith', 'কপি করুন')}
                className="h-9 px-3 rounded-xl bg-[#F4F1EA] dark:bg-white/5 border border-stone-200/80 dark:border-white/10 text-xs font-medium text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-1.5"
              >
                {copiedId === focusedHadith.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{t(lang, 'Copied', 'কপি হয়েছে')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t(lang, 'Copy', 'কপি')}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                data-testid="hadith-focused-bookmark-btn"
                aria-label={`Bookmark Hadith ${focusedHadith.reference}`}
                aria-pressed={state.hadithBookmarks.includes(focusedHadith.id)}
                onClick={() => toggleBookmark(focusedHadith.id)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-colors ${
                  state.hadithBookmarks.includes(focusedHadith.id)
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-300'
                    : 'bg-[#F4F1EA] dark:bg-white/5 border-stone-200/80 dark:border-white/10 text-zinc-500 dark:text-zinc-400'
                }`}
              >
                <Bookmark
                  className="w-4 h-4"
                  fill={state.hadithBookmarks.includes(focusedHadith.id) ? 'currentColor' : 'none'}
                />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 font-medium">
              #{lang === 'bn' ? focusedHadith.grade === 'Sahih' ? 'সহীহ' : 'হাসান' : focusedHadith.grade}
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-amber-500/12 text-amber-700 dark:text-amber-300 font-medium">
              #{lang === 'bn' ? focusedHadith.bookBn : focusedHadith.bookEn}
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-[#F4F1EA] dark:bg-white/5 text-zinc-600 dark:text-zinc-300 font-medium">
              #{lang === 'bn' ? HADITH_CATEGORY_LABELS[focusedHadith.category].bn : HADITH_CATEGORY_LABELS[focusedHadith.category].en}
            </span>
            <span className="text-zinc-500 dark:text-zinc-400 ml-auto font-mono-num">
              {focusedHadith.reference}
            </span>
          </div>

          <p
            className="font-quran text-right font-medium text-zinc-900 dark:text-zinc-100"
            style={{ fontSize: `${state.quranFontSize}px` }}
            data-testid="hadith-focused-arabic"
          >
            <span>{focusedHadith.arabic}</span>
            <OrnateEndRosette number={focusedIndex + 1} label={`Hadith ${focusedIndex + 1}`} />
          </p>

          <div className="space-y-3 pt-4 border-t border-black/[0.06] dark:border-white/10">
            <p className="text-base sm:text-lg text-zinc-900 dark:text-zinc-100 leading-relaxed font-medium">
              {lang === 'bn' ? focusedHadith.bengali : focusedHadith.english}
            </p>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {lang === 'bn' ? focusedHadith.english : focusedHadith.bengali}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-[#F7F4EC] dark:bg-black border border-stone-200/80 dark:border-white/10 p-4 space-y-2">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" aria-hidden="true" />
                {t(lang, 'Detailed Commentary', 'বিস্তারিত ব্যাখ্যা')}
              </p>
              <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                {lang === 'bn' ? focusedHadith.explanationBn : focusedHadith.explanationEn}
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 space-y-2">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                <HeartHandshake className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                {t(lang, 'Practical Application in Daily Life', 'আমার জীবনে যেভাবে প্রয়োগ করব')}
              </p>
              <p className="text-sm text-zinc-900 dark:text-zinc-100 leading-relaxed font-medium">
                {lang === 'bn' ? focusedHadith.practicalBn : focusedHadith.practicalEn}
              </p>
            </div>
          </div>

          {/* Previous / Next Navigation Buttons */}
          <div className="pt-4 border-t border-black/[0.06] dark:border-white/10 flex items-center justify-between gap-3">
            <button
              type="button"
              data-testid="hadith-prev-btn"
              disabled={focusedIndex <= 0}
              onClick={() => {
                if (focusedIndex > 0) setFocusedHadithId(filteredHadiths[focusedIndex - 1].id);
              }}
              className="px-4 py-2.5 min-h-[44px] rounded-2xl bg-[#F4F1EA] dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-40 text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {t(lang, 'Previous', 'পূর্ববর্তী হাদীস')}
            </button>
            <button
              type="button"
              data-testid="hadith-next-btn"
              disabled={focusedIndex >= filteredHadiths.length - 1}
              onClick={() => {
                if (focusedIndex < filteredHadiths.length - 1) {
                  setFocusedHadithId(filteredHadiths[focusedIndex + 1].id);
                }
              }}
              className="px-4 py-2.5 min-h-[44px] rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-xs sm:text-sm font-semibold text-black inline-flex items-center gap-2"
            >
              {t(lang, 'Next', 'পরবর্তী হাদীস')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {filteredHadiths.map((h, idx) => {
            const saved = state.hadithBookmarks.includes(h.id);
            const isExpanded = expandedHadithId === h.id;
            const numLabel = String(idx + 1).padStart(2, '0');
            return (
              <article
                key={h.id}
                data-testid={`hadith-card-${h.id}`}
                className={`rounded-3xl bg-white/90 backdrop-blur-md dark:bg-[#09090B] border p-5 sm:p-6 flex flex-col justify-between gap-4 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none transition-all duration-200 ${
                  isExpanded
                    ? 'border-emerald-500/50 shadow-[0_0_24px_rgba(16,185,129,0.1)]'
                    : 'border-stone-200/80 dark:border-white/10'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono-num font-bold">
                        #{formatNum(lang, numLabel)}
                      </span>
                      <span>
                        {lang === 'bn' ? h.bookBn : h.bookEn} · {h.reference}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        data-testid={`hadith-read-focused-btn-${h.id}`}
                        onClick={() => setFocusedHadithId(h.id)}
                        className="h-9 px-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-xs font-semibold text-amber-800 dark:text-amber-300 inline-flex items-center gap-1"
                      >
                        {t(lang, 'Reader', 'রিডার')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedHadithId(isExpanded ? null : h.id)}
                        aria-expanded={isExpanded}
                        data-testid={`hadith-explain-btn-${h.id}`}
                        className={`h-9 px-3 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                          isExpanded
                            ? 'bg-emerald-500 text-black font-semibold'
                            : 'bg-[#F4F1EA] dark:bg-white/5 border border-stone-200/80 dark:border-white/10 text-zinc-700 dark:text-zinc-200 hover:border-emerald-500/40'
                        }`}
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{t(lang, 'Explanation', 'ব্যাখ্যা ও প্রয়োগ')}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        aria-label={`Bookmark Hadith ${h.reference}`}
                        aria-pressed={saved}
                        onClick={() => toggleBookmark(h.id)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-colors ${
                          saved
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-300'
                            : 'bg-[#F4F1EA] dark:bg-white/5 border-stone-200/80 dark:border-white/10 text-zinc-500 dark:text-zinc-400'
                        }`}
                      >
                        <Bookmark className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>

                  {/* Hashtag Pill Tags */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="px-2 py-0.5 rounded-lg bg-[#F4F1EA] dark:bg-white/5 text-emerald-700 dark:text-emerald-400 font-medium">
                      #{lang === 'bn' ? (h.grade === 'Sahih' ? 'সহীহ' : 'হাসান') : h.grade}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-[#F4F1EA] dark:bg-white/5 text-zinc-700 dark:text-zinc-300">
                      #{lang === 'bn' ? h.bookBn.split(' ')[0] : h.bookEn.replace('Sahih al-', '').replace('Sahih ', '').replace('Jami at-', '')}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-[#F4F1EA] dark:bg-white/5 text-amber-700 dark:text-amber-300">
                      #{lang === 'bn' ? HADITH_CATEGORY_LABELS[h.category].bn : HADITH_CATEGORY_LABELS[h.category].en}
                    </span>
                  </div>

                  {/* Exact Quran-Matched Noorani Indo-Pak Arabic Typography + Ornate Rosette */}
                  <button
                    type="button"
                    onClick={() => setExpandedHadithId(isExpanded ? null : h.id)}
                    className="w-full text-left active:scale-[0.992] transition-transform duration-150 rounded-2xl focus-visible:outline-2 focus-visible:outline-emerald-500"
                  >
                    <p
                      className="font-quran text-right font-medium text-zinc-900 dark:text-zinc-100"
                      style={{ fontSize: `${state.quranFontSize}px` }}
                      data-testid={`hadith-arabic-${h.id}`}
                    >
                      <span>{h.arabic}</span>
                      <OrnateEndRosette number={idx + 1} label={`Hadith ${idx + 1}`} />
                    </p>
                  </button>

                  <div className="space-y-2 pt-3 border-t border-black/[0.06] dark:border-white/10">
                    <p className="text-sm sm:text-base text-zinc-900 dark:text-zinc-100 leading-relaxed font-medium">
                      {lang === 'bn' ? h.bengali : h.english}
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {lang === 'bn' ? h.english : h.bengali}
                    </p>
                  </div>

                  {/* Expandable Detailed Commentary + Practical Life Application Drawer */}
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
                          data-testid={`hadith-explain-panel-${h.id}`}
                          className="mt-1 pt-4 border-t border-emerald-500/20 space-y-4"
                        >
                          {/* 1. Detailed Commentary */}
                          <div className="rounded-2xl bg-[#F7F4EC] dark:bg-black border border-stone-200/80 dark:border-white/10 p-4 space-y-2">
                            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" aria-hidden="true" />
                              {t(lang, 'Detailed Commentary', 'বিস্তারিত ব্যাখ্যা')}
                            </p>
                            <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                              {lang === 'bn' ? h.explanationBn : h.explanationEn}
                            </p>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                              {lang === 'bn' ? h.explanationEn : h.explanationBn}
                            </p>
                          </div>

                          {/* 2. Highlighted Practical Life Application */}
                          <div
                            data-testid={`hadith-practical-box-${h.id}`}
                            className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 space-y-2"
                          >
                            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                              <HeartHandshake className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                              {t(
                                lang,
                                'Practical Application in Daily Life',
                                'আমার জীবনে যেভাবে প্রয়োগ করব'
                              )}
                            </p>
                            <p className="text-sm text-zinc-900 dark:text-zinc-100 leading-relaxed font-medium">
                              {lang === 'bn' ? h.practicalBn : h.practicalEn}
                            </p>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                              {lang === 'bn' ? h.practicalEn : h.practicalBn}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

// 2. FIQH PAGE (#/fiqh)
export const FiqhPage: React.FC<{
  state: AppPersistedState;
  onNavigate: (route: AppRoute) => void;
}> = ({ state, onNavigate }) => {
  const lang = state.language;
  const [fiqhSearch, setFiqhSearch] = useState('');
  const [fiqhCategory, setFiqhCategory] = useState<'all' | FiqhItem['category']>('all');

  const filteredFiqh = useMemo(() => {
    const q = fiqhSearch.trim().toLowerCase();
    return FIQH_MASAIL.filter((f) => {
      if (fiqhCategory !== 'all' && f.category !== fiqhCategory) return false;
      if (!q) return true;
      return (
        f.questionEn.toLowerCase().includes(q) ||
        f.questionBn.toLowerCase().includes(q) ||
        f.answerEn.toLowerCase().includes(q) ||
        f.answerBn.toLowerCase().includes(q)
      );
    });
  }, [fiqhSearch, fiqhCategory]);

  return (
    <div className="space-y-6">
      <PageHeader
        lang={lang}
        title={t(lang, "Daily Fiqh (Mas'alah)", 'দৈনন্দিন ফিকহ ও মাসআলা')}
        subtitle={t(
          lang,
          'Practical rulings on Salah, Roza, Wudu, and Halal-Haram grounded in Quran & Sunnah.',
          'নামাজ, রোজা, ওযু ও হালাল-হারামের প্রয়োজনীয় মাসআলা।'
        )}
        onNavigate={onNavigate}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={fiqhSearch}
            onChange={(e) => setFiqhSearch(e.target.value)}
            placeholder={t(
              lang,
              'Search Fiqh rules (Namaz, Roza, Wudu, Halal)...',
              'ফিকহ মাসআলা খুঁজুন (নামাজ, রোজা, ওযু, হালাল)...'
            )}
            aria-label={t(lang, 'Search Fiqh', 'ফিকহ খুঁজুন')}
            className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white/90 backdrop-blur-md dark:bg-[#09090B] border border-stone-200/80 dark:border-white/10 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/90 backdrop-blur-md dark:bg-[#09090B] border border-stone-200/80 dark:border-white/10 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none overflow-x-auto">
          {(
            [
              { id: 'all', en: 'All', bn: 'সব' },
              { id: 'namaz', en: 'Namaz', bn: 'নামাজ' },
              { id: 'roza', en: 'Roza', bn: 'রোজা' },
              { id: 'taharah', en: 'Wudu', bn: 'ওযু ও পবিত্রতা' },
              { id: 'halal_haram', en: 'Halal-Haram', bn: 'হালাল-হারাম' },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFiqhCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap ${
                fiqhCategory === cat.id
                  ? 'bg-emerald-500 text-black font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {lang === 'bn' ? cat.bn : cat.en}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredFiqh.map((item) => (
          <article
            key={item.id}
            className="rounded-3xl bg-white/90 backdrop-blur-md dark:bg-[#09090B] border border-stone-200/80 dark:border-white/10 p-5 sm:p-6 space-y-2.5 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none"
          >
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {lang === 'bn' ? item.referenceBn : item.referenceEn}
            </p>
            <h2 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white">
              {lang === 'bn' ? item.questionBn : item.questionEn}
            </h2>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {lang === 'bn' ? item.answerBn : item.answerEn}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
};

// 3. MASNOON DUA PAGE (#/dua)
export const DuaPage: React.FC<{
  state: AppPersistedState;
  onNavigate: (route: AppRoute) => void;
}> = ({ state, onNavigate }) => {
  const lang = state.language;
  const [duaCategory, setDuaCategory] = useState<'all' | DuaItem['category']>('all');
  const [expandedDuaId, setExpandedDuaId] = useState<string | null>(null);

  const filteredDuas = useMemo(() => {
    if (duaCategory === 'all') return MASNOON_DUAS;
    return MASNOON_DUAS.filter((d) => d.category === duaCategory);
  }, [duaCategory]);

  return (
    <div className="space-y-6">
      <PageHeader
        lang={lang}
        title={t(lang, 'Masnoon Duas & Adhkar', 'মাসনূন দোয়া ও আযকার')}
        subtitle={t(
          lang,
          'Hisnul Muslim supplications in Noorani Arabic with Bengali pronunciation, meaning & Fazilat.',
          'হিসনুল মুসলিম থেকে নূরানী আরবি, বাংলা উচ্চারণ, অর্থ এবং ফজিলত ও ব্যাখ্যা।'
        )}
        onNavigate={onNavigate}
      />

      <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/90 backdrop-blur-md dark:bg-[#09090B] border border-stone-200/80 dark:border-white/10 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none overflow-x-auto">
        {(
          [
            { id: 'all', en: 'All Duas', bn: 'সকল দোয়া' },
            { id: 'morning_evening', en: 'Morning/Evening', bn: 'সকাল-সন্ধ্যা' },
            { id: 'sleep', en: 'Sleep', bn: 'ঘুম' },
            { id: 'travel', en: 'Travel', bn: 'সফর' },
            { id: 'eating', en: 'Eating', bn: 'খাবার' },
            { id: 'distress', en: 'Distress', bn: 'বিপদ ও মুক্তি' },
            { id: 'mosque', en: 'Mosque', bn: 'মসজিদ' },
          ] as const
        ).map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setDuaCategory(cat.id)}
            className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap ${
              duaCategory === cat.id
                ? 'bg-emerald-500 text-black font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            {lang === 'bn' ? cat.bn : cat.en}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredDuas.map((dua) => {
          const isExpanded = expandedDuaId === dua.id;
          return (
            <article
              key={dua.id}
              data-testid={`dua-card-${dua.id}`}
              className={`rounded-3xl bg-white/90 backdrop-blur-md dark:bg-[#09090B] border p-5 sm:p-6 space-y-4 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none transition-colors ${
                isExpanded
                  ? 'border-emerald-500/45'
                  : 'border-stone-200/80 dark:border-white/10'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                    {lang === 'bn' ? dua.titleBn : dua.titleEn}
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {dua.reference}
                    {dua.repeat && dua.repeat > 1
                      ? ` · ${t(lang, `Recite ${dua.repeat}x`, `${formatNum(lang, dua.repeat)} বার পাঠ করুন`)}`
                      : ''}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setExpandedDuaId(isExpanded ? null : dua.id)}
                  aria-expanded={isExpanded}
                  data-testid={`dua-explain-btn-${dua.id}`}
                  className={`h-9 px-3 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 shrink-0 transition-colors ${
                    isExpanded
                      ? 'bg-emerald-500 text-black font-semibold'
                      : 'bg-[#F4F1EA] dark:bg-white/5 border border-stone-200/80 dark:border-white/10 text-zinc-700 dark:text-zinc-200 hover:border-emerald-500/40'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{t(lang, 'Fazilat & Lesson', 'ফজিলত ও ব্যাখ্যা')}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Noorani Arabic Font */}
              <p className="font-quran text-2xl sm:text-[28px] text-right text-amber-800 dark:text-amber-200/95">
                {dua.arabic}
              </p>

              {/* Bengali Pronunciation + Bengali & English Meaning */}
              <div className="pt-3 border-t border-black/[0.06] dark:border-white/10 space-y-2.5 text-sm">
                <p className="text-emerald-700 dark:text-emerald-300/90 leading-relaxed">
                  <span className="text-xs text-zinc-500 block mb-0.5">
                    {t(lang, 'Pronunciation', 'উচ্চারণ')}
                  </span>
                  {lang === 'bn' ? dua.transliterationBn : dua.transliterationEn}
                </p>
                <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed">
                  {lang === 'bn' ? dua.meaningBn : dua.meaningEn}
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {lang === 'bn' ? dua.meaningEn : dua.meaningBn}
                </p>
              </div>

              {/* Expandable Fazilat & Lesson Drawer */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div
                      data-testid={`dua-explain-panel-${dua.id}`}
                      className="pt-3.5 border-t border-emerald-500/20 rounded-2xl bg-[#F7F4EC] dark:bg-black p-4 space-y-2.5"
                    >
                      <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" aria-hidden="true" />
                        {t(lang, 'Virtue, Background & Guidance', 'ফজিলত, প্রেক্ষাপট ও শিক্ষা')}
                      </p>
                      <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                        {lang === 'bn' ? dua.explanationBn : dua.explanationEn}
                      </p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {lang === 'bn' ? dua.explanationEn : dua.explanationBn}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </article>
          );
        })}
      </div>
    </div>
  );
};

// 4. SMART DIGITAL TASBIH PAGE (#/tasbih)
export const TasbihPage: React.FC<{
  state: AppPersistedState;
  onUpdateState: (
    updater: Partial<AppPersistedState> | ((prev: AppPersistedState) => AppPersistedState)
  ) => void;
  onNavigate: (route: AppRoute) => void;
}> = ({ state, onUpdateState, onNavigate }) => {
  const lang = state.language;
  const [customTargetInput, setCustomTargetInput] = useState(String(state.tasbihTarget));
  const [showCustomDhikrForm, setShowCustomDhikrForm] = useState(false);
  const [newDhikrArabic, setNewDhikrArabic] = useState('');
  const [newDhikrTranslit, setNewDhikrTranslit] = useState('');
  const [newDhikrMeaning, setNewDhikrMeaning] = useState('');
  const swipeStartXRef = useRef<number | null>(null);

  const allDhikrs = useMemo(
    () => [...DEFAULT_DHIKR_LIST, ...state.customDhikrs],
    [state.customDhikrs]
  );

  const activeIndex = Math.max(
    0,
    allDhikrs.findIndex((d) => d.id === state.selectedDhikrId)
  );
  const activeDhikr = allDhikrs[activeIndex] ?? DEFAULT_DHIKR_LIST[0];
  const currentTasbihCount = state.tasbihCounts[activeDhikr.id] ?? 0;
  const progressRatio = Math.min(1, currentTasbihCount / Math.max(1, state.tasbihTarget));

  const cycleDhikr = (step: -1 | 1) => {
    const nextIdx = (activeIndex + step + allDhikrs.length) % allDhikrs.length;
    onUpdateState({ selectedDhikrId: allDhikrs[nextIdx].id });
  };

  const handleTasbihTap = () => {
    const nextVal = currentTasbihCount + 1;
    const hitTarget = nextVal === state.tasbihTarget;

    if (state.tasbihHaptic && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(hitTarget ? [40, 30, 60] : 20);
    }

    onUpdateState((prev) => ({
      ...prev,
      tasbihCounts: {
        ...prev.tasbihCounts,
        [activeDhikr.id]: (prev.tasbihCounts[activeDhikr.id] ?? 0) + 1,
      },
      tasbihLifetimeTotal: prev.tasbihLifetimeTotal + 1,
    }));
  };

  const handleResetCurrent = () => {
    onUpdateState((prev) => ({
      ...prev,
      tasbihCounts: { ...prev.tasbihCounts, [activeDhikr.id]: 0 },
    }));
  };

  const handleAddCustomDhikr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDhikrTranslit.trim()) return;
    const item: DhikrItem = {
      id: `custom_${Date.now()}`,
      arabic: newDhikrArabic.trim() || newDhikrTranslit.trim(),
      transliterationEn: newDhikrTranslit.trim(),
      transliterationBn: newDhikrTranslit.trim(),
      meaningEn: newDhikrMeaning.trim() || 'Custom Dhikr',
      meaningBn: newDhikrMeaning.trim() || 'কাস্টম যিকির',
      defaultTarget: 33,
    };
    onUpdateState((prev) => ({
      ...prev,
      customDhikrs: [...prev.customDhikrs, item],
      selectedDhikrId: item.id,
    }));
    setNewDhikrArabic('');
    setNewDhikrTranslit('');
    setNewDhikrMeaning('');
    setShowCustomDhikrForm(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        lang={lang}
        title={t(lang, 'Smart Digital Tasbih', 'স্মার্ট ডিজিটাল তাসবীহ')}
        subtitle={t(
          lang,
          'Swipe between Dhikr cards, track circular progress, and count with sound & haptic feedback.',
          'যিকির কার্ড পরিবর্তন করুন, বৃত্তাকার প্রগ্রেস দেখুন এবং সাউন্ড ও ভাইব্রেশনসহ তাসবীহ গণনা করুন।'
        )}
        onNavigate={onNavigate}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Reference-Inspired Minimal Centered Counter Stage */}
        <div className="lg:col-span-7 rounded-3xl bg-white/90 backdrop-blur-md dark:bg-[#09090B] border border-stone-200/80 dark:border-white/10 p-5 sm:p-8 flex flex-col items-center text-center space-y-6 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
          {/* Swipeable / Chevron-Navigable Top Dhikr Card */}
          <div
            data-testid="tasbih-dhikr-card"
            onPointerDown={(e) => {
              swipeStartXRef.current = e.clientX;
            }}
            onPointerUp={(e) => {
              if (swipeStartXRef.current === null) return;
              const dx = e.clientX - swipeStartXRef.current;
              swipeStartXRef.current = null;
              if (Math.abs(dx) > 40) {
                cycleDhikr(dx < 0 ? 1 : -1);
              }
            }}
            className="w-full rounded-2xl bg-[#F7F4EC] dark:bg-black border border-stone-200/80 dark:border-white/10 p-4 sm:p-5 space-y-3 select-none"
          >
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                aria-label={t(lang, 'Previous Dhikr', 'পূর্ববর্তী যিকির')}
                onClick={() => cycleDhikr(-1)}
                className="w-8 h-8 rounded-xl bg-white/90 dark:bg-[#1C1C1E] border border-stone-200/80 dark:border-white/10 flex items-center justify-center text-zinc-600 dark:text-zinc-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="min-w-0 flex-1 px-2">
                <p className="font-quran text-2xl sm:text-4xl text-amber-700 dark:text-amber-200 leading-relaxed">
                  {activeDhikr.arabic}
                </p>
              </div>

              <button
                type="button"
                aria-label={t(lang, 'Next Dhikr', 'পরবর্তী যিকির')}
                onClick={() => cycleDhikr(1)}
                className="w-8 h-8 rounded-xl bg-white/90 dark:bg-[#1C1C1E] border border-stone-200/80 dark:border-white/10 flex items-center justify-center text-zinc-600 dark:text-zinc-300"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-0.5">
              <p className="text-base font-semibold text-zinc-900 dark:text-white">
                {lang === 'bn' ? activeDhikr.transliterationBn : activeDhikr.transliterationEn}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {lang === 'bn' ? activeDhikr.meaningBn : activeDhikr.meaningEn}
              </p>
            </div>

            {/* Pagination Dot Indicators */}
            <div className="flex items-center justify-center gap-1.5 pt-1">
              {allDhikrs.map((d, idx) => {
                const isDotActive = d.id === activeDhikr.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    data-testid={`tasbih-dot-${idx}`}
                    aria-label={lang === 'bn' ? d.transliterationBn : d.transliterationEn}
                    onClick={() => onUpdateState({ selectedDhikrId: d.id })}
                    className={`h-2 rounded-full transition-all ${
                      isDotActive
                        ? 'w-5 bg-emerald-500'
                        : 'w-2 bg-zinc-300 dark:bg-zinc-700 hover:bg-emerald-400/60'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Central Circular Progress Ring (count / target) */}
          <div className="relative w-52 h-52 sm:w-56 sm:h-56 rounded-full bg-[#F7F4EC] dark:bg-black border border-stone-200/80 dark:border-white/10 flex flex-col items-center justify-center">
            <svg
              viewBox="0 0 200 200"
              className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
              aria-hidden="true"
            >
              <circle
                cx="100"
                cy="100"
                r="88"
                fill="none"
                className="stroke-black/[0.08] dark:stroke-white/[0.08]"
                strokeWidth="9"
              />
              <circle
                cx="100"
                cy="100"
                r="88"
                fill="none"
                stroke={currentTasbihCount >= state.tasbihTarget ? '#F59E0B' : '#10B981'}
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 88}
                strokeDashoffset={2 * Math.PI * 88 * (1 - progressRatio)}
                className="transition-all duration-150"
              />
            </svg>
            <div className="flex items-baseline gap-1 font-mono-num">
              <span
                className="text-4xl sm:text-5xl font-bold text-zinc-900 dark:text-white leading-[1.6] pt-0.5"
                data-testid="tasbih-counter-value"
              >
                {formatNum(lang, currentTasbihCount)}
              </span>
              <span className="text-lg font-medium text-zinc-500 dark:text-zinc-400">
                / {formatNum(lang, state.tasbihTarget)}
              </span>
            </div>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 font-mono-num">
              {t(lang, 'Lifetime', 'সর্বমোট')}: {formatNum(lang, state.tasbihLifetimeTotal)}
            </span>
          </div>

          {/* Large Full-Width Primary Tap to Count Button + Clean Reset Pill Below */}
          <div className="w-full max-w-sm space-y-3">
            <button
              type="button"
              onClick={handleTasbihTap}
              data-testid="tasbih-tap-button"
              aria-label={`Tap to count ${activeDhikr.transliterationEn}`}
              className="w-full py-4 min-h-[56px] rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-black text-base font-bold tracking-tight shadow-[0_6px_24px_rgba(16,185,129,0.28)] transition-all focus-visible:outline-2 focus-visible:outline-emerald-500"
            >
              {t(lang, 'Tap to Count', 'গুনতে ট্যাপ করুন')}
            </button>

            <button
              type="button"
              data-testid="tasbih-reset-button"
              onClick={handleResetCurrent}
              className="w-full py-2.5 min-h-[42px] rounded-2xl bg-[#F4F1EA] dark:bg-black border border-stone-200/80 dark:border-white/10 hover:border-black/20 dark:hover:border-white/25 text-xs font-semibold text-zinc-700 dark:text-zinc-300 inline-flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t(lang, 'Reset', 'রিসেট করুন')}
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-5">
          {/* iOS Grouped Feedback Toggles */}
          <IOSSection title={t(lang, 'Feedback Preferences', 'ভাইব্রেশন')}>
            <IOSRow
              icon={<Sparkles className="w-4 h-4" />}
              iconBg="bg-[#FF9500]"
              title={t(lang, 'Haptic Vibration', 'হ্যাপটিক ভাইব্রেশন')}
              rightElement={
                <IOSSwitch
                  checked={state.tasbihHaptic}
                  onChange={(next) => onUpdateState({ tasbihHaptic: next })}
                  ariaLabel="Toggle Tasbih haptic"
                />
              }
            />
          </IOSSection>

          <div className="rounded-3xl bg-white/90 backdrop-blur-md dark:bg-[#1C1C1E] border border-stone-200/80 dark:border-white/[0.08] p-5 space-y-5 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {t(lang, 'Set Target', 'লক্ষ্যমাত্রা নির্ধারণ')}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {[33, 100, 1000].map((target) => (
                  <button
                    key={target}
                    type="button"
                    onClick={() => {
                      onUpdateState({ tasbihTarget: target });
                      setCustomTargetInput(String(target));
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-mono-num border ${
                      state.tasbihTarget === target
                        ? 'bg-emerald-500 border-emerald-500 text-black font-semibold'
                        : 'bg-[#F4F1EA] dark:bg-black border-stone-200/80 dark:border-white/10 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {formatNum(lang, target)}
                  </button>
                ))}
                <input
                  type="number"
                  min={1}
                  max={100000}
                  value={customTargetInput}
                  onChange={(e) => {
                    setCustomTargetInput(e.target.value);
                    const v = Number(e.target.value);
                    if (v > 0) onUpdateState({ tasbihTarget: v });
                  }}
                  aria-label="Custom tasbih target"
                  className="w-20 h-9 rounded-xl bg-[#F4F1EA] dark:bg-black border border-stone-200/80 dark:border-white/15 px-2.5 text-xs text-zinc-900 dark:text-white font-mono-num"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-black/[0.07] dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {t(lang, 'Select Dhikr', 'যিকির নির্বাচন করুন')}
                </p>
                <button
                  type="button"
                  onClick={() => setShowCustomDhikrForm((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t(lang, 'Add Custom', 'নতুন যিকির')}
                </button>
              </div>

              {showCustomDhikrForm && (
                <form
                  onSubmit={handleAddCustomDhikr}
                  className="p-3.5 rounded-2xl bg-[#F4F1EA] dark:bg-black border border-stone-200/80 dark:border-white/10 space-y-2.5"
                >
                  <input
                    type="text"
                    value={newDhikrTranslit}
                    onChange={(e) => setNewDhikrTranslit(e.target.value)}
                    placeholder={t(
                      lang,
                      'Dhikr name (e.g. Durood Sharif)',
                      'যিকিরের নাম (যেমন: দরুদ শরীফ)'
                    )}
                    required
                    className="w-full h-9 rounded-lg bg-white dark:bg-[#1C1C1E] border border-stone-200/80 dark:border-white/15 px-3 text-xs text-zinc-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={newDhikrArabic}
                    onChange={(e) => setNewDhikrArabic(e.target.value)}
                    placeholder={t(lang, 'Arabic text (optional)', 'আরবি টেক্সট (ঐচ্ছিক)')}
                    className="w-full h-9 rounded-lg bg-white dark:bg-[#1C1C1E] border border-stone-200/80 dark:border-white/15 px-3 text-xs text-zinc-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={newDhikrMeaning}
                    onChange={(e) => setNewDhikrMeaning(e.target.value)}
                    placeholder={t(lang, 'Meaning (optional)', 'অর্থ (ঐচ্ছিক)')}
                    className="w-full h-9 rounded-lg bg-white dark:bg-[#1C1C1E] border border-stone-200/80 dark:border-white/15 px-3 text-xs text-zinc-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="w-full h-9 rounded-lg bg-emerald-500 text-black text-xs font-semibold"
                  >
                    {t(lang, 'Save Dhikr', 'সংরক্ষণ করুন')}
                  </button>
                </form>
              )}

              <div className="divide-y divide-black/[0.07] dark:divide-white/10">
                {allDhikrs.map((d) => {
                  const active = d.id === activeDhikr.id;
                  const count = state.tasbihCounts[d.id] ?? 0;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => onUpdateState({ selectedDhikrId: d.id })}
                      className={`w-full py-3 px-2 flex items-center justify-between text-left transition-colors ${
                        active
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-sm font-medium truncate">
                          {lang === 'bn' ? d.transliterationBn : d.transliterationEn}
                        </p>
                        <p className="text-xs text-zinc-500 truncate">
                          {lang === 'bn' ? d.meaningBn : d.meaningEn}
                        </p>
                      </div>
                      <span className="font-mono-num text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
                        {formatNum(lang, count)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 5. RUQYAH SHARIAH PAGE (#/ruqyah)
export const RuqyahPage: React.FC<{
  state: AppPersistedState;
  onNavigate: (route: AppRoute) => void;
}> = ({ state, onNavigate }) => {
  const lang = state.language;
  const ruqyahAudioRef = useRef<HTMLAudioElement | null>(null);
  const [playingRuqyahId, setPlayingRuqyahId] = useState<string | null>(null);
  const [ruqyahTrackIndex, setRuqyahTrackIndex] = useState(0);
  const [expandedRuqyahId, setExpandedRuqyahId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      releaseAudio('ruqyah');
    };
  }, []);

  const playRuqyah = (itemId: string, urls: string[], idx: number = 0) => {
    if (urls.length === 0) return;
    if (playingRuqyahId === itemId) {
      releaseAudio('ruqyah');
      setPlayingRuqyahId(null);
      return;
    }
    // Claim the single shared audio element: stops any Azan/Quran/previous track first.
    const audio = claimAudio('ruqyah', () => setPlayingRuqyahId(null));
    ruqyahAudioRef.current = audio;
    audio.src = urls[idx];
    setPlayingRuqyahId(itemId);
    setRuqyahTrackIndex(idx);
    audio.play().catch(() => setPlayingRuqyahId(null));
    audio.onended = () => {
      const next = idx + 1;
      if (next < urls.length) {
        playRuqyah(itemId, urls, next);
      } else {
        setPlayingRuqyahId(null);
        setRuqyahTrackIndex(0);
      }
    };
  };

  return (
    <div className="space-y-6">
      <PageHeader
        lang={lang}
        title={t(lang, 'Ruqyah Shariah & Shifa', 'রুকইয়াহ শরইয়াহ ও শিফা')}
        subtitle={t(
          lang,
          'Quranic healing verses & Prophetic Ruqyah in Noorani Arabic with Bengali pronunciation, audio & guidance.',
          'নূরানী আরবি, বাংলা উচ্চারণ, অর্থ, অডিও এবং আমল পদ্ধতিসহ কুরআন-সুন্নাহর রুকইয়াহ।'
        )}
        onNavigate={onNavigate}
      />

      <div className="space-y-4">
        {RUQYAH_ITEMS.map((item) => {
          const isPlaying = playingRuqyahId === item.id;
          const isExpanded = expandedRuqyahId === item.id;
          return (
            <article
              key={item.id}
              data-testid={`ruqyah-card-${item.id}`}
              className={`rounded-3xl bg-white/90 backdrop-blur-md dark:bg-[#09090B] border p-5 sm:p-6 space-y-4 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none transition-colors ${
                isExpanded
                  ? 'border-emerald-500/45'
                  : 'border-stone-200/80 dark:border-white/10'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white">
                    {lang === 'bn' ? item.titleBn : item.titleEn}
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">{item.reference}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedRuqyahId(isExpanded ? null : item.id)}
                    aria-expanded={isExpanded}
                    className={`h-10 px-3 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                      isExpanded
                        ? 'bg-emerald-500 text-black font-semibold'
                        : 'bg-[#F4F1EA] dark:bg-white/5 border border-stone-200/80 dark:border-white/10 text-zinc-700 dark:text-zinc-200 hover:border-emerald-500/40'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{t(lang, 'Amal & Explanation', 'ব্যাখ্যা ও আমল')}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {item.audioUrls.length > 0 && (
                    <button
                      type="button"
                      onClick={() => playRuqyah(item.id, item.audioUrls)}
                      className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold"
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      {isPlaying
                        ? `${t(lang, 'Pause', 'বিরতি')} (${ruqyahTrackIndex + 1}/${item.audioUrls.length})`
                        : t(lang, 'Play Audio', 'অডিও শুনুন')}
                    </button>
                  )}
                </div>
              </div>

              {/* Noorani Arabic Font */}
              <p className="font-quran text-2xl sm:text-[28px] text-right text-amber-800 dark:text-amber-200/95">
                {item.arabic}
              </p>

              <div className="pt-3 border-t border-black/[0.06] dark:border-white/10 space-y-2 text-sm">
                <p className="text-emerald-700 dark:text-emerald-300/90 leading-relaxed">
                  <span className="text-xs text-zinc-500 block mb-0.5">
                    {t(lang, 'Pronunciation', 'উচ্চারণ')}
                  </span>
                  {lang === 'bn' ? item.transliterationBn : item.transliterationEn}
                </p>
                <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed">
                  {lang === 'bn' ? item.meaningBn : item.meaningEn}
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {lang === 'bn' ? item.meaningEn : item.meaningBn}
                </p>
              </div>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3.5 border-t border-emerald-500/20 rounded-2xl bg-[#F7F4EC] dark:bg-black p-4 space-y-2.5">
                      <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" aria-hidden="true" />
                        {t(lang, 'Sunnah Method & Explanation', 'সুন্নাহ পদ্ধতি ও ব্যাখ্যা')}
                      </p>
                      <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                        {lang === 'bn' ? item.explanationBn : item.explanationEn}
                      </p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {lang === 'bn' ? item.explanationEn : item.explanationBn}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </article>
          );
        })}
      </div>
    </div>
  );
};

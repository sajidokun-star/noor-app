import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronDown,
  Compass,
  Crown,
  RotateCcw,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import type { AppPersistedState, SeerahChapter } from '../types/islamic';
import type { AppRoute } from '../utils/routes';
import { SEERAH_CURRICULUM } from '../data/seerahLibrary';
import { SEERAH_QUIZ_QUESTIONS } from '../data/duasAndRuqyah';
import { formatNum, t } from '../utils/i18n';
import { PageHeader } from './PageHeader';

const INLINE_QUIZ_QUESTIONS = SEERAH_QUIZ_QUESTIONS.slice(0, 5);

export const SeerahPage: React.FC<{
  state: AppPersistedState;
  onUpdateState: (
    updater: Partial<AppPersistedState> | ((prev: AppPersistedState) => AppPersistedState)
  ) => void;
  onNavigate: (route: AppRoute) => void;
}> = ({ state, onUpdateState, onNavigate }) => {
  const lang = state.language;
  const [category, setCategory] = useState<'all' | SeerahChapter['category']>('all');
  const [openChapterId, setOpenChapterId] = useState<string | null>(SEERAH_CURRICULUM[0]?.id ?? null);

  // Inline 5-Question Interactive Chapter Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizActiveIdx, setQuizActiveIdx] = useState(0);

  const completedSet = useMemo(
    () => new Set(state.seerahCompletedIds ?? []),
    [state.seerahCompletedIds]
  );

  // Next recommended chapter for Continue Reading banner
  const nextChapter = useMemo(() => {
    return (
      SEERAH_CURRICULUM.find((ch) => !completedSet.has(ch.id)) ??
      SEERAH_CURRICULUM[SEERAH_CURRICULUM.length - 1]
    );
  }, [completedSet]);

  const filteredChapters = useMemo(() => {
    if (category === 'all') return SEERAH_CURRICULUM;
    return SEERAH_CURRICULUM.filter((c) => c.category === category);
  }, [category]);

  const toggleCompleted = (chapterId: string) => {
    onUpdateState((prev) => {
      const current = prev.seerahCompletedIds ?? [];
      const exists = current.includes(chapterId);
      return {
        ...prev,
        seerahCompletedIds: exists
          ? current.filter((id) => id !== chapterId)
          : [...current, chapterId],
      };
    });
  };

  const handleContinueReading = () => {
    if (!nextChapter) return;
    setCategory('all');
    setOpenChapterId(nextChapter.id);
    const el = document.querySelector(`[data-testid="seerah-chapter-${nextChapter.id}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const getCategoryIcon = (cat: SeerahChapter['category']) => {
    if (cat === 'seerah') return <Crown className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />;
    if (cat === 'prophets') return <Compass className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />;
    return <Users className="w-3.5 h-3.5 text-sky-500" aria-hidden="true" />;
  };

  // Inline 5-question Quiz score computation
  const answeredCount = Object.keys(quizAnswers).length;
  const inlineScore = INLINE_QUIZ_QUESTIONS.reduce((acc, q) => {
    return acc + (quizAnswers[q.id] === q.correctIndex ? 1 : 0);
  }, 0);

  const handleSelectQuizOption = (questionId: string, optionIdx: number) => {
    if (quizAnswers[questionId] !== undefined) return;
    const nextAnswers = { ...quizAnswers, [questionId]: optionIdx };
    setQuizAnswers(nextAnswers);

    const nextScore = INLINE_QUIZ_QUESTIONS.reduce(
      (acc, q) => acc + (nextAnswers[q.id] === q.correctIndex ? 1 : 0),
      0
    );
    if (nextScore > state.quizBestScore) {
      onUpdateState({ quizBestScore: nextScore });
    }
  };

  const activeQuestion = INLINE_QUIZ_QUESTIONS[quizActiveIdx] ?? INLINE_QUIZ_QUESTIONS[0];
  const activeChosen = quizAnswers[activeQuestion.id];

  const completedCount = completedSet.size;
  const totalCount = SEERAH_CURRICULUM.length;
  const progressPct = Math.round((completedCount / Math.max(1, totalCount)) * 100);

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <PageHeader
        lang={lang}
        title={t(lang, 'Islamic Learning & Seerah Library', 'সিরাত ও ইসলামিক শিক্ষা লাইব্রেরি')}
        subtitle={t(
          lang,
          'Chronological Seerah of Prophet Muhammad (ﷺ), Stories of the Prophets, and Biographies of the Sahaba.',
          'রাসূলুল্লাহ (ﷺ)-এর সিরাত, নবী-রাসুলদের জীবনী এবং সাহাবিদের জীবনাদর্শ — পাঠ অগ্রগতি সংরক্ষণসহ।'
        )}
        onNavigate={onNavigate}
      />

      {/* Continue Reading Hero Banner */}
      {nextChapter && (
        <section className="rounded-3xl bg-gradient-to-br from-emerald-500/12 via-white/90 to-amber-500/10 dark:from-emerald-950/45 dark:via-[#09090B] dark:to-amber-950/30 backdrop-blur-md border border-emerald-500/30 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
          <div className="space-y-1.5 min-w-0">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
              {completedCount === totalCount
                ? t(lang, 'Review Completed Curriculum', 'সম্পন্ন অধ্যায় পুনরায় পড়ুন')
                : t(lang, 'Continue Reading', 'পড়া চালিয়ে যান')}
            </p>
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white leading-snug">
              {lang === 'bn' ? nextChapter.titleBn : nextChapter.titleEn}
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-1">
              {lang === 'bn' ? nextChapter.eraBn : nextChapter.eraEn} · {nextChapter.reference}
            </p>
          </div>
          <button
            type="button"
            data-testid="seerah-continue-btn"
            onClick={handleContinueReading}
            className="px-4 py-2.5 min-h-[44px] rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 shrink-0 active:scale-[0.98] transition-all"
          >
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            {t(lang, 'Continue Reading', 'পড়া শুরু করুন')}
          </button>
        </section>
      )}

      {/* Sequential Chapter Progress Dots + Overall Reading Progress */}
      <section className="rounded-3xl bg-white/90 dark:bg-[#09090B] backdrop-blur-md border border-stone-200/80 dark:border-white/10 p-5 sm:p-6 space-y-4 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-900 dark:text-white inline-flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                {t(lang, 'Curriculum Progress', 'পাঠের অগ্রগতি')}
              </span>
              <span
                data-testid="seerah-progress-readout"
                className="font-mono-num font-semibold text-emerald-700 dark:text-emerald-400"
              >
                {formatNum(lang, completedCount)}/{formatNum(lang, totalCount)} ({formatNum(lang, progressPct)}%)
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[#EFECE3] dark:bg-black overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('quiz')}
            className="px-4 py-2.5 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs inline-flex items-center justify-center gap-1.5 shrink-0"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            {t(lang, 'Full Quiz Mode', 'পূর্ণাঙ্গ কুইজ মোড')}
          </button>
        </div>

        {/* Sequential Stepper Dots */}
        <div
          className="flex items-center gap-1.5 overflow-x-auto pb-1"
          aria-label={t(lang, 'Chapter milestones', 'অধ্যায় ধাপসমূহ')}
        >
          {SEERAH_CURRICULUM.map((ch, idx) => {
            const done = completedSet.has(ch.id);
            const active = openChapterId === ch.id;
            return (
              <button
                key={ch.id}
                type="button"
                data-testid={`seerah-step-dot-${idx + 1}`}
                onClick={() => {
                  setCategory('all');
                  setOpenChapterId(ch.id);
                }}
                title={lang === 'bn' ? ch.titleBn : ch.titleEn}
                className={`min-w-[36px] h-9 px-2 rounded-xl border text-xs font-mono-num font-semibold inline-flex items-center justify-center gap-1 transition-all shrink-0 ${
                  active
                    ? 'bg-emerald-500 text-black border-emerald-400 ring-2 ring-emerald-500/30'
                    : done
                    ? 'bg-emerald-500/15 border-emerald-500/45 text-emerald-700 dark:text-emerald-300'
                    : 'bg-[#F7F4EC] dark:bg-black border-stone-200/80 dark:border-white/10 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {done && !active ? <Check className="w-3 h-3" /> : formatNum(lang, idx + 1)}
              </button>
            );
          })}
        </div>
      </section>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/90 dark:bg-[#09090B] backdrop-blur-md border border-stone-200/80 dark:border-white/10 overflow-x-auto shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
        {(
          [
            { id: 'all', en: 'All Chapters', bn: 'সকল অধ্যায়' },
            { id: 'seerah', en: 'Seerah (ﷺ)', bn: 'রাসূল (ﷺ)-এর সিরাত' },
            { id: 'prophets', en: 'Prophets (AS)', bn: 'নবী-রাসুলদের জীবনী' },
            { id: 'sahaba', en: 'Sahaba (RA)', bn: 'সাহাবিদের জীবনী' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            data-testid={`seerah-tab-${tab.id}`}
            onClick={() => setCategory(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition-colors min-h-[38px] ${
              category === tab.id
                ? 'bg-emerald-500 text-black font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            {lang === 'bn' ? tab.bn : tab.en}
          </button>
        ))}
      </div>

      {/* Chapters List */}
      <div className="space-y-4">
        {filteredChapters.map((ch) => {
          const isOpen = openChapterId === ch.id;
          const isCompleted = completedSet.has(ch.id);

          return (
            <article
              key={ch.id}
              data-testid={`seerah-chapter-${ch.id}`}
              className={`rounded-3xl bg-white/90 dark:bg-[#09090B] backdrop-blur-md border transition-colors shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none ${
                isOpen
                  ? 'border-emerald-500/45'
                  : 'border-stone-200/80 dark:border-white/10'
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenChapterId(isOpen ? null : ch.id)}
                aria-expanded={isOpen}
                className="w-full p-5 sm:p-6 text-left flex items-start justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-300 inline-flex items-center gap-1.5 flex-wrap">
                    {getCategoryIcon(ch.category)}
                    <span>{lang === 'bn' ? ch.eraBn : ch.eraEn}</span>
                    {isCompleted && (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        · {t(lang, 'Completed', 'সম্পন্ন')}
                      </span>
                    )}
                  </p>
                  <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white leading-snug">
                    {lang === 'bn' ? ch.titleBn : ch.titleEn}
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {lang === 'bn' ? ch.summaryBn : ch.summaryEn}
                  </p>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-zinc-400 shrink-0 mt-1 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-emerald-500' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>

              {isOpen && (
                <div className="px-5 sm:px-6 pb-6 pt-4 border-t border-black/[0.06] dark:border-white/10 space-y-4">
                  <p className="text-sm sm:text-[15px] text-zinc-800 dark:text-zinc-200 leading-relaxed">
                    {lang === 'bn' ? ch.contentBn : ch.contentEn}
                  </p>

                  <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/25 p-4 space-y-2">
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      {t(lang, 'Key Takeaways & Reflections', 'মূল শিক্ষা ও করণীয়')}
                    </p>
                    <ul className="space-y-1.5 text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 list-disc pl-4">
                      {(lang === 'bn' ? ch.lessonsBn : ch.lessonsEn).map((lesson, idx) => (
                        <li key={idx}>{lesson}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {t(lang, 'Source', 'সূত্র')}: {ch.reference}
                    </span>
                    <button
                      type="button"
                      data-testid={`seerah-complete-btn-${ch.id}`}
                      onClick={() => toggleCompleted(ch.id)}
                      aria-pressed={isCompleted}
                      className={`px-4 py-2 min-h-[42px] rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                        isCompleted
                          ? 'bg-emerald-500 text-black'
                          : 'bg-[#F4F1EA] dark:bg-white/5 hover:bg-emerald-500/20 text-zinc-800 dark:text-zinc-200 border border-stone-200/80 dark:border-white/10'
                      }`}
                    >
                      <Check className="w-4 h-4" aria-hidden="true" />
                      {isCompleted
                        ? t(lang, 'Marked as Read', 'পড়া সম্পন্ন হয়েছে')
                        : t(lang, 'Mark Chapter Read', 'পড়া সম্পন্ন চিহ্নিত করুন')}
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Inline 5-Question Interactive Seerah Knowledge Quiz */}
      <section
        data-testid="seerah-inline-quiz"
        className="rounded-3xl bg-white/90 dark:bg-[#09090B] backdrop-blur-md border border-stone-200/80 dark:border-white/10 p-5 sm:p-6 space-y-4 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-300 inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              {t(lang, 'Quick 5-Question Seerah Check', '৫ প্রশ্নের সিরাত কুইজ')}
            </p>
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
              {t(lang, 'Test Your Seerah Knowledge', 'আপনার সিরাত জ্ঞান যাচাই করুন')}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span
              data-testid="seerah-quiz-score"
              className="px-3 py-1 rounded-xl bg-emerald-500/12 border border-emerald-500/30 text-xs font-mono-num font-semibold text-emerald-700 dark:text-emerald-300"
            >
              {t(lang, 'Score', 'স্কোর')}: {formatNum(lang, inlineScore)}/{formatNum(lang, INLINE_QUIZ_QUESTIONS.length)}
            </span>
            {answeredCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQuizAnswers({});
                  setQuizActiveIdx(0);
                }}
                aria-label={t(lang, 'Restart quiz', 'পুনরায় শুরু করুন')}
                className="w-8 h-8 rounded-xl bg-[#F4F1EA] dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-zinc-600 dark:text-zinc-300"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Question Step Dots */}
        <div className="flex items-center gap-2">
          {INLINE_QUIZ_QUESTIONS.map((q, idx) => {
            const ans = quizAnswers[q.id];
            const isCorrect = ans === q.correctIndex;
            const isAnswered = ans !== undefined;
            const isCurrent = idx === quizActiveIdx;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setQuizActiveIdx(idx)}
                className={`h-8 flex-1 rounded-xl text-xs font-mono-num font-semibold border transition-all ${
                  isCurrent ? 'ring-2 ring-emerald-500/40' : ''
                } ${
                  !isAnswered
                    ? isCurrent
                      ? 'bg-emerald-500 text-black border-emerald-400'
                      : 'bg-[#F7F4EC] dark:bg-black border-stone-200/80 dark:border-white/10 text-zinc-600 dark:text-zinc-400'
                    : isCorrect
                    ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-500/20 border-rose-500/60 text-rose-700 dark:text-rose-300'
                }`}
              >
                {formatNum(lang, idx + 1)}
              </button>
            );
          })}
        </div>

        {/* Active Question */}
        <div className="space-y-3 pt-1">
          <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-white leading-snug">
            {formatNum(lang, quizActiveIdx + 1)}.{' '}
            {lang === 'bn' ? activeQuestion.questionBn : activeQuestion.questionEn}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(lang === 'bn' ? activeQuestion.optionsBn : activeQuestion.optionsEn).map((opt, idx) => {
              const chosen = activeChosen !== undefined;
              const isCorrectOpt = idx === activeQuestion.correctIndex;
              const isSelectedOpt = idx === activeChosen;
              let btnStyle =
                'bg-[#F7F4EC] dark:bg-black border-stone-200/80 dark:border-white/10 text-zinc-800 dark:text-zinc-200 hover:border-emerald-500/50';
              if (chosen) {
                if (isCorrectOpt) {
                  btnStyle =
                    'bg-emerald-500/20 border-emerald-500 text-emerald-800 dark:text-emerald-200 font-semibold';
                } else if (isSelectedOpt) {
                  btnStyle =
                    'bg-rose-500/20 border-rose-500 text-rose-800 dark:text-rose-200 font-semibold';
                } else {
                  btnStyle =
                    'bg-[#F7F4EC] dark:bg-black border-stone-200/60 dark:border-white/5 text-zinc-400 dark:text-zinc-500';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  data-testid={`seerah-quiz-opt-${idx}`}
                  disabled={chosen}
                  onClick={() => handleSelectQuizOption(activeQuestion.id, idx)}
                  className={`min-h-[46px] rounded-2xl border px-4 py-3 text-left text-xs sm:text-sm flex items-center justify-between gap-2 transition-all ${btnStyle}`}
                >
                  <span>{opt}</span>
                  {chosen && isCorrectOpt && (
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                  {chosen && isSelectedOpt && !isCorrectOpt && (
                    <X className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {activeChosen !== undefined && (
            <div
              data-testid="seerah-quiz-feedback"
              className={`rounded-2xl border p-3.5 text-xs sm:text-sm leading-relaxed flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                activeChosen === activeQuestion.correctIndex
                  ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-500/10 border-rose-500/35 text-rose-900 dark:text-rose-200'
              }`}
            >
              <p>
                {lang === 'bn' ? activeQuestion.explanationBn : activeQuestion.explanationEn}
              </p>
              {quizActiveIdx < INLINE_QUIZ_QUESTIONS.length - 1 && (
                <button
                  type="button"
                  onClick={() => setQuizActiveIdx((v) => Math.min(INLINE_QUIZ_QUESTIONS.length - 1, v + 1))}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 text-black font-semibold text-xs shrink-0 self-start sm:self-center"
                >
                  {t(lang, 'Next Question →', 'পরবর্তী প্রশ্ন →')}
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

import React from 'react';
import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  Calculator,
  Check,
  CircleDot,
  Clock,
  Compass,
  Database,
  HandHeart,
  Image as ImageIcon,
  MapPin,
  MessageSquare,
  Moon,
  Scale,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import type {
  AppPersistedState,
  DailyPrayerTimes,
  WaqtKey,
} from '../types/islamic';
import type { AppRoute } from '../utils/routes';
import {
  formatDateKey,
  formatTime12h,
  getNextPrayerCountdown,
  gregorianToHijri,
} from '../utils/calculations';
import { getActiveDisplayIdentity } from '../utils/accounts';
import { formatNum, t, WAQT_LABELS } from '../utils/i18n';
import { HADITH_COLLECTION } from '../data/hadithAndFiqh';
import { NoorLogo, UserAvatarBadge } from './NoorLogo';
import { DailyIbadahCard } from './DailyIbadahCard';
import { SpacedTime } from './SpacedTime';

interface HomeViewProps {
  state: AppPersistedState;
  prayerTimes: DailyPrayerTimes;
  now: Date;
  onNavigate: (route: AppRoute) => void;
  onContinueReading: () => void;
  onToggleWaqt: (dateKey: string, waqt: WaqtKey) => void;
}

const WAQT_ORDER: WaqtKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export const HomeView: React.FC<HomeViewProps> = ({
  state,
  prayerTimes,
  now,
  onNavigate,
  onContinueReading,
  onToggleWaqt,
}) => {
  const lang = state.language;
  const dateKey = formatDateKey(now);
  const todayChecklist = state.prayerChecklist[dateKey] ?? {
    fajr: false,
    dhuhr: false,
    asr: false,
    maghrib: false,
    isha: false,
  };
  const completedCount = WAQT_ORDER.filter((w) => todayChecklist[w]).length;

  const nextPrayer = getNextPrayerCountdown(prayerTimes, now);
  const hijri = gregorianToHijri(now, state.hijriOffset);
  const identity = getActiveDisplayIdentity(state.profile);

  const dayIndex = now.getDate() % HADITH_COLLECTION.length;
  const dailyHadith = HADITH_COLLECTION[dayIndex];

  const totalQaza =
    state.qazaCounts.fajr +
    state.qazaCounts.dhuhr +
    state.qazaCounts.asr +
    state.qazaCounts.maghrib +
    state.qazaCounts.isha +
    state.qazaCounts.witr;

  const currentDhikrCount = state.tasbihCounts[state.selectedDhikrId] ?? 0;

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Personalized Greeting & Quick Account / Azan Bar */}
      <section className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onNavigate('profile')}
          data-testid="home-profile-greeting-btn"
          className="inline-flex items-center gap-3 text-left group min-h-[44px]"
        >
          <UserAvatarBadge avatarId={identity.avatarId} size="md" />
          <div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {t(lang, 'Assalamu Alaikum', 'আসসালামু আলাইকুম')}
            </p>
            <p className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">
              {identity.displayName}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('notifications')}
          className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[42px] rounded-2xl bg-white/90 dark:bg-[#111113] backdrop-blur-md border border-stone-200/80 dark:border-white/10 hover:border-emerald-500/45 text-xs font-medium text-zinc-700 dark:text-zinc-200 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none transition-colors whitespace-nowrap"
        >
          <Bell className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" aria-hidden="true" />
          <span>{t(lang, 'Azan & Hadith Alerts', 'আজান ও হাদীস অ্যালার্ট')}</span>
        </button>
      </section>

      {/* Primary Hero Focal Anchor: Next Prayer & Hijri Overview + 5-Waqt Checklist */}
      <section className="noor-hero-card rounded-3xl bg-white/90 dark:bg-[#09090B] backdrop-blur-md border border-stone-200/80 dark:border-white/10 p-4 sm:p-8 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-center">
          <div className="lg:col-span-7 space-y-4 min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium whitespace-nowrap">
                <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                {lang === 'bn' ? state.location.labelBn : state.location.labelEn}
              </span>
              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                <span className="hidden sm:inline" aria-hidden="true">·</span>
                <span>
                  {formatNum(lang, hijri.day)}{' '}
                  {lang === 'bn' ? hijri.monthNameBn : hijri.monthNameEn}{' '}
                  {formatNum(lang, hijri.year)} {t(lang, 'AH', 'হিজরি')}
                </span>
              </span>
              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                <span className="hidden sm:inline" aria-hidden="true">·</span>
                <span>{prayerTimes.dateLabel}</span>
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {t(lang, 'Upcoming Prayer', 'পরবর্তী নামাজ')}
              </p>
              <div className="flex flex-wrap items-baseline gap-3 sm:gap-4">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white leading-[1.3]">
                  {WAQT_LABELS[nextPrayer.key][lang]}
                </h1>
                <span className="text-xl sm:text-2xl font-semibold text-amber-600 dark:text-amber-400">
                  <SpacedTime value={formatTime12h(nextPrayer.time)} lang={lang} colonSize="md" />
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-1">
              <div>
                <p className="text-xs text-zinc-500">{t(lang, 'Time Remaining', 'বাকি সময়')}</p>
                <p
                  className="text-2xl sm:text-3xl font-semibold text-emerald-600 dark:text-emerald-400 font-timer tracking-wider leading-[1.6] pt-0.5"
                  data-testid="next-prayer-countdown"
                >
                  <SpacedTime value={nextPrayer.countdownFormatted} lang={lang} colonSize="lg" />
                </p>
              </div>
              <div className="h-9 w-px bg-black/10 dark:bg-white/10 hidden sm:block" aria-hidden="true" />
              <div className="grid grid-cols-3 gap-2.5 sm:flex sm:items-center sm:gap-5 text-xs sm:text-sm w-full sm:w-auto">
                <div className="min-w-0">
                  <span className="block text-[11px] sm:text-xs text-zinc-500">
                    {t(lang, 'Sahri Ends', 'সাহরি শেষ')}
                  </span>
                  <span className="text-zinc-800 dark:text-zinc-200 font-medium whitespace-nowrap">
                    <SpacedTime value={formatTime12h(prayerTimes.sahri)} lang={lang} />
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="block text-[11px] sm:text-xs text-zinc-500">
                    {t(lang, 'Iftar', 'ইফতার')}
                  </span>
                  <span className="text-zinc-800 dark:text-zinc-200 font-medium whitespace-nowrap">
                    <SpacedTime value={formatTime12h(prayerTimes.iftar)} lang={lang} />
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="block text-[11px] sm:text-xs text-zinc-500">
                    {t(lang, 'Tahajjud', 'তাহাজ্জুদ')}
                  </span>
                  <span className="text-zinc-800 dark:text-zinc-200 font-medium whitespace-nowrap">
                    <SpacedTime value={formatTime12h(prayerTimes.tahajjud)} lang={lang} />
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-black/[0.08] dark:border-white/10 pt-5 lg:pt-0 lg:pl-6 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                {t(lang, "Today's 5-Waqt Checklist", 'আজকের ৫ ওয়াক্ত নামাজ')}
              </h2>
              <span className="text-xs font-mono-num font-semibold text-emerald-600 dark:text-emerald-400">
                {formatNum(lang, completedCount)}/{formatNum(lang, 5)}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2 w-full" data-testid="home-waqt-grid">
              {WAQT_ORDER.map((waqt) => {
                const checked = todayChecklist[waqt];
                return (
                  <button
                    key={waqt}
                    type="button"
                    onClick={() => onToggleWaqt(dateKey, waqt)}
                    aria-pressed={checked}
                    className={`min-w-0 min-h-[58px] rounded-2xl border px-0.5 py-2 flex flex-col items-center justify-center gap-1.5 active:scale-[0.96] transition-all focus-visible:outline-2 focus-visible:outline-emerald-500 ${
                      checked
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-300'
                        : 'bg-[#F7F4EC] dark:bg-black border-stone-200/80 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:border-stone-300 dark:hover:border-white/25 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full flex items-center justify-center border border-current shrink-0">
                      {checked && <Check className="w-3 h-3" aria-hidden="true" />}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-medium leading-tight text-center truncate max-w-full px-0.5">
                      {WAQT_LABELS[waqt][lang]}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>
                {t(lang, 'Pending Qaza', 'বকেয়া কাজা')}:{' '}
                <strong className="text-zinc-900 dark:text-zinc-200 font-mono-num">
                  {formatNum(lang, totalQaza)}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => onNavigate('tracker')}
                className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 inline-flex items-center gap-1 font-medium whitespace-nowrap py-1"
              >
                {t(lang, 'Manage Qaza', 'কাজা ট্র্যাকার')}
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Live Daily Ibadah & Namaz Completion Progress Card */}
      <DailyIbadahCard state={state} now={now} onNavigate={onNavigate} compact />

      {/* Continue Reading Quran Shortcut (Persisted in localStorage) */}
      {state.lastRead && (
        <section>
          <button
            type="button"
            onClick={onContinueReading}
            data-testid="continue-reading-btn"
            className="w-full rounded-3xl bg-white/90 dark:bg-[#09090B] backdrop-blur-md border border-emerald-500/35 hover:border-emerald-500 px-5 py-4 flex items-center justify-between gap-4 text-left shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {t(lang, 'Continue Reading Al-Quran', 'সর্বশেষ পাঠকৃত সূরা থেকে শুরু করুন')}
                </p>
                <p className="text-base font-semibold text-zinc-900 dark:text-white truncate">
                  {formatNum(lang, state.lastRead.surahNumber)}.{' '}
                  {lang === 'bn' ? state.lastRead.surahNameBn : state.lastRead.surahNameEn} ·{' '}
                  {t(lang, 'Ayah', 'আয়াত')} {formatNum(lang, state.lastRead.ayahNumber)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="font-quran text-xl text-amber-700 dark:text-amber-200 hidden sm:inline">
                {state.lastRead.surahNameAr}
              </span>
              <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            </div>
          </button>
        </section>
      )}

      {/* Quick-Access Grid Cards for Every Separate Page */}
      <section aria-labelledby="modules-heading" className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 id="modules-heading" className="text-lg font-semibold text-zinc-900 dark:text-white">
            {t(lang, 'All Modules & Pages', 'সকল মডিউল ও পেজ')}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t(lang, 'Offline Ready · Bilingual', 'অফলাইন সংরক্ষিত · দ্বিভাষিক')}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          <QuickModuleTile
            icon={<BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            title={t(lang, 'Noorani Quran', 'নূরানী কুরআন')}
            meta={t(lang, 'Tajweed · Tafsir · Audio', 'তাজবিদ · তাফসীর · অডিও')}
            onClick={() => onNavigate('quran')}
          />
          <QuickModuleTile
            icon={<Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
            title={t(lang, 'Prayer Times', 'নামাজের সময়সূচি')}
            meta={t(lang, 'Sahri, Iftar & Tahajjud', 'সাহরি, ইফতার ও তাহাজ্জুদ')}
            onClick={() => onNavigate('prayer')}
          />
          <QuickModuleTile
            icon={<Compass className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            title={t(lang, 'Qibla Compass', 'কিবলা কম্পাস')}
            meta={t(lang, 'Live Sensor + Manual', 'লাইভ সেন্সর ও ম্যানুয়াল')}
            onClick={() => onNavigate('qibla')}
          />
          <QuickModuleTile
            icon={<Check className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
            title={t(lang, 'Prayer & Qaza', 'নামাজ ও কাজা')}
            meta={`${t(lang, 'Pending', 'বকেয়া')}: ${formatNum(lang, totalQaza)}`}
            onClick={() => onNavigate('tracker')}
          />
          <QuickModuleTile
            icon={<Bell className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            title={t(lang, 'Azan & Alerts', 'আজান ও অ্যালার্ট')}
            meta={t(lang, '5-Waqt Alarm · Hadith Push', '৫ ওয়াক্ত আজান · হাদীস')}
            onClick={() => onNavigate('notifications')}
          />
          <QuickModuleTile
            icon={<CircleDot className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
            title={t(lang, 'Smart Tasbih', 'ডিজিটাল তাসবীহ')}
            meta={`${t(lang, 'Count', 'গণনা')}: ${formatNum(lang, currentDhikrCount)}`}
            onClick={() => onNavigate('tasbih')}
          />
          <QuickModuleTile
            icon={<HandHeart className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            title={t(lang, 'Masnoon Duas', 'মাসনূন দোয়া')}
            meta={t(lang, 'Hisnul Muslim · Fazilat', 'হিসনুল মুসলিম · ফজিলত')}
            onClick={() => onNavigate('dua')}
          />
          <QuickModuleTile
            icon={<ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
            title={t(lang, 'Ruqyah Shariah', 'রুকইয়াহ শরইয়াহ')}
            meta={t(lang, 'Shifa Verses & Audio', 'শিফার আয়াত ও অডিও')}
            onClick={() => onNavigate('ruqyah')}
          />
          <QuickModuleTile
            icon={<BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            title={t(lang, 'Hadith Collection', 'হাদীস সংকলন')}
            meta={t(lang, 'Bukhari · Muslim · Tirmidhi', 'সহীহ হাদীস ও ব্যাখ্যা')}
            onClick={() => onNavigate('hadith')}
          />
          <QuickModuleTile
            icon={<Scale className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
            title={t(lang, "Daily Fiqh (Mas'alah)", 'দৈনন্দিন ফিকহ')}
            meta={t(lang, 'Namaz · Roza · Halal', 'নামাজ · রোজা · হালাল')}
            onClick={() => onNavigate('fiqh')}
          />
          <QuickModuleTile
            icon={<CalendarDays className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            title={t(lang, 'Hijri Calendar', 'হিজরি ক্যালেন্ডার')}
            meta={t(lang, 'Moon Offset · Events', 'চাঁদ সমন্বয় ও দিবস')}
            onClick={() => onNavigate('calendar')}
          />
          <QuickModuleTile
            icon={<Calculator className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
            title={t(lang, 'Zakat Calculator', 'যাকাত ক্যালকুলেটর')}
            meta={t(lang, '2.5% · Nisab Check', '২.৫% · নিসাব যাচাই')}
            onClick={() => onNavigate('zakat')}
          />
          <QuickModuleTile
            icon={<Scale className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            title={t(lang, 'Miras (Inheritance)', 'মীরাস (উত্তরাধিকার)')}
            meta={t(lang, 'Faraid Share Breakdown', 'ফারায়েজ অংশ বণ্টন')}
            onClick={() => onNavigate('miras')}
          />
          <QuickModuleTile
            icon={<MapPin className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
            title={t(lang, 'Mosque & Halal', 'মসজিদ ও হালাল')}
            meta={t(lang, 'Google Maps Finder', 'গুগল ম্যাপ সন্ধান')}
            onClick={() => onNavigate('nearby')}
          />
          <QuickModuleTile
            icon={<Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            title={t(lang, 'Seerah Quiz', 'সিরাত কুইজ')}
            meta={`${t(lang, 'Best', 'সেরা')}: ${formatNum(lang, state.quizBestScore)}`}
            onClick={() => onNavigate('quiz')}
          />
          <QuickModuleTile
            icon={<ImageIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
            title={t(lang, 'Card Maker', 'কার্ড মেকার')}
            meta={t(lang, 'PNG Quote Export', 'PNG কার্ড ডাউনলোড')}
            onClick={() => onNavigate('card-maker')}
          />
          <QuickModuleTile
            icon={<User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            title={t(lang, 'Account & Profile', 'অ্যাকাউন্ট ও প্রোফাইল')}
            meta={t(lang, 'Streaks · Sync · Settings', 'স্ট্রিক · প্রোফাইল · সেটিংস')}
            onClick={() => onNavigate('profile')}
          />
          <QuickModuleTile
            icon={<Moon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            title={t(lang, 'Ramadan Hub', 'রমজান ড্যাশবোর্ড')}
            meta={t(lang, 'Roza · Taraweeh · Khatam', 'রোজা · তারাবীহ · খতম')}
            onClick={() => onNavigate('ramadan')}
          />
          <QuickModuleTile
            icon={<BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
            title={t(lang, 'Seerah & Prophets', 'সিরাত ও নবীদের জীবনী')}
            meta={`${t(lang, 'Completed', 'সম্পন্ন')}: ${formatNum(lang, state.seerahCompletedIds?.length ?? 0)}`}
            onClick={() => onNavigate('seerah')}
          />
          <QuickModuleTile
            icon={<MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            title={t(lang, 'AI Islamic Assistant', 'ইসলামিক এআই অ্যাসিস্ট্যান্ট')}
            meta={t(lang, 'Quran & Hadith Grounded', 'কুরআন ও হাদীস ভিত্তিক')}
            onClick={() => onNavigate('ai-assistant')}
          />
          <QuickModuleTile
            icon={<Database className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
            title={t(lang, 'Offline Backup', 'অফলাইন ব্যাকআপ')}
            meta={t(lang, 'JSON Export / Import', 'JSON এক্সপোর্ট / ইমপোর্ট')}
            onClick={() => onNavigate('backup')}
          />
        </div>
      </section>

      {/* Daily Hadith Card */}
      <section className="rounded-3xl bg-white/90 dark:bg-[#09090B] backdrop-blur-md border border-stone-200/80 dark:border-white/10 p-6 space-y-4 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span>{t(lang, 'Hadith of the Day', 'আজকের হাদীস')}</span>
          <span>
            {lang === 'bn' ? dailyHadith.bookBn : dailyHadith.bookEn} · {dailyHadith.reference} ·{' '}
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">{dailyHadith.grade}</span>
          </span>
        </div>
        <p className="font-quran text-2xl sm:text-[26px] text-right text-amber-800 dark:text-amber-200/95">
          {dailyHadith.arabic}
        </p>
        <p className="text-sm sm:text-base text-zinc-800 dark:text-zinc-200 leading-relaxed">
          {lang === 'bn' ? dailyHadith.bengali : dailyHadith.english}
        </p>
        <div className="pt-3 border-t border-black/[0.07] dark:border-white/10 flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            {t(lang, 'Authenticity verified collection', 'নির্ভরযোগ্য ও যাচাইকৃত সংকলন')}
          </span>
          <button
            type="button"
            onClick={() => onNavigate('hadith')}
            className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 inline-flex items-center gap-1 whitespace-nowrap py-1"
          >
            {t(lang, 'Explore All Hadiths', 'সব হাদীস দেখুন')}
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* Quiet Respectful Footer with Custom SVG Logo & Creator Credit */}
      <footer className="pt-4 pb-2 border-t border-black/[0.08] dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
        <div className="inline-flex items-center gap-2.5">
          <NoorLogo size={22} />
          <span>Noor · All-Rounder Islamic Companion</span>
        </div>
        <p>
          Developed &amp; Crafted by{' '}
          <span className="text-amber-700 dark:text-amber-300/90 font-medium">Sayed Tahmid Sajid</span>
        </p>
      </footer>
    </div>
  );
};

interface QuickModuleTileProps {
  icon: React.ReactNode;
  title: string;
  meta: string;
  onClick: () => void;
}

const QuickModuleTile: React.FC<QuickModuleTileProps> = ({ icon, title, meta, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={`${title} — ${meta}`}
    className="group rounded-2xl bg-white/90 dark:bg-[#09090B] backdrop-blur-md border border-stone-200/80 dark:border-white/10 hover:border-emerald-500/45 active:scale-[0.97] p-4 text-left shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none transition-all duration-150 flex flex-col justify-between gap-3 min-h-[104px] focus-visible:outline-2 focus-visible:outline-emerald-500"
  >
    <div className="w-9 h-9 rounded-xl bg-[#F7F4EC] dark:bg-black border border-stone-200/80 dark:border-white/10 flex items-center justify-center group-hover:border-emerald-500/40 transition-colors">
      {icon}
    </div>
    <div>
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-700 dark:group-hover:text-white leading-snug">
        {title}
      </p>
      <p className="text-xs text-zinc-500 mt-0.5 truncate">{meta}</p>
    </div>
  </button>
);

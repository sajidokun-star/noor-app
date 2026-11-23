import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  Calculator,
  Check,
  CheckCircle2,
  CircleDot,
  Clock,
  Compass,
  Database,
  Download,
  ExternalLink,
  HandHeart,
  Image as ImageIcon,
  MapPin,
  MessageSquare,
  Moon,
  RotateCcw,
  Scale,
  ShieldCheck,
  Sparkles,
  Upload,
  UserCircle2,
  XCircle,
} from 'lucide-react';
import type { AppPersistedState, ZakatSnapshot } from '../types/islamic';
import type { AppRoute } from '../utils/routes';
import { calculateMiras, calculateZakat } from '../utils/calculations';
import { SEERAH_QUIZ_QUESTIONS } from '../data/duasAndRuqyah';
import { HADITH_COLLECTION } from '../data/hadithAndFiqh';
import { formatNum, t } from '../utils/i18n';
import { PageHeader } from './PageHeader';

const CARD_PRESETS = [
  {
    id: 'verse_ease',
    arabic: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا',
    en: 'For indeed, with hardship [will be] ease.',
    bn: 'নিশ্চয়ই কষ্টের সাথেই রয়েছে স্বস্তি।',
    ref: 'Surah Ash-Sharh 94:5',
  },
  {
    id: 'verse_remember',
    arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ',
    en: 'So remember Me; I will remember you.',
    bn: 'অতএব তোমরা আমাকে স্মরণ করো, আমিও তোমাদের স্মরণ করব।',
    ref: 'Surah Al-Baqarah 2:152',
  },
  {
    id: 'hadith_intent',
    arabic: HADITH_COLLECTION[0].arabic,
    en: HADITH_COLLECTION[0].english,
    bn: HADITH_COLLECTION[0].bengali,
    ref: 'Sahih al-Bukhari 1',
  },
  {
    id: 'hadith_smile',
    arabic: HADITH_COLLECTION[7].arabic,
    en: HADITH_COLLECTION[7].english,
    bn: HADITH_COLLECTION[7].bengali,
    ref: 'Jami at-Tirmidhi 1956',
  },
];

const CARD_THEMES = [
  { id: 'obsidian', nameEn: 'Obsidian Emerald', nameBn: 'অবসিডিয়ান পান্না', bg1: '#040806', bg2: '#0B1F17', accent: '#10B981', gold: '#F59E0B' },
  { id: 'midnight', nameEn: 'Midnight Gold', nameBn: 'মিডনাইট গোল্ড', bg1: '#050507', bg2: '#15120B', accent: '#D4AF37', gold: '#FDE68A' },
  { id: 'deep_teal', nameEn: 'Deep Kaaba Noir', nameBn: 'কাবা নোয়াখালি', bg1: '#000000', bg2: '#111317', accent: '#34D399', gold: '#FBBF24' },
];

// 1. ALL TOOLS DIRECTORY PAGE (#/tools)
export const ToolsHubPage: React.FC<{
  state: AppPersistedState;
  onNavigate: (route: AppRoute) => void;
}> = ({ state, onNavigate }) => {
  const lang = state.language;

  const directoryItems: Array<{
    route: AppRoute;
    icon: React.ReactNode;
    titleEn: string;
    titleBn: string;
    descEn: string;
    descBn: string;
  }> = [
    {
      route: 'quran',
      icon: <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      titleEn: 'Al-Quran & Noorani Tajweed',
      titleBn: 'আল-কুরআন ও নূরানী তাজবিদ',
      descEn: 'Color-coded Tajweed, Bengali & English Tafsir, Core Lesson, Audio & Hifz loop.',
      descBn: 'রঙিন তাজবিদ, বাংলা ও ইংরেজি তাফসীর, মূল শিক্ষা ও হিফজ অডিও।',
    },
    {
      route: 'prayer',
      icon: <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      titleEn: 'Prayer Times',
      titleBn: 'নামাজের সময়সূচি',
      descEn: '5 daily Waqts, Sahri, Iftar, Ishraq, Tahajjud & GPS city settings.',
      descBn: '৫ ওয়াক্ত নামাজ, সাহরি, ইফতার, ইশরাক, তাহাজ্জুদ ও জিপিএস।',
    },
    {
      route: 'qibla',
      icon: <Compass className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      titleEn: 'Qibla Compass',
      titleBn: 'কিবলা কম্পাস',
      descEn: 'High-precision compass dial with live sensor & drag pointing to Holy Kaaba.',
      descBn: 'লাইভ সেন্সর ও ইন্টারেক্টিভ ডায়ালসহ কাবার দিক নির্ণয়।',
    },
    {
      route: 'tracker',
      icon: <Check className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      titleEn: 'Prayer & Qaza Tracker',
      titleBn: 'নামাজ ও কাজা ট্র্যাকার',
      descEn: 'Daily 5-Waqt checklist and persistent Qaza counter.',
      descBn: 'দৈনিক ৫ ওয়াক্ত নামাজের চেকলিস্ট এবং কাজা হিসাব।',
    },
    {
      route: 'calendar',
      icon: <CalendarDays className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      titleEn: 'Hijri Calendar & Events',
      titleBn: 'হিজরি ক্যালেন্ডার ও দিবস',
      descEn: 'Moon-sighting +/-2 day offset, Ayyam al-Beed & Islamic event countdowns.',
      descBn: 'চাঁদ দেখা সমন্বয়, আইয়্যামে বীজ ও ইসলামিক দিবসের কাউন্টডাউন।',
    },
    {
      route: 'hadith',
      icon: <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      titleEn: 'Hadith Collection',
      titleBn: 'সহীহ হাদীস সংকলন',
      descEn: 'Sahih Bukhari, Muslim & Tirmidhi narrations with commentary & daily life application.',
      descBn: 'বুখারী, মুসলিম ও তিরমিযী থেকে যাচাইকৃত হাদীস, ব্যাখ্যা ও বাস্তব প্রয়োগ।',
    },
    {
      route: 'fiqh',
      icon: <Scale className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      titleEn: "Daily Fiqh (Mas'alah)",
      titleBn: 'দৈনন্দিন ফিকহ ও মাসআলা',
      descEn: 'Essential rulings for Namaz, Roza, Wudu, and Halal-Haram.',
      descBn: 'নামাজ, রোজা, ওযু ও হালাল-হারামের প্রয়োজনীয় মাসআলা।',
    },
    {
      route: 'dua',
      icon: <HandHeart className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      titleEn: 'Masnoon Duas',
      titleBn: 'মাসনূন দোয়া',
      descEn: 'Hisnul Muslim categorized supplications with pronunciation & meaning.',
      descBn: 'হিসনুল মুসলিম থেকে সকাল-সন্ধ্যা, ঘুম, সফর ও বিপদমুক্তির দোয়া।',
    },
    {
      route: 'tasbih',
      icon: <CircleDot className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      titleEn: 'Smart Digital Tasbih',
      titleBn: 'ডিজিটাল তাসবীহ',
      descEn: 'Haptic tap counter, custom Dhikr, sound chime & target ring.',
      descBn: 'ভাইব্রেশন, কাস্টম যিকির, শব্দ ও লক্ষ্যমাত্রাসহ তাসবীহ।',
    },
    {
      route: 'ruqyah',
      icon: <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      titleEn: 'Ruqyah Shariah',
      titleBn: 'রুকইয়াহ শরইয়াহ',
      descEn: 'Quranic Shifa verses & Prophetic Ruqyah Duas with audio playback.',
      descBn: 'কুরআনের শিফার আয়াত ও অডিওসহ রুকইয়াহ দোয়া।',
    },
    {
      route: 'zakat',
      icon: <Calculator className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      titleEn: 'Smart Zakat Calculator',
      titleBn: 'স্মার্ট যাকাত ক্যালকুলেটর',
      descEn: '2.5% Zakat calculation in BDT/USD with Nisab threshold check.',
      descBn: 'নিসাব সীমা যাচাইসহ টাকা বা ডলারে ২.৫% যাকাত হিসাব।',
    },
    {
      route: 'miras',
      icon: <Scale className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      titleEn: 'Miras (Inheritance)',
      titleBn: 'মীরাস (উত্তরাধিকার)',
      descEn: 'Faraid share calculator for spouse, parents, sons & daughters.',
      descBn: 'ফারায়েজ অনুযায়ী ইসলামী উত্তরাধিকার অংশ বণ্টন হিসাব।',
    },
    {
      route: 'nearby',
      icon: <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      titleEn: 'Mosque & Halal Finder',
      titleBn: 'মসজিদ ও হালাল খাবার',
      descEn: 'Open Google Maps to find mosques and Halal food near you.',
      descBn: 'গুগল ম্যাপে নিকটস্থ মসজিদ ও হালাল রেস্তোরাঁ খুঁজুন।',
    },
    {
      route: 'quiz',
      icon: <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      titleEn: 'Seerah & Sahaba Quiz',
      titleBn: 'সিরাত ও সাহাবা কুইজ',
      descEn: 'Interactive Islamic knowledge quiz with explanations & high score.',
      descBn: 'ব্যাখ্যা ও স্কোরসহ ইসলামিক জ্ঞান কুইজ।',
    },
    {
      route: 'card-maker',
      icon: <ImageIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      titleEn: 'Islamic Card Maker',
      titleBn: 'ইসলামিক কার্ড মেকার',
      descEn: 'Design and download 1080×1080 calligraphy quote cards as PNG.',
      descBn: 'সুন্দর ইসলামিক আয়াত ও হাদীসের কার্ড তৈরি করে PNG ডাউনলোড করুন।',
    },
    {
      route: 'notifications',
      icon: <Bell className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      titleEn: 'Azan & Hadith Alerts',
      titleBn: 'আজান ও হাদীস অ্যালার্ট',
      descEn: '5-Waqt Azan audio alarm, Muazzin picker & Daily Hadith notifications.',
      descBn: '৫ ওয়াক্ত নামাজের আজান অ্যালার্ম ও দৈনিক হাদীস নোটিফিকেশন।',
    },
    {
      route: 'profile',
      icon: <UserCircle2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      titleEn: 'Profile & Settings',
      titleBn: 'প্রোফাইল ও সেটিংস',
      descEn: 'Switch Light/Dark mode, profiles, streaks & transfer JSON backups.',
      descBn: 'লাইট/ডার্ক থিম, অ্যাকাউন্ট, নামাজ স্ট্রিক এবং JSON ব্যাকআপ।',
    },
    {
      route: 'ramadan',
      icon: <Moon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      titleEn: 'Ramadan Dashboard',
      titleBn: 'পবিত্র রমজান ড্যাশবোর্ড',
      descEn: 'Sahri/Iftar countdown, Roza & Taraweeh tracker, Khatam planner & Last 10 Nights.',
      descBn: 'সাহরি ও ইফতার কাউন্টডাউন, রোজা-তারাবীহ ট্র্যাকার ও কুরআন খতম পরিকল্পনা।',
    },
    {
      route: 'seerah',
      icon: <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      titleEn: 'Islamic Learning & Seerah',
      titleBn: 'সিরাত ও ইসলামিক শিক্ষা',
      descEn: 'Seerah of Prophet (ﷺ), Stories of the Prophets & Biographies of the Sahaba.',
      descBn: 'রাসূল (ﷺ)-এর সিরাত, নবী-রাসুলদের জীবনী ও সাহাবিদের জীবনাদর্শ।',
    },
    {
      route: 'ai-assistant',
      icon: <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      titleEn: 'AI Islamic Assistant',
      titleBn: 'ইসলামিক এআই অ্যাসিস্ট্যান্ট',
      descEn: 'Source-grounded Q&A citing verified Quran Ayahs & authentic Hadith.',
      descBn: 'কুরআন ও সহীহ হাদীসের দলিলভিত্তিক প্রশ্নোত্তর এবং আলেম পরামর্শ।',
    },
    {
      route: 'backup',
      icon: <Database className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      titleEn: 'Offline Backup (JSON)',
      titleBn: 'অফলাইন ব্যাকআপ (JSON)',
      descEn: 'Export or restore all bookmarks, checklists, and Tasbih data.',
      descBn: 'সব বুকমার্ক, নামাজ ও তাসবীহ ডেটা JSON ফাইলে ব্যাকআপ নিন।',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        lang={lang}
        title={t(lang, 'All Modules & Islamic Tools', 'সকল মডিউল ও ইসলামিক টুলস')}
        subtitle={t(
          lang,
          'Dedicated full-screen pages for every feature with offline data persistence.',
          'প্রতিটি ফিচারের জন্য আলাদা পূর্ণ-স্ক্রিন পেজ — অফলাইনে সংরক্ষিত।'
        )}
        onNavigate={onNavigate}
        showAllToolsLink={false}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {directoryItems.map((item) => (
          <button
            key={item.route}
            type="button"
            onClick={() => onNavigate(item.route)}
            className="group rounded-3xl bg-white/90 backdrop-blur-md dark:bg-[#09090B] border border-stone-200/80 dark:border-white/10 hover:border-emerald-500/45 p-5 text-left shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none active:scale-[0.98] transition-all duration-150 flex items-start justify-between gap-3"
          >
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#F4F1EA] dark:bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/10 transition-colors">
                {item.icon}
              </div>
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                  {lang === 'bn' ? item.titleBn : item.titleEn}
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {lang === 'bn' ? item.descBn : item.descEn}
                </p>
              </div>
            </div>
            <ArrowRight
              className="w-4 h-4 text-zinc-400 dark:text-zinc-600 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 shrink-0 mt-1 transition-colors"
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
    </div>
  );
};

// 2. ZAKAT PAGE (#/zakat)
export const ZakatPage: React.FC<{
  state: AppPersistedState;
  onUpdateState: (
    updater: Partial<AppPersistedState> | ((prev: AppPersistedState) => AppPersistedState)
  ) => void;
  onNavigate: (route: AppRoute) => void;
}> = ({ state, onUpdateState, onNavigate }) => {
  const lang = state.language;
  const [currency, setCurrency] = useState<'BDT' | 'USD'>('BDT');
  const [cashAndBank, setCashAndBank] = useState<string>('0');
  const [goldValue, setGoldValue] = useState<string>('0');
  const [silverValue, setSilverValue] = useState<string>('0');
  const [businessInventory, setBusinessInventory] = useState<string>('0');
  const [investments, setInvestments] = useState<string>('0');
  const [receivables, setReceivables] = useState<string>('0');
  const [liabilities, setLiabilities] = useState<string>('0');
  const [nisabThreshold, setNisabThreshold] = useState<string>('95000');

  const switchCurrency = (next: 'BDT' | 'USD') => {
    setCurrency(next);
    setNisabThreshold(next === 'BDT' ? '95000' : '750');
  };

  const zakatResult = useMemo(
    () =>
      calculateZakat({
        cashAndBank: Number(cashAndBank) || 0,
        goldValue: Number(goldValue) || 0,
        silverValue: Number(silverValue) || 0,
        businessInventory: Number(businessInventory) || 0,
        investments: Number(investments) || 0,
        receivables: Number(receivables) || 0,
        liabilities: Number(liabilities) || 0,
        nisabThreshold: Number(nisabThreshold) || 0,
      }),
    [cashAndBank, goldValue, silverValue, businessInventory, investments, receivables, liabilities, nisabThreshold]
  );

  const saveZakatSnapshot = () => {
    const snap: ZakatSnapshot = {
      id: `zk_${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      currency,
      netWealth: zakatResult.netWealth,
      zakatDue: zakatResult.zakatPayable,
      eligible: zakatResult.eligible,
    };
    onUpdateState((prev) => ({
      ...prev,
      zakatHistory: [snap, ...prev.zakatHistory].slice(0, 10),
    }));
  };

  const currencySymbol = currency === 'BDT' ? '৳' : '$';

  return (
    <div className="space-y-6">
      <PageHeader
        lang={lang}
        title={t(lang, 'Smart Zakat Calculator (2.5%)', 'স্মার্ট যাকাত ক্যালকুলেটর (২.৫%)')}
        subtitle={t(
          lang,
          'Calculate net zakatable assets against Nisab in BDT or USD.',
          'নিসাব সীমা অনুযায়ী টাকা বা ডলারে আপনার প্রদেয় যাকাত নির্ণয় করুন।'
        )}
        onNavigate={onNavigate}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 rounded-3xl bg-white/90 backdrop-blur-md dark:bg-[#1C1C1E] border border-stone-200/80 dark:border-white/[0.08] p-6 space-y-5 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              {t(lang, 'Assets & Liabilities', 'সম্পদ ও দায়-দেনা')}
            </h2>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F4F1EA] dark:bg-black border border-stone-200/80 dark:border-white/10">
              {(['BDT', 'USD'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => switchCurrency(c)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium ${
                    currency === c
                      ? 'bg-emerald-500 text-black font-semibold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {c === 'BDT' ? 'BDT (৳)' : 'USD ($)'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NumberField
              id="zakat-cash"
              label={t(lang, `Cash & Bank (${currencySymbol})`, `নগদ ও ব্যাংক জমা (${currencySymbol})`)}
              value={cashAndBank}
              onChange={setCashAndBank}
            />
            <NumberField
              id="zakat-gold"
              label={t(lang, `Gold Value (${currencySymbol})`, `স্বর্ণের মূল্য (${currencySymbol})`)}
              value={goldValue}
              onChange={setGoldValue}
            />
            <NumberField
              id="zakat-silver"
              label={t(lang, `Silver Value (${currencySymbol})`, `রূপার মূল্য (${currencySymbol})`)}
              value={silverValue}
              onChange={setSilverValue}
            />
            <NumberField
              id="zakat-business"
              label={t(lang, `Business Inventory (${currencySymbol})`, `ব্যবসায়িক পণ্য (${currencySymbol})`)}
              value={businessInventory}
              onChange={setBusinessInventory}
            />
            <NumberField
              id="zakat-invest"
              label={t(lang, `Shares & Investments (${currencySymbol})`, `বিনিয়োগ ও শেয়ার (${currencySymbol})`)}
              value={investments}
              onChange={setInvestments}
            />
            <NumberField
              id="zakat-recv"
              label={t(lang, `Receivables (${currencySymbol})`, `পাওনা টাকা (${currencySymbol})`)}
              value={receivables}
              onChange={setReceivables}
            />
            <NumberField
              id="zakat-debt"
              label={t(lang, `Short-Term Liabilities / Debts (${currencySymbol})`, `ঋণ ও দায় বাদ (${currencySymbol})`)}
              value={liabilities}
              onChange={setLiabilities}
            />
            <NumberField
              id="zakat-nisab"
              label={t(lang, `Nisab Threshold (${currencySymbol})`, `নিসাব সীমা (${currencySymbol})`)}
              value={nisabThreshold}
              onChange={setNisabThreshold}
            />
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {t(
              lang,
              'Nisab Guide: 612.36g (52.5 tola) Silver or 87.48g (7.5 tola) Gold held for 1 lunar year (Hawl). Scholars recommend Silver Nisab if you hold mixed assets.',
              'নিসাব নির্দেশিকা: ৫২.৫ তোলা (৬১২.৩৬ গ্রাম) রূপা বা ৭.৫ তোলা (৮৭.৪৮ গ্রাম) স্বর্ণের সমমূল্য ১ চন্দ্রবছর থাকলে যাকাত ফরয।'
            )}
          </p>
        </div>

        <div className="lg:col-span-5 rounded-3xl bg-white/90 backdrop-blur-md dark:bg-[#1C1C1E] border border-stone-200/80 dark:border-white/[0.08] p-6 space-y-5 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t(lang, 'Total Payable Zakat (2.5%)', 'প্রদেয় মোট যাকাত (২.৫%)')}
            </p>
            <p
              className="text-4xl font-bold text-emerald-600 dark:text-emerald-400 font-mono-num mt-1"
              data-testid="zakat-payable-output"
            >
              {currencySymbol} {formatNum(lang, zakatResult.zakatPayable.toLocaleString())}
            </p>
            <p
              className={`text-xs mt-2 font-medium ${
                zakatResult.eligible
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-amber-700 dark:text-amber-300'
              }`}
            >
              {zakatResult.eligible
                ? t(lang, 'Eligible · Above Nisab threshold', 'যাকাত ফরয হয়েছে · নিসাবের উপরে')
                : t(lang, 'Below Nisab threshold · Zakat not obligatory', 'নিসাব সীমার নিচে · যাকাত ফরয নয়')}
            </p>
          </div>

          <div className="divide-y divide-black/[0.07] dark:divide-white/10 text-sm">
            <div className="py-2.5 flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">{t(lang, 'Total Assets', 'মোট সম্পদ')}</span>
              <span className="font-mono-num text-zinc-900 dark:text-white">
                {currencySymbol} {formatNum(lang, zakatResult.totalAssets.toLocaleString())}
              </span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">{t(lang, 'Deductible Liabilities', 'বাদযোগ্য ঋণ')}</span>
              <span className="font-mono-num text-zinc-700 dark:text-zinc-300">
                - {currencySymbol} {formatNum(lang, zakatResult.totalLiabilities.toLocaleString())}
              </span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-zinc-800 dark:text-zinc-200 font-medium">
                {t(lang, 'Net Zakatable Wealth', 'নিট যাকাতযোগ্য সম্পদ')}
              </span>
              <span className="font-mono-num text-amber-700 dark:text-amber-300 font-semibold">
                {currencySymbol} {formatNum(lang, zakatResult.netWealth.toLocaleString())}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={saveZakatSnapshot}
            className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors"
          >
            {t(lang, 'Save Calculation to History', 'হিসাবটি সংরক্ষণ করুন')}
          </button>

          {state.zakatHistory.length > 0 && (
            <div className="pt-3 border-t border-black/[0.07] dark:border-white/10 space-y-2">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {t(lang, 'Saved Calculations', 'সংরক্ষিত হিসাব')}
              </p>
              <div className="divide-y divide-black/[0.06] dark:divide-white/5 text-xs">
                {state.zakatHistory.slice(0, 4).map((h) => (
                  <div key={h.id} className="py-2 flex justify-between text-zinc-700 dark:text-zinc-300">
                    <span className="font-mono-num text-zinc-500">{h.date}</span>
                    <span className="font-mono-num text-emerald-600 dark:text-emerald-400">
                      {h.currency === 'BDT' ? '৳' : '$'} {formatNum(lang, h.zakatDue.toLocaleString())}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 3. MIRAS PAGE (#/miras)
export const MirasPage: React.FC<{
  state: AppPersistedState;
  onNavigate: (route: AppRoute) => void;
}> = ({ state, onNavigate }) => {
  const lang = state.language;
  const [totalEstate, setTotalEstate] = useState<string>('240000');
  const [spouse, setSpouse] = useState<'none' | 'husband' | 'wife'>('wife');
  const [fatherAlive, setFatherAlive] = useState(false);
  const [motherAlive, setMotherAlive] = useState(false);
  const [sons, setSons] = useState(1);
  const [daughters, setDaughters] = useState(1);

  const mirasResult = useMemo(
    () =>
      calculateMiras({
        totalEstate: Number(totalEstate) || 0,
        spouse,
        fatherAlive,
        motherAlive,
        sons,
        daughters,
      }),
    [totalEstate, spouse, fatherAlive, motherAlive, sons, daughters]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        lang={lang}
        title={t(lang, 'Islamic Inheritance (Miras) Calculator', 'ইসলামী উত্তরাধিকার (মীরাস) হিসাব')}
        subtitle={t(
          lang,
          'Compute Faraid shares after debts, funeral expenses, and valid Wasiyyah (up to 1/3).',
          'ঋণ, কাফন-দাফন ও বৈধ অসিয়ত (সর্বোচ্চ ১/৩) পরিশোধের পর ফারায়েজ অনুযায়ী বণ্টন।'
        )}
        onNavigate={onNavigate}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 rounded-3xl bg-white/90 backdrop-blur-md dark:bg-[#1C1C1E] border border-stone-200/80 dark:border-white/[0.08] p-6 space-y-5 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
          <NumberField
            id="miras-estate"
            label={t(lang, 'Net Distributable Estate Value', 'বণ্টনযোগ্য মোট সম্পদের মূল্য')}
            value={totalEstate}
            onChange={setTotalEstate}
          />

          <div className="space-y-2">
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">
              {t(lang, 'Surviving Spouse', 'জীবিত স্বামী / স্ত্রী')}
            </span>
            <div className="grid grid-cols-3 gap-1.5 bg-[#F4F1EA] dark:bg-black p-1 rounded-xl border border-stone-200/80 dark:border-white/10">
              {(
                [
                  { id: 'none', en: 'None', bn: 'কেউ না' },
                  { id: 'husband', en: 'Husband', bn: 'স্বামী' },
                  { id: 'wife', en: 'Wife', bn: 'স্ত্রী' },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSpouse(s.id)}
                  className={`py-2 rounded-lg text-xs font-medium ${
                    spouse === s.id
                      ? 'bg-emerald-500 text-black font-semibold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {lang === 'bn' ? s.bn : s.en}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="inline-flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200 cursor-pointer">
              <input
                type="checkbox"
                checked={fatherAlive}
                onChange={(e) => setFatherAlive(e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
              {t(lang, 'Father Alive', 'পিতা জীবিত')}
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200 cursor-pointer">
              <input
                type="checkbox"
                checked={motherAlive}
                onChange={(e) => setMotherAlive(e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
              {t(lang, 'Mother Alive', 'মাতা জীবিত')}
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="miras-sons" className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1.5">
                {t(lang, 'Sons', 'পুত্র সংখ্যা')}
              </label>
              <input
                id="miras-sons"
                type="number"
                min={0}
                max={20}
                value={sons}
                onChange={(e) => setSons(Math.max(0, Number(e.target.value) || 0))}
                className="w-full h-11 rounded-xl bg-[#F7F4EC] dark:bg-black border border-stone-200/80 dark:border-white/15 px-3 text-sm text-zinc-900 dark:text-white font-mono-num"
              />
            </div>
            <div>
              <label htmlFor="miras-daughters" className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1.5">
                {t(lang, 'Daughters', 'কন্যা সংখ্যা')}
              </label>
              <input
                id="miras-daughters"
                type="number"
                min={0}
                max={20}
                value={daughters}
                onChange={(e) => setDaughters(Math.max(0, Number(e.target.value) || 0))}
                className="w-full h-11 rounded-xl bg-[#F7F4EC] dark:bg-black border border-stone-200/80 dark:border-white/15 px-3 text-sm text-zinc-900 dark:text-white font-mono-num"
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 rounded-3xl bg-white/90 backdrop-blur-md dark:bg-[#1C1C1E] border border-stone-200/80 dark:border-white/[0.08] p-6 space-y-4 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
              {t(lang, 'Faraid Share Breakdown', 'ফারায়েজ অনুযায়ী অংশ বণ্টন')}
            </h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono-num">
              {mirasResult.awlApplied
                ? t(lang, 'Awl (Proportional Adjustment) Applied', 'আউল নীতি প্রয়োগ হয়েছে')
                : mirasResult.raddApplied
                ? t(lang, 'Radd Applied', 'রাদ্দ প্রয়োগ হয়েছে')
                : `${t(lang, 'Allocated', 'বণ্টিত')}: ${formatNum(lang, mirasResult.totalAllocatedPercentage)}%`}
            </span>
          </div>

          {mirasResult.rows.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 py-8 text-center">
              {t(
                lang,
                'Select at least one surviving heir to compute shares.',
                'অংশ নির্ণয় করতে অন্তত একজন জীবিত উত্তরাধিকারী নির্বাচন করুন।'
              )}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-black/[0.07] dark:border-white/10 text-xs text-zinc-500 dark:text-zinc-400">
                    <th className="py-2.5 pr-3">{t(lang, 'Heir', 'উত্তরাধিকারী')}</th>
                    <th className="py-2.5 pr-3">{t(lang, 'Basis', 'ভিত্তি')}</th>
                    <th className="py-2.5 pr-3 text-right">{t(lang, 'Share %', 'শতাংশ')}</th>
                    <th className="py-2.5 text-right">{t(lang, 'Amount', 'পরিমাণ')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.07] dark:divide-white/10">
                  {mirasResult.rows.map((row) => {
                    const heirLabels = {
                      husband: t(lang, 'Husband', 'স্বামী'),
                      wife: t(lang, 'Wife', 'স্ত্রী'),
                      father: t(lang, 'Father', 'পিতা'),
                      mother: t(lang, 'Mother', 'মাতা'),
                      sons: `${t(lang, 'Sons', 'পুত্র')} (${formatNum(lang, row.count)})`,
                      daughters: `${t(lang, 'Daughters', 'কন্যা')} (${formatNum(lang, row.count)})`,
                    };
                    return (
                      <tr key={row.heirKey}>
                        <td className="py-3 pr-3 font-medium text-zinc-900 dark:text-white">{heirLabels[row.heirKey]}</td>
                        <td className="py-3 pr-3 text-xs text-zinc-500 dark:text-zinc-400">{row.fractionLabel}</td>
                        <td className="py-3 pr-3 text-right font-mono-num text-emerald-600 dark:text-emerald-400">
                          {formatNum(lang, row.percentage)}%
                        </td>
                        <td className="py-3 text-right font-mono-num text-amber-700 dark:text-amber-300 font-semibold">
                          {formatNum(lang, row.amount.toLocaleString())}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {mirasResult.unallocatedRemainder > 0 && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 pt-2 border-t border-black/[0.07] dark:border-white/10">
              {t(
                lang,
                `Remaining ${mirasResult.unallocatedRemainder.toLocaleString()} goes to extended agnatic relatives (Asabah) or Baitul-Mal.`,
                `অবশিষ্ট ${formatNum(lang, mirasResult.unallocatedRemainder.toLocaleString())} দূরবর্তী আসাবা ওয়ারিশ বা বাইতুল মালে প্রাপ্য হবে।`
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// 4. NEARBY MOSQUE & HALAL FOOD PAGE (#/nearby)
export const NearbyPage: React.FC<{
  state: AppPersistedState;
  onNavigate: (route: AppRoute) => void;
}> = ({ state, onNavigate }) => {
  const lang = state.language;
  const mapsCoordsQuery = state.location.isGps
    ? `@${state.location.lat},${state.location.lng},14z`
    : encodeURIComponent(state.location.labelEn);

  const mosqueMapUrl = state.location.isGps
    ? `https://www.google.com/maps/search/mosque/${mapsCoordsQuery}`
    : `https://www.google.com/maps/search/${encodeURIComponent(`mosque near ${state.location.labelEn}`)}`;

  const halalMapUrl = state.location.isGps
    ? `https://www.google.com/maps/search/halal+food/${mapsCoordsQuery}`
    : `https://www.google.com/maps/search/${encodeURIComponent(`halal food near ${state.location.labelEn}`)}`;

  return (
    <div className="space-y-6">
      <PageHeader
        lang={lang}
        title={t(lang, 'Mosque & Halal Food Finder', 'মসজিদ ও হালাল খাবার সন্ধান')}
        subtitle={lang === 'bn' ? state.location.labelBn : state.location.labelEn}
        onNavigate={onNavigate}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white/90 backdrop-blur-md dark:bg-[#1C1C1E] border border-stone-200/80 dark:border-white/[0.08] p-6 flex flex-col justify-between gap-5 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
          <div className="space-y-2">
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {lang === 'bn' ? state.location.labelBn : state.location.labelEn}
            </p>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              {t(lang, 'Nearby Mosques', 'নিকটস্থ মসজিদ খুঁজুন')}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {t(
                lang,
                'Open Google Maps directly to discover Jamaat timings, Jumu’ah mosques, and prayer spaces around your current location.',
                'আপনার বর্তমান অবস্থানের আশেপাশের মসজিদ ও জামাতের স্থান সরাসরি গুগল ম্যাপে দেখুন।'
              )}
            </p>
          </div>
          <a
            href={mosqueMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors"
          >
            <MapPin className="w-4 h-4" />
            {t(lang, 'Search Mosques on Google Maps', 'গুগল ম্যাপে মসজিদ খুঁজুন')}
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <div className="rounded-3xl bg-white/90 backdrop-blur-md dark:bg-[#1C1C1E] border border-stone-200/80 dark:border-white/[0.08] p-6 flex flex-col justify-between gap-5 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
          <div className="space-y-2">
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
              {lang === 'bn' ? state.location.labelBn : state.location.labelEn}
            </p>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              {t(lang, 'Nearby Halal Food', 'নিকটস্থ হালাল খাবার খুঁজুন')}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {t(
                lang,
                'Find Halal-certified restaurants, eateries, and groceries near you in one tap via Google Maps.',
                'আপনার এলাকার আশেপাশের হালাল রেস্তোরাঁ ও খাবারের দোকান সরাসরি গুগল ম্যাপে খুঁজে বের করুন।'
              )}
            </p>
          </div>
          <a
            href={halalMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-sm transition-colors"
          >
            <MapPin className="w-4 h-4" />
            {t(lang, 'Search Halal Food on Google Maps', 'গুগল ম্যাপে হালাল খাবার খুঁজুন')}
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};

// 5. SEERAH QUIZ PAGE (#/quiz)
export const QuizPage: React.FC<{
  state: AppPersistedState;
  onUpdateState: (
    updater: Partial<AppPersistedState> | ((prev: AppPersistedState) => AppPersistedState)
  ) => void;
  onNavigate: (route: AppRoute) => void;
}> = ({ state, onUpdateState, onNavigate }) => {
  const lang = state.language;
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);

  const currentQuestion = SEERAH_QUIZ_QUESTIONS[quizIndex];

  const answerQuestion = (optIdx: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(optIdx);
    const isCorrect = optIdx === currentQuestion.correctIndex;
    const nextScore = isCorrect ? quizScore + 1 : quizScore;
    if (isCorrect) {
      setQuizScore(nextScore);
      if (nextScore > state.quizBestScore) {
        onUpdateState({ quizBestScore: nextScore });
      }
    }
  };

  const nextQuizStep = () => {
    if (quizIndex + 1 < SEERAH_QUIZ_QUESTIONS.length) {
      setQuizIndex((i) => i + 1);
      setSelectedOption(null);
    } else {
      setQuizCompleted(true);
    }
  };

  const restartQuiz = () => {
    setQuizIndex(0);
    setSelectedOption(null);
    setQuizScore(0);
    setQuizCompleted(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        lang={lang}
        title={t(lang, 'Seerah & Sahaba Quiz', 'সিরাত ও সাহাবা কুইজ')}
        subtitle={t(
          lang,
          'Test your knowledge of the Prophets (AS), Seerah, and Companions (RA).',
          'নবী-রাসূল, সিরাত ও সাহাবাদের জীবন থেকে কুইজ ও ব্যাখ্যা।'
        )}
        onNavigate={onNavigate}
      />

      <div className="rounded-3xl bg-white/90 backdrop-blur-md dark:bg-[#1C1C1E] border border-stone-200/80 dark:border-white/[0.08] p-6 sm:p-8 max-w-3xl shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
        {quizCompleted ? (
          <div className="text-center space-y-5 py-6">
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {t(lang, 'Quiz Completed', 'কুইজ সম্পন্ন হয়েছে')}
            </p>
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white font-mono-num">
              {formatNum(lang, quizScore)} / {formatNum(lang, SEERAH_QUIZ_QUESTIONS.length)}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {t(lang, 'Personal Best Score', 'সর্বোচ্চ স্কোর')}:{' '}
              <strong className="text-amber-700 dark:text-amber-300 font-mono-num">
                {formatNum(lang, state.quizBestScore)}
              </strong>
            </p>
            <button
              type="button"
              onClick={restartQuiz}
              className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              {t(lang, 'Play Again', 'আবার খেলুন')}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-mono-num">
                {t(lang, 'Question', 'প্রশ্ন')} {formatNum(lang, quizIndex + 1)} /{' '}
                {formatNum(lang, SEERAH_QUIZ_QUESTIONS.length)}
              </span>
              <span className="font-mono-num text-emerald-600 dark:text-emerald-400 font-semibold">
                {t(lang, 'Score', 'স্কোর')}: {formatNum(lang, quizScore)}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-white leading-snug">
              {lang === 'bn' ? currentQuestion.questionBn : currentQuestion.questionEn}
            </h2>

            <div className="grid grid-cols-1 gap-2.5">
              {(lang === 'bn' ? currentQuestion.optionsBn : currentQuestion.optionsEn).map(
                (opt, idx) => {
                  const isPicked = selectedOption === idx;
                  const isRight = idx === currentQuestion.correctIndex;
                  let cls =
                    'bg-[#F7F4EC] dark:bg-black/60 border-stone-200/80 dark:border-white/10 text-zinc-800 dark:text-zinc-200 hover:border-stone-300 dark:hover:border-white/30';
                  if (selectedOption !== null) {
                    if (isRight) {
                      cls = 'bg-emerald-500/20 border-emerald-500 text-emerald-900 dark:text-emerald-200';
                    } else if (isPicked) {
                      cls = 'bg-red-500/20 border-red-500 text-red-800 dark:text-red-200';
                    } else {
                      cls = 'bg-[#F7F4EC] dark:bg-black/40 border-stone-200/60 dark:border-white/5 text-zinc-400 dark:text-zinc-500';
                    }
                  }

                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={selectedOption !== null}
                      onClick={() => answerQuestion(idx)}
                      className={`w-full min-h-[48px] px-4 py-3 rounded-2xl border text-left text-sm font-medium flex items-center justify-between transition-colors ${cls}`}
                    >
                      <span>{opt}</span>
                      {selectedOption !== null && isRight && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                      {selectedOption !== null && isPicked && !isRight && (
                        <XCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
                      )}
                    </button>
                  );
                }
              )}
            </div>

            {selectedOption !== null && (
              <div className="pt-4 border-t border-black/[0.07] dark:border-white/10 space-y-4">
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {lang === 'bn'
                    ? currentQuestion.explanationBn
                    : currentQuestion.explanationEn}
                </p>
                <button
                  type="button"
                  onClick={nextQuizStep}
                  className="px-5 py-2.5 min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm"
                >
                  {quizIndex + 1 < SEERAH_QUIZ_QUESTIONS.length
                    ? t(lang, 'Next Question', 'পরবর্তী প্রশ্ন')
                    : t(lang, 'See Results', 'ফলাফল দেখুন')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// 6. ISLAMIC CARD MAKER PAGE (#/card-maker)
export const CardMakerPage: React.FC<{
  state: AppPersistedState;
  onNavigate: (route: AppRoute) => void;
}> = ({ state, onNavigate }) => {
  const lang = state.language;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cardPresetId, setCardPresetId] = useState(CARD_PRESETS[0].id);
  const [cardArabic, setCardArabic] = useState(CARD_PRESETS[0].arabic);
  const [cardTranslation, setCardTranslation] = useState(
    lang === 'bn' ? CARD_PRESETS[0].bn : CARD_PRESETS[0].en
  );
  const [cardRef, setCardRef] = useState(CARD_PRESETS[0].ref);
  const [cardThemeId, setCardThemeId] = useState(CARD_THEMES[0].id);

  const applyPreset = (id: string) => {
    const p = CARD_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setCardPresetId(p.id);
    setCardArabic(p.arabic);
    setCardTranslation(lang === 'bn' ? p.bn : p.en);
    setCardRef(p.ref);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const theme = CARD_THEMES.find((x) => x.id === cardThemeId) ?? CARD_THEMES[0];
    const W = 1080;
    const H = 1080;

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, theme.bg1);
    grad.addColorStop(1, theme.bg2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.strokeStyle = `${theme.accent}22`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      ctx.strokeRect(-280, -280, 560, 560);
    }
    ctx.beginPath();
    ctx.arc(0, 0, 420, 0, Math.PI * 2);
    ctx.strokeStyle = `${theme.gold}22`;
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = `${theme.gold}55`;
    ctx.lineWidth = 3;
    ctx.strokeRect(48, 48, W - 96, H - 96);

    const drawWrappedText = (
      text: string,
      x: number,
      startY: number,
      maxWidth: number,
      lineHeight: number
    ) => {
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let line = '';
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);

      lines.forEach((l, idx) => {
        ctx.fillText(l, x, startY + idx * lineHeight);
      });
      return startY + lines.length * lineHeight;
    };

    ctx.fillStyle = theme.gold;
    ctx.textAlign = 'center';
    ctx.font = '600 58px "Scheherazade New", "Amiri", serif';
    const afterArabicY = drawWrappedText(cardArabic, W / 2, 330, W - 200, 92);

    ctx.fillStyle = theme.accent;
    ctx.fillRect(W / 2 - 70, afterArabicY + 24, 140, 3);

    ctx.fillStyle = '#F4F4F5';
    ctx.font = '500 34px -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "SolaimanLipi", "Kalpurush", "Noto Serif Bengali", sans-serif';
    const afterTransY = drawWrappedText(
      cardTranslation,
      W / 2,
      afterArabicY + 100,
      W - 220,
      54
    );

    ctx.fillStyle = theme.accent;
    ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "SolaimanLipi", "Kalpurush", "Noto Serif Bengali", sans-serif';
    ctx.fillText(cardRef, W / 2, Math.min(H - 130, afterTransY + 45));

    ctx.fillStyle = '#71717A';
    ctx.font = '500 20px -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif';
    ctx.fillText('NOOR · ISLAMIC COMPANION', W / 2, H - 82);
  }, [cardArabic, cardTranslation, cardRef, cardThemeId]);

  const downloadCardPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `noor-islamic-card-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        lang={lang}
        title={t(lang, 'Islamic Quote Card Maker', 'ইসলামিক কার্ড মেকার')}
        subtitle={t(
          lang,
          'Create and download high-resolution 1080×1080 PNG calligraphy cards to share.',
          'শেয়ার করার জন্য উচ্চ-মানের ১০৮০×১০৮০ ক্যালিগ্রাফি কার্ড তৈরি ও ডাউনলোড করুন।'
        )}
        onNavigate={onNavigate}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 rounded-3xl bg-white/90 backdrop-blur-md dark:bg-[#1C1C1E] border border-stone-200/80 dark:border-white/[0.08] p-6 space-y-4 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
          <div className="space-y-1.5">
            <label htmlFor="card-preset" className="block text-xs text-zinc-500 dark:text-zinc-400">
              {t(lang, 'Preset Verse / Hadith', 'পছন্দের আয়াত বা হাদীস')}
            </label>
            <select
              id="card-preset"
              value={cardPresetId}
              onChange={(e) => applyPreset(e.target.value)}
              className="w-full h-11 rounded-xl bg-[#F7F4EC] dark:bg-black border border-stone-200/80 dark:border-white/15 px-3 text-sm text-zinc-900 dark:text-white"
            >
              {CARD_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.ref}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="card-arabic" className="block text-xs text-zinc-500 dark:text-zinc-400">
              {t(lang, 'Arabic Text', 'আরবি লেখা')}
            </label>
            <textarea
              id="card-arabic"
              rows={2}
              value={cardArabic}
              onChange={(e) => setCardArabic(e.target.value)}
              className="w-full rounded-xl bg-[#F7F4EC] dark:bg-black border border-stone-200/80 dark:border-white/15 px-3 py-2 text-lg text-zinc-900 dark:text-white font-arabic !leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="card-translation" className="block text-xs text-zinc-500 dark:text-zinc-400">
              {t(lang, 'Translation / Quote', 'অনুবাদ বা বাণী')}
            </label>
            <textarea
              id="card-translation"
              rows={3}
              value={cardTranslation}
              onChange={(e) => setCardTranslation(e.target.value)}
              className="w-full rounded-xl bg-[#F7F4EC] dark:bg-black border border-stone-200/80 dark:border-white/15 p-3 text-sm text-zinc-900 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="card-ref" className="block text-xs text-zinc-500 dark:text-zinc-400">
              {t(lang, 'Reference', 'তথ্যসূত্র')}
            </label>
            <input
              id="card-ref"
              type="text"
              value={cardRef}
              onChange={(e) => setCardRef(e.target.value)}
              className="w-full h-10 rounded-xl bg-[#F7F4EC] dark:bg-black border border-stone-200/80 dark:border-white/15 px-3 text-sm text-zinc-900 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">
              {t(lang, 'Background Theme', 'ব্যাকগ্রাউন্ড থিম')}
            </span>
            <div className="grid grid-cols-3 gap-2">
              {CARD_THEMES.map((th) => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => setCardThemeId(th.id)}
                  className={`px-2.5 py-2 rounded-xl text-xs border transition-colors ${
                    cardThemeId === th.id
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold'
                      : 'border-stone-200/80 dark:border-white/10 bg-[#F4F1EA] dark:bg-black text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {lang === 'bn' ? th.nameBn : th.nameEn}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={downloadCardPng}
            className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm inline-flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            {t(lang, 'Download PNG Card', 'PNG কার্ড ডাউনলোড করুন')}
          </button>
        </div>

        <div className="lg:col-span-7 rounded-3xl bg-white/90 backdrop-blur-md dark:bg-[#1C1C1E] border border-stone-200/80 dark:border-white/[0.08] p-5 flex items-center justify-center shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
          <canvas
            ref={canvasRef}
            width={1080}
            height={1080}
            data-testid="islamic-card-canvas"
            className="w-full max-w-[480px] aspect-square rounded-2xl border border-black/10 dark:border-white/10"
          />
        </div>
      </div>
    </div>
  );
};

// 7. BACKUP PAGE (#/backup)
export const BackupPage: React.FC<{
  state: AppPersistedState;
  onExportJson: () => void;
  onImportJson: (raw: string) => { ok: boolean; error?: string };
  onResetData: () => void;
  onNavigate: (route: AppRoute) => void;
}> = ({ state, onExportJson, onImportJson, onResetData, onNavigate }) => {
  const lang = state.language;
  const [importFeedback, setImportFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const res = onImportJson(text);
      if (res.ok) {
        setImportFeedback({
          ok: true,
          msg: t(lang, 'Backup restored successfully.', 'ব্যাকআপ সফলভাবে রিস্টোর হয়েছে।'),
        });
      } else {
        setImportFeedback({
          ok: false,
          msg: res.error ?? t(lang, 'Invalid backup file.', 'অবৈধ ব্যাকআপ ফাইল।'),
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        lang={lang}
        title={t(lang, 'Offline Backup & Data Portability', 'অফলাইন ব্যাকআপ ও ডেটা ট্রান্সফার')}
        subtitle={t(
          lang,
          'Export or restore all localStorage preferences, bookmarks, checklists, and Tasbih counts as JSON.',
          'সব পছন্দ, বুকমার্ক, নামাজের চেকলিস্ট ও তাসবীহ ডেটা JSON হিসেবে ব্যাকআপ বা রিস্টোর করুন।'
        )}
        onNavigate={onNavigate}
      />

      <div className="rounded-3xl bg-white/90 backdrop-blur-md dark:bg-[#1C1C1E] border border-stone-200/80 dark:border-white/[0.08] p-6 sm:p-8 max-w-2xl space-y-6 shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onExportJson}
            className="h-12 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm inline-flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            {t(lang, 'Export Data (JSON)', 'ডেটা এক্সপোর্ট করুন (JSON)')}
          </button>

          <label className="h-12 px-4 rounded-xl bg-[#F4F1EA] dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-stone-200/80 dark:border-white/15 text-zinc-900 dark:text-zinc-100 font-medium text-sm inline-flex items-center justify-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{t(lang, 'Import Data (JSON)', 'ডেটা ইমপোর্ট করুন (JSON)')}</span>
            <input
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              className="sr-only"
            />
          </label>
        </div>

        {importFeedback && (
          <p
            className={`text-sm font-medium ${
              importFeedback.ok
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {importFeedback.msg}
          </p>
        )}

        <div className="pt-5 border-t border-black/[0.07] dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-zinc-500">
            {t(
              lang,
              'Need a fresh start? Clear local app data.',
              'নতুনভাবে শুরু করতে লোকাল ডেটা রিসেট করতে পারেন।'
            )}
          </p>
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium"
            >
              {t(lang, 'Reset All Local Data', 'সব ডেটা রিসেট করুন')}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onResetData();
                  setConfirmReset(false);
                }}
                className="px-3.5 py-2 rounded-xl bg-red-500 text-white text-xs font-semibold"
              >
                {t(lang, 'Confirm Reset', 'নিশ্চিত করুন')}
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-3.5 py-2 rounded-xl bg-[#F4F1EA] dark:bg-white/5 text-zinc-700 dark:text-zinc-300 text-xs"
              >
                {t(lang, 'Cancel', 'বাতিল')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface NumberFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
}

const NumberField: React.FC<NumberFieldProps> = ({ id, label, value, onChange }) => (
  <div>
    <label htmlFor={id} className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1.5">
      {label}
    </label>
    <input
      id={id}
      type="number"
      min={0}
      step="any"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-11 rounded-xl bg-[#F7F4EC] dark:bg-black border border-stone-200/80 dark:border-white/15 px-3 text-sm text-zinc-900 dark:text-white font-mono-num focus:outline-none focus:border-emerald-500"
    />
  </div>
);

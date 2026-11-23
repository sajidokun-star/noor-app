export type Language = 'en' | 'bn';

export type ThemeMode = 'dark' | 'light';

export type NavTab = 'home' | 'quran' | 'prayer' | 'knowledge' | 'tools';

export type PrayerSubTab = 'times' | 'qibla' | 'tracker' | 'calendar';
export type KnowledgeSubTab = 'hadith' | 'fiqh' | 'dua' | 'tasbih' | 'ruqyah';
export type ToolsSubTab = 'zakat' | 'miras' | 'finder' | 'quiz' | 'card' | 'backup';

export type WaqtKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface QazaCounts {
  fajr: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
  witr: number;
}

export interface DhikrItem {
  id: string;
  arabic: string;
  transliterationEn: string;
  transliterationBn: string;
  meaningEn: string;
  meaningBn: string;
  defaultTarget: number;
}

export interface QuranBookmark {
  surahNumber: number;
  surahNameEn: string;
  surahNameAr: string;
  ayahNumber: number;
  arabic: string;
  translationEn: string;
  translationBn: string;
  savedAt: string;
}

export interface ZakatSnapshot {
  id: string;
  date: string;
  currency: 'BDT' | 'USD';
  netWealth: number;
  zakatDue: number;
  eligible: boolean;
}

export interface LocationState {
  lat: number;
  lng: number;
  labelEn: string;
  labelBn: string;
  isGps: boolean;
}

export interface LastReadPosition {
  surahNumber: number;
  surahNameEn: string;
  surahNameBn: string;
  surahNameAr: string;
  ayahNumber: number;
  updatedAt: string;
}

export type MuazzinId = 'makkah' | 'madinah' | 'mishary' | 'chime';

export interface NotificationSettings {
  permissionGranted: boolean;
  audioUnlocked: boolean;
  azanWaqtAlerts: Record<WaqtKey, boolean>;
  playAzanAudio: boolean;
  muazzin: MuazzinId;
  dailyHadithAlerts: boolean;
  hadithIntervalMinutes: number;
  lastTriggeredPrayerKey?: string;
  lastHadithSentAt?: string;
}

export type AvatarId = 'crescent' | 'lantern' | 'kaaba' | 'quran' | 'star' | 'dome';

export interface UserAccountRecord {
  id: string;
  name: string;
  emailOrUsername: string;
  pinHash: string;
  avatarId: AvatarId;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileState {
  activeAccountId: string | null;
  accounts: UserAccountRecord[];
  guestName: string;
  guestAvatarId: AvatarId;
}

export interface RamadanState {
  fastingDays: number[];
  taraweehLogs: Record<number, 0 | 8 | 20>;
  khatamPagesRead: number;
  khatamTargetDays: number;
  lastTenNightsChecklist: Record<string, boolean>;
  dailyTimelineChecklist?: Record<string, boolean>;
}

export interface AppPersistedState {
  version: number;
  language: Language;
  theme: ThemeMode;
  location: LocationState;
  calculationMethod: number;
  asrJuristic: 0 | 1; // 0 = Shafi, 1 = Hanafi
  quranFontSize: number;
  quranTranslationMode: 'both' | 'bn' | 'en' | 'none';
  tajweedEnabled: boolean;
  quranRepeatCount: 1 | 3 | 5 | 999;
  lastRead: LastReadPosition | null;
  quranBookmarks: QuranBookmark[];
  hadithBookmarks: string[];
  prayerChecklist: Record<string, Record<WaqtKey, boolean>>; // keyed by YYYY-MM-DD
  qazaCounts: QazaCounts;
  tasbihCounts: Record<string, number>;
  tasbihLifetimeTotal: number;
  tasbihTarget: number;
  tasbihSound: boolean;
  tasbihHaptic: boolean;
  selectedDhikrId: string;
  customDhikrs: DhikrItem[];
  hijriOffset: number; // -2 to +2
  eventReminders: string[];
  zakatHistory: ZakatSnapshot[];
  quizBestScore: number;
  ayahsReadCount: number;
  notifications: NotificationSettings;
  profile: UserProfileState;
  ramadan: RamadanState;
  seerahCompletedIds: string[];
}

export interface SurahMeta {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  bengaliName: string;
  numberOfAyahs: number;
  revelationType: 'Meccan' | 'Medinan' | string;
}

export interface AyahEntry {
  number: number; // global ayah number
  numberInSurah: number;
  arabic: string;
  tajweedRaw?: string;
  bengali: string;
  english: string;
  tafsir?: string;
  audioUrl: string;
}

export interface DailyPrayerTimes {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  sahri: string;
  iftar: string;
  ishraq: string;
  tahajjud: string;
  dateLabel: string;
  hijriApiLabel?: string;
  source: 'aladhan' | 'offline';
}

export interface HadithItem {
  id: string;
  category: 'faith' | 'prayer' | 'character' | 'charity' | 'knowledge' | 'family';
  bookEn: string;
  bookBn: string;
  reference: string;
  grade: 'Sahih' | 'Hasan';
  arabic: string;
  english: string;
  bengali: string;
  explanationEn: string;
  explanationBn: string;
  practicalEn: string;
  practicalBn: string;
}

export interface FiqhItem {
  id: string;
  category: 'namaz' | 'roza' | 'taharah' | 'halal_haram';
  questionEn: string;
  questionBn: string;
  answerEn: string;
  answerBn: string;
  referenceEn: string;
  referenceBn: string;
}

export interface DuaItem {
  id: string;
  category: 'morning_evening' | 'sleep' | 'travel' | 'eating' | 'distress' | 'mosque';
  titleEn: string;
  titleBn: string;
  arabic: string;
  transliterationEn: string;
  transliterationBn: string;
  meaningEn: string;
  meaningBn: string;
  explanationEn: string;
  explanationBn: string;
  reference: string;
  repeat?: number;
}

export interface RuqyahItem {
  id: string;
  titleEn: string;
  titleBn: string;
  arabic: string;
  transliterationEn: string;
  transliterationBn: string;
  meaningEn: string;
  meaningBn: string;
  explanationEn: string;
  explanationBn: string;
  reference: string;
  audioUrls: string[];
}

export interface QuizQuestion {
  id: string;
  topic: 'prophets' | 'sahaba' | 'seerah';
  questionEn: string;
  questionBn: string;
  optionsEn: string[];
  optionsBn: string[];
  correctIndex: number;
  explanationEn: string;
  explanationBn: string;
}

export interface QuranWordItem {
  position: number;
  arabic: string;
  transliteration: string;
  meaningEn: string;
  meaningBn: string;
  rootArabic: string;
  grammarEn: string;
  grammarBn: string;
}

export interface SeerahChapter {
  id: string;
  category: 'seerah' | 'prophets' | 'sahaba';
  eraEn: string;
  eraBn: string;
  titleEn: string;
  titleBn: string;
  summaryEn: string;
  summaryBn: string;
  contentEn: string;
  contentBn: string;
  lessonsEn: string[];
  lessonsBn: string[];
  reference: string;
}

export interface AssistantReference {
  sourceType: 'quran' | 'hadith' | 'scholarly_note';
  citation: string;
  excerpt: string;
}

export interface AssistantChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  references?: AssistantReference[];
  scholarAdvice?: string;
  error?: boolean;
  timestamp: string;
}

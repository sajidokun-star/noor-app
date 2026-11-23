import type { QuranWordItem } from '../types/islamic';

export interface ArabicWordLetterStats {
  words: number;
  letters: number;
}

const ARABIC_DIACRITICS_REGEX = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
const ARABIC_LETTER_REGEX = /[\u0621-\u064A\u0671-\u06D3\u06D5]/g;

export function countArabicStats(arabicText: string): ArabicWordLetterStats {
  const cleaned = arabicText.replace(/۝[\u0660-\u0669]*/g, '').trim();
  if (!cleaned) return { words: 0, letters: 0 };

  const words = cleaned.split(/\s+/).filter(Boolean).length;
  const withoutDiacritics = cleaned.replace(ARABIC_DIACRITICS_REGEX, '');
  const letterMatches = withoutDiacritics.match(ARABIC_LETTER_REGEX);
  return {
    words,
    letters: letterMatches ? letterMatches.length : 0,
  };
}

// Curated Bengali glosses & roots for frequent Quranic terms so offline/API word cards stay bilingual
const COMMON_WORD_GLOSSARY: Record<
  string,
  { bn: string; root: string; grammarEn: string; grammarBn: string }
> = {
  allah: {
    bn: 'আল্লাহ (মহাগৌরবময় নাম)',
    root: 'أ ل ه',
    grammarEn: 'Proper Noun (Lafz al-Jalalah)',
    grammarBn: 'ইসমে জালালাহ (বিশেষ্য)',
  },
  god: {
    bn: 'আল্লাহ',
    root: 'أ ل ه',
    grammarEn: 'Proper Noun',
    grammarBn: 'বিশেষ্য',
  },
  name: {
    bn: 'নামে / নাম',
    root: 'س م و',
    grammarEn: 'Preposition + Noun (Genitive)',
    grammarBn: 'অব্যয় ও বিশেষ্য (মাজরূর)',
  },
  merciful: {
    bn: 'পরম দয়ালু / অসীম করুণাময়',
    root: 'ر ح م',
    grammarEn: 'Intensive Adjective (Fa‘il / Fa‘lan)',
    grammarBn: 'সিফাতে মুশাব্বাহা (গুণবাচক বিশেষণ)',
  },
  compassionate: {
    bn: 'অতি মেহেরবান',
    root: 'ر ح م',
    grammarEn: 'Intensive Adjective',
    grammarBn: 'গুণবাচক বিশেষণ',
  },
  praise: {
    bn: 'সমস্ত প্রশংসা ও কৃতজ্ঞতা',
    root: 'ح م د',
    grammarEn: 'Definite Noun (Nominative Subject)',
    grammarBn: 'মারিফাহ বিশেষ্য (মুবতাদা)',
  },
  lord: {
    bn: 'প্রতিপালক / রব',
    root: 'ر ب ب',
    grammarEn: 'Noun (Mudaf — Construct)',
    grammarBn: 'বিশেষ্য (মুযাফ)',
  },
  worlds: {
    bn: 'সমগ্র সৃষ্টিজগৎ',
    root: 'ع ل م',
    grammarEn: 'Sound Masculine Plural Noun',
    grammarBn: 'বহুবচন বিশেষ্য (জমা মুজাক্কার)',
  },
  universe: {
    bn: 'সকল জগৎ',
    root: 'ع ل م',
    grammarEn: 'Plural Noun',
    grammarBn: 'বহুবচন বিশেষ্য',
  },
  master: {
    bn: 'মালিক / অধিপতি',
    root: 'م ل ك',
    grammarEn: 'Active Participle (Ism Fa‘il)',
    grammarBn: 'ইসমে ফায়েল (কর্তৃবাচক বিশেষ্য)',
  },
  sovereign: {
    bn: 'সার্বভৌম অধিপতি',
    root: 'م ل ك',
    grammarEn: 'Active Participle',
    grammarBn: 'কর্তৃবাচক বিশেষ্য',
  },
  day: {
    bn: 'দিবস / দিন',
    root: 'ي و م',
    grammarEn: 'Noun (Genitive)',
    grammarBn: 'বিশেষ্য (মাজরূর)',
  },
  judgment: {
    bn: 'বিচার ও প্রতিদান',
    root: 'د ي ن',
    grammarEn: 'Noun (Genitive)',
    grammarBn: 'বিশেষ্য (মাজরূর)',
  },
  recompense: {
    bn: 'প্রতিফল / বিচার',
    root: 'د ي ن',
    grammarEn: 'Noun (Genitive)',
    grammarBn: 'বিশেষ্য',
  },
  worship: {
    bn: 'আমরা ইবাদত করি',
    root: 'ع ب د',
    grammarEn: 'Imperfect Verb (1st Plural)',
    grammarBn: 'ফে’লে মুদারে (বর্তমান/ভবিষ্যৎ ক্রিয়া)',
  },
  help: {
    bn: 'আমরা সাহায্য চাই',
    root: 'ع و ن',
    grammarEn: 'Form X Imperfect Verb (1st Plural)',
    grammarBn: 'বাবে ইস্তিফআল (সাহায্য প্রার্থনা ক্রিয়া)',
  },
  guide: {
    bn: 'আমাদের পথ দেখান / হিদায়াত দিন',
    root: 'ه د ي',
    grammarEn: 'Imperative Verb (Dua) + Pronoun',
    grammarBn: 'আমর বা দোয়াসূচক ক্রিয়া ও সর্বনাম',
  },
  path: {
    bn: 'পথ / সরল পথ',
    root: 'ص ر ط',
    grammarEn: 'Accusative Direct Object Noun',
    grammarBn: 'বিশেষ্য (মাফউল বিহী)',
  },
  straight: {
    bn: 'সরল ও সুদৃঢ়',
    root: 'ق و م',
    grammarEn: 'Form X Active Participle Adjective',
    grammarBn: 'বিশেষণ (সিফাত)',
  },
  bestowed: {
    bn: 'আপনি অনুগ্রহ দান করেছেন',
    root: 'ن ع م',
    grammarEn: 'Form IV Perfect Verb (2nd Sing.)',
    grammarBn: 'ফে’লে মাদি (অতীত ক্রিয়া)',
  },
  anger: {
    bn: 'যাদের ওপর ক্রোধ আপতিত হয়েছে',
    root: 'غ ض ب',
    grammarEn: 'Passive Participle (Ism Maf‘ul)',
    grammarBn: 'ইসমে মাফউল (কর্মবাচক বিশেষ্য)',
  },
  astray: {
    bn: 'পথভ্রষ্টদের',
    root: 'ض ل ل',
    grammarEn: 'Active Participle Plural',
    grammarBn: 'বহুবচন কর্তৃবাচক বিশেষণ',
  },
  peace: {
    bn: 'শান্তি ও নিরাপত্তা',
    root: 'س ل م',
    grammarEn: 'Noun',
    grammarBn: 'বিশেষ্য',
  },
  heart: {
    bn: 'অন্তর / হৃদয়',
    root: 'ق ل ب',
    grammarEn: 'Noun',
    grammarBn: 'বিশেষ্য',
  },
  hearts: {
    bn: 'অন্তরসমূহ',
    root: 'ق ل ب',
    grammarEn: 'Broken Plural Noun',
    grammarBn: 'বহুবচন বিশেষ্য',
  },
  book: {
    bn: 'কিতাব / গ্রন্থ',
    root: 'ك ت ب',
    grammarEn: 'Noun',
    grammarBn: 'বিশেষ্য',
  },
  believe: {
    bn: 'যারা ঈমান আনে',
    root: 'أ م ن',
    grammarEn: 'Form IV Imperfect Verb',
    grammarBn: 'ক্রিয়া (ঈমান আনা)',
  },
  prayer: {
    bn: 'সালাত / নামাজ',
    root: 'ص ل و',
    grammarEn: 'Noun',
    grammarBn: 'বিশেষ্য',
  },
};

// Complete built-in Word-by-Word dataset for Surah Al-Fatiha (1:1–1:7) for instant & offline accuracy
export const FATIHA_WORDS_BY_AYAH: Record<string, QuranWordItem[]> = {
  '1:1': [
    {
      position: 1,
      arabic: 'بِسْمِ',
      transliteration: 'Bismi',
      meaningEn: 'In the name of',
      meaningBn: 'নামে (শুরু করছি)',
      rootArabic: 'س م و',
      grammarEn: 'Preposition (bi) + Noun (ism, genitive)',
      grammarBn: 'হরফে জার (ব) + ইসিম (মাজরূর)',
    },
    {
      position: 2,
      arabic: 'ٱللَّهِ',
      transliteration: 'Allāhi',
      meaningEn: 'Allah',
      meaningBn: 'আল্লাহর',
      rootArabic: 'أ ل ه',
      grammarEn: 'Proper Noun (Lafz al-Jalalah, genitive)',
      grammarBn: 'ইসমে জালালাহ (সম্বন্ধ পদ)',
    },
    {
      position: 3,
      arabic: 'ٱلرَّحْمَـٰنِ',
      transliteration: 'Ar-Raḥmāni',
      meaningEn: 'the Most Gracious',
      meaningBn: 'পরম করুণাময়',
      rootArabic: 'ر ح م',
      grammarEn: 'Intensive Adjective (universal mercy)',
      grammarBn: 'সিফাত (সকল সৃষ্টির প্রতি সর্বব্যাপী দয়ালু)',
    },
    {
      position: 4,
      arabic: 'ٱلرَّحِيمِ',
      transliteration: 'Ar-Raḥīmi',
      meaningEn: 'the Most Merciful',
      meaningBn: 'অতি মেহেরবান',
      rootArabic: 'ر ح م',
      grammarEn: 'Permanent Adjective (special mercy)',
      grammarBn: 'সিফাত (মুমিনদের প্রতি চিরন্তন দয়ালু)',
    },
  ],
  '1:2': [
    {
      position: 1,
      arabic: 'ٱلْحَمْدُ',
      transliteration: 'Al-ḥamdu',
      meaningEn: 'All praise and thanks',
      meaningBn: 'সমস্ত প্রশংসা ও কৃতজ্ঞতা',
      rootArabic: 'ح م د',
      grammarEn: 'Definite Noun (Subject / Mubtada)',
      grammarBn: 'মারিফাহ বিশেষ্য (মুবতাদা)',
    },
    {
      position: 2,
      arabic: 'لِلَّهِ',
      transliteration: 'lillāhi',
      meaningEn: 'be to Allah',
      meaningBn: 'কেবল আল্লাহরই জন্য',
      rootArabic: 'أ ل ه',
      grammarEn: 'Preposition (li) + Proper Noun',
      grammarBn: 'হরফে জার (ল) + ইসমে জালালাহ',
    },
    {
      position: 3,
      arabic: 'رَبِّ',
      transliteration: 'Rabbi',
      meaningEn: 'Lord of',
      meaningBn: 'যিনি প্রতিপালক',
      rootArabic: 'ر ب ب',
      grammarEn: 'Noun (Mudaf — Construct state)',
      grammarBn: 'বিশেষ্য (মুযাফ)',
    },
    {
      position: 4,
      arabic: 'ٱلْعَـٰلَمِينَ',
      transliteration: 'al-‘ālamīna',
      meaningEn: 'all the worlds',
      meaningBn: 'সমগ্র সৃষ্টিজগতের',
      rootArabic: 'ع ل م',
      grammarEn: 'Plural Noun (Mudaf Ilayhi)',
      grammarBn: 'বহুবচন বিশেষ্য (মুযাফ ইলাইহি)',
    },
  ],
  '1:3': [
    {
      position: 1,
      arabic: 'ٱلرَّحْمَـٰنِ',
      transliteration: 'Ar-Raḥmāni',
      meaningEn: 'The Most Gracious',
      meaningBn: 'পরম করুণাময়',
      rootArabic: 'ر ح م',
      grammarEn: 'Intensive Adjective (Attribute of Allah)',
      grammarBn: 'গুণবাচক বিশেষণ',
    },
    {
      position: 2,
      arabic: 'ٱلرَّحِيمِ',
      transliteration: 'Ar-Raḥīmi',
      meaningEn: 'the Most Merciful',
      meaningBn: 'অসীম দয়ালু',
      rootArabic: 'ر ح م',
      grammarEn: 'Permanent Adjective',
      grammarBn: 'চিরন্তন গুণবাচক বিশেষণ',
    },
  ],
  '1:4': [
    {
      position: 1,
      arabic: 'مَـٰلِكِ',
      transliteration: 'Māliki',
      meaningEn: 'Master / Sovereign of',
      meaningBn: 'মালিক ও অধিপতি',
      rootArabic: 'م ل ك',
      grammarEn: 'Active Participle (Ism Fa‘il)',
      grammarBn: 'ইসমে ফায়েল (কর্তৃবাচক বিশেষ্য)',
    },
    {
      position: 2,
      arabic: 'يَوْمِ',
      transliteration: 'yawmi',
      meaningEn: 'the Day of',
      meaningBn: 'দিনের (দিবসের)',
      rootArabic: 'ي و م',
      grammarEn: 'Noun (Genitive Mudaf)',
      grammarBn: 'বিশেষ্য (মুযাফ)',
    },
    {
      position: 3,
      arabic: 'ٱلدِّينِ',
      transliteration: 'ad-dīni',
      meaningEn: 'Recompense / Judgment',
      meaningBn: 'বিচার ও প্রতিদান',
      rootArabic: 'د ي ن',
      grammarEn: 'Definite Noun (Genitive)',
      grammarBn: 'বিশেষ্য (মুযাফ ইলাইহি)',
    },
  ],
  '1:5': [
    {
      position: 1,
      arabic: 'إِيَّاكَ',
      transliteration: 'Iyyāka',
      meaningEn: 'You Alone',
      meaningBn: 'শুধুমাত্র আপনারই',
      rootArabic: 'إ ي ا',
      grammarEn: 'Detached Accusative Pronoun (Exclusivity)',
      grammarBn: 'স্বতন্ত্র মানসুব সর্বনাম (একান্ত নির্দিষ্ট)',
    },
    {
      position: 2,
      arabic: 'نَعْبُدُ',
      transliteration: 'na‘budu',
      meaningEn: 'we worship',
      meaningBn: 'আমরা ইবাদত করি',
      rootArabic: 'ع ب د',
      grammarEn: 'Imperfect Verb (1st Person Plural)',
      grammarBn: 'ফে’লে মুদারে (বর্তমান ক্রিয়া)',
    },
    {
      position: 3,
      arabic: 'وَإِيَّاكَ',
      transliteration: 'wa iyyāka',
      meaningEn: 'and You Alone',
      meaningBn: 'এবং কেবল আপনারই কাছে',
      rootArabic: 'إ ي ا',
      grammarEn: 'Conjunction + Detached Accusative Pronoun',
      grammarBn: 'সংযোজক অব্যয় ও সর্বনাম',
    },
    {
      position: 4,
      arabic: 'نَسْتَعِينُ',
      transliteration: 'nasta‘īnu',
      meaningEn: 'we ask for help',
      meaningBn: 'আমরা সাহায্য প্রার্থনা করি',
      rootArabic: 'ع و ن',
      grammarEn: 'Form X Imperfect Verb (Seeking aid)',
      grammarBn: 'বাবে ইস্তিফআল (সাহায্য কামনা ক্রিয়া)',
    },
  ],
  '1:6': [
    {
      position: 1,
      arabic: 'ٱهْدِنَا',
      transliteration: 'Ihdinā',
      meaningEn: 'Guide us',
      meaningBn: 'আমাদের পথ দেখান',
      rootArabic: 'ه د ي',
      grammarEn: 'Imperative Dua Verb + 1st Plural Object Pronoun',
      grammarBn: 'দোয়াসূচক আমর ক্রিয়া + সর্বনাম',
    },
    {
      position: 2,
      arabic: 'ٱلصِّرَٰطَ',
      transliteration: 'aṣ-ṣirāṭa',
      meaningEn: 'to the Path',
      meaningBn: 'পথে (পথের দিকে)',
      rootArabic: 'ص ر ط',
      grammarEn: 'Definite Noun (Accusative)',
      grammarBn: 'বিশেষ্য (মাফউল বিহী)',
    },
    {
      position: 3,
      arabic: 'ٱلْمُسْتَقِيمَ',
      transliteration: 'al-mustaqīma',
      meaningEn: 'the Straight',
      meaningBn: 'সরল ও সঠিক',
      rootArabic: 'ق و م',
      grammarEn: 'Form X Active Participle Adjective',
      grammarBn: 'বিশেষণ (সিফাত)',
    },
  ],
  '1:7': [
    {
      position: 1,
      arabic: 'صِرَٰطَ',
      transliteration: 'Ṣirāṭa',
      meaningEn: 'The path of',
      meaningBn: 'সেই সমস্ত লোকের পথ',
      rootArabic: 'ص ر ط',
      grammarEn: 'Noun (Apposition / Badal)',
      grammarBn: 'বিশেষ্য (বদল)',
    },
    {
      position: 2,
      arabic: 'ٱلَّذِينَ',
      transliteration: 'alladhīna',
      meaningEn: 'those who',
      meaningBn: 'যাদের প্রতি',
      rootArabic: 'ل ذ ي',
      grammarEn: 'Plural Relative Pronoun',
      grammarBn: 'বহুবচন সম্বন্ধবাচক সর্বনাম',
    },
    {
      position: 3,
      arabic: 'أَنْعَمْتَ',
      transliteration: 'an‘amta',
      meaningEn: 'You have favored',
      meaningBn: 'আপনি অনুগ্রহ দান করেছেন',
      rootArabic: 'ن ع م',
      grammarEn: 'Form IV Perfect Verb (2nd Sing.)',
      grammarBn: 'ফে’লে মাদি (বাবে ইফআল)',
    },
    {
      position: 4,
      arabic: 'عَلَيْهِمْ',
      transliteration: '‘alayhim',
      meaningEn: 'upon them',
      meaningBn: 'তাদের ওপর',
      rootArabic: 'ع ل و',
      grammarEn: 'Preposition (‘ala) + 3rd Plural Pronoun',
      grammarBn: 'হরফে জার + সর্বনাম',
    },
    {
      position: 5,
      arabic: 'غَيْرِ',
      transliteration: 'ghayri',
      meaningEn: 'not of',
      meaningBn: 'তাদের নয়',
      rootArabic: 'غ ي ر',
      grammarEn: 'Exception Noun (Genitive)',
      grammarBn: 'ব্যতিক্রমসূচক বিশেষ্য',
    },
    {
      position: 6,
      arabic: 'ٱلْمَغْضُوبِ',
      transliteration: 'al-maghḍūbi',
      meaningEn: 'those who earned wrath',
      meaningBn: 'যাদের ওপর গজব আপতিত হয়েছে',
      rootArabic: 'غ ض ب',
      grammarEn: 'Passive Participle (Ism Maf‘ul)',
      grammarBn: 'ইসমে মাফউল (কর্মবাচক বিশেষ্য)',
    },
    {
      position: 7,
      arabic: 'عَلَيْهِمْ',
      transliteration: '‘alayhim',
      meaningEn: 'upon them',
      meaningBn: 'তাদের ওপর',
      rootArabic: 'ع ل و',
      grammarEn: 'Preposition + Pronoun',
      grammarBn: 'হরফে জার + সর্বনাম',
    },
    {
      position: 8,
      arabic: 'وَلَا',
      transliteration: 'wa lā',
      meaningEn: 'and not',
      meaningBn: 'এবং নয়',
      rootArabic: 'ل ا',
      grammarEn: 'Conjunction + Negative Particle',
      grammarBn: 'সংযোজক ও না-বাচক অব্যয়',
    },
    {
      position: 9,
      arabic: 'ٱلضَّآلِّينَ',
      transliteration: 'aḍ-ḍāllīna',
      meaningEn: 'those who went astray',
      meaningBn: 'যারা পথভ্রষ্ট হয়েছে',
      rootArabic: 'ض ل ل',
      grammarEn: 'Active Participle Masculine Plural',
      grammarBn: 'বহুবচন ইসমে ফায়েল',
    },
  ],
};

function enrichFromGlossary(meaningEn: string, arabic: string): {
  bn: string;
  root: string;
  grammarEn: string;
  grammarBn: string;
} {
  const lower = meaningEn.toLowerCase();
  for (const [key, entry] of Object.entries(COMMON_WORD_GLOSSARY)) {
    if (lower.includes(key)) {
      return entry;
    }
  }
  const letters = arabic.replace(ARABIC_DIACRITICS_REGEX, '').trim();
  const rootGuess = letters.slice(0, 3).split('').join(' ') || '—';
  return {
    bn: meaningEn,
    root: rootGuess,
    grammarEn: arabic.startsWith('ال') || arabic.startsWith('ٱل') ? 'Definite Noun / Modifier' : 'Quranic Word (Kalimah)',
    grammarBn: arabic.startsWith('ال') || arabic.startsWith('ٱل') ? 'মারিফাহ বিশেষ্য / গুণবাচক পদ' : 'কুরআনিক পদ (কালিমাহ)',
  };
}

interface RawQuranComWord {
  position?: number;
  char_type_name?: string;
  text_uthmani?: string;
  text?: string;
  transliteration?: { text?: string | null };
  translation?: { text?: string | null };
  root_word?: string | null;
}

interface RawQuranComVerse {
  verse_key?: string;
  words?: RawQuranComWord[];
}

export function parseQuranComWordsResponse(
  verses: RawQuranComVerse[],
  bnVerses?: RawQuranComVerse[]
): Record<string, QuranWordItem[]> {
  const result: Record<string, QuranWordItem[]> = {};
  const bnLookup = new Map<string, RawQuranComWord[]>();

  if (Array.isArray(bnVerses)) {
    for (const v of bnVerses) {
      if (v.verse_key && Array.isArray(v.words)) {
        bnLookup.set(v.verse_key, v.words);
      }
    }
  }

  for (const verse of verses) {
    if (!verse.verse_key || !Array.isArray(verse.words)) continue;
    const bnWords = bnLookup.get(verse.verse_key);

    const parsedWords: QuranWordItem[] = [];
    for (let idx = 0; idx < verse.words.length; idx++) {
      const w = verse.words[idx];
      if (w.char_type_name === 'end') continue;

      const arabic = (w.text_uthmani || w.text || '').trim();
      if (!arabic) continue;
      const transliteration = (w.transliteration?.text || '').trim() || '—';
      const meaningEn = (w.translation?.text || '').trim() || '—';
      const apiBnMeaning = (bnWords?.[idx]?.translation?.text || '').trim();
      const glossary = enrichFromGlossary(meaningEn, arabic);

      parsedWords.push({
        position: w.position ?? parsedWords.length + 1,
        arabic,
        transliteration,
        meaningEn,
        meaningBn: apiBnMeaning || glossary.bn,
        rootArabic: (w.root_word || '').trim() || glossary.root,
        grammarEn: glossary.grammarEn,
        grammarBn: glossary.grammarBn,
      });
    }

    result[verse.verse_key] = parsedWords;
  }

  return result;
}

export function buildFallbackWordsFromArabic(
  arabicText: string,
  verseKey: string
): QuranWordItem[] {
  if (FATIHA_WORDS_BY_AYAH[verseKey]) {
    return FATIHA_WORDS_BY_AYAH[verseKey];
  }
  const tokens = arabicText
    .replace(/۝[\u0660-\u0669]*/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return tokens.map((token, i) => {
    const info = enrichFromGlossary('', token);
    return {
      position: i + 1,
      arabic: token,
      transliteration: 'Tap online for full transliteration',
      meaningEn: 'Connect to internet for full lexicon gloss',
      meaningBn: 'পূর্ণ শাব্দিক অর্থ দেখতে ইন্টারনেট সংযোগ দিন',
      rootArabic: info.root,
      grammarEn: info.grammarEn,
      grammarBn: info.grammarBn,
    };
  });
}

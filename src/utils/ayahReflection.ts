export interface AyahCoreLesson {
  en: string;
  bn: string;
  themeEn: string;
  themeBn: string;
}

/**
 * Safely converts HTML strings returned by Quran.com Tafsir API into clean
 * readable plain-text paragraphs without rendering raw HTML.
 */
export function sanitizeTafsirHtml(rawHtml: string): string {
  if (!rawHtml) return '';
  return rawHtml
    .replace(/<\/(p|div|h[1-6]|li|br)\s*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const CURATED_LESSONS: Record<string, AyahCoreLesson> = {
  '1:1': {
    themeEn: 'Beginning with Mercy',
    themeBn: 'দয়াময় আল্লাহর নামে শুরু',
    en: 'Begin every worthwhile task by remembering Allah’s boundless mercy—anchor your intention in sincerity rather than ego.',
    bn: 'জীবনের প্রতিটি ভালো কাজ অসীম দয়ালু আল্লাহর নামে এবং তাঁর রহমতের আশা নিয়ে শুরু করুন; এতে কাজে বরকত ও ইখলাস আসে।',
  },
  '1:2': {
    themeEn: 'Gratitude & Sovereignty',
    themeBn: 'কৃতজ্ঞতা ও প্রভুত্বের স্বীকৃতি',
    en: 'True praise belongs solely to Allah, who nurtures and sustains every atom of creation—cultivate a heart of daily shukr (gratitude).',
    bn: 'সব প্রশংসা একমাত্র বিশ্বজগতের পালনকর্তা আল্লাহর; সুখে-দুঃখে সর্বাবস্থায় তাঁর প্রতি কৃতজ্ঞ থাকার অভ্যাস গড়ে তুলুন।',
  },
  '1:3': {
    themeEn: 'Hope in Divine Mercy',
    themeBn: 'আল্লাহর অফুরন্ত রহমত',
    en: 'Allah introduces Himself first through mercy before judgment; never despair of His compassion no matter how heavy your mistakes feel.',
    bn: 'আল্লাহ নিজেকে প্রথমে পরম করুণাময় হিসেবে পরিচয় দিয়েছেন—তাই নিজের ভুল যত বড়ই হোক, তাঁর রহমত থেকে কখনো নিরাশ হবেন না।',
  },
  '1:4': {
    themeEn: 'Accountability',
    themeBn: 'আখিরাতের জবাবদিহিতা',
    en: 'Every choice carries weight before the Master of the Day of Judgment—live mindfully today with tomorrow’s accountability in view.',
    bn: 'বিচার দিবসে প্রতিটি কাজের হিসাব দিতে হবে—এই সচেতনতাই মানুষকে অন্যায় থেকে দূরে রাখে ও ন্যায়পথে অবিচল করে।',
  },
  '1:5': {
    themeEn: 'Pure Devotion & Reliance',
    themeBn: 'একমাত্র আল্লাহর ইবাদত ও সাহায্য প্রার্থনা',
    en: 'Worship Allah alone and turn to Him before anyone else for help—true inner freedom comes when you stop seeking validation from creation.',
    bn: 'ইবাদত কেবল আল্লাহর জন্য এবং চূড়ান্ত সাহায্য শুধু তাঁরই কাছে—মানুষের মুখাপেক্ষিতা ছেড়ে আল্লাহর ওপর ভরসা করলেই প্রকৃত প্রশান্তি মেলে।',
  },
  '1:6': {
    themeEn: 'Seeking Daily Guidance',
    themeBn: 'সঠিক পথের দিশা কামনা',
    en: 'Guidance is not a one-time achievement; ask Allah every day to keep your mind, heart, and decisions aligned with the straight path.',
    bn: 'সঠিক পথের দিশা পাওয়া একবারের বিষয় নয়; জীবনের প্রতিটি বাঁকে ও সিদ্ধান্তে আল্লাহর কাছে সিরাতে মুস্তাকীমের হেদায়েত চাইতে থাকুন।',
  },
  '1:7': {
    themeEn: 'Righteous Company',
    themeBn: 'সৎপথের অনুসারীদের পথ',
    en: 'Walk the path of sincere believers who pair knowledge with action, and guard yourself against arrogance or heedlessness.',
    bn: 'জ্ঞানের সাথে আমলের সমন্বয়কারী নেককার বান্দাদের পথ অনুসরণ করুন এবং অহংকার ও উদাসীনতা থেকে নিজেকে রক্ষা করুন।',
  },
  '2:255': {
    themeEn: 'Ayat al-Kursi · Absolute Protection',
    themeBn: 'আয়াতুল কুরসি · আল্লাহর সর্বব্যাপী ক্ষমতা ও সুরক্ষা',
    en: 'Allah never tires, sleeps, or loses control of the universe—entrust your fears to the Ever-Living Guardian who sustains all existence.',
    bn: 'আল্লাহ চিরঞ্জীব ও সর্বসত্তার ধারক, তন্দ্রা বা নিদ্রা তাঁকে স্পর্শ করে না—তাই যেকোনো ভয় ও অনিশ্চয়তায় তাঁর ওপরই পূর্ণ ভরসা রাখুন।',
  },
  '94:5': {
    themeEn: 'Ease Alongside Hardship',
    themeBn: 'কষ্টের সাথেই স্বস্তির প্রতিশ্রুতি',
    en: 'Allah does not merely promise ease after hardship—He affirms ease accompanies hardship. Stay patient, for relief is already unfolding.',
    bn: 'আল্লাহ শুধু কষ্টের পরে নয়, বরং কষ্টের সাথেই স্বস্তি থাকার ঘোষণা দিয়েছেন—তাই বিপদে ধৈর্য ধরুন, উত্তরণের পথ সামনেই রয়েছে।',
  },
  '112:1': {
    themeEn: 'Pure Tawhid (Oneness)',
    themeBn: 'তাওহীদের বিশুদ্ধ ঘোষণা',
    en: 'Allah is uniquely One, beyond comparison or division—center your worldview around His absolute unity and sufficiency.',
    bn: 'আল্লাহ এক ও অদ্বিতীয়, তাঁর কোনো সমকক্ষ নেই—আপনার বিশ্বাস, ভালোবাসা ও ভয়ের কেন্দ্রবিন্দু একমাত্র তাঁকেই বানান।',
  },
};

const THEME_RULES: Array<{
  keywords: RegExp;
  themeEn: string;
  themeBn: string;
  en: string;
  bn: string;
}> = [
  {
    keywords: /\b(pray|prayer|salah|prostrate|worship|bow|zakat|charity|spend)\b/i,
    themeEn: 'Devotion & Generosity',
    themeBn: 'ইবাদত ও দানশীলতা',
    en: 'Allah calls us to strengthen our connection with Him through consistent worship and to purify our wealth by caring for those in need.',
    bn: 'আল্লাহ আমাদেরকে নিয়মিত ইবাদতের মাধ্যমে তাঁর সাথে সম্পর্ক দৃঢ় করতে এবং অভাবীদের সাহায্যে সম্পদ ব্যয় করে আত্মশুদ্ধি অর্জন করতে শেখাচ্ছেন।',
  },
  {
    keywords: /\b(mercy|merciful|forgive|forgiveness|repent|pardons?|compassion)\b/i,
    themeEn: 'Mercy & Turning Back',
    themeBn: 'ক্ষমা ও আল্লাহর করুণা',
    en: 'Allah’s mercy always outpaces His wrath—turn back to Him sincerely, and show that same gentleness and forgiveness to people around you.',
    bn: 'আল্লাহর রহমত অত্যন্ত বিশাল; খাঁটি অন্তরে তওবা করলে তিনি ক্ষমা করেন এবং আমাদেরকেও অন্যের প্রতি দয়াশীল ও ক্ষমাশীল হতে নির্দেশ দেন।',
  },
  {
    keywords: /\b(patient|patience|steadfast|persevere|hardship|fear not|trust|rely)\b/i,
    themeEn: 'Patience & Tawakkul',
    themeBn: 'ধৈর্য ও তাওয়াক্কুল (ভরসা)',
    en: 'Trials are purposeful tests from Allah—meet difficulty with steady patience, prayer, and unshakable trust in His wisdom.',
    bn: 'জীবনের পরীক্ষাগুলোতে ভেঙে না পড়ে ধৈর্য ও নামাজের মাধ্যমে আল্লাহর ওপর পূর্ণ ভরসা রাখুন; তাঁর পরিকল্পনায় কল্যাণ নিহিত থাকে।',
  },
  {
    keywords: /\b(create|created|heavens|earth|signs|sun|moon|night|day|rain|reflect|understand)\b/i,
    themeEn: 'Reflecting on Allah’s Signs',
    themeBn: 'সৃষ্টিজগৎ নিয়ে চিন্তাভাবনা',
    en: 'Look closely at the order and beauty of creation—every detail in the heavens and earth points directly to Allah’s wisdom and power.',
    bn: 'আসমান ও জমিনের সৃষ্টিকৌশল নিয়ে গভীরভাবে চিন্তা করুন—প্রকৃতির প্রতিটি নিদর্শন আল্লাহর অসীম প্রজ্ঞা ও কুদরতের প্রমাণ বহন করে।',
  },
  {
    keywords: /\b(justice|just|truth|honest|promise|covenant|parents|orphan|kind|good)\b/i,
    themeEn: 'Integrity & Moral Conduct',
    themeBn: 'সততা ও উত্তম আচরণ',
    en: 'Faith must shine through character—uphold truth, honor commitments, respect parents, and act justly even when it feels inconvenient.',
    bn: 'প্রকৃত ঈমান চরিত্রে ফুটে ওঠে—সর্বদা সত্য কথা বলুন, ওয়াদা রক্ষা করুন, পিতামাতা ও দুর্বলদের প্রতি ন্যায় ও সদাচরণ বজায় রাখুন।',
  },
  {
    keywords: /\b(hereafter|paradise|garden|hell|fire|resurrection|day of|reward|recompense)\b/i,
    themeEn: 'Eternal Perspective',
    themeBn: 'আখিরাতমুখী জীবনদৃষ্টি',
    en: 'This world is temporary while the Hereafter is lasting—invest your energy in deeds whose reward endures beyond this life.',
    bn: 'দুনিয়ার জীবন ক্ষণস্থায়ী ও আখিরাত চিরস্থায়ী—তাই চিরকালীন সফলতার লক্ষ্যে সৎকর্ম ও আল্লাহর সন্তুষ্টিকে প্রাধান্য দিন।',
  },
  {
    keywords: /\b(messenger|prophet|reveal|revelation|book|quran|scripture|guide|guidance)\b/i,
    themeEn: 'Guidance Through Revelation',
    themeBn: 'ওহী ও কুরআনের হেদায়েত',
    en: 'Allah sent revelation and messengers out of care for humanity—read the Quran as a personal manual for clarity, healing, and direction.',
    bn: 'মানুষের কল্যাণে আল্লাহ কিতাব ও নবী-রাসূল পাঠিয়েছেন—কুরআনকে আপনার ব্যক্তিগত জীবনের দিকনির্দেশনা ও অন্তরের প্রশান্তির উৎস বানান।',
  },
];

/**
 * Produces a clear, accessible "What Allah Wants Us to Understand" reflection
 * in both English and Bengali for any Ayah.
 */
export function synthesizeAyahCoreLesson(
  surahNumber: number,
  ayahNumber: number,
  englishText: string,
  bengaliText: string
): AyahCoreLesson {
  const key = `${surahNumber}:${ayahNumber}`;
  if (CURATED_LESSONS[key]) {
    return CURATED_LESSONS[key];
  }

  for (const rule of THEME_RULES) {
    if (rule.keywords.test(englishText)) {
      return {
        themeEn: rule.themeEn,
        themeBn: rule.themeBn,
        en: rule.en,
        bn: rule.bn,
      };
    }
  }

  const conciseEn = englishText.length > 150 ? `${englishText.slice(0, 147).trim()}...` : englishText;
  const conciseBn = bengaliText.length > 160 ? `${bengaliText.slice(0, 157).trim()}...` : bengaliText;

  return {
    themeEn: 'Direct Guidance & Reflection',
    themeBn: 'আয়াতের মূল শিক্ষা ও উপলব্ধি',
    en: `Pause and apply this reminder personally: "${conciseEn}" — ask yourself how this truth reshapes your attitude and actions today.`,
    bn: `আয়াতটির মূল বার্তা নিজের জীবনে ধারণ করুন: "${conciseBn}" — আজকের আচরণ, সিদ্ধান্ত ও আল্লাহর সাথে সম্পর্কে এটি কীভাবে প্রতিফলিত করবেন তা ভাবুন।`,
  };
}

export type TajweedRuleCategory =
  | 'plain'
  | 'ghunnah'
  | 'qalqalah'
  | 'madd'
  | 'idgham'
  | 'silent';

export interface TajweedSegment {
  text: string;
  rule: TajweedRuleCategory;
  code?: string;
}

export interface TajweedLegendItem {
  rule: Exclude<TajweedRuleCategory, 'plain'>;
  colorHex: string;
  textClass: string;
  swatchClass: string;
  labelEn: string;
  labelBn: string;
  descEn: string;
  descBn: string;
}

export const TAJWEED_LEGEND: TajweedLegendItem[] = [
  {
    rule: 'madd',
    colorHex: '#f43f5e',
    textClass: 'text-rose-600 dark:text-rose-400',
    swatchClass: 'bg-rose-500',
    labelEn: 'Madd (Prolongation)',
    labelBn: 'মদ (টেনে পড়া)',
    descEn: 'Stretch vowel sound for 2, 4, or 6 counts (Alif, Waw, Ya maddah).',
    descBn: 'স্বরবর্ণ ২, ৪ বা ৬ আলিফ পরিমাণ দীর্ঘ করে পড়ুন।',
  },
  {
    rule: 'ghunnah',
    colorHex: '#22c55e',
    textClass: 'text-emerald-700 dark:text-green-400',
    swatchClass: 'bg-green-500',
    labelEn: 'Ghunnah & Ikhfa (Nasalization)',
    labelBn: 'গুন্নাহ ও ইখফা (নাসিকা ধ্বনি)',
    descEn: 'Hold nasal resonance in Nun/Meem Mushaddadah, Ikhfa, and Iqlab for 2 counts.',
    descBn: 'নাকের বাঁশি থেকে ২ হারাকাত পরিমাণ গুন্নাহ করে পড়ুন।',
  },
  {
    rule: 'qalqalah',
    colorHex: '#38bdf8',
    textClass: 'text-sky-700 dark:text-sky-400',
    swatchClass: 'bg-sky-500 dark:bg-sky-400',
    labelEn: 'Qalqalah (Echoing Bounce)',
    labelBn: 'কলকলা (প্রতিধ্বনি)',
    descEn: 'Crisp echoing bounce on sukoon letters: ق ط ب ج د (Qutb Jadd).',
    descBn: 'ক্বফ, ত্ব, বা, জীম, দাল-এ জযম থাকলে ধ্বনি প্রতিধ্বনিত করে পড়ুন।',
  },
  {
    rule: 'idgham',
    colorHex: '#fb923c',
    textClass: 'text-orange-600 dark:text-orange-400',
    swatchClass: 'bg-orange-500 dark:bg-orange-400',
    labelEn: 'Idgham (Merging)',
    labelBn: 'ইদগাম (মিলিয়ে পড়া)',
    descEn: 'Merge Nun Sakinah/Tanween smoothly into the following letter.',
    descBn: 'নূন সাকিন বা তানভীনকে পরবর্তী হরফের সাথে মিলিয়ে পড়ুন।',
  },
  {
    rule: 'silent',
    colorHex: '#71717a',
    textClass: 'text-zinc-500 dark:text-zinc-400',
    swatchClass: 'bg-zinc-400 dark:bg-zinc-500',
    labelEn: 'Silent / Hamzat Wasl',
    labelBn: 'অনুচ্চারিত / হামযাতুল ওয়াসল',
    descEn: 'Letters written in script but skipped during continuous recitation.',
    descBn: 'লিখিত থাকলেও মিলিয়ে পড়ার সময় এ হরফগুলো অনুচ্চারিত থাকে।',
  },
];

const CODE_TO_RULE: Record<string, TajweedRuleCategory> = {
  // Madd rules (Normal, Permissible, Obligatory, Necessary)
  n: 'madd',
  p: 'madd',
  o: 'madd',
  m: 'madd',
  // Ghunnah, Ikhfa, Iqlab
  g: 'ghunnah',
  f: 'ghunnah',
  c: 'ghunnah',
  i: 'ghunnah',
  // Qalqalah
  q: 'qalqalah',
  // Idgham with / without ghunnah
  a: 'idgham',
  u: 'idgham',
  w: 'idgham',
  // Silent / Hamzat Wasl / Lam Shamsiyyah
  h: 'silent',
  l: 'silent',
  s: 'silent',
};

export function mapTajweedCodeToRule(code: string): TajweedRuleCategory {
  const key = code.trim().toLowerCase().charAt(0);
  return CODE_TO_RULE[key] ?? 'plain';
}

/**
 * Parses Al-Quran Cloud `quran-tajweed` bracket markup such as:
 * "بِسْمِ [h:1[ٱ]للَّهِ [h:2[ٱ][l[ل]رَّحْمَ[n[ـٰ]نِ [h:3[ٱ][l[ل]رَّح[p[ِي]مِ"
 * into flat styled segments while handling nested or adjacent tags safely.
 */
export function parseTajweedText(raw: string): TajweedSegment[] {
  if (!raw) return [];

  const segments: TajweedSegment[] = [];
  const ruleStack: { rule: TajweedRuleCategory; code?: string }[] = [{ rule: 'plain' }];
  let buffer = '';

  const flush = () => {
    if (!buffer) return;
    const top = ruleStack[ruleStack.length - 1];
    const prev = segments[segments.length - 1];
    if (prev && prev.rule === top.rule && prev.code === top.code) {
      prev.text += buffer;
    } else {
      segments.push({ text: buffer, rule: top.rule, code: top.code });
    }
    buffer = '';
  };

  let i = 0;
  while (i < raw.length) {
    const ch = raw[i];

    if (ch === '[') {
      // Match "[code[:id]?[" e.g. "[h:1[" or "[l["
      const rest = raw.slice(i);
      const tagMatch = rest.match(/^\[([a-zA-Z])(?::\d+)?\[/);
      if (tagMatch) {
        flush();
        const code = tagMatch[1];
        ruleStack.push({ rule: mapTajweedCodeToRule(code), code });
        i += tagMatch[0].length;
        continue;
      }
    }

    if (ch === ']') {
      if (ruleStack.length > 1) {
        flush();
        ruleStack.pop();
        i += 1;
        continue;
      }
    }

    buffer += ch;
    i += 1;
  }

  flush();
  return segments;
}

/**
 * Strips all Tajweed markup tags to produce clean plain Arabic text.
 */
export function stripTajweedMarkup(raw: string): string {
  return parseTajweedText(raw)
    .map((s) => s.text)
    .join('');
}

/**
 * Converts Western digits to traditional Arabic-Indic numerals (١, ٢, ٣)
 * used inside ornate Noorani Ayah rosettes.
 */
export function toArabicIndicDigits(num: number | string): string {
  const map = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/\d/g, (d) => map[Number(d)] ?? d);
}

export function getTajweedTextClass(rule: TajweedRuleCategory, enabled: boolean): string {
  if (!enabled || rule === 'plain') return 'text-zinc-900 dark:text-zinc-50';
  switch (rule) {
    case 'madd':
      return 'text-rose-600 dark:text-rose-400';
    case 'ghunnah':
      return 'text-emerald-700 dark:text-green-400';
    case 'qalqalah':
      return 'text-sky-700 dark:text-sky-400';
    case 'idgham':
      return 'text-orange-600 dark:text-orange-400';
    case 'silent':
      return 'text-zinc-400 dark:text-zinc-500';
    default:
      return 'text-zinc-900 dark:text-zinc-50';
  }
}

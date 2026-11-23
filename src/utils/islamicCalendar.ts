import { gregorianToHijri, type HijriDate } from './calculations';

export type IslamicMarkerKind = 'eid' | 'ramadan' | 'qadr' | 'major_fast' | 'white_day' | 'sunnah_fast' | 'jumuah';

export interface DateIslamicMarker {
  id: string;
  reminderKey: string;
  kind: IslamicMarkerKind;
  titleEn: string;
  titleBn: string;
  significanceEn: string;
  significanceBn: string;
  recommendedDeedEn: string;
  recommendedDeedBn: string;
}

export interface CalendarCellMeta {
  date: Date;
  gregorianDay: number;
  hijri: HijriDate;
  isToday: boolean;
  isFriday: boolean;
  isMondayOrThursday: boolean;
  markers: DateIslamicMarker[];
  primaryKind: IslamicMarkerKind | null;
}

/**
 * Inspects any Gregorian date (with Hijri moon-sighting offset) and returns all matching
 * Eid, Ramadan, Laylatul Qadr, Ashura, Shab-e-Barat, Arafah, Ayyam al-Beed, Jumu'ah,
 * and Sunnah Monday/Thursday fasting markers + recommended deeds.
 */
export function getDateIslamicMarkers(
  date: Date,
  hijriOffset: number = 0
): { hijri: HijriDate; markers: DateIslamicMarker[] } {
  const hijri = gregorianToHijri(date, hijriOffset);
  const markers: DateIslamicMarker[] = [];
  const dow = date.getDay(); // 0 Sun .. 6 Sat

  // 1. Eid-ul-Fitr (1 Shawwal)
  if (hijri.month === 10 && hijri.day === 1) {
    markers.push({
      id: 'eid_fitr',
      reminderKey: 'eid_fitr',
      kind: 'eid',
      titleEn: 'Eid ul-Fitr (1 Shawwal)',
      titleBn: 'পবিত্র ঈদুল ফিতর (১ শাওয়াল)',
      significanceEn: 'Day of gratitude and joy celebrating completion of Ramadan fasting.',
      significanceBn: 'রমজানের সিয়াম সাধনার পর শোকরানা ও আনন্দের দিন।',
      recommendedDeedEn: 'Pay Sadaqat al-Fitr before Eid prayer, eat odd dates, recite Takbirat, and visit family.',
      recommendedDeedBn: 'ঈদের নামাজের আগে ফিতরা আদায়, বেজোড় সংখ্যক খেজুর খাওয়া, তাকবীর পাঠ ও আত্মীয়তার সম্পর্ক দৃঢ় করা।',
    });
  }

  // 2. Eid-ul-Adha (10 Dhul Hijjah)
  if (hijri.month === 12 && hijri.day === 10) {
    markers.push({
      id: 'eid_adha',
      reminderKey: 'eid_adha',
      kind: 'eid',
      titleEn: 'Eid ul-Adha (10 Dhul Hijjah)',
      titleBn: 'পবিত্র ঈদুল আযহা (১০ জিলহজ)',
      significanceEn: 'Festival of Sacrifice honoring Prophet Ibrahim (AS)’s complete devotion.',
      significanceBn: 'হযরত ইবরাহীম (আ.)-এর ত্যাগের আদর্শে কুরবানি ও তাকবীরের দিন।',
      recommendedDeedEn: 'Recite Takbir at-Tashriq, attend Eid Salah, perform Qurbani, and share meat with the needy.',
      recommendedDeedBn: 'তাকবীরে তাশরীক পাঠ, ঈদের নামাজ, সামর্থ্য অনুযায়ী কুরবানি ও দরিদ্রদের মাঝে গোশত বণ্টন।',
    });
  }

  // 3. Ramadan Start (1 Ramadan) & Blessed Ramadan Month
  if (hijri.month === 9 && hijri.day === 1) {
    markers.push({
      id: 'ramadan',
      reminderKey: 'ramadan',
      kind: 'ramadan',
      titleEn: 'First Day of Ramadan',
      titleBn: 'পবিত্র রমজানের ১ম রোজা',
      significanceEn: 'Opening of the month in which the Noble Quran was revealed.',
      significanceBn: 'কুরআন নাযিলের বরকতময় মাসের সূচনা।',
      recommendedDeedEn: 'Make sincere fasting intention, begin daily Quran recitation plan, and pray Taraweeh.',
      recommendedDeedBn: 'রোজার নিয়ত, কুরআন খতমের পরিকল্পনা শুরু ও তারাবীহ নামাজ আদায়।',
    });
  }

  // 4. Laylatul Qadr Odd Nights (21, 23, 25, 27, 29 Ramadan)
  if (hijri.month === 9 && [21, 23, 25, 27, 29].includes(hijri.day)) {
    markers.push({
      id: `qadr_${hijri.day}`,
      reminderKey: 'laylatul_qadr',
      kind: 'qadr',
      titleEn: `Odd Night of Last Ten (${hijri.day} Ramadan)`,
      titleBn: `লাইলাতুল কদর অন্বেষণ (${hijri.day} রমজান)`,
      significanceEn: 'One of the blessed odd nights where worship is better than 1,000 months.',
      significanceBn: 'শেষ দশকের বিজোড় রাত — হাজার মাসের চেয়েও উত্তম লাইলাতুল কদরের সম্ভাব্য রাত।',
      recommendedDeedEn: 'Pray Qiyam/Tahajjud, recite "Allahumma innaka Afuwwun tuhibbul-afwa fa’fu anni", and give Sadaqah.',
      recommendedDeedBn: 'কিয়ামুল লাইল, "আল্লাহুম্মা ইন্নাকা আফুউন..." দোয়া পাঠ, কুরআন তিলাওয়াত ও দান-সদকা।',
    });
  }

  // 5. Shab-e-Barat / Mid-Sha'ban (15 Sha'ban)
  if (hijri.month === 8 && hijri.day === 15) {
    markers.push({
      id: 'shab_e_barat',
      reminderKey: 'shab_e_barat',
      kind: 'major_fast',
      titleEn: '15th of Sha’ban (Laylatul Bara’ah)',
      titleBn: '১৫ শাবান (শবে বরাত / মধ্য শাবান)',
      significanceEn: 'A blessed night when Allah pardons believers free of shirk and malice, plus Ayyam al-Beed.',
      significanceBn: 'ক্ষমা প্রার্থনা ও নফল ইবাদতের রাত এবং আইয়্যামে বীজের রোজার দিন।',
      recommendedDeedEn: 'Seek sincere forgiveness (Istighfar), mend broken ties, and observe voluntary daytime fasting.',
      recommendedDeedBn: 'বিদ্বেষ ও হিংসা ত্যাগ করে তাওবা-ইস্তিগফার এবং দিনের বেলায় নফল রোজা রাখা।',
    });
  }

  // 6. Day of Ashura (10 Muharram) & 9th/11th recommended days
  if (hijri.month === 1 && hijri.day === 10) {
    markers.push({
      id: 'ashura',
      reminderKey: 'ashura',
      kind: 'major_fast',
      titleEn: 'Day of Ashura (10 Muharram)',
      titleBn: 'পবিত্র আশুরা (১০ মুহররম)',
      significanceEn: 'Fasting on Ashura expiates the minor sins of the previous year (Sahih Muslim 1162).',
      significanceBn: 'আশুরার রোজা বিগত এক বছরের সগিরা গুনাহ মাফের কারণ হয় (সহীহ মুসলিম ১১৬২)।',
      recommendedDeedEn: 'Fast on 9th & 10th (or 10th & 11th) of Muharram and practice gratitude.',
      recommendedDeedBn: '৯ ও ১০ অথবা ১০ ও ১১ মুহররম রোজা রাখা ও শোকরানা আদায়।',
    });
  } else if (hijri.month === 1 && (hijri.day === 9 || hijri.day === 11)) {
    markers.push({
      id: `ashura_companion_${hijri.day}`,
      reminderKey: 'ashura',
      kind: 'major_fast',
      titleEn: `${hijri.day} Muharram (Ashura Paired Fast)`,
      titleBn: `${hijri.day} মুহররম (আশুরার সংযুক্ত রোজা)`,
      significanceEn: 'Sunnah day paired with the 10th of Muharram for Ashura fasting.',
      significanceBn: 'আশুরার ১০ তারিখের সাথে মিলিয়ে রাখার সুন্নাহ রোজার দিন।',
      recommendedDeedEn: 'Observe voluntary Sunnah fasting alongside 10 Muharram.',
      recommendedDeedBn: '১০ মুহররমের সাথে এই দিনেও নফল রোজা রাখা সুন্নাহ।',
    });
  }

  // 7. Day of Arafah (9 Dhul Hijjah)
  if (hijri.month === 12 && hijri.day === 9) {
    markers.push({
      id: 'arafah',
      reminderKey: 'arafah',
      kind: 'major_fast',
      titleEn: 'Day of Arafah (9 Dhul Hijjah)',
      titleBn: 'পবিত্র আরাফার দিন (৯ জিলহজ)',
      significanceEn: 'Fasting on Arafah expiates sins of the previous and coming year for non-pilgrims (Muslim 1162).',
      significanceBn: 'আরাফার দিনের রোজা বিগত ও আগত দুই বছরের সগিরা গুনাহ মাফ করে (সহীহ মুসলিম ১১৬২)।',
      recommendedDeedEn: 'Observe fasting (if not on Hajj), recite Takbir, and make abundant Dua ("La ilaha illallah...").',
      recommendedDeedBn: 'নফল রোজা রাখা, বেশি বেশি তাওবা-দোয়া ও তাকবীরে তাশরীক পাঠ।',
    });
  }

  // 8. Ayyam al-Beed (13th, 14th, 15th of every Hijri month)
  if (hijri.day === 13 || hijri.day === 14 || hijri.day === 15) {
    markers.push({
      id: `white_${hijri.day}`,
      reminderKey: 'ayyam_al_beed',
      kind: 'white_day',
      titleEn: `Ayyam al-Beed (${hijri.day} ${hijri.monthNameEn})`,
      titleBn: `আইয়্যামে বীজ (${hijri.day} ${hijri.monthNameBn})`,
      significanceEn: 'Fasting the three White Days every month equals fasting a lifetime (Bukhari 1979).',
      significanceBn: 'প্রতি মাসে ১৩, ১৪ ও ১৫ তারিখ ৩টি রোজা রাখা সারা বছর রোজার সমান সওয়াব (বুখারী ১৯৭৯)।',
      recommendedDeedEn: 'Fast today (except 13 Dhul Hijjah Tashriq) and renew Sunnah gratitude.',
      recommendedDeedBn: 'নফল রোজা রাখা (১৩ জিলহজ ব্যতীত) এবং শোকরিয়া আদায়।',
    });
  }

  // 9. Sunnah Monday / Thursday Fasts
  if ((dow === 1 || dow === 4) && !(hijri.month === 10 && hijri.day === 1) && !(hijri.month === 12 && hijri.day === 10)) {
    markers.push({
      id: dow === 1 ? 'sunnah_mon' : 'sunnah_thu',
      reminderKey: 'sunnah_mon_thu',
      kind: 'sunnah_fast',
      titleEn: dow === 1 ? 'Sunnah Monday Fast' : 'Sunnah Thursday Fast',
      titleBn: dow === 1 ? 'সোমবারের সুন্নাহ রোজা' : 'বৃহস্পতিবারের সুন্নাহ রোজা',
      significanceEn: 'Deeds are presented to Allah on Mondays and Thursdays; the Prophet (ﷺ) loved to be fasting (Tirmidhi 747).',
      significanceBn: 'সোম ও বৃহস্পতিবার বান্দার আমল আল্লাহর দরবারে পেশ করা হয়; নবীজি (ﷺ) এই দুই দিন রোজা রাখতে ভালোবাসতেন।',
      recommendedDeedEn: 'Observe voluntary Sunnah fasting or guard tongue and acts carefully.',
      recommendedDeedBn: 'সুন্নাহ নফল রোজা রাখা এবং উত্তম আমল বৃদ্ধি করা।',
    });
  }

  // 10. Blessed Friday (Jumu'ah)
  if (dow === 5) {
    markers.push({
      id: 'jumuah',
      reminderKey: 'jumuah',
      kind: 'jumuah',
      titleEn: 'Blessed Friday (Jumu’ah)',
      titleBn: 'পবিত্র জুমআর দিন',
      significanceEn: 'Best day on which the sun rises; contains an accepted hour for Dua.',
      significanceBn: 'সপ্তাহের শ্রেষ্ঠ দিন এবং দোয়া কবুলের বিশেষ মুহূর্ত সমৃদ্ধ দিন।',
      recommendedDeedEn: 'Recite Surah Al-Kahf, send abundant Salawat on the Prophet (ﷺ), attend Jumu’ah early, and pray Dua before Maghrib.',
      recommendedDeedBn: 'সূরা কাহাফ পাঠ, বেশি বেশি দরুদ শরিফ, দ্রুত মসজিদে গমন ও আসর-মাগরিবের মাঝে দোয়া করা।',
    });
  }

  return { hijri, markers };
}

export function buildMonthlyIslamicCalendar(
  year: number,
  monthZeroIndexed: number,
  hijriOffset: number = 0,
  todayRef: Date = new Date()
): { leadingEmptyDays: number; cells: CalendarCellMeta[] } {
  const leadingEmptyDays = new Date(year, monthZeroIndexed, 1).getDay();
  const daysInMonth = new Date(year, monthZeroIndexed + 1, 0).getDate();
  const cells: CalendarCellMeta[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthZeroIndexed, day);
    const { hijri, markers } = getDateIslamicMarkers(d, hijriOffset);
    const isToday =
      d.getFullYear() === todayRef.getFullYear() &&
      d.getMonth() === todayRef.getMonth() &&
      d.getDate() === todayRef.getDate();

    const priorityOrder: IslamicMarkerKind[] = [
      'eid',
      'qadr',
      'ramadan',
      'major_fast',
      'white_day',
      'sunnah_fast',
      'jumuah',
    ];
    const primaryKind =
      priorityOrder.find((k) => markers.some((m) => m.kind === k)) ?? null;

    cells.push({
      date: d,
      gregorianDay: day,
      hijri,
      isToday,
      isFriday: d.getDay() === 5,
      isMondayOrThursday: d.getDay() === 1 || d.getDay() === 4,
      markers,
      primaryKind,
    });
  }

  return { leadingEmptyDays, cells };
}

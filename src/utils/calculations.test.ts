import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateQiblaBearing,
  calculateDistanceToKaabaKm,
  calculateTahajjudStart,
  getNextPrayerCountdown,
  buildOfflinePrayerTimes,
  gregorianToHijri,
  calculateZakat,
  calculateMiras,
  parseAndValidateBackup,
} from './calculations';
import type { AppPersistedState } from '../types/islamic';

test('Qibla bearing and distance from Dhaka are accurate', () => {
  const bearing = calculateQiblaBearing(23.8103, 90.4125);
  const distance = calculateDistanceToKaabaKm(23.8103, 90.4125);
  // Dhaka to Makkah is ~277.6 degrees WNW, ~5170 km
  assert.ok(bearing > 275 && bearing < 280, `Expected ~277.6, got ${bearing}`);
  assert.ok(distance > 5100 && distance < 5250, `Expected ~5170km, got ${distance}`);
});

test('Tahajjud last third of night computes correctly across midnight', () => {
  // Maghrib 18:00 (1080), Fajr 05:00 (300 -> +1440 = 1740). Night = 660m. 2/3 = 440m -> 1520 = 01:20
  assert.equal(calculateTahajjudStart('18:00', '05:00'), '01:20');
});

test('Next prayer countdown handles mid-day and after-isha wraparound', () => {
  const times = buildOfflinePrayerTimes(new Date('2026-06-15T12:00:00'));
  const morning = new Date('2026-06-15T10:00:00');
  const nextMorning = getNextPrayerCountdown(times, morning);
  assert.equal(nextMorning.key, 'dhuhr');
  assert.equal(nextMorning.isTomorrow, false);

  const lateNight = new Date('2026-06-15T23:30:00');
  const nextNight = getNextPrayerCountdown(times, lateNight);
  assert.equal(nextNight.key, 'fajr');
  assert.equal(nextNight.isTomorrow, true);
});

test('Hijri converter applies moon-sighting day offset cleanly', () => {
  const baseDate = new Date(2026, 2, 20); // March 20, 2026
  const h0 = gregorianToHijri(baseDate, 0);
  const hPlus1 = gregorianToHijri(baseDate, 1);
  assert.ok(h0.year >= 1447);
  assert.ok(h0.month >= 1 && h0.month <= 12);
  assert.notEqual(`${h0.year}-${h0.month}-${h0.day}`, `${hPlus1.year}-${hPlus1.month}-${hPlus1.day}`);
});

test('Zakat calculator enforces Nisab threshold and 2.5% rate', () => {
  const belowNisab = calculateZakat({
    cashAndBank: 50000,
    goldValue: 0,
    silverValue: 0,
    businessInventory: 0,
    investments: 0,
    receivables: 0,
    liabilities: 10000,
    nisabThreshold: 85000,
  });
  assert.equal(belowNisab.netWealth, 40000);
  assert.equal(belowNisab.eligible, false);
  assert.equal(belowNisab.zakatPayable, 0);

  const aboveNisab = calculateZakat({
    cashAndBank: 500000,
    goldValue: 100000,
    silverValue: 0,
    businessInventory: 0,
    investments: 0,
    receivables: 0,
    liabilities: 100000,
    nisabThreshold: 85000,
  });
  assert.equal(aboveNisab.netWealth, 500000);
  assert.equal(aboveNisab.eligible, true);
  assert.equal(aboveNisab.zakatPayable, 12500);
});

test('Miras calculator handles Wife + 1 Son + 1 Daughter and Awl cases', () => {
  // Wife = 1/8 (12.5%), remaining 7/8 split 2:1 -> Son 7/12 (58.33%), Daughter 7/24 (29.17%)
  const standard = calculateMiras({
    totalEstate: 240000,
    spouse: 'wife',
    fatherAlive: false,
    motherAlive: false,
    sons: 1,
    daughters: 1,
  });
  assert.equal(standard.awlApplied, false);
  const wife = standard.rows.find((r) => r.heirKey === 'wife');
  const son = standard.rows.find((r) => r.heirKey === 'sons');
  const daughter = standard.rows.find((r) => r.heirKey === 'daughters');
  assert.equal(wife?.amount, 30000);
  assert.equal(son?.amount, 140000);
  assert.equal(daughter?.amount, 70000);

  // Awl case: Husband (1/4) + Father (1/6) + Mother (1/6) + 2 Daughters (2/3) -> 3+2+2+8 = 15/12
  const awlCase = calculateMiras({
    totalEstate: 150000,
    spouse: 'husband',
    fatherAlive: true,
    motherAlive: true,
    sons: 0,
    daughters: 2,
  });
  assert.equal(awlCase.awlApplied, true);
  assert.ok(Math.abs(awlCase.totalAllocatedPercentage - 100) < 0.1);
  const awlHusband = awlCase.rows.find((r) => r.heirKey === 'husband');
  assert.equal(awlHusband?.amount, 30000);
});

test('JSON backup validator accepts valid partial backup and rejects malformed data', () => {
  const defaults = {
    version: 1,
    language: 'en',
    theme: 'dark',
    location: { lat: 23.8103, lng: 90.4125, labelEn: 'Dhaka', labelBn: 'ঢাকা', isGps: false },
    calculationMethod: 1,
    asrJuristic: 1,
    quranFontSize: 32,
    quranTranslationMode: 'both',
    tajweedEnabled: true,
    quranRepeatCount: 1,
    lastRead: null,
    quranBookmarks: [],
    hadithBookmarks: [],
    prayerChecklist: {},
    qazaCounts: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, witr: 0 },
    tasbihCounts: {},
    tasbihLifetimeTotal: 0,
    tasbihTarget: 33,
    tasbihSound: true,
    tasbihHaptic: true,
    selectedDhikrId: 'subhanallah',
    customDhikrs: [],
    hijriOffset: 0,
    eventReminders: [],
    zakatHistory: [],
    quizBestScore: 0,
    ayahsReadCount: 0,
    notifications: {
      permissionGranted: false,
      audioUnlocked: false,
      azanWaqtAlerts: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
      playAzanAudio: true,
      muazzin: 'makkah',
      dailyHadithAlerts: false,
      hadithIntervalMinutes: 240,
    },
    profile: {
      activeAccountId: null,
      accounts: [],
      guestName: 'Guest Believer',
      guestAvatarId: 'crescent',
    },
    ramadan: {
      fastingDays: [],
      taraweehLogs: {},
      khatamPagesRead: 0,
      khatamTargetDays: 30,
      lastTenNightsChecklist: {},
    },
    seerahCompletedIds: [],
  } as AppPersistedState;

  const bad = parseAndValidateBackup('{not json', defaults);
  assert.equal(bad.ok, false);

  const good = parseAndValidateBackup(
    JSON.stringify({ language: 'bn', theme: 'light', tasbihLifetimeTotal: 199 }),
    defaults
  );
  assert.equal(good.ok, true);
  if (good.ok) {
    assert.equal(good.state.language, 'bn');
    assert.equal(good.state.theme, 'light');
    assert.equal(good.state.tasbihLifetimeTotal, 199);
  }

  const invalidTheme = parseAndValidateBackup(JSON.stringify({ theme: 'sepia' }), defaults);
  assert.equal(invalidTheme.ok, true);
  if (invalidTheme.ok) {
    assert.equal(invalidTheme.state.theme, 'dark');
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPrayerNotificationCopy,
  shouldTriggerPeriodicHadith,
  shouldTriggerPrayerAlert,
} from './notifications';
import {
  authenticateUserAccount,
  calculatePrayerStreak,
  createUserAccount,
  getActiveDisplayIdentity,
  validateAccountFields,
} from './accounts';
import type { DailyPrayerTimes, NotificationSettings, UserProfileState } from '../types/islamic';

const SAMPLE_PRAYER_TIMES: DailyPrayerTimes = {
  fajr: '05:10',
  sunrise: '06:22',
  dhuhr: '12:02',
  asr: '15:30',
  maghrib: '17:38',
  isha: '18:55',
  sahri: '05:09',
  iftar: '17:38',
  ishraq: '06:37',
  tahajjud: '01:19',
  dateLabel: 'Mon, Nov 23, 2026',
  source: 'aladhan',
};

test('shouldTriggerPrayerAlert matches exact prayer minute once per day/waqt', () => {
  const settings: NotificationSettings = {
    permissionGranted: true,
    audioUnlocked: true,
    azanWaqtAlerts: { fajr: true, dhuhr: false, asr: true, maghrib: true, isha: true },
    playAzanAudio: true,
    muazzin: 'makkah',
    dailyHadithAlerts: false,
    hadithIntervalMinutes: 240,
  };

  // Fajr exact match -> triggers
  const atFajr = new Date(2026, 10, 23, 5, 10, 12);
  const match = shouldTriggerPrayerAlert(SAMPLE_PRAYER_TIMES, atFajr, settings);
  assert.ok(match);
  assert.equal(match?.waqt, 'fajr');
  assert.equal(match?.triggerKey, '2026-11-23:fajr');

  // Same minute after triggerKey recorded -> does NOT double-fire
  const deduped = shouldTriggerPrayerAlert(SAMPLE_PRAYER_TIMES, atFajr, {
    ...settings,
    lastTriggeredPrayerKey: '2026-11-23:fajr',
  });
  assert.equal(deduped, null);

  // Disabled waqt (Dhuhr = false) -> does NOT fire
  const atDhuhr = new Date(2026, 10, 23, 12, 2, 0);
  assert.equal(shouldTriggerPrayerAlert(SAMPLE_PRAYER_TIMES, atDhuhr, settings), null);
});

test('shouldTriggerPeriodicHadith respects interval and toggle', () => {
  const base: NotificationSettings = {
    permissionGranted: true,
    audioUnlocked: true,
    azanWaqtAlerts: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
    playAzanAudio: true,
    muazzin: 'makkah',
    dailyHadithAlerts: true,
    hadithIntervalMinutes: 60,
    lastHadithSentAt: '2026-11-23T08:00:00.000Z',
  };

  assert.equal(
    shouldTriggerPeriodicHadith(new Date('2026-11-23T08:30:00.000Z'), base),
    false
  );
  assert.equal(
    shouldTriggerPeriodicHadith(new Date('2026-11-23T09:05:00.000Z'), base),
    true
  );
  assert.equal(
    shouldTriggerPeriodicHadith(new Date('2026-11-23T12:00:00.000Z'), {
      ...base,
      dailyHadithAlerts: false,
    }),
    false
  );

  const bnCopy = buildPrayerNotificationCopy('fajr', 'bn', '5:10 AM');
  assert.ok(bnCopy.title.includes('ফজর'));
});

test('account creation, login, duplicate prevention, and guest display identity', () => {
  const initial: UserProfileState = {
    activeAccountId: null,
    accounts: [],
    guestName: 'Guest Believer',
    guestAvatarId: 'crescent',
  };

  assert.equal(validateAccountFields({ name: 'A', emailOrUsername: 'x', pin: '12' }).ok, false);

  const created = createUserAccount(initial, {
    name: 'Sayed Tahmid',
    emailOrUsername: 'tahmid@noor.app',
    pin: '1234',
    avatarId: 'lantern',
  });
  assert.equal(created.ok, true);
  if (!created.ok) return;

  assert.equal(created.profile.accounts.length, 1);
  assert.equal(getActiveDisplayIdentity(created.profile).displayName, 'Sayed Tahmid');

  const duplicate = createUserAccount(created.profile, {
    name: 'Other',
    emailOrUsername: 'TAHMID@noor.app',
    pin: '9999',
    avatarId: 'star',
  });
  assert.equal(duplicate.ok, false);

  const badLogin = authenticateUserAccount(created.profile, 'tahmid@noor.app', '0000');
  assert.equal(badLogin.ok, false);

  const signedOut: UserProfileState = { ...created.profile, activeAccountId: null };
  assert.equal(getActiveDisplayIdentity(signedOut).isAuthenticated, false);

  const goodLogin = authenticateUserAccount(signedOut, 'tahmid@noor.app', '1234');
  assert.equal(goodLogin.ok, true);
  if (goodLogin.ok) {
    assert.equal(goodLogin.profile.activeAccountId, created.account.id);
  }
});

test('calculatePrayerStreak counts consecutive logged prayer days accurately', () => {
  const today = new Date(2026, 10, 23);
  const checklist = {
    '2026-11-23': { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
    '2026-11-22': { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
    '2026-11-21': { fajr: true, dhuhr: false, asr: false, maghrib: false, isha: false },
  };
  const streak = calculatePrayerStreak(checklist, today);
  assert.equal(streak.activeDaysStreak, 3);
  assert.equal(streak.fullFiveStreak, 2);
  assert.equal(streak.totalWaqtLogged, 11);
});

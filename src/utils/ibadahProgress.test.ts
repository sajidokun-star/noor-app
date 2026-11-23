import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDailyIbadahProgress } from './ibadahProgress';
import { formatDateKey } from './calculations';

test('calculateDailyIbadahProgress computes 20% per prayer and active streak', () => {
  const today = new Date(2026, 10, 23);
  const yesterday = new Date(2026, 10, 22);
  const todayKey = formatDateKey(today);
  const yesterdayKey = formatDateKey(yesterday);

  const summary = calculateDailyIbadahProgress(
    {
      prayerChecklist: {
        [yesterdayKey]: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
        [todayKey]: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: false },
      },
      tasbihCounts: { subhanallah: 33 },
      selectedDhikrId: 'subhanallah',
      tasbihTarget: 33,
      ayahsReadCount: 10,
    },
    today
  );

  assert.equal(summary.completedPrayers, 4);
  assert.equal(summary.prayerPercent, 80);
  assert.equal(summary.tasbihPercent, 100);
  assert.equal(summary.holisticPercent, 84); // 4/5 * 80 (64) + 10 + 10
  assert.equal(summary.streakDays, 2);
  assert.equal(summary.isAllPrayersDone, false);
});

test('calculateDailyIbadahProgress handles empty checklist at 0%', () => {
  const today = new Date(2026, 10, 23);
  const summary = calculateDailyIbadahProgress(
    {
      prayerChecklist: {},
      tasbihCounts: {},
      selectedDhikrId: 'subhanallah',
      tasbihTarget: 33,
      ayahsReadCount: 0,
    },
    today
  );

  assert.equal(summary.completedPrayers, 0);
  assert.equal(summary.prayerPercent, 0);
  assert.equal(summary.holisticPercent, 0);
  assert.equal(summary.streakDays, 0);
});

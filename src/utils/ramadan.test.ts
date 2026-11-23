import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRamadanSchedule,
  calculateKhatamPlan,
  getSahriIftarCountdown,
} from './ramadan';
import { buildOfflinePrayerTimes } from './calculations';

test('calculateKhatamPlan computes exact remaining pages per day and per prayer', () => {
  const plan = calculateKhatamPlan(104, 25, 604);
  assert.equal(plan.remainingPages, 500);
  assert.equal(plan.pagesPerDay, 20);
  assert.equal(plan.pagesPerPrayer, 4);
  assert.equal(plan.percentComplete, 17);

  const completed = calculateKhatamPlan(604, 10, 604);
  assert.equal(completed.remainingPages, 0);
  assert.equal(completed.pagesPerDay, 0);
  assert.equal(completed.percentComplete, 100);
});

test('buildRamadanSchedule produces 30 days and marks odd nights in last ten', () => {
  const schedule = buildRamadanSchedule('04:50', '18:05');
  assert.equal(schedule.length, 30);
  assert.equal(schedule[20].ramadanDay, 21);
  assert.equal(schedule[20].isOddLastTen, true);
  assert.equal(schedule[21].isOddLastTen, false);
  assert.equal(schedule[26].ramadanDay, 27);
  assert.equal(schedule[26].isOddLastTen, true);
});

test('getSahriIftarCountdown selects iftar during daytime and sahri overnight', () => {
  const times = buildOfflinePrayerTimes(new Date('2026-03-10T12:00:00'));
  const midday = new Date('2026-03-10T12:00:00');
  const dayStatus = getSahriIftarCountdown(times, midday);
  assert.equal(dayStatus.target, 'iftar');

  const preDawn = new Date('2026-03-10T02:00:00');
  const nightStatus = getSahriIftarCountdown(times, preDawn);
  assert.equal(nightStatus.target, 'sahri');
});

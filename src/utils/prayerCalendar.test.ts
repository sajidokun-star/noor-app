import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMonthlyOfflineSchedule,
  buildSevenDayStrip,
  hydrateCachedMonthlySchedule,
  parseAladhanCalendarResponse,
} from './prayerCalendar';

test('buildSevenDayStrip starts at Yesterday and covers 7 consecutive days', () => {
  const anchor = new Date(2026, 10, 23); // Nov 23, 2026
  const strip = buildSevenDayStrip(anchor, 0);

  assert.equal(strip.length, 7);
  assert.equal(strip[0].offsetFromToday, -1);
  assert.equal(strip[0].labelEn, 'Yesterday');
  assert.equal(strip[0].dateKey, '2026-11-22');

  assert.equal(strip[1].offsetFromToday, 0);
  assert.equal(strip[1].labelEn, 'Today');
  assert.equal(strip[1].dateKey, '2026-11-23');

  assert.equal(strip[2].offsetFromToday, 1);
  assert.equal(strip[2].labelEn, 'Tomorrow');
  assert.equal(strip[2].dateKey, '2026-11-24');

  assert.equal(strip[6].dateKey, '2026-11-28');
});

test('buildMonthlyOfflineSchedule populates every day in a month deterministically', () => {
  const nov = buildMonthlyOfflineSchedule(2026, 10, 0);
  assert.equal(Object.keys(nov).length, 30);
  assert.ok(nov['2026-11-01']);
  assert.ok(nov['2026-11-30']);
  assert.equal(nov['2026-11-15'].timings.source, 'offline');
  assert.ok(nov['2026-11-15'].timings.fajr.includes(':'));
  assert.ok(nov['2026-11-15'].timings.tahajjud.includes(':'));
});

test('parseAladhanCalendarResponse maps Aladhan monthly JSON into keyed timetable rows', () => {
  const parsed = parseAladhanCalendarResponse(
    [
      {
        timings: {
          Fajr: '05:01 (+06)',
          Sunrise: '06:20 (+06)',
          Dhuhr: '11:47 (+06)',
          Asr: '15:35 (+06)',
          Maghrib: '17:12 (+06)',
          Isha: '18:30 (+06)',
        },
        date: {
          readable: '24 Nov 2026',
          gregorian: { date: '24-11-2026' },
          hijri: {
            day: '14',
            month: { number: 6, en: 'Jumada al-Akhirah' },
            year: '1448',
          },
        },
      },
    ],
    2026,
    10,
    0
  );

  const row = parsed['2026-11-24'];
  assert.ok(row);
  assert.equal(row.timings.fajr, '05:01');
  assert.equal(row.timings.sahri, '05:00');
  assert.equal(row.timings.iftar, '17:12');
  assert.equal(row.timings.ishraq, '06:35');
  assert.equal(row.timings.source, 'aladhan');
  assert.equal(row.hijriDay, 14);
});

test('hydrateCachedMonthlySchedule restores Date instances after JSON localStorage round-trip', () => {
  const original = buildMonthlyOfflineSchedule(2026, 10, 0);
  const serialized = JSON.parse(JSON.stringify(original));
  assert.equal(typeof serialized['2026-11-24'].date, 'string');

  const hydrated = hydrateCachedMonthlySchedule(serialized);
  const row = hydrated['2026-11-24'];
  assert.ok(row);
  assert.ok(row.date instanceof Date);
  assert.equal(row.date.getFullYear(), 2026);
  assert.equal(row.date.getMonth(), 10);
  assert.equal(row.date.getDate(), 24);
  assert.equal(typeof row.date.toLocaleDateString('en-US', { month: 'short' }), 'string');

  // Safely ignores invalid payloads
  assert.deepEqual(hydrateCachedMonthlySchedule(null), {});
  assert.deepEqual(hydrateCachedMonthlySchedule({ bad: { dateKey: '2026-11-01' } }), {});
});


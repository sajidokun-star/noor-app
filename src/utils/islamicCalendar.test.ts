import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMonthlyIslamicCalendar,
  getDateIslamicMarkers,
} from './islamicCalendar';
import { gregorianToHijri } from './calculations';

function findDateForHijri(targetMonth: number, targetDay: number, startYear = 2026): Date {
  for (let i = 0; i < 400; i++) {
    const d = new Date(startYear, 0, 1 + i);
    const h = gregorianToHijri(d, 0);
    if (h.month === targetMonth && h.day === targetDay) return d;
  }
  throw new Error(`Could not find Hijri ${targetDay}/${targetMonth}`);
}

test('getDateIslamicMarkers identifies Eid ul-Fitr, Ramadan Qadr nights, Ashura, Shab-e-Barat, Arafah, and Ayyam al-Beed', () => {
  const eidFitr = findDateForHijri(10, 1);
  assert.ok(getDateIslamicMarkers(eidFitr).markers.some((m) => m.id === 'eid_fitr'));

  const eidAdha = findDateForHijri(12, 10);
  assert.ok(getDateIslamicMarkers(eidAdha).markers.some((m) => m.id === 'eid_adha'));

  const arafah = findDateForHijri(12, 9);
  assert.ok(getDateIslamicMarkers(arafah).markers.some((m) => m.id === 'arafah'));

  const qadr27 = findDateForHijri(9, 27);
  assert.ok(getDateIslamicMarkers(qadr27).markers.some((m) => m.id === 'qadr_27'));

  const shabBarat = findDateForHijri(8, 15);
  const shabMarkers = getDateIslamicMarkers(shabBarat).markers;
  assert.ok(shabMarkers.some((m) => m.id === 'shab_e_barat'));
  assert.ok(shabMarkers.some((m) => m.kind === 'white_day'));

  const ashura = findDateForHijri(1, 10);
  assert.ok(getDateIslamicMarkers(ashura).markers.some((m) => m.id === 'ashura'));
});

test('getDateIslamicMarkers tags Sunnah Monday/Thursday fasts and Jumuah', () => {
  // Find a Monday (day === 1) that is not Eid
  const monday = new Date(2026, 10, 23); // Nov 23, 2026 is a Monday
  assert.equal(monday.getDay(), 1);
  assert.ok(getDateIslamicMarkers(monday).markers.some((m) => m.id === 'sunnah_mon'));

  const thursday = new Date(2026, 10, 26); // Nov 26, 2026 is a Thursday
  assert.equal(thursday.getDay(), 4);
  assert.ok(getDateIslamicMarkers(thursday).markers.some((m) => m.id === 'sunnah_thu'));

  const friday = new Date(2026, 10, 27); // Nov 27, 2026 is a Friday
  assert.equal(friday.getDay(), 5);
  assert.ok(getDateIslamicMarkers(friday).markers.some((m) => m.id === 'jumuah'));
});

test('buildMonthlyIslamicCalendar produces exact month grid cells', () => {
  const cal = buildMonthlyIslamicCalendar(2026, 10, 0, new Date(2026, 10, 23));
  assert.equal(cal.cells.length, 30);
  assert.equal(cal.cells[22].isToday, true);
  assert.equal(cal.cells[22].gregorianDay, 23);
});

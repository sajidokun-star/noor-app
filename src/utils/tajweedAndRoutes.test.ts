import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseTajweedText,
  stripTajweedMarkup,
  toArabicIndicDigits,
  mapTajweedCodeToRule,
} from './tajweed';
import { sanitizeTafsirHtml, synthesizeAyahCoreLesson } from './ayahReflection';
import { parseHashToRoute, routeToHash } from './routes';

test('parseTajweedText parses nested and adjacent Al-Quran Cloud Tajweed tags accurately', () => {
  const sample = 'بِسْمِ [h:1[ٱ]للَّهِ [h:2[ٱ][l[ل]رَّحْمَ[n[ـٰ]نِ [h:3[ٱ][l[ل]رَّح[p[ِي]مِ';
  const segments = parseTajweedText(sample);

  assert.ok(segments.length > 5);
  assert.equal(stripTajweedMarkup(sample), 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ');

  assert.ok(segments.some((s) => s.rule === 'silent' && s.text.includes('ٱ')));
  assert.ok(segments.some((s) => s.rule === 'madd' && s.text.includes('ـٰ')));
  assert.ok(segments.some((s) => s.rule === 'madd' && s.text.includes('ِي')));
});

test('mapTajweedCodeToRule maps quran-tajweed codes to Noorani color categories', () => {
  assert.equal(mapTajweedCodeToRule('g'), 'ghunnah');
  assert.equal(mapTajweedCodeToRule('f'), 'ghunnah');
  assert.equal(mapTajweedCodeToRule('q'), 'qalqalah');
  assert.equal(mapTajweedCodeToRule('m'), 'madd');
  assert.equal(mapTajweedCodeToRule('p'), 'madd');
  assert.equal(mapTajweedCodeToRule('a'), 'idgham');
  assert.equal(mapTajweedCodeToRule('h'), 'silent');
});

test('toArabicIndicDigits converts ayah numbers to Arabic-Indic glyphs', () => {
  assert.equal(toArabicIndicDigits(1), '١');
  assert.equal(toArabicIndicDigits(255), '٢٥٥');
  assert.equal(toArabicIndicDigits(109), '١٠٩');
});

test('sanitizeTafsirHtml removes HTML tags while preserving clean paragraph breaks', () => {
  const html = '<p>First <b>insight</b> here.</p><p>Second &amp; final line.</p>';
  const cleaned = sanitizeTafsirHtml(html);
  assert.equal(cleaned, 'First insight here.\nSecond & final line.');
});

test('synthesizeAyahCoreLesson returns curated and thematic bilingual reflections', () => {
  const fatiha = synthesizeAyahCoreLesson(1, 5, 'It is You we worship', 'আমরা কেবল তোমারই ইবাদত করি');
  assert.equal(fatiha.themeEn, 'Pure Devotion & Reliance');
  assert.ok(fatiha.bn.includes('ইবাদত'));

  const thematic = synthesizeAyahCoreLesson(
    2,
    153,
    'Seek help through patience and prayer.',
    'ধৈর্য ও নামাজের মাধ্যমে সাহায্য প্রার্থনা করো।'
  );
  assert.equal(thematic.themeEn, 'Devotion & Generosity');
});

test('hash routing maps all tool pages and falls back safely to home', () => {
  assert.equal(parseHashToRoute('#/quran'), 'quran');
  assert.equal(parseHashToRoute('#/card-maker'), 'card-maker');
  assert.equal(parseHashToRoute('#/qibla'), 'qibla');
  assert.equal(parseHashToRoute('#/notifications'), 'notifications');
  assert.equal(parseHashToRoute('#/profile'), 'profile');
  assert.equal(parseHashToRoute('#/ramadan'), 'ramadan');
  assert.equal(parseHashToRoute('#/seerah'), 'seerah');
  assert.equal(parseHashToRoute('#/ai-assistant'), 'ai-assistant');
  assert.equal(parseHashToRoute('#/unknown-path'), 'home');
  assert.equal(parseHashToRoute(''), 'home');
  assert.equal(routeToHash('tasbih'), '#/tasbih');
  assert.equal(routeToHash('ramadan'), '#/ramadan');
  assert.equal(routeToHash('seerah'), '#/seerah');
  assert.equal(routeToHash('ai-assistant'), '#/ai-assistant');
});

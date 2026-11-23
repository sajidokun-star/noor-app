import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFallbackWordsFromArabic,
  countArabicStats,
  FATIHA_WORDS_BY_AYAH,
  parseQuranComWordsResponse,
} from './wordByWord';

test('countArabicStats ignores diacritics and counts words and letters accurately', () => {
  const stats = countArabicStats('بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ');
  assert.equal(stats.words, 4);
  assert.ok(stats.letters >= 18 && stats.letters <= 22, `Expected ~19 letters, got ${stats.letters}`);
});

test('parseQuranComWordsResponse skips end markers and preserves Bengali/English glosses', () => {
  const parsed = parseQuranComWordsResponse(
    [
      {
        verse_key: '1:1',
        words: [
          {
            position: 1,
            char_type_name: 'word',
            text_uthmani: 'بِسْمِ',
            transliteration: { text: 'bis' + "'mi" },
            translation: { text: 'In (the) name' },
            root_word: 'س م و',
          },
          {
            position: 2,
            char_type_name: 'end',
            text_uthmani: '١',
          },
        ],
      },
    ],
    [
      {
        verse_key: '1:1',
        words: [
          {
            position: 1,
            char_type_name: 'word',
            translation: { text: 'নামে' },
          },
        ],
      },
    ]
  );

  assert.equal(parsed['1:1'].length, 1);
  assert.equal(parsed['1:1'][0].meaningBn, 'নামে');
  assert.equal(parsed['1:1'][0].rootArabic, 'س م و');
});

test('FATIHA_WORDS_BY_AYAH and fallback builder return complete word items', () => {
  assert.equal(FATIHA_WORDS_BY_AYAH['1:1'].length, 4);
  const fallback = buildFallbackWordsFromArabic('بِسْمِ ٱللَّهِ', '1:1');
  assert.equal(fallback.length, 4);
  assert.equal(fallback[1].meaningBn, 'আল্লাহর');
});

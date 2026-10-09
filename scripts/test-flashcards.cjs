const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function load(file, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function('require', 'exports', code)(name => dependencies[name] ?? require(name), exports);
  return exports;
}

const srs = load('src/domain/study/flashcardSrs.ts');
const generation = load('src/domain/study/flashcardGeneration.ts', { '@/src/domain/study/flashcardSrs': srs });
const memory = new Map();
const types = load('src/domain/types/flashcards.ts');
const scoring = load('src/domain/study/flashcardScoring.ts', { '../types/flashcards': types });
const { LocalFlashcardRepository } = load('src/data/local/FlashcardRepository.ts', {
  './flashcardStorage': { flashcardStorage: { getItem: async key => memory.get(key) ?? null, setItem: async (key, value) => memory.set(key, value) } },
  '@react-native-async-storage/async-storage': { getItem: async key => memory.get(key) ?? null, setItem: async (key, value) => memory.set(key, value) },
  '@/src/domain/study/flashcardSrs': srs,
  '@/src/domain/types/flashcards': types,
  '@/src/domain/study/flashcardScoring': scoring,
});
const first = srs.computeFlashcardSrs(4, 1, 0, 2.5, 0);
assert.deepEqual(first, { interval: 1, repetition: 1, easeFactor: 2.6, dueAt: 86400000 });
const second = srs.computeFlashcardSrs(4, first.interval, first.repetition, first.easeFactor, 0);
assert.equal(second.interval, 6);
assert.equal(second.repetition, 2);
const failed = srs.computeFlashcardSrs(1, 30, 5, 2.3, 0);
assert.equal(failed.repetition, 0);
assert.equal(failed.interval, 1);
const candidates = generation.generateLocalFlashcardCandidates([
  { id: 'chapter-1', bookId: 'book-1', chapterIndex: 0, title: 'Capítulo', startCfi: null, endCfi: null, characterCount: 100, html: '<p>Uma ideia importante aparece neste capítulo para explicar como a leitura e o estudo local podem trabalhar juntos.</p>' },
], { bookId: 'book-1', maxCards: 3 });
assert.equal(candidates.length, 1);
assert.equal(candidates[0].source.bookId, 'book-1');
assert.equal(candidates[0].source.chapterId, 'chapter-1');
assert.equal(candidates[0].source.kind, 'book-chapter');
const repository = new LocalFlashcardRepository({ getItem: async key => memory.get(key) ?? null, setItem: async (key, value) => memory.set(key, value) });
(async () => {
  const now = 0;
  const deck = { id: 'deck-1', title: 'Local', description: '', category: 'Leitura', bookIds: ['book-1'], isGenerated: true, createdAt: now, updatedAt: now };
  await repository.createDeck(deck);
  const card = { id: 'card-1', deckId: deck.id, front: 'Q', back: 'A', difficulty: 'EASY', tags: [], status: 'approved', interval: 1, repetition: 0, easeFactor: 2.5, dueAt: 0, source: { kind: 'book-chapter', bookId: 'book-1', chapterId: 'chapter-1', chapterTitle: 'Capítulo', quote: 'Q', prefix: null, suffix: null, sourcePage: null }, createdAt: now, updatedAt: now };
  await repository.createCards([card]);
  const event = { id: 'review-1', cardId: card.id, rating: 4, reviewedAt: 0, durationMs: 0 };
  const firstReview = await repository.recordReview(card, event);
  const secondReview = await repository.recordReview(firstReview.card, event);
  assert.equal(firstReview.card.repetition, 1);
  assert.equal(secondReview.card.repetition, 1);
  assert.equal((await repository.load()).reviews.length, 1);
  const concurrent = Array.from({ length: 20 }, (_, index) => ({ ...deck, id: `deck-concurrent-${index}` }));
  await Promise.all(concurrent.map(value => repository.createDeck(value)));
  assert.equal((await repository.load()).decks.length, 21, 'parallel local writes must not lose decks');
  console.log('PASS flashcards persistence: deck/card storage and idempotent review event.');
})().catch(error => { console.error(error); process.exitCode = 1; });

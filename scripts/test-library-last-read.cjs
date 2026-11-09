// "Continue lendo": last reading activity is derived from persisted reading progress (SQLite and IndexedDB),
// isolated per account, never written back into the book row/JSON. Real node:sqlite; IndexedDB store stubbed.
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { loader, sqliteAdapter } = require('./library-test-utils.cjs');

const base = { title: 'Livro', author: 'Autor', fileName: 'x.epub', filePath: 'file:///app/books/x.epub', fileHash: null, mimeType: 'application/epub+zip', fileSize: 5, coverImagePath: null, totalChapters: 1, totalWords: 3, addedDate: 1, lastOpenedDate: null, isDeleted: false, progress: 0 };

(async () => {
  // SQLite (Android): real schema/migrations.
  const db = new DatabaseSync(':memory:'); db.exec('PRAGMA foreign_keys=ON');
  const load = loader({ '@/src/data/database/connection/database': { getDatabase: async () => sqliteAdapter(db) } });
  await load('src/data/database/migrations/MigrationRunner.ts').runMigrations(sqliteAdapter(db));
  const raw = new (load('src/data/repositories/SqliteBookRepository.ts').SqliteBookRepository)();
  const progress = new (load('src/data/repositories/SqliteReadingProgressRepository.ts').SqliteReadingProgressRepository)();
  const { LibraryAccountScope } = load('src/data/library/LibraryAccountScope.ts');
  const { AccountBookRepository } = load('src/data/library/AccountBookRepository.ts');
  const scope = new LibraryAccountScope();
  const books = new AccountBookRepository(raw, scope);

  scope.set('A');
  await books.save({ ...base, id: 'a-read' });
  await books.save({ ...base, id: 'a-unread', addedDate: 5 });
  scope.set('B');
  await books.save({ ...base, id: 'b-read' });
  await progress.save({ id: 'p-a', bookId: 'a-read', currentChapterId: null, cfiPosition: null, percentage: 0.3, pageNumber: 11, updatedAt: 1762680000000 });
  await progress.save({ id: 'p-b', bookId: 'b-read', currentChapterId: null, cfiPosition: null, percentage: 0.7, pageNumber: 40, updatedAt: 1762690000000 });

  scope.set('A');
  let list = await books.listActive();
  assert.equal(list.find(b => b.id === 'a-read').lastReadAt, 1762680000000, 'progress updatedAt becomes lastReadAt');
  assert.equal(list.find(b => b.id === 'a-read').progress, 0.3);
  assert.equal(list.find(b => b.id === 'a-unread').lastReadAt, null, 'no progress → null, never zero or invented');
  assert.equal(list.some(b => b.id === 'b-read'), false, 'account B book/progress stays out of A');
  assert.equal((await books.findById('a-read')).lastReadAt, 1762680000000);

  // Saving a book read from the list must not persist the derived value.
  await books.save({ ...list.find(b => b.id === 'a-read'), title: 'Editado' });
  const row = db.prepare('SELECT account_json, last_opened_date FROM books WHERE id = ?').get('a-read');
  assert.equal(JSON.parse(row.account_json).lastReadAt, undefined, 'derived field is not stored in account_json');
  assert.equal(row.last_opened_date, null, 'last_opened_date is not fabricated');
  // Newer progress is reflected on the next read (not frozen).
  await progress.save({ id: 'p-a', bookId: 'a-read', currentChapterId: null, cfiPosition: null, percentage: 0.31, pageNumber: 12, updatedAt: 1762700000000 });
  list = await books.listActive();
  assert.equal(list.find(b => b.id === 'a-read').lastReadAt, 1762700000000);
  assert.equal(list.find(b => b.id === 'a-read').title, 'Editado');

  // IndexedDB (Web): same contract over the existing store helpers.
  const store = { book_metadata: [{ ...base, id: 'w-read', ownerUserId: 'A' }, { ...base, id: 'w-unread', ownerUserId: 'A' }], reading_progress: [{ id: 'wp', bookId: 'w-read', percentage: 0.5, pageNumber: 3, updatedAt: 1762710000000 }, { id: 'bad', bookId: 'w-unread', percentage: 0, pageNumber: 0, updatedAt: Number.NaN }] };
  const saved = [];
  const webLoad = loader({ '@/src/data/database/connection/webLibraryStore': {
    webGetAllPersistent: async name => store[name] ?? [], webSaveBookPersistent: async book => saved.push(book),
    webGet: async () => null, webGetAll: async () => [], webPut: async () => undefined, webGetPersistent: async () => null,
    webReplaceChaptersPersistent: async () => undefined, webPutPersistent: async () => undefined, webDeletePersistent: async () => undefined, webImportStudyPersistent: async () => undefined,
  } });
  const web = new (webLoad('src/data/repositories/IndexedDbRepositories.ts').IndexedDbBookRepository)();
  const webList = await web.listActive();
  assert.equal(webList.find(b => b.id === 'w-read').lastReadAt, 1762710000000);
  assert.equal(webList.find(b => b.id === 'w-read').progress, 0.5);
  assert.equal(webList.find(b => b.id === 'w-unread').lastReadAt, null, 'invalid timestamp is not used');
  await web.save(webList.find(b => b.id === 'w-read'));
  assert.equal('lastReadAt' in saved[0], false, 'IndexedDB save strips the derived field');

  console.log('PASS last read: SQLite/IndexedDB derive lastReadAt from persisted progress, null without progress, A/B isolated, never written back. No Android claim.');
})().catch(error => { console.error(error); process.exit(1); });

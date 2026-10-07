const assert = require('node:assert/strict');
const fs = require('node:fs'), ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');

// Real SQLite SQL/rollback; the Expo bridge remains a separate physical-device check.
function repository(file, database) {
  const exports = {};
  const adapter = {
    getFirstAsync: async (sql, ...params) => database.prepare(sql).get(...params),
    getAllAsync: async (sql, ...params) => database.prepare(sql).all(...params),
    runAsync: async (sql, ...params) => database.prepare(sql).run(...params),
    withExclusiveTransactionAsync: async operation => {
      database.exec('BEGIN');
      try { await operation(adapter); database.exec('COMMIT'); }
      catch (error) { database.exec('ROLLBACK'); throw error; }
    },
  };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'exports', code)(() => ({ getDatabase: async () => adapter }), exports);
  return new (Object.values(exports)[0])();
}

(async () => {
  const database = new DatabaseSync(':memory:');
  database.exec(`CREATE TABLE bookmarks (id TEXT PRIMARY KEY, book_id TEXT NOT NULL, chapter_id TEXT NOT NULL, cfi_position TEXT, text_preview TEXT NOT NULL, note TEXT, created_at INTEGER NOT NULL);
    CREATE TABLE highlights (id TEXT PRIMARY KEY, book_id TEXT NOT NULL, chapter_id TEXT NOT NULL, start_cfi TEXT NOT NULL, end_cfi TEXT NOT NULL, highlighted_text TEXT NOT NULL, color_label TEXT NOT NULL, created_at INTEGER NOT NULL);`);
  const bookmark = { id: 'local', bookId: 'book', chapterId: 'chapter', cfiPosition: null, textPreview: 'Trecho', note: 'Local', createdAt: 1 };
  const highlight = { id: 'local', bookId: 'book', chapterId: 'chapter', startCfi: 'anchor', endCfi: 'anchor', highlightedText: 'Trecho', colorLabel: 'blue', createdAt: 1 };
  for (const [table, file, value] of [
    ['bookmarks', 'src/data/repositories/SqliteBookmarkRepository.ts', bookmark],
    ['highlights', 'src/data/repositories/SqliteHighlightRepository.ts', highlight],
  ]) {
    const repo = repository(file, database);
    await repo.save(value);
    assert.deepEqual(await repo.importPreservingExisting('book', [value, { ...value, id: 'new' }]), { imported: 1, skipped: 1 });
    assert.deepEqual(await repo.importPreservingExisting('book', [value, { ...value, id: 'new' }]), { imported: 0, skipped: 2 });
    await repo.save({ ...value, id: 'collision', bookId: 'other' });
    await assert.rejects(repo.importPreservingExisting('book', [{ ...value, id: 'rollback' }, { ...value, id: 'collision' }]), /outro livro/);
    assert.equal(await repo.findById('rollback'), null);
    assert.equal((await repo.findById('collision')).bookId, 'other');
    database.exec(`CREATE TRIGGER fail_${table} BEFORE INSERT ON ${table} WHEN NEW.id = 'failure' BEGIN SELECT RAISE(ABORT, 'injected write failure'); END;`);
    await assert.rejects(repo.importPreservingExisting('book', [{ ...value, id: 'partial' }, { ...value, id: 'failure' }]), /injected write failure/);
    assert.equal(await repo.findById('partial'), null);
    await assert.rejects(repo.importPreservingExisting('book', [value, value]), /duplicados/);
    await assert.rejects(repo.importPreservingExisting('book', [{ ...value, bookId: 'other' }]), /inválidos/);
    assert.deepEqual(await repo.importPreservingExisting('book', []), { imported: 0, skipped: 0 });
    await repo.remove('new');
    assert.equal(await repo.findById('new'), null);
    console.log(`PASS SQLite ${table}: CRUD, import, idempotence, conflict rollback, injected partial-write rollback, invalid batch, empty batch.`);
  }
  database.close();
  // No IndexedDB in Node: strict study APIs must fail without claiming persistence.
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('src/data/database/connection/webLibraryStore.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function('exports', code)(exports);
  await assert.rejects(exports.webGetAllPersistent('bookmarks'), /persistente indisponível/);
  await assert.rejects(exports.webPutPersistent('bookmarks', bookmark), /Não foi possível salvar/);
  await assert.rejects(exports.webDeletePersistent('bookmarks', 'local'), /Não foi possível salvar/);
  await assert.rejects(exports.webImportStudyPersistent('bookmarks', 'book', [bookmark]), /Não foi possível recuperar/);
  console.log('PASS Web unavailable storage: read/save/delete/import reject, no silent memory success. Real IndexedDB is checked by browser test.');
})().catch(error => { console.error(error); process.exitCode = 1; });

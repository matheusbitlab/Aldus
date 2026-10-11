import { SQLiteDatabase } from "expo-sqlite";
import { DatabaseError } from "@/src/core/errors/AppError";

interface Migration { version: number; statements: string[]; }
const migrations: Migration[] = [{ version: 1, statements: [
  "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);",
  "CREATE TABLE IF NOT EXISTS books (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, author TEXT NOT NULL, file_name TEXT NOT NULL, file_path TEXT NOT NULL, file_hash TEXT, mime_type TEXT NOT NULL, file_size INTEGER NOT NULL DEFAULT 0, cover_image_path TEXT, total_chapters INTEGER NOT NULL DEFAULT 0, total_words INTEGER NOT NULL DEFAULT 0, added_date INTEGER NOT NULL, last_opened_date INTEGER, is_deleted INTEGER NOT NULL DEFAULT 0);",
  "CREATE TABLE IF NOT EXISTS chapters (id TEXT PRIMARY KEY NOT NULL, book_id TEXT NOT NULL, chapter_index INTEGER NOT NULL, title TEXT NOT NULL, start_cfi TEXT, end_cfi TEXT, character_count INTEGER NOT NULL DEFAULT 0, html TEXT NOT NULL DEFAULT '', FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE);",
  "CREATE INDEX IF NOT EXISTS chapters_book_id_idx ON chapters(book_id);",
  "CREATE TABLE IF NOT EXISTS reading_progress (id TEXT PRIMARY KEY NOT NULL, book_id TEXT NOT NULL UNIQUE, current_chapter_id TEXT, cfi_position TEXT, percentage REAL NOT NULL DEFAULT 0, page_number INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL, FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE);",
  "CREATE INDEX IF NOT EXISTS progress_book_id_idx ON reading_progress(book_id);",
  "CREATE TABLE IF NOT EXISTS bookmarks (id TEXT PRIMARY KEY NOT NULL, book_id TEXT NOT NULL, chapter_id TEXT NOT NULL, cfi_position TEXT, text_preview TEXT NOT NULL, note TEXT, created_at INTEGER NOT NULL, FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE);",
  "CREATE INDEX IF NOT EXISTS bookmarks_book_chapter_idx ON bookmarks(book_id, chapter_id);",
  "CREATE TABLE IF NOT EXISTS highlights (id TEXT PRIMARY KEY NOT NULL, book_id TEXT NOT NULL, chapter_id TEXT NOT NULL, start_cfi TEXT NOT NULL, end_cfi TEXT NOT NULL, highlighted_text TEXT NOT NULL, color_label TEXT NOT NULL, created_at INTEGER NOT NULL, FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE);",
  "CREATE INDEX IF NOT EXISTS highlights_book_chapter_idx ON highlights(book_id, chapter_id);",
  "CREATE TABLE IF NOT EXISTS web_search_history (id TEXT PRIMARY KEY NOT NULL, query TEXT NOT NULL, results_count INTEGER NOT NULL DEFAULT 0, searched_at INTEGER NOT NULL);"
]}, { version: 2, statements: [
  "CREATE TABLE IF NOT EXISTS pdf_reflow_cache (book_id TEXT PRIMARY KEY NOT NULL, source_signature TEXT NOT NULL, processor_version INTEGER NOT NULL, document_json TEXT NOT NULL, updated_at INTEGER NOT NULL, FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE);"
]}, { version: 3, statements: [
  "CREATE TABLE IF NOT EXISTS source_catalogs (source_id TEXT PRIMARY KEY NOT NULL, snapshot_json TEXT NOT NULL);",
  "CREATE TABLE IF NOT EXISTS source_import_links (source_id TEXT NOT NULL, remote_book_id TEXT NOT NULL, book_id TEXT NOT NULL, PRIMARY KEY (source_id, remote_book_id));"
]}, { version: 4, statements: [
  "ALTER TABLE books ADD COLUMN owner_user_id TEXT;",
  "ALTER TABLE books ADD COLUMN account_json TEXT;",
  "CREATE INDEX books_owner_idx ON books(owner_user_id, is_deleted);"
]}];

export async function runMigrations(database: SQLiteDatabase): Promise<void> {
  try {
    await database.withTransactionAsync(async () => {
      await database.runAsync("CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)");
      const row = await database.getFirstAsync<{ version: number }>("SELECT version FROM schema_version LIMIT 1");
      let currentVersion = row?.version ?? 0;
      for (const migration of migrations.filter((item) => item.version > currentVersion)) {
        for (const statement of migration.statements) await database.execAsync(statement);
        currentVersion = migration.version;
        await database.runAsync("DELETE FROM schema_version");
        await database.runAsync("INSERT INTO schema_version (version) VALUES (?)", currentVersion);
      }
    });
  } catch (error) { throw new DatabaseError("Falha ao executar migrations do banco local.", error); }
}

import { StoredChapter } from "@/src/domain/entities/LibraryBook";
import { ChapterRepository } from "@/src/domain/repositories/ChapterRepository";
import { getDatabase } from "@/src/data/database/connection/database";

export class SqliteChapterRepository implements ChapterRepository {
  async listByBookId(bookId: string): Promise<StoredChapter[]> { const database = await getDatabase(); const rows = await database.getAllAsync<StoredChapterRow>("SELECT * FROM chapters WHERE book_id = ? ORDER BY chapter_index ASC", bookId); return rows.map((row) => ({ id: row.id, bookId: row.book_id, chapterIndex: row.chapter_index, title: row.title, startCfi: row.start_cfi, endCfi: row.end_cfi, characterCount: row.character_count, html: row.html })); }
  async replaceForBook(bookId: string, chapters: StoredChapter[]): Promise<void> { const database = await getDatabase(); await database.withTransactionAsync(async () => { await database.runAsync("DELETE FROM chapters WHERE book_id = ?", bookId); for (const chapter of chapters) await database.runAsync("INSERT INTO chapters (id, book_id, chapter_index, title, start_cfi, end_cfi, character_count, html) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", chapter.id, bookId, chapter.chapterIndex, chapter.title, chapter.startCfi, chapter.endCfi, chapter.characterCount, chapter.html); }); }
}
interface StoredChapterRow { id: string; book_id: string; chapter_index: number; title: string; start_cfi: string | null; end_cfi: string | null; character_count: number; html: string; }

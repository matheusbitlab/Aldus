import { Bookmark, BookmarkRepository } from "@/src/domain/repositories/BookmarkRepository";
import { getDatabase } from "@/src/data/database/connection/database";

export class SqliteBookmarkRepository implements BookmarkRepository {
  async importPreservingExisting(bookId: string, bookmarks: Bookmark[]): Promise<{ imported: number; skipped: number }> {
    if (!bookId || bookmarks.some(value => value.bookId !== bookId || !value.id) || new Set(bookmarks.map(value => value.id)).size !== bookmarks.length) throw new Error("Marcadores inválidos ou duplicados para este livro.");
    const database = await getDatabase(); let imported = 0, skipped = 0;
    await database.withExclusiveTransactionAsync(async transaction => {
      for (const bookmark of bookmarks) {
        const previous = await transaction.getFirstAsync<{ book_id: string }>("SELECT book_id FROM bookmarks WHERE id = ?", bookmark.id);
        if (previous && previous.book_id !== bookId) throw new Error("Identificador utilizado em outro livro. Nenhum marcador foi importado.");
        if (previous) { skipped++; continue; }
        await transaction.runAsync("INSERT INTO bookmarks (id, book_id, chapter_id, cfi_position, text_preview, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", bookmark.id, bookmark.bookId, bookmark.chapterId, bookmark.cfiPosition, bookmark.textPreview, bookmark.note, bookmark.createdAt);
        imported++;
      }
    });
    return { imported, skipped };
  }
  async findById(id: string): Promise<Bookmark | null> {
    const database = await getDatabase();
    const row = await database.getFirstAsync<BookmarkRow>("SELECT * FROM bookmarks WHERE id = ?", id);
    return row ? { id: row.id, bookId: row.book_id, chapterId: row.chapter_id, cfiPosition: row.cfi_position, textPreview: row.text_preview, note: row.note, createdAt: row.created_at } : null;
  }
  async listByBookId(bookId: string): Promise<Bookmark[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<BookmarkRow>("SELECT * FROM bookmarks WHERE book_id = ? ORDER BY created_at DESC", bookId);
    return rows.map((row) => ({ id: row.id, bookId: row.book_id, chapterId: row.chapter_id, cfiPosition: row.cfi_position, textPreview: row.text_preview, note: row.note, createdAt: row.created_at }));
  }
  async save(bookmark: Bookmark): Promise<void> {
    const database = await getDatabase();
    await database.runAsync("INSERT OR REPLACE INTO bookmarks (id, book_id, chapter_id, cfi_position, text_preview, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", bookmark.id, bookmark.bookId, bookmark.chapterId, bookmark.cfiPosition, bookmark.textPreview, bookmark.note, bookmark.createdAt);
  }
  async remove(bookmarkId: string): Promise<void> { const database = await getDatabase(); await database.runAsync("DELETE FROM bookmarks WHERE id = ?", bookmarkId); }
}
interface BookmarkRow { id: string; book_id: string; chapter_id: string; cfi_position: string | null; text_preview: string; note: string | null; created_at: number; }

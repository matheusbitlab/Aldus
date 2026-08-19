import { Bookmark, BookmarkRepository } from "@/src/domain/repositories/BookmarkRepository";
import { getDatabase } from "@/src/data/database/connection/database";

export class SqliteBookmarkRepository implements BookmarkRepository {
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

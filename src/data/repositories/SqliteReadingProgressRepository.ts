import { ReadingProgress, ReadingProgressRepository } from "@/src/domain/repositories/ReadingProgressRepository";
import { getDatabase } from "@/src/data/database/connection/database";

export class SqliteReadingProgressRepository implements ReadingProgressRepository {
  async findByBookId(bookId: string): Promise<ReadingProgress | null> { const database = await getDatabase(); const row = await database.getFirstAsync<ProgressRow>("SELECT * FROM reading_progress WHERE book_id = ?", bookId); return row ? { id: row.id, bookId: row.book_id, currentChapterId: row.current_chapter_id, cfiPosition: row.cfi_position, percentage: row.percentage, pageNumber: row.page_number, updatedAt: row.updated_at } : null; }
  async save(progress: ReadingProgress): Promise<void> { const database = await getDatabase(); await database.runAsync("INSERT INTO reading_progress (id, book_id, current_chapter_id, cfi_position, percentage, page_number, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(book_id) DO UPDATE SET current_chapter_id = excluded.current_chapter_id, cfi_position = excluded.cfi_position, percentage = excluded.percentage, page_number = excluded.page_number, updated_at = excluded.updated_at", progress.id, progress.bookId, progress.currentChapterId, progress.cfiPosition, Math.min(1, Math.max(0, progress.percentage)), progress.pageNumber, progress.updatedAt); }
}
interface ProgressRow { id: string; book_id: string; current_chapter_id: string | null; cfi_position: string | null; percentage: number; page_number: number; updated_at: number; }

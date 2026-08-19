import { Highlight, HighlightRepository } from "@/src/domain/repositories/HighlightRepository";
import { getDatabase } from "@/src/data/database/connection/database";

export class SqliteHighlightRepository implements HighlightRepository {
  async listByBookId(bookId: string): Promise<Highlight[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<HighlightRow>("SELECT * FROM highlights WHERE book_id = ? ORDER BY created_at DESC", bookId);
    return rows.map((row) => ({ id: row.id, bookId: row.book_id, chapterId: row.chapter_id, startCfi: row.start_cfi, endCfi: row.end_cfi, highlightedText: row.highlighted_text, colorLabel: row.color_label as Highlight["colorLabel"], createdAt: row.created_at }));
  }
  async save(highlight: Highlight): Promise<void> {
    const database = await getDatabase();
    await database.runAsync("INSERT OR REPLACE INTO highlights (id, book_id, chapter_id, start_cfi, end_cfi, highlighted_text, color_label, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", highlight.id, highlight.bookId, highlight.chapterId, highlight.startCfi, highlight.endCfi, highlight.highlightedText, highlight.colorLabel, highlight.createdAt);
  }
  async remove(highlightId: string): Promise<void> { const database = await getDatabase(); await database.runAsync("DELETE FROM highlights WHERE id = ?", highlightId); }
}
interface HighlightRow { id: string; book_id: string; chapter_id: string; start_cfi: string; end_cfi: string; highlighted_text: string; color_label: string; created_at: number; }

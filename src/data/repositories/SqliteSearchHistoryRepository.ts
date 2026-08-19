import { getDatabase } from "@/src/data/database/connection/database";
import { SearchHistoryRepository } from "@/src/domain/repositories/SearchHistoryRepository";
import { SearchHistory } from "@/src/domain/types/search";

export class SqliteSearchHistoryRepository implements SearchHistoryRepository {
  async list(limit = 20): Promise<SearchHistory[]> { const database = await getDatabase(); const rows = await database.getAllAsync<SearchHistoryRow>("SELECT * FROM web_search_history ORDER BY searched_at DESC LIMIT ?", Math.max(1, Math.min(100, limit))); return rows.map((row) => ({ id: row.id, query: row.query, resultsCount: row.results_count, searchedAt: row.searched_at })); }
  async save(history: SearchHistory): Promise<void> { const database = await getDatabase(); await database.runAsync("INSERT INTO web_search_history (id, query, results_count, searched_at) VALUES (?, ?, ?, ?)", history.id, history.query, history.resultsCount, history.searchedAt); }
}
interface SearchHistoryRow { id: string; query: string; results_count: number; searched_at: number; }

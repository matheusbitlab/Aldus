import { SearchHistory } from "@/src/domain/types/search";
export interface SearchHistoryRepository { list(limit?: number): Promise<SearchHistory[]>; save(history: SearchHistory): Promise<void>; }

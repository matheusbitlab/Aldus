export interface ReadingProgress {
  id: string;
  bookId: string;
  currentChapterId: string | null;
  cfiPosition: string | null;
  percentage: number;
  pageNumber: number;
  updatedAt: number;
}

export interface ReadingProgressRepository {
  findByBookId(bookId: string): Promise<ReadingProgress | null>;
  save(progress: ReadingProgress): Promise<void>;
}

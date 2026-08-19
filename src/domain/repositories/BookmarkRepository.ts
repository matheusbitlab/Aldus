export interface Bookmark { id: string; bookId: string; chapterId: string; cfiPosition: string | null; textPreview: string; note: string | null; createdAt: number; }
export interface BookmarkRepository { listByBookId(bookId: string): Promise<Bookmark[]>; save(bookmark: Bookmark): Promise<void>; remove(bookmarkId: string): Promise<void>; }

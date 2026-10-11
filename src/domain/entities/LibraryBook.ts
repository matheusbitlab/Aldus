export interface LibraryBook {
  /** Missing/null means preserved legacy local data, never silently claimed. */
  ownerUserId?: string | null;
  bundledAssetId?: string;
  importComplete?: boolean;
  id: string;
  title: string;
  author: string;
  fileName: string;
  filePath: string;
  fileHash: string | null;
  mimeType: string;
  fileSize: number;
  coverImagePath: string | null;
  totalChapters: number;
  totalWords: number;
  addedDate: number;
  lastOpenedDate: number | null;
  isDeleted: boolean;
  progress: number;
}

export interface StoredChapter {
  id: string;
  bookId: string;
  chapterIndex: number;
  title: string;
  startCfi: string | null;
  endCfi: string | null;
  characterCount: number;
  html: string;
}

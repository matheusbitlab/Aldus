export type HighlightColor = "yellow" | "green" | "blue" | "pink" | "purple";
export interface Highlight { id: string; bookId: string; chapterId: string; startCfi: string; endCfi: string; highlightedText: string; colorLabel: HighlightColor; createdAt: number; }
export interface HighlightRepository { listByBookId(bookId: string): Promise<Highlight[]>; save(highlight: Highlight): Promise<void>; remove(highlightId: string): Promise<void>; }

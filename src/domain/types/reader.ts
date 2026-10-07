export type ReaderTheme = "light" | "dark" | "sepia" | "paper" | "black";
export type ReaderFont = "serif" | "sans" | "dyslexic";
export type ReaderMargin = "small" | "medium" | "large";

export interface Chapter {
  id: string;
  title: string;
  html: string;
  characterCount: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  chapters: Chapter[];
}

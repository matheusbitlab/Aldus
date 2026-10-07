import { StoredChapter } from "@/src/domain/entities/LibraryBook";
import { FlashcardGenerationCandidate, FlashcardGenerationOptions } from "@/src/domain/types/flashcards";
import { difficultyForIndex, } from "@/src/domain/study/flashcardSrs";

/**
 * Deterministic local generation for the first integration stage. It creates
 * editable candidates from real chapter text and never claims to be AI.
 */
export function generateLocalFlashcardCandidates(
  chapters: StoredChapter[],
  options: FlashcardGenerationOptions,
): FlashcardGenerationCandidate[] {
  const selected = chapters.filter(chapter => !options.chapterIds?.length || options.chapterIds.includes(chapter.id));
  const candidates: FlashcardGenerationCandidate[] = [];
  for (const chapter of selected) {
    const text = chapter.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const sentences = text.split(/(?<=[.!?])\s+/).map(value => value.trim()).filter(value => value.length >= 60);
    for (const sentence of sentences) {
      if (candidates.length >= options.maxCards) return candidates;
      const quote = sentence.slice(0, 500);
      candidates.push({
        front: `Qual é a ideia principal deste trecho de ${chapter.title || "capítulo"}?`,
        back: quote,
        difficulty: difficultyForIndex(candidates.length),
        source: { kind: "book-chapter", bookId: options.bookId, chapterId: chapter.id, chapterTitle: chapter.title, quote, prefix: null, suffix: null, sourcePage: null },
      });
    }
  }
  return candidates;
}

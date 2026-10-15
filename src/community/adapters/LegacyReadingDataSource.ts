import type { BookRepository } from "@/src/domain/repositories/BookRepository";
import type { ReadingProgressRepository } from "@/src/domain/repositories/ReadingProgressRepository";
import { applyBookOrganization, inferredReadingStatus, type LibraryOrganizationRepository } from "@/src/domain/types/libraryOrganization";
import type { CommunityReadingDataSource } from "../domain/ports";
import type { ReadingSnapshot } from "../domain/models";

/** Reads existing repositories only. No library/Reader writes and no account attribution. */
export class LegacyReadingDataSource implements CommunityReadingDataSource {
  constructor(private readonly books: BookRepository, private readonly progress: ReadingProgressRepository, private readonly organization: LibraryOrganizationRepository) {}
  async getSnapshot(_userId: string): Promise<ReadingSnapshot> {
    const [books, records] = await Promise.all([this.books.listActive(), this.organization.list()]);
    const result = await Promise.all(books.filter(b => !b.isDeleted).map(async original => {
      const saved = await this.progress.findByBookId(original.id);
      const percentage = saved?.percentage ?? original.progress;
      const reliable = Number.isFinite(percentage) && percentage >= 0 && percentage <= 1 ? percentage : null;
      if (reliable === null) throw Error("Progresso inválido na biblioteca. As métricas não foram calculadas.");
      const book = applyBookOrganization({ ...original, progress: reliable ?? 0 }, records[original.id]);
      return { id: book.id, title: book.title, author: book.author,
        status: inferredReadingStatus(book, records[original.id]), progress: reliable,
        // Tags/collections are not genres; updatedAt/lastOpenedDate are not session/completion dates.
        genres: null, startedAt: null, completedAt: null, pagesRead: null, readingSeconds: null };
    }));
    return { scope: "device", userId: null, books: result, history: [], readingDays: null,
      availableMetrics: { completionDates: false, pagesRead: false, readingSeconds: false, genres: false } };
  }
}

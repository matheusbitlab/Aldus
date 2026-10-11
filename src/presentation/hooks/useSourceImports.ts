import { useCallback, useEffect, useRef, useState } from "react";
import { sourceCatalogs } from "@/src/data/sources/sourceCatalogDependencies";
import { appDependencies } from "@/src/presentation/services/dependencies";
import { useDownloadStore } from "@/src/presentation/stores/downloadStore";

export function useSourceImports(sourceId: string) {
  const [imported, setImported] = useState<Record<string, string>>({}), [error, setError] = useState<string | null>(null);
  const revision = useRef(0), activeSource = useRef(sourceId);
  activeSource.current = sourceId;
  const jobs = useDownloadStore(state => state.jobs);
  const completed = Object.values(jobs).filter(job => job.source?.sourceId === sourceId && job.status === "completed").map(job => `${job.operationId}:${job.sourceLinkStatus}`).join("|");
  const reload = useCallback(async () => {
    const run = ++revision.current;
    try {
      const [links, books] = await Promise.all([sourceCatalogs.links(sourceId), appDependencies.bookRepository.listActive()]);
      const active = new Set(books.map(book => book.id));
      if (activeSource.current !== sourceId || revision.current !== run) return;
      setImported(Object.fromEntries(links.filter(link => active.has(link.bookId)).map(link => [link.remoteBookId, link.bookId])));
      setError(null);
    } catch { if (activeSource.current === sourceId && revision.current === run) setError("Não foi possível conferir os vínculos com a Biblioteca. Abra os livros importados pela Biblioteca pessoal."); }
  }, [sourceId]);
  useEffect(() => { void reload(); return () => { revision.current++; }; }, [reload, completed]);
  useEffect(() => { setImported({}); }, [sourceId]);
  return { imported, error, reload };
}

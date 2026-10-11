import { useCallback, useEffect, useSyncExternalStore } from "react";
import { UserSource } from "@/src/domain/types/sources";
import { sourceCatalogs } from "@/src/data/sources/sourceCatalogDependencies";

export function useSourceCatalog(source: UserSource) {
  const snapshot = useCallback(() => sourceCatalogs.view(source.id), [source.id]);
  const view = useSyncExternalStore(sourceCatalogs.subscribe, snapshot, snapshot);
  useEffect(() => { void sourceCatalogs.load(source); }, [source]);
  return view;
}

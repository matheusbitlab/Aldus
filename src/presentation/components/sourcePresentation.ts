import { useSyncExternalStore } from 'react';
import { libraryAccountScope } from '@/src/data/library/LibraryAccountScope';
import type { SourceOperationProgress } from '@/src/domain/types/sourceCatalog';
import type { UserSource } from '@/src/domain/types/sources';
const subscribe = (listener: () => void) => libraryAccountScope.subscribe(listener);
const account = () => libraryAccountScope.userId;
const generation = () => libraryAccountScope.generation;
export const useSourceAccountId = () => useSyncExternalStore(subscribe, account, account);
export const useSourceAccountGeneration = () => useSyncExternalStore(subscribe, generation, generation);
export const sourceVisibleInAccount = (source: UserSource, accountId: string | null) => (source.ownerId ?? null) === accountId;
export const sourceLibraryTypeLabel = (kind: UserSource['kind']) => kind === 'google-drive' ? 'Google Drive' : kind === 'json' ? 'Biblioteca por link' : 'Catálogo de pesquisa';
export function sourceProgressLabel(progress: SourceOperationProgress | null | undefined): string | null {
  if (!progress) return null;
  return ({ preparing: 'Preparando conexão…', authorizing: 'Aguardando autorização do Google…', verifying: 'Verificando a pasta…', indexing: 'Buscando livros…', organizing: 'Organizando a biblioteca…', saving: 'Salvando biblioteca…', success: 'Operação concluída.', error: 'A operação não foi concluída.', cancelled: 'Operação cancelada. Seus dados foram preservados.' })[progress.phase];
}
export function sourceProgressCounts(progress: SourceOperationProgress | null | undefined): string | null {
  if (!progress) return null;
  const values: string[] = [];
  if (typeof progress.booksFound === 'number') values.push(`${progress.booksFound.toLocaleString('pt-BR')} ${progress.booksFound === 1 ? 'livro encontrado' : 'livros encontrados'}`);
  if (typeof progress.foldersScanned === 'number') values.push(`${progress.foldersScanned.toLocaleString('pt-BR')} ${progress.foldersScanned === 1 ? 'pasta consultada' : 'pastas consultadas'}`);
  return values.length ? values.join(' · ') : null;
}

import entries from './bundledBookManifest.json';
import legacyEntries from './legacyBundledAssets.json';

/**
 * Acervo embutido ATIVO: só obras em domínio público declaradas em `bundledCatalog.ts`.
 * Apenas estes arquivos são registrados em contas e instalações novas.
 */
export const bundledBookManifest = entries;

/**
 * Acervo LEGADO (revisão de direitos autorais; porta do 21f595f, etapa 1 de 3 em 06/11/2026).
 * Estes 33 títulos já foram distribuídos e continuam no pacote só para que contas existentes
 * não percam acesso: não são registrados em contas novas, mas registros `bundled-*` antigos
 * seguem resolvendo arquivo, Sync e réplica normalmente. Etapa 2 (pendente) migra cada registro
 * para cópia própria do usuário; só a etapa 3 remove os arquivos. Nunca apague entradas daqui.
 */
export const legacyBundledAssets = legacyEntries;

/** Último recurso para quando o arquivo legado deixar de existir e não houver cópia local nem na nuvem. */
export const LEGACY_BUNDLED_UNAVAILABLE_MESSAGE =
  'Este título saiu do acervo incluído no Aldus e a cópia desta conta não foi encontrada neste dispositivo. Importe uma edição própria para continuar lendo.';

function baseId(id: string) {
  return id.split('--')[0];
}

const matches = (base: string) => (entry: { id: string; legacyId: string }) => entry.id === base || entry.legacyId === base;

/** Identidade de conteúdo embutido, ativo ou legado (registros existentes continuam reconhecidos). */
export function findBundledAsset(id: string) {
  const base = baseId(id);
  return entries.find(matches(base)) ?? legacyEntries.find(matches(base));
}

export function isLegacyBundledAsset(id: string | null | undefined): boolean {
  if (!id) return false;
  return legacyEntries.some(matches(baseId(id)));
}

/** Registro que ainda depende de um arquivo do acervo legado (sem cópia própria local ou na nuvem). */
export function isLegacyBundledBook(book: { id: string; bundledAssetId?: string | null; remotePath?: string | null; filePath?: string | null }): boolean {
  if (book.remotePath) return false;
  if (book.filePath && !book.filePath.startsWith('bundled-')) return false;
  return isLegacyBundledAsset(book.bundledAssetId) || isLegacyBundledAsset(book.id);
}

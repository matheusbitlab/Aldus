/**
 * @deprecated Compatibilidade de imports das telas. Catálogo ativo (domínio público, com fonte e licença):
 * `src/data/library/bundledCatalog.ts`. Metadados só de exibição do acervo legado (contas existentes):
 * `src/data/library/legacyBundledCatalog.ts`. Não use esta lista para registrar livros em contas novas.
 */
import { BUNDLED_BOOKS } from '@/src/data/library/bundledCatalog';
import { LEGACY_BUNDLED_BOOKS } from '@/src/data/library/legacyBundledCatalog';
import type { Book } from '@/src/data/library/bundledCatalog';

export { DEFAULT_COVER_PLACEHOLDER } from '@/src/data/library/bundledCatalog';
export type { Book } from '@/src/data/library/bundledCatalog';
export const MOCK_BOOKS: Book[] = [...BUNDLED_BOOKS, ...LEGACY_BUNDLED_BOOKS];

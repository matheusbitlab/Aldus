/**
 * Metadados do acervo incluído no aplicativo.
 *
 * Política (revisão de 23/10/2026): só entram obras **originalmente escritas em
 * português** por autores falecidos há mais de 70 anos (Lei 9.610/98, art. 41),
 * em transcrições sem tradução, notas, adaptação ou prefácio de terceiros.
 * Qualquer inclusão nova precisa registrar `source` e `license` e passar pelo
 * teste `scripts/test-bundled-catalog.cjs`.
 */
export interface BookCardModel {
  id: string;
  title: string;
  author: string;
  format: 'pdf' | 'epub';
  coverUri?: string;
  fileUri: string;
  progress: number;
  totalPages?: number;
  currentPage?: number;
}

export interface BundledBook extends BookCardModel {
  /** Ano de falecimento do autor: base do domínio público no Brasil. */
  authorDeathYear: number;
  firstPublished: number;
  source: string;
  license: string;
}

/** @deprecated Use `BookCardModel`. Mantido para compatibilidade de imports antigos. */
export type Book = BookCardModel;

export const DEFAULT_COVER_PLACEHOLDER = 'assets/covers/default.jpg';

const gutenberg = (id: number) => `Project Gutenberg #${id} (https://www.gutenberg.org/ebooks/${id})`;
const PD_BR = 'Domínio público no Brasil (autor falecido há mais de 70 anos; texto original em português, sem tradução).';

export const BUNDLED_BOOKS: BundledBook[] = [
  {
    id: 'bundled-memorias-postumas',
    title: 'Memórias Póstumas de Brás Cubas',
    author: 'Machado de Assis',
    format: 'pdf',
    coverUri: 'assets/covers/memorias-postumas.jpg',
    fileUri: 'Livros/memórias postumas.pdf',
    progress: 0,
    authorDeathYear: 1908,
    firstPublished: 1881,
    source: 'Texto-fonte: Obra Completa, Nova Aguilar, 1994 (texto integral, sem aparato editorial).',
    license: PD_BR,
  },
  {
    id: 'bundled-dom-casmurro',
    title: 'Dom Casmurro',
    author: 'Machado de Assis',
    format: 'epub',
    coverUri: 'assets/covers/machado-de-assis-dom-casmurro.jpg',
    fileUri: 'assets/Livros/machado-de-assis-dom-casmurro.epub',
    progress: 0,
    authorDeathYear: 1908,
    firstPublished: 1899,
    source: gutenberg(55752),
    license: PD_BR,
  },
  {
    id: 'bundled-quincas-borba',
    title: 'Quincas Borba',
    author: 'Machado de Assis',
    format: 'epub',
    coverUri: 'assets/covers/machado-de-assis-quincas-borba.jpg',
    fileUri: 'assets/Livros/machado-de-assis-quincas-borba.epub',
    progress: 0,
    authorDeathYear: 1908,
    firstPublished: 1891,
    source: gutenberg(55682),
    license: PD_BR,
  },
  {
    id: 'bundled-papeis-avulsos',
    title: 'Papéis Avulsos (inclui O Alienista)',
    author: 'Machado de Assis',
    format: 'epub',
    coverUri: 'assets/covers/machado-de-assis-papeis-avulsos.jpg',
    fileUri: 'assets/Livros/machado-de-assis-papeis-avulsos.epub',
    progress: 0,
    authorDeathYear: 1908,
    firstPublished: 1882,
    source: gutenberg(57001),
    license: PD_BR,
  },
  {
    id: 'bundled-esau-e-jaco',
    title: 'Esaú e Jacó',
    author: 'Machado de Assis',
    format: 'epub',
    coverUri: 'assets/covers/machado-de-assis-esau-e-jaco.jpg',
    fileUri: 'assets/Livros/machado-de-assis-esau-e-jaco.epub',
    progress: 0,
    authorDeathYear: 1908,
    firstPublished: 1904,
    source: gutenberg(56737),
    license: PD_BR,
  },
  {
    id: 'bundled-cinco-minutos',
    title: 'Cinco Minutos',
    author: 'José de Alencar',
    format: 'epub',
    coverUri: 'assets/covers/jose-de-alencar-cinco-minutos.jpg',
    fileUri: 'assets/Livros/jose-de-alencar-cinco-minutos.epub',
    progress: 0,
    authorDeathYear: 1877,
    firstPublished: 1856,
    source: gutenberg(44540),
    license: PD_BR,
  },
  {
    id: 'bundled-ubirajara',
    title: 'Ubirajara: Lenda Tupi',
    author: 'José de Alencar',
    format: 'epub',
    coverUri: 'assets/covers/jose-de-alencar-ubirajara.jpg',
    fileUri: 'assets/Livros/jose-de-alencar-ubirajara.epub',
    progress: 0,
    authorDeathYear: 1877,
    firstPublished: 1874,
    source: gutenberg(38496),
    license: PD_BR,
  },
];

const fileKey = (fileUri: string) => (fileUri.split(/[\\/]/).pop() ?? '').toLowerCase();

export function findBundledBookByFileName(fileName: string | null | undefined): BundledBook | undefined {
  if (!fileName) return undefined;
  const key = fileKey(fileName);
  return BUNDLED_BOOKS.find(book => fileKey(book.fileUri) === key);
}

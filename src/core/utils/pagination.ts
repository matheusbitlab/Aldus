export interface PaginationInput { totalCharacters: number; width: number; height: number; fontSize: number; lineHeight: number; margin: number; }

export function estimateCharactersPerPage(input: PaginationInput): number {
  if (input.totalCharacters <= 0 || input.width <= input.margin * 2 || input.height <= 0) return 1;
  const usableWidth = input.width - input.margin * 2;
  const usableHeight = input.height - 120;
  const charsPerLine = Math.max(1, Math.floor(usableWidth / Math.max(7, input.fontSize * 0.52)));
  const linesPerPage = Math.max(1, Math.floor(usableHeight / input.lineHeight));
  return charsPerLine * linesPerPage;
}

export function estimateTotalPages(totalCharacters: number, charactersPerPage: number): number {
  if (totalCharacters <= 0 || charactersPerPage <= 0) return 0;
  return Math.max(1, Math.ceil(totalCharacters / charactersPerPage));
}

export function estimatePageNumber(currentCharacterOffset: number, totalCharacters: number, totalPages: number): number {
  if (totalCharacters <= 0 || totalPages <= 0) return 0;
  const ratio = Math.min(1, Math.max(0, currentCharacterOffset / totalCharacters));
  return Math.max(1, Math.ceil(ratio * totalPages));
}

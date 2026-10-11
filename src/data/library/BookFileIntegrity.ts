import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { throwIfAborted } from '@/src/core/utils/cancellation';

export const BOOK_FILE_CHUNK = 1024 * 1024;
export const MAX_PRIVATE_BOOK_SIZE = 512 * 1024 * 1024;

/** Bounded reads: no extra full-file copy just to calculate a checksum. */
export async function hashBookFile(size: number, read: (offset: number, length: number) => Promise<Uint8Array>, signal?: AbortSignal) {
  if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_PRIVATE_BOOK_SIZE) throw new Error('Arquivo vazio ou maior que o limite de 512 MiB.');
  const digest = sha256.create();
  for (let offset = 0; offset < size; offset += BOOK_FILE_CHUNK) {
    throwIfAborted(signal);
    const length = Math.min(BOOK_FILE_CHUNK, size - offset);
    const bytes = await read(offset, length);
    if (bytes.length !== length) throw new Error('Arquivo incompleto. Tente baixar novamente.');
    digest.update(bytes);
    // Let Native handle cancellation and rendering between chunks.
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  }
  throwIfAborted(signal);
  return bytesToHex(digest.digest());
}

export function privateBookPath(owner: string, bookId: string, hash: string, format: 'epub' | 'pdf') {
  if (!/^[a-f0-9-]{36}$/.test(owner) || !bookId || bookId.length > 200 || /[/\\]/.test(bookId)
    || ['.','..','__proto__','constructor','prototype'].includes(bookId) || !/^[a-f0-9]{64}$/.test(hash)) throw new Error('Identidade do arquivo privado inválida.');
  return `${owner}/${bookId}/${hash}.${format}`;
}

import { uuid } from 'expo-modules-core';

/** Existing Expo Core uses java.util.UUID.randomUUID (SecureRandom). No Math.random fallback. */
export function installNativeAuthRandom(): void {
  if (typeof globalThis.crypto?.getRandomValues === 'function') return;
  const secure = globalThis.crypto ?? {} as Crypto;
  secure.getRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
    if (!array || !ArrayBuffer.isView(array) || !('BYTES_PER_ELEMENT' in array)
      || array instanceof Float32Array || array instanceof Float64Array) throw new TypeError('Expected an integer typed array.');
    if (array.byteLength > 65536) throw new Error('Random byte request exceeds the secure limit.');
    const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
    let cursor = 0;
    while (cursor < bytes.length) {
      const value = uuid.v4();
      if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)) throw new Error('Secure random source unavailable.');
      const hex = value.replaceAll('-', '');
      for (let index = 0; index < 16 && cursor < bytes.length; index++) {
        // Discard the two bytes with UUID version/variant bits; all retained bytes are random.
        if (index !== 6 && index !== 8) bytes[cursor++] = parseInt(hex.slice(index * 2, index * 2 + 2), 16);
      }
    }
    return array;
  };
  if (!globalThis.crypto) Object.defineProperty(globalThis, 'crypto', { value: secure, configurable: true });
  // Do not pretend to implement SubtleCrypto: JWT verification must retain its server fallback.
}

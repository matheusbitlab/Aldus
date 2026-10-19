import { sha256 } from '@noble/hashes/sha2.js';

/** Convert the installed SDK's Native plain fallback to S256, retaining its stored verifier/flow ID. */
export function hardenPkceParameters(parameters: URLSearchParams): void {
  if (parameters.get('code_challenge_method') !== 'plain') return;
  const verifier = parameters.get('code_challenge') ?? '';
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) throw new Error('Não foi possível preparar a autenticação segura.');
  const digest = sha256(Uint8Array.from(verifier, character => character.charCodeAt(0)));
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let encoded = '', accumulator = 0, bits = 0;
  for (const byte of digest) {
    accumulator = (accumulator << 8) | byte; bits += 8;
    while (bits >= 6) { bits -= 6; encoded += alphabet[(accumulator >>> bits) & 63]; }
  }
  if (bits) encoded += alphabet[(accumulator << (6 - bits)) & 63];
  parameters.set('code_challenge', encoded);
  parameters.set('code_challenge_method', 's256');
}

/** Native Auth POSTs (signup/recovery/OTP) use the same SDK verifier and need the same S256 boundary. */
export function nativeAuthFetch(projectUrl: string, request: typeof fetch): typeof fetch {
  const origin = new URL(projectUrl).origin;
  return (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    if (url.origin === origin && ['/auth/v1/signup', '/auth/v1/recover', '/auth/v1/otp'].includes(url.pathname)
      && init?.method?.toUpperCase() === 'POST' && typeof init.body === 'string') {
      const body = JSON.parse(init.body) as Record<string, unknown>;
      if (body.code_challenge_method === 'plain') {
        const parameters = new URLSearchParams({ code_challenge: String(body.code_challenge ?? ''), code_challenge_method: 'plain' });
        hardenPkceParameters(parameters);
        return request(input, { ...init, body: JSON.stringify({ ...body, code_challenge: parameters.get('code_challenge'), code_challenge_method: 's256' }) });
      }
    }
    return request(input, init);
  };
}

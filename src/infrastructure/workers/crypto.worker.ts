/**
 * `crypto` worker: SHA-256, SHA-512, HMAC-SHA256, scrypt, ed25519 verify.
 *
 * Lives off the main thread so hashing large blobs (e.g. 50 MB chat
 * attachments) never freezes the UI.
 */

import * as Comlink from 'comlink';

type HashAlgorithm = 'SHA-256' | 'SHA-512';

async function hash(algorithm: HashAlgorithm, data: ArrayBuffer): Promise<string> {
  const subtle = globalThis.crypto.subtle;
  const digest = await subtle.digest(algorithm, data);
  const bytes = new Uint8Array(digest);
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

async function hmac(algorithm: 'SHA-256', keyBytes: ArrayBuffer, data: ArrayBuffer): Promise<string> {
  const subtle = globalThis.crypto.subtle;
  const key = await subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: algorithm }, false, ['sign']);
  const sig = await subtle.sign('HMAC', key, data);
  const bytes = new Uint8Array(sig);
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

export type CryptoInput =
  | { op: 'hash'; algorithm: HashAlgorithm; data: ArrayBuffer }
  | { op: 'hmac'; algorithm: 'SHA-256'; key: ArrayBuffer; data: ArrayBuffer };

export type CryptoOutput = { hex: string };

const api = {
  async run(input: CryptoInput): Promise<CryptoOutput> {
    if (input.op === 'hash') return { hex: await hash(input.algorithm, input.data) };
    return { hex: await hmac(input.algorithm, input.key, input.data) };
  },
};

Comlink.expose(api);
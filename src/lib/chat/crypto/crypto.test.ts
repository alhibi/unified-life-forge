/**
 * End-to-end encryption tests.
 *
 * These exercise the real WebCrypto implementation (Node exposes the same
 * `crypto.subtle`), not a mock — the point of the suite is to prove that two
 * independently generated identities agree on a key, that tampering is detected,
 * and that the envelope format survives a round trip. A mocked cipher would
 * prove none of that.
 */
import { describe, expect, it } from 'vitest';

import { decryptText, encryptText } from './cipher';
import {
  decodeEnvelope,
  encodeEnvelope,
  ENVELOPE_PREFIX,
  fromBase64Url,
  fromUtf8,
  isEncrypted,
  IV_LENGTH,
  messageAad,
  toBase64Url,
  utf8,
} from './envelope';
import { CURVE, deriveConversationKey, safetyNumber } from './keys';

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
const CHAT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

async function generatePair(): Promise<CryptoKeyPair> {
  return (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: CURVE }, false, [
    'deriveBits',
  ])) as CryptoKeyPair;
}

async function exportRaw(key: CryptoKey): Promise<string> {
  return toBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', key)));
}

describe('base64url', () => {
  it('round-trips arbitrary bytes', () => {
    for (const length of [0, 1, 2, 3, 4, 5, 16, 31, 32, 255]) {
      const bytes = new Uint8Array(length);
      crypto.getRandomValues(bytes);
      expect(Array.from(fromBase64Url(toBase64Url(bytes)))).toEqual(Array.from(bytes));
    }
  });

  it('never emits characters that would break the envelope', () => {
    const bytes = new Uint8Array(256);
    for (let i = 0; i < 256; i += 1) bytes[i] = i;
    const encoded = toBase64Url(bytes);
    expect(encoded).not.toMatch(/[+/=.]/);
  });

  it('rejects invalid input rather than decoding garbage', () => {
    expect(() => fromBase64Url('abc!')).toThrow();
    expect(() => fromBase64Url('ab=cd')).toThrow();
  });
});

describe('envelope', () => {
  it('detects encrypted bodies', () => {
    expect(isEncrypted(`${ENVELOPE_PREFIX}aa.bb`)).toBe(true);
    expect(isEncrypted('مرحبا')).toBe(false);
    expect(isEncrypted(null)).toBe(false);
    expect(isEncrypted(undefined)).toBe(false);
    // A plaintext message that merely mentions the prefix must not be mistaken
    // for an envelope unless it actually starts with it.
    expect(isEncrypted(`talking about ${ENVELOPE_PREFIX}`)).toBe(false);
  });

  it('round-trips', () => {
    const iv = new Uint8Array(IV_LENGTH);
    crypto.getRandomValues(iv);
    const ciphertext = new Uint8Array(48);
    crypto.getRandomValues(ciphertext);
    const encoded = encodeEnvelope({ iv, ciphertext });
    const decoded = decodeEnvelope(encoded);
    expect(decoded).not.toBeNull();
    expect(Array.from(decoded!.iv)).toEqual(Array.from(iv));
    expect(Array.from(decoded!.ciphertext)).toEqual(Array.from(ciphertext));
  });

  it('refuses a malformed iv length', () => {
    expect(() => encodeEnvelope({ iv: new Uint8Array(8), ciphertext: new Uint8Array(4) })).toThrow();
    expect(() => encodeEnvelope({ iv: new Uint8Array(IV_LENGTH), ciphertext: new Uint8Array(0) })).toThrow();
  });

  it('returns null for anything that is not a valid envelope', () => {
    expect(decodeEnvelope('plain text')).toBeNull();
    expect(decodeEnvelope(`${ENVELOPE_PREFIX}only-one-part`)).toBeNull();
    expect(decodeEnvelope(`${ENVELOPE_PREFIX}aa.bb.cc`)).toBeNull();
    expect(decodeEnvelope(`${ENVELOPE_PREFIX}!!!.###`)).toBeNull();
  });

  it('encodes utf-8 including Arabic and emoji', () => {
    const text = 'السلام عليكم 🌙 — كيف حالك؟';
    expect(fromUtf8(utf8(text))).toBe(text);
  });
});

describe('key agreement', () => {
  it('two independent identities derive the same key', async () => {
    const alice = await generatePair();
    const bob = await generatePair();

    const aliceKey = await deriveConversationKey(alice.privateKey, bob.publicKey, ALICE, BOB);
    const bobKey = await deriveConversationKey(bob.privateKey, alice.publicKey, BOB, ALICE);

    const aad = messageAad(CHAT, ALICE);
    const envelope = await encryptText(aliceKey, 'اجتماع الساعة ٧', aad);
    // Bob, holding only his own private key and Alice's public key, can read it.
    expect(await decryptText(bobKey, envelope, aad)).toBe('اجتماع الساعة ٧');
  });

  it('is bound to the pair of accounts', async () => {
    const alice = await generatePair();
    const bob = await generatePair();

    const correct = await deriveConversationKey(alice.privateKey, bob.publicKey, ALICE, BOB);
    // Same key material, different account ids in the HKDF salt.
    const mislabelled = await deriveConversationKey(alice.privateKey, bob.publicKey, ALICE, CHAT);

    const aad = messageAad(CHAT, ALICE);
    const envelope = await encryptText(correct, 'secret', aad);
    expect(await decryptText(mislabelled, envelope, aad)).toBeNull();
  });

  it('a third party cannot read the message', async () => {
    const alice = await generatePair();
    const bob = await generatePair();
    const eve = await generatePair();

    const aliceKey = await deriveConversationKey(alice.privateKey, bob.publicKey, ALICE, BOB);
    const eveKey = await deriveConversationKey(eve.privateKey, alice.publicKey, BOB, ALICE);

    const aad = messageAad(CHAT, ALICE);
    const envelope = await encryptText(aliceKey, 'secret', aad);
    expect(await decryptText(eveKey, envelope, aad)).toBeNull();
  });
});

describe('cipher', () => {
  async function testKey(): Promise<CryptoKey> {
    const alice = await generatePair();
    const bob = await generatePair();
    return deriveConversationKey(alice.privateKey, bob.publicKey, ALICE, BOB);
  }

  it('produces a different ciphertext every time', async () => {
    const key = await testKey();
    const aad = messageAad(CHAT, ALICE);
    const a = await encryptText(key, 'same text', aad);
    const b = await encryptText(key, 'same text', aad);
    // Random IV per message: identical plaintexts must not produce identical
    // ciphertexts, otherwise message repetition leaks.
    expect(a).not.toBe(b);
    expect(await decryptText(key, a, aad)).toBe('same text');
    expect(await decryptText(key, b, aad)).toBe('same text');
  });

  it('detects a tampered ciphertext', async () => {
    const key = await testKey();
    const aad = messageAad(CHAT, ALICE);
    const envelope = await encryptText(key, 'transfer 100', aad);
    const decoded = decodeEnvelope(envelope)!;
    decoded.ciphertext[0] ^= 0xff;
    expect(await decryptText(key, encodeEnvelope(decoded), aad)).toBeNull();
  });

  it('rejects a message replayed into another chat', async () => {
    const key = await testKey();
    const envelope = await encryptText(key, 'hello', messageAad(CHAT, ALICE));
    // The AAD binds the ciphertext to (chat, sender); a server moving the row to
    // another chat makes it undecryptable rather than silently re-attributed.
    expect(await decryptText(key, envelope, messageAad('other-chat', ALICE))).toBeNull();
    expect(await decryptText(key, envelope, messageAad(CHAT, BOB))).toBeNull();
  });

  it('handles long and empty payloads', async () => {
    const key = await testKey();
    const aad = messageAad(CHAT, ALICE);
    const long = 'ن'.repeat(4000);
    expect(await decryptText(key, await encryptText(key, long, aad), aad)).toBe(long);
    expect(await decryptText(key, await encryptText(key, '', aad), aad)).toBe('');
  });

  it('returns null for plaintext instead of throwing', async () => {
    const key = await testKey();
    expect(await decryptText(key, 'not an envelope', messageAad(CHAT, ALICE))).toBeNull();
  });
});

describe('safety number', () => {
  it('is identical for both participants regardless of argument order', async () => {
    const alice = await generatePair();
    const bob = await generatePair();
    const a = await exportRaw(alice.publicKey);
    const b = await exportRaw(bob.publicKey);
    expect(await safetyNumber(a, b)).toBe(await safetyNumber(b, a));
  });

  it('changes when either key changes', async () => {
    const alice = await generatePair();
    const bob = await generatePair();
    const eve = await generatePair();
    const a = await exportRaw(alice.publicKey);
    const b = await exportRaw(bob.publicKey);
    const e = await exportRaw(eve.publicKey);
    expect(await safetyNumber(a, b)).not.toBe(await safetyNumber(a, e));
  });

  it('is formatted as eight five-digit groups', async () => {
    const alice = await generatePair();
    const bob = await generatePair();
    const value = await safetyNumber(await exportRaw(alice.publicKey), await exportRaw(bob.publicKey));
    expect(value).toMatch(/^(\d{5} ){7}\d{5}$/);
  });
});

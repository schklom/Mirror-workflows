// Crypto functions for FMD Server Protocol v2

import {
  AES_IV_SIZE_BYTES,
  AES_KEY_SIZE_BYTES,
  AES_TAG_SIZE_BYTES,
  base64Decode,
  base64Encode,
} from './crypto';

// ------- Constants / Types -------

const enc = new TextEncoder();

export type DataBlobType = 'command' | 'location' | 'picture';

// Contexts for key schedule
export const CTX_PASSWORD = enc.encode('fmd_v2_password');
const CTX_AUTH = enc.encode('fmd_v2_auth');
const CTX_PREMASTER = enc.encode('fmd_v2_premaster');
const CTX_MASTER = enc.encode('fmd_v2_master');

// Contexts for main KEKs
const CTX_KEK_CMD = enc.encode('fmd_v2_kek_command');
const CTX_KEK_LOC = enc.encode('fmd_v2_kek_location');
const CTX_KEK_PIC = enc.encode('fmd_v2_kek_picture');

// Contexts for data encryption
const CTX_DEK = enc.encode('fmd_v2_dek_'); // location, ...
const CTX_DATA = enc.encode('fmd_v2_data_'); // location, ...

const CLIENT_ITEM_ID_SIZE_BYTES = 16; // 128 bit

// ------- Helpers -------

export async function hash(
  data: Uint8Array<ArrayBuffer> | ArrayBuffer
): Promise<Uint8Array<ArrayBuffer>> {
  // `crypto.subtle` instead of `window.crypto.subtle`, because `window` is not
  // available in Web Workers, where hash() must be callable.
  // For consistency (and shortness), drop the `window` everywhere.
  const hash = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hash);
}

/**
 * Encodes a 64-bit number (long) into an 8-byte array using big endian byte order.
 */
function numberToBytes(num: number, size = 8): Uint8Array {
  const arr = new Uint8Array(size);
  const view = new DataView(arr.buffer);
  view.setBigUint64(0, BigInt(num), false); // big-endian
  return arr;
}

async function hkdfDeriveBits(ikm: CryptoKey, info: Uint8Array<ArrayBuffer>): Promise<ArrayBuffer> {
  const algorithm: HkdfParams = {
    name: 'HKDF',
    hash: 'SHA-256',
    info: info,
    salt: new Uint8Array(),
  };
  const lengthBits = 256;
  return await crypto.subtle.deriveBits(algorithm, ikm, lengthBits);
}

// A CryptoKey can either be an AES key or an HKDF key, but not both.
// Therefore, we need separate import functions.

async function importBytesAesKey(
  keyBytes: Uint8Array<ArrayBuffer> | ArrayBuffer
): Promise<CryptoKey> {
  return await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
}

async function importBytesHkdfKey(
  keyBytes: Uint8Array<ArrayBuffer> | ArrayBuffer
): Promise<CryptoKey> {
  return await crypto.subtle.importKey('raw', keyBytes, 'HKDF', false, ['deriveBits', 'deriveKey']);
}

// ------- Functions -------

/**
 * HKDF-derives the auth key and the pre master key from the password key.
 *
 * @returns [auth key bytes, pre master key]
 */
export async function deriveAuthKeyAndPreMasterKey(
  username: string,
  passwordKeyBytes: ArrayBuffer
): Promise<[Uint8Array<ArrayBuffer>, CryptoKey]> {
  const usernameHash = await hash(enc.encode(username));
  const passwordKey = await importBytesHkdfKey(passwordKeyBytes);

  const infoAuth = new Uint8Array([...CTX_AUTH, ...usernameHash]);
  const authKeyBytes = await hkdfDeriveBits(passwordKey, infoAuth);

  const infoPreMaster = new Uint8Array([...CTX_PREMASTER, ...usernameHash]);
  const preMasterKeyBytes = await hkdfDeriveBits(passwordKey, infoPreMaster);
  const preMasterKey = await importBytesAesKey(preMasterKeyBytes);

  return [new Uint8Array(authKeyBytes), preMasterKey];
}

/**
 * Decrypts the encrypted master key blob.
 *
 * @returns [master key, its fingerprint]
 */
export async function decryptMasterKey(
  username: string,
  preMasterKey: CryptoKey,
  encMasterKey64: string
): Promise<[CryptoKey, string]> {
  const usernameHash = await hash(enc.encode(username));

  const encMasterKeyBytes = base64Decode(encMasterKey64);
  const iv = encMasterKeyBytes.subarray(0, AES_IV_SIZE_BYTES);
  const ciphertext = encMasterKeyBytes.subarray(AES_IV_SIZE_BYTES);

  const additionalData = new Uint8Array([...CTX_MASTER, ...usernameHash]);
  const algorithm: AesGcmParams = { name: 'AES-GCM', iv, additionalData };

  const masterKeyBytes = await crypto.subtle.decrypt(algorithm, preMasterKey, ciphertext);
  const masterKey = await importBytesHkdfKey(masterKeyBytes);
  const fingerprint = (await hash(masterKeyBytes)).toHex();

  return [masterKey, fingerprint];
}

/**
 * Derives the data-specific key encryption keys (KEKs) from the master key.
 *
 * @returns [cmd kek, location kek, picture kek]
 */
export async function deriveKeks(
  username: string,
  masterKey: CryptoKey
): Promise<[CryptoKey, CryptoKey, CryptoKey]> {
  const usernameHash = await hash(enc.encode(username));

  let info = new Uint8Array([...CTX_KEK_CMD, ...usernameHash]);
  const cmdKeyBytes = await hkdfDeriveBits(masterKey, info);
  const cmdKey = await importBytesAesKey(cmdKeyBytes);

  info = new Uint8Array([...CTX_KEK_LOC, ...usernameHash]);
  const locKeyBytes = await hkdfDeriveBits(masterKey, info);
  const locKey = await importBytesAesKey(locKeyBytes);

  info = new Uint8Array([...CTX_KEK_PIC, ...usernameHash]);
  const picKeyBytes = await hkdfDeriveBits(masterKey, info);
  const picKey = await importBytesAesKey(picKeyBytes);

  return [cmdKey, locKey, picKey];
}

export async function encryptDataV2(
  username: string,
  kek: CryptoKey,
  type: DataBlobType,
  data: Uint8Array<ArrayBuffer>
): Promise<[string, number, string]> {
  const usernameHash = await hash(enc.encode(username));

  const uniqueId = new Uint8Array(CLIENT_ITEM_ID_SIZE_BYTES);
  window.crypto.getRandomValues(uniqueId);
  const unixMillis = Date.now();

  const adSuffix = new Uint8Array([
    ...enc.encode(type),
    ...usernameHash,
    ...uniqueId,
    ...numberToBytes(unixMillis),
  ]);

  // Generate + encrypt the DEK
  const dekBytes = new Uint8Array(AES_KEY_SIZE_BYTES);
  crypto.getRandomValues(dekBytes);

  const ivDek = new Uint8Array(AES_IV_SIZE_BYTES);
  crypto.getRandomValues(ivDek);

  const adDek = new Uint8Array([...CTX_DEK, ...adSuffix]);
  const algoDek: AesGcmParams = { name: 'AES-GCM', iv: ivDek, additionalData: adDek };

  const encryptedDek = await crypto.subtle.encrypt(algoDek, kek, dekBytes);
  const dekKey = await importBytesAesKey(dekBytes);

  // Encrypt the data
  const ivData = new Uint8Array(AES_IV_SIZE_BYTES);
  crypto.getRandomValues(ivData);

  const adData = new Uint8Array([...CTX_DATA, ...adSuffix]);
  const algoData: AesGcmParams = { name: 'AES-GCM', iv: ivData, additionalData: adData };

  const encryptedData = await crypto.subtle.encrypt(algoData, dekKey, data);

  // Combine the result
  const ciphertextBytes = new Uint8Array([
    ...ivDek,
    ...new Uint8Array(encryptedDek),
    ...ivData,
    ...new Uint8Array(encryptedData),
  ]);
  const ciphertext64 = base64Encode(ciphertextBytes);

  return [uniqueId.toHex(), unixMillis, ciphertext64];
}

export async function decryptDataV2(
  username: string,
  kek: CryptoKey,
  type: DataBlobType,
  clientItemIdHex: string,
  unixMillis: number,
  ciphertext64: string
): Promise<Uint8Array<ArrayBuffer>> {
  const usernameHash = await hash(enc.encode(username));

  const uniqueId = Uint8Array.fromHex(clientItemIdHex);
  if (uniqueId.length != CLIENT_ITEM_ID_SIZE_BYTES) {
    throw new Error(`bad clientItemId length: ${uniqueId.length}`);
  }

  const adSuffix = new Uint8Array([
    ...enc.encode(type),
    ...usernameHash,
    ...uniqueId,
    ...numberToBytes(unixMillis),
  ]);

  const ciphertextBytes = base64Decode(ciphertext64);

  // Deconstruct ciphertext
  let start = 0;
  let end = start + AES_IV_SIZE_BYTES;
  const ivDek = ciphertextBytes.subarray(start, end);

  start = end;
  end += AES_KEY_SIZE_BYTES + AES_TAG_SIZE_BYTES;
  const encryptedDek = ciphertextBytes.subarray(start, end);

  start = end;
  end += AES_IV_SIZE_BYTES;
  const ivData = ciphertextBytes.subarray(start, end);

  start = end;
  const encryptedData = ciphertextBytes.subarray(start);

  // Decrypt the DEK
  const adDek = new Uint8Array([...CTX_DEK, ...adSuffix]);
  const algoDek: AesGcmParams = { name: 'AES-GCM', iv: ivDek, additionalData: adDek };

  const dekBytes = await crypto.subtle.decrypt(algoDek, kek, encryptedDek);
  const dekKey = await importBytesAesKey(dekBytes);

  // Decrypt the data
  const adData = new Uint8Array([...CTX_DATA, ...adSuffix]);
  const algoData: AesGcmParams = { name: 'AES-GCM', iv: ivData, additionalData: adData };

  const data = await crypto.subtle.decrypt(algoData, dekKey, encryptedData);

  return new Uint8Array(data);
}

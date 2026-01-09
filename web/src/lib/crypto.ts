import { argon2id } from '@noble/hashes/argon2.js';

const ARGON2_T = 1;
const ARGON2_P = 4;
const ARGON2_M = 131072;
const ARGON2_HASH_LENGTH = 32;
const ARGON2_SALT_LENGTH = 16;

const CONTEXT_STRING_ASYM_KEY_WRAP = 'context:asymmetricKeyWrap';
const CONTEXT_STRING_LOGIN = 'context:loginAuthentication';

const AES_GCM_IV_SIZE_BYTES = 12;

const RSA_KEY_SIZE_BYTES = 3072 / 8; // 384 bytes

const base64Decode = (encodedString: string) => {
  try {
    const cleaned = encodedString.trim().replace(/\s/g, '');
    return Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
  } catch {
    throw new Error('Invalid base64 string');
  }
};

const base64Encode = (bytesToEncode: Uint8Array) => {
  const binString = Array.from(bytesToEncode, (byte) =>
    String.fromCodePoint(byte)
  ).join('');
  return btoa(binString);
};

// Section: Password and hashing

export const hashPasswordForLogin = (password: string, salt: string) => {
  const saltBytes = base64Decode(salt);
  const contextPassword = CONTEXT_STRING_LOGIN + password;
  const passwordBytes = new TextEncoder().encode(contextPassword);

  const hash = argon2id(passwordBytes, saltBytes, {
    t: ARGON2_T,
    p: ARGON2_P,
    m: ARGON2_M,
    dkLen: ARGON2_HASH_LENGTH,
  });

  let hashBase64 = base64Encode(hash);
  // Remove base64 padding for Argon2 format
  while (hashBase64.endsWith('=')) {
    hashBase64 = hashBase64.slice(0, -1);
  }

  return `$argon2id$v=19$m=${ARGON2_M},t=${ARGON2_T},p=${ARGON2_P}$${salt}$${hashBase64}`;
};

const hashPasswordForKeyWrap = (password: string, salt: Uint8Array) => {
  const contextPassword = CONTEXT_STRING_ASYM_KEY_WRAP + password;
  const passwordBytes = new TextEncoder().encode(contextPassword);

  return argon2id(passwordBytes, salt, {
    t: ARGON2_T,
    p: ARGON2_P,
    m: ARGON2_M,
    dkLen: ARGON2_HASH_LENGTH,
  });
};

// Section: Asymmetric crypto

export const unwrapPrivateKey = async (password: string, keyData: string) => {
  const concatBytes = base64Decode(keyData);
  const saltBytes = concatBytes.slice(0, ARGON2_SALT_LENGTH);
  const ivBytes = concatBytes.slice(
    ARGON2_SALT_LENGTH,
    ARGON2_SALT_LENGTH + AES_GCM_IV_SIZE_BYTES
  );
  const wrappedKeyBytes = concatBytes.slice(
    ARGON2_SALT_LENGTH + AES_GCM_IV_SIZE_BYTES
  );

  const rawAesKey = hashPasswordForKeyWrap(password, saltBytes);

  const unwrappingCryptoKey = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(rawAesKey),
    'AES-GCM',
    false,
    ['decrypt']
  );

  const pemBytes = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    unwrappingCryptoKey,
    wrappedKeyBytes
  );

  let pemString = new TextDecoder().decode(pemBytes);
  pemString = pemString.replaceAll('-----BEGIN PRIVATE KEY-----', '');
  pemString = pemString.replaceAll('-----END PRIVATE KEY-----', '');
  pemString = pemString.replaceAll('\n', '');
  const binaryDer = base64Decode(pemString);

  const rsaEncKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false, // extractability
    ['decrypt'] // keyUsages
  );

  const rsaSigKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSA-PSS', hash: 'SHA-256' },
    false,
    ['sign']
  );

  return { rsaEncKey, rsaSigKey };
};

export const sign = async (rsaCryptoKey: CryptoKey, msg: string) => {
  const msgBytes = new TextEncoder().encode(msg);
  const pssParams = { name: 'RSA-PSS', saltLength: 32 };
  const sig = await crypto.subtle.sign(pssParams, rsaCryptoKey, msgBytes);
  const sigBytes = new Uint8Array(sig);
  return base64Encode(sigBytes);
};

// Section: Symmetric crypto

export const decryptData = async (
  rsaCryptoKey: CryptoKey,
  encryptedBase64: string
) => {
  try {
    // Hybrid encryption format:
    // [384 bytes: RSA-encrypted AES key][12 bytes: IV][remaining: AES-GCM encrypted data]
    const allBytes = base64Decode(encryptedBase64);

    const encryptedAesKeyBytes = allBytes.slice(0, RSA_KEY_SIZE_BYTES);
    const ivBytes = allBytes.slice(
      RSA_KEY_SIZE_BYTES,
      RSA_KEY_SIZE_BYTES + AES_GCM_IV_SIZE_BYTES
    );
    const encryptedDataBytes = allBytes.slice(
      RSA_KEY_SIZE_BYTES + AES_GCM_IV_SIZE_BYTES
    );

    const aesKeyBytes = await crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      rsaCryptoKey,
      encryptedAesKeyBytes
    );

    const aesKey = await crypto.subtle.importKey(
      'raw',
      aesKeyBytes,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const decryptedBytes = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      aesKey,
      encryptedDataBytes
    );

    return new TextDecoder().decode(decryptedBytes);
  } catch {
    throw new Error('Decryption failed');
  }
};

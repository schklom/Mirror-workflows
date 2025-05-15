// See https://developer.mozilla.org/en-US/docs/Web/API/Window/btoa#examples

function base64Decode(encodedString) {
    return Uint8Array.from(atob(encodedString), c => c.charCodeAt(0))
}

function base64Encode(bytesToEncode) {
    const binString = Array.from(bytesToEncode, (byte) =>
        String.fromCodePoint(byte),
    ).join("");
    return btoa(binString);
}

const AES_GCM_IV_SIZE_BYTES = 12;

const RSA_KEY_SIZE_BYTES = 3072 / 8;

const ARGON2_T = 1;
const ARGON2_P = 4;
const ARGON2_M = 131072;
const ARGON2_HASH_LENGTH = 32;
const ARGON2_SALT_LENGTH = 16;

const CONTEXT_STRING_ASYM_KEY_WRAP = "context:asymmetricKeyWrap";
const CONTEXT_STRING_FMD_PIN = "context:fmdPin";
const CONTEXT_STRING_LOGIN = "context:loginAuthentication";

// Section: Password and hashing

async function hashPasswordForLogin(password, salt) {
    const res = await hashPasswordArgon2(CONTEXT_STRING_LOGIN + password, salt);
    return res.encoded // string
}

async function hashPasswordForKeyWrap(password, salt) {
    const res = await hashPasswordArgon2(CONTEXT_STRING_ASYM_KEY_WRAP + password, salt);
    return res.hash // Uint8Array
}

async function hashPasswordArgon2(password, salt) {
    if (typeof salt === "string") {
        salt = base64Decode(salt);
    }
    let res = await argon2.hash({
        type: argon2.ArgonType.Argon2id,
        pass: password,
        salt: salt,
        time: ARGON2_T,
        parallelism: ARGON2_P,
        mem: ARGON2_M,
        hashLen: ARGON2_HASH_LENGTH,
    });
    return res;
}

// Section: Asymmetric crypto (key wrap)

async function unwrapPrivateKey(password, keyData) { // -> (CryptoKey, CryptoKey)
    const concatBytes = base64Decode(keyData);
    const saltBytes = concatBytes.slice(0, ARGON2_SALT_LENGTH);
    const ivBytes = concatBytes.slice(ARGON2_SALT_LENGTH, ARGON2_SALT_LENGTH + AES_GCM_IV_SIZE_BYTES);
    const wrappedKeyBytes = concatBytes.slice(ARGON2_SALT_LENGTH + AES_GCM_IV_SIZE_BYTES);

    let rawAesKey = await hashPasswordForKeyWrap(password, saltBytes);
    const unwrappingCryptoKey = await window.crypto.subtle.importKey("raw", rawAesKey, "AES-GCM", false, ["decrypt"]);
    const pemBytes = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBytes }, unwrappingCryptoKey, wrappedKeyBytes);

    let pemString = new TextDecoder().decode(pemBytes);
    pemString = pemString.replaceAll("-----BEGIN PRIVATE KEY-----", "");
    pemString = pemString.replaceAll("-----END PRIVATE KEY-----", "");
    pemString = pemString.replaceAll("\n", "");
    const binaryDer = base64Decode(pemString);

    // XXX: It would be nice to use unwrapKey instead of decrypt+importKey
    // XXX: If redesigned from scratch, there should be key separation between encryption and signing.
    const rsaEncKey = await window.crypto.subtle.importKey(
        "pkcs8",
        binaryDer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        false, // extractability
        ["decrypt"] // keyUsages
    );
    const rsaSigKey = await window.crypto.subtle.importKey(
        "pkcs8",
        binaryDer,
        { name: "RSA-PSS", hash: "SHA-256" },
        false, // extractability
        ["sign"] // keyUsages
    );
    return [rsaEncKey, rsaSigKey];
}

async function sign(rsaCryptoKey, msg) {
    const msgBytes = new TextEncoder().encode(msg);
    const pssParams = { name: "RSA-PSS", saltLength: 32 }
    const sig = await window.crypto.subtle.sign(pssParams, rsaCryptoKey, msgBytes);
    const sigBytes = new Uint8Array(sig);
    const sigBase64 = base64Encode(sigBytes);
    return sigBase64
}

// Section: Symmetric crypto

async function decryptPacket(rsaCryptoKey, packetBase64) {
    const concatBytes = base64Decode(packetBase64);
    const sessionKeyPacketBytes = concatBytes.slice(0, RSA_KEY_SIZE_BYTES);
    const ivBytes = concatBytes.slice(RSA_KEY_SIZE_BYTES, RSA_KEY_SIZE_BYTES + AES_GCM_IV_SIZE_BYTES);
    const ctBytes = concatBytes.slice(RSA_KEY_SIZE_BYTES + AES_GCM_IV_SIZE_BYTES);

    const sessionKeyBytes = await window.crypto.subtle.decrypt({ name: "RSA-OAEP" }, rsaCryptoKey, sessionKeyPacketBytes);

    const sessionKeyCryptoKey = await window.crypto.subtle.importKey("raw", sessionKeyBytes, "AES-GCM", false, ["decrypt"]);

    const plaintext = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBytes }, sessionKeyCryptoKey, ctBytes);

    const plaintextString = new TextDecoder().decode(plaintext);
    return plaintextString
}

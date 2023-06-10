// function base64Encode(stringToEncode) { return btoa(stringToEncode) }
function base64Decode(encodedData) {
    return Uint8Array.from(atob(encodedData), c => c.charCodeAt(0))
}


// Legacy crypto uses libraries that we ship (CryptoJS and JSEncrypt).
// Modern crpyto uses the WebCrypto API:
// https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
//
// WARNING: The legacy crypto contains known issues and is only included for
//          compatibility with old clients.
//          See https://gitlab.com/Nulide/findmydeviceserver/-/issues/22

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

async function hashPasswordForLoginModern(password, salt) {
    const res = await hashPasswordArgon2(CONTEXT_STRING_LOGIN + password, salt);
    return res.encoded // string
}

function hashPasswordForLoginLegacy(password, salt) {
    return CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(salt), {
        keySize: 256 / 32,
        iterations: 1867 * 2
    }).toString();
}

async function hashPasswordForKeyWrap(password, salt) {
    const res = await hashPasswordArgon2(CONTEXT_STRING_ASYM_KEY_WRAP + password, salt);
    return res.hash // Uint8Array
}

async function hashPasswordArgon2(password, salt) {
    if (typeof salt === "string") {
        salt = base64Decode(salt);
    }
    try {
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
    } catch (error) {
        console.log(error.messsage, error.code);
        return "";
    }
}

// Section: Asymmetric crypto (key wrap)

async function unwrapPrivateKey(password, keyData) {
    try {
        return await unwrapPrivateKeyModern(password, keyData);
    } catch (error) {
        console.log("Modern unwrapKey failed, trying legacy:", error);
    }
    try {
        return unwrapPrivateKeyLegacy(password, keyData);
    }
    catch (error) {
        console.log("Legacy unwrapKey failed:", error);
    }
    return -1
}

async function unwrapPrivateKeyModern(password, keyData) { // -> CryptoKey
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
    const rsaCryptoKey = await window.crypto.subtle.importKey(
        "pkcs8",
        binaryDer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        false, // extractability
        ["decrypt"] // keyUsages
    );
    return rsaCryptoKey;
}

function unwrapPrivateKeyLegacy(password, keyData) {
    return decryptAESLegacy(password, keyData)
}

// Section: Symmetric crypto

async function decryptPacketModern(rsaCryptoKey, packetBase64) {
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

// XXX: Remove this in a few months/a year when all clients had reasonable time to upgrade
function decryptAESLegacy(password, ciphertext) {
    keySize = 256;
    ivSize = 128;
    iterationCount = 1867;

    let ivLength = ivSize / 4;
    let saltLength = keySize / 4;

    let iv = ciphertext.substr(saltLength, ivLength);
    let encrypted = ciphertext.substring(ivLength + saltLength);

    let salt = ciphertext.substr(0, saltLength);
    let derivedAesKey = CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(salt), {
        keySize: keySize / 32,
        iterations: iterationCount
    });

    let cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext: CryptoJS.enc.Base64.parse(encrypted)
    });
    let decrypted = CryptoJS.AES.decrypt(cipherParams, derivedAesKey, { iv: CryptoJS.enc.Hex.parse(iv) });
    return decrypted.toString(CryptoJS.enc.Utf8);
}

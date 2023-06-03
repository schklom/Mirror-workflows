// function base64Encode(stringToEncode) { return btoa(stringToEncode) }
function base64Decode(encodedData) {
    return Uint8Array.from(atob(encodedData), c => c.charCodeAt(0))
}

// Section: Password and hashing

const ARGON2_T = 1;
const ARGON2_P = 4;
const ARGON2_M = 131072;
const ARGON2_HASH_LENGTH = 32;

const CONTEXT_STRING_ASYM_KEY_WRAP = "context:asymmetricKeyWrap";
const CONTEXT_STRING_FMD_PIN = "context:fmdPin";
const CONTEXT_STRING_LOGIN = "context:loginAuthentication";


async function hashPasswordForLogin(password, salt) {
    return await hashPasswordArgon2(CONTEXT_STRING_LOGIN + password, salt);
}

function hashPasswordForLoginLegacy(password, salt) {
    return CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(salt), {
        keySize: 256 / 32,
        iterations: 1867 * 2
    }).toString();
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
        return res.encoded;
    } catch (error) {
        console.log(error.messsage, error.code);
        return "";
    }
}


// Section: Symmetric crypto

function decryptAES(password, cipherText) {
    try {
        return decryptAESModern(password, cipherText);
    } catch (error) { }
    try {
        return decryptAESLegacy(password, cipherText);
    }
    catch (error) { }
    return -1
}

function decryptAESModern(password, ciphertext) {
    throw "TODO implemented"
    return window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        ciphertext,
    );
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


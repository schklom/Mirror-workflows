const SEPARATOR = "___PICTURE-DATA___";

async function parsePicture(rsaCryptoKey, pictureData) {
    if (pictureData.includes(SEPARATOR)) {
        return parsePictureLegacy(rsaCryptoKey, pictureData);
    } else {
        return await parsePictureModern(rsaCryptoKey, pictureData);
    }
}

async function parsePictureModern(rsaCryptoKey, pictureData) {
    const picture = await decryptPacketModern(rsaCryptoKey, pictureData);
    return picture
}

function parsePictureLegacy(rsaCryptoKey, pictureData) {
    const split = pictureData.split(SEPARATOR);
    const crypt = new JSEncrypt();
    crypt.setPrivateKey(rsaCryptoKey);
    const picPassword = crypt.decrypt(split[0]);
    const picture = decryptAESLegacy(picPassword, split[1]);
    return picture;
}

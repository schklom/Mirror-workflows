async function parsePicture(rsaCryptoKey, pictureData) {
    const picture = await decryptPacket(rsaCryptoKey, pictureData);
    return picture
}

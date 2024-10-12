async function parsePicture(rsaCryptoKey, pictureData) {
    const picture = await decryptPacketModern(rsaCryptoKey, pictureData);
    return picture
}

async function parseLocation(rsaCryptoKey, locationData) {
    const json = await decryptPacketModern(rsaCryptoKey, locationData.Data);
    return JSON.parse(json)
}

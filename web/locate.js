async function parseLocation(rsaCryptoKey, locationData) {
    const json = await decryptPacket(rsaCryptoKey, locationData.Data);
    return JSON.parse(json)
}

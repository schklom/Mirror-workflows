async function parseLocation(rsaCryptoKey, locationData) {
    if ("Data" in locationData) {
        return await parseLocationModern(rsaCryptoKey, locationData.Data);
    } else {
        return parseLocationLegacy(rsaCryptoKey, locationData);
    }
}

async function parseLocationModern(rsaCryptoKey, locationData) {
    const json = await decryptPacketModern(rsaCryptoKey, locationData);
    return JSON.parse(json)
}

function parseLocationLegacy(rsaCryptoKey, locationData) {
    var crypt = new JSEncrypt();
    crypt.setPrivateKey(rsaCryptoKey);

    const provider = crypt.decrypt(locationData.Provider);
    const time = locationData.Date;
    const lon = crypt.decrypt(locationData.lon);
    const lat = crypt.decrypt(locationData.lat);
    const bat = crypt.decrypt(locationData.Bat);

    return {
        provider,
        time,
        lon,
        lat,
        bat,
    }
}

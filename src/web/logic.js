var map, markers;

function init() {
    map = new OpenLayers.Map("map");
    map.addLayer(new OpenLayers.Layer.OSM());
    map.setCenter(new OpenLayers.LonLat(13.41,52.52) // Center of the map
        .transform(
        new OpenLayers.Projection("EPSG:4326"), // transform from WGS 1984
            new OpenLayers.Projection("EPSG:900913") // to Spherical Mercator Projection
          ), 15 // Zoom level
      );
    markers = new OpenLayers.Layer.Markers( "Markers" );
    map.addLayer(markers);
}

function locate(){
    idInput = document.getElementById('fmdid');

    fetch("/location/" + idInput.value)
        .then(function(response) {
            return response.json();
        })
        .then(function(json) {

            fetch("/key/" + idInput.value)
                .then(function(response) {
                    return response.text()
            })
            .then(function(keyBase64){

                //magic
                password = prompt("Enter the password:");
                
                var key = decryptAES(password, keyBase64)
                var crypt = new JSEncrypt();
                crypt.setPrivateKey(key);

                var provider = crypt.decrypt(json.Provider);
                var lon = crypt.decrypt(json.lon);
                var lat = crypt.decrypt(json.lat);
                var lonLat = new OpenLayers.LonLat(lon, lat)
                .transform(
                new OpenLayers.Projection("EPSG:4326"),
                map.getProjectionObject()
                );

            var zoom=16;
            markers.clearMarkers();
            markers.addMarker(new OpenLayers.Marker(lonLat));
            map.setCenter (lonLat, zoom);
            })
        })

}

function decryptAES(password, cipherText) {
    keySize = 256;
    ivSize = 128;
    iterationCount = 1867;

    let ivLength = ivSize / 4;
    let saltLength = keySize / 4;
    let salt = cipherText.substr(0, saltLength);
    let iv = cipherText.substr(saltLength, ivLength);
    let encrypted = cipherText.substring(ivLength + saltLength);
    let key = CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(salt), {
        keySize: keySize / 32,
        iterations: iterationCount
    });
    let cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext: CryptoJS.enc.Base64.parse(encrypted)
    });
    let decrypted = CryptoJS.AES.decrypt(cipherParams, key, {iv: CryptoJS.enc.Hex.parse(iv)});
    return decrypted.toString(CryptoJS.enc.Utf8);
}    
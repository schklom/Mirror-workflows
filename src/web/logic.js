var map, markers;

var newestLocationDataIndex;
var currentLocationDataIndx = 0;

var interval = setInterval(function () { 
    idInput = document.getElementById('fmdid');

    fetch("/locationDataSize", {
        method: 'PUT',
        body: JSON.stringify({
             id: idInput.value,
             index: -1
         }),
        headers: {
            'Content-type': 'applicatoin/json'
        }
        })
        .then(function(response) {
            return response.text()
    })
    .then(function(responseIndex){
        newlocationDataIndex = parseInt(responseIndex);
        if(newestLocationDataIndex < newlocationDataIndex){
            newestLocationDataIndex = newlocationDataIndex;
            var toasted = new Toasted({
                position: 'top-center',
                duration: 3000
            })
            toasted.show('New locationdata available!') 
        }
    })

}, 600000);

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

function locate(index){
    idInput = document.getElementById('fmdid');

    fetch("/location", {
        method: 'PUT',
        body: JSON.stringify({
             id: idInput.value,
             index: index
         }),
        headers: {
            'Content-type': 'applicatoin/json'
        }
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(json) {

            fetch("/key", {
                method: 'PUT',
                body: JSON.stringify({
                     id: idInput.value,
                     index: index
                 }),
                headers: {
                    'Content-type': 'applicatoin/json'
                }
                })
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
                var time = new Date(json.Date);
                var lon = crypt.decrypt(json.lon);
                var lat = crypt.decrypt(json.lat);

                document.getElementById("deviceInfo").style.visibility= "visible";
                document.getElementById("dateView").innerHTML = time;
                document.getElementById("providerView").innerHTML = provider;

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


        fetch("/locationDataSize", {
            method: 'PUT',
            body: JSON.stringify({
                 id: idInput.value,
                 index: index
             }),
            headers: {
                'Content-type': 'applicatoin/json'
            }
            })
            .then(function(response) {
                return response.text()
        })
        .then(function(responseIndex){
            newestLocationDataIndex = parseInt(responseIndex);
            if(currentLocationDataIndx == 0){
                currentLocationDataIndx = newestLocationDataIndex;
            }
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

function clickPress(event) {
    if (event.keyCode == 13) {
        locate(-1);
    }
}

function locateOlder(){
    currentLocationDataIndx -= 1;
    locate (currentLocationDataIndx);
    
}

function locateNewer(){
    currentLocationDataIndx += 1;
    locate(currentLocationDataIndx);
}
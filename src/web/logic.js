var map, markers;

var newestLocationDataIndex;
var currentLocationDataIndx = 0;
var currentId;
var keyTemp;

var interval = setInterval(function () {
    idInput = document.getElementById('fmdid');

    if (idInput.value != "") {

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
            .then(function (response) {
                return response.text()
            })
            .then(function (responseIndex) {
                newlocationDataIndex = parseInt(responseIndex);
                if (newestLocationDataIndex < newlocationDataIndex) {
                    newestLocationDataIndex = newlocationDataIndex;
                    var toasted = new Toasted({
                        position: 'top-center',
                        duration: 3000
                    })
                    toasted.show('New locationdata available!')
                }
            })
    }

}, 300000);

function init() {
    var element = document.getElementById('map');
    map = L.map(element);
    markers = L.layerGroup().addTo(map);

    L.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    var target = L.latLng('57', '13');
    map.setView(target, 1.5);
}

function locate(index) {
    idInput = document.getElementById('fmdid');

    if (idInput.value != "") {

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
        .then(function (response) {
            return response.json();
        })
        .then(function (json) {

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
                .then(function (response) {
                    return response.text()
                })
                .then(function (keyBase64) {

                    //magic
                    if (keyTemp == null) {
                        password =  password_prompt();                   
                    }

                    var key = decryptAES(password, keyBase64)
                    var crypt = new JSEncrypt();
                    crypt.setPrivateKey(key);

                    var provider = crypt.decrypt(json.Provider);
                    var time = new Date(json.Date);
                    var lon = crypt.decrypt(json.lon);
                    var lat = crypt.decrypt(json.lat);

                    document.getElementById("deviceInfo").style.visibility = "visible";
                    document.getElementById("dateView").innerHTML = time.getDay() + "/" + time.getMonth() + "/" + time.getFullYear();
                    document.getElementById("timeView").innerHTML = time.getHours() + ":" + time.getMinutes();
                    document.getElementById("providerView").innerHTML = provider;

                    var target = L.latLng(lat, lon);

                    markers.clearLayers();
                    L.marker(target).addTo(markers);
                    map.setView(target, 16);

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
        .then(function (response) {
            return response.text()
        })
        .then(function (responseIndex) {
            newestLocationDataIndex = parseInt(responseIndex);
            if (currentLocationDataIndx == 0) {
                currentLocationDataIndx = newestLocationDataIndex;
            }
            document.getElementById("indexView").innerHTML = currentLocationDataIndx;
        })

    }

}

function decryptAES(password, cipherText) {
    var key;
    keySize = 256;
    ivSize = 128;
    iterationCount = 1867;

    let ivLength = ivSize / 4;
    let saltLength = keySize / 4;

    let iv = cipherText.substr(saltLength, ivLength);
    let encrypted = cipherText.substring(ivLength + saltLength);

    if (keyTemp == null) {
        let salt = cipherText.substr(0, saltLength);
        key = CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(salt), {
            keySize: keySize / 32,
            iterations: iterationCount
        });
        keyTemp = key;
    } else {
        key = keyTemp;
    }
    let cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext: CryptoJS.enc.Base64.parse(encrypted)
    });
    let decrypted = CryptoJS.AES.decrypt(cipherParams, key, { iv: CryptoJS.enc.Hex.parse(iv) });
    return decrypted.toString(CryptoJS.enc.Utf8);
}

function clickPress(event) {
    if (event.keyCode == 13) {
        locate(-1);
    }
}

function switchWithKeys(event){
    if (event.keyCode == 111) {
        locateOlder();
    }else if(event.keyCode == 110){
        locateNewer();
    }
}

function locateOlder() {
    currentLocationDataIndx -= 1;
    locate(currentLocationDataIndx);

}

function locateNewer() {
    currentLocationDataIndx += 1;
    locate(currentLocationDataIndx);
}

window.password_prompt = function() {
    var submit = function() {
        callback(input.value);
        document.body.removeChild(div);
    };

    var div = document.createElement("div");
    div.id = "passwordPrompt";

    var label = document.createElement("label");
    label.id = "password_prompt_label";
    label.className = "center"
    label.innerHTML = "Please enter the password:";
    label.for = "password_prompt_input";
    div.appendChild(label);

    div.appendChild(document.createElement("br"));

    var centedInnerDiv = document.createElement("div");
    centedInnerDiv.className = "center";
    div.appendChild(centedInnerDiv);

    var input = document.createElement("input");
    input.id = "password_prompt_input";
    input.type = "password";
    input.addEventListener("keyup", function(e) {
        if (event.keyCode == 13) submit();
    }, false);
    centedInnerDiv.appendChild(input);

    div.appendChild(document.createElement("br"));
    div.appendChild(document.createElement("br"));

    document.body.appendChild(div);
};
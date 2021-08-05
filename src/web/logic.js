var map, markers;

var newestLocationDataIndex;
var smallestLocationDataIndex;
var currentLocationDataIndx = 0;
var currentId;
var keyTemp;
var hashedPW;

var backgroundSync = false;

function init() {
    var element = document.getElementById('map');
    map = L.map(element);
    markers = L.layerGroup().addTo(map);

    L.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    var target = L.latLng('57', '13');
    map.setView(target, 1.5);

    var versionView = document.getElementById('version');
    fetch("/version", {
        method: 'GET'
    })
        .then(function (response) {
            return response.text();
        })
        .then(function (versionCode) {
            versionView.innerHTML = versionCode;
        })

}

function prepareForLocate() {
    idInput = document.getElementById('fmdid');
    if (idInput.value != "" && keyTemp == null) {
        var submit = function () {
            document.body.removeChild(div);
            locate(-1, input.value);
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
        centedInnerDiv.appendChild(input);

        div.appendChild(document.createElement("br"));
        div.appendChild(document.createElement("br"));

        document.body.appendChild(div);

        input.focus();
        input.addEventListener("keyup", function (e) {
            if (event.keyCode == 13) {
                if (input.value != "") {
                    submit();
                }
            }
        }, false);

    } else {
        locate(-1, "");
    }
}

function locate(index, password) {
    idInput = document.getElementById('fmdid');
    if (password != "") {
        hashedPW = CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse("cafe"), {
            keySize: 256 / 32,
            iterations: 1867
        }).toString();
    }

    if (idInput.value != "") {


        fetch("/requestAccess", {
            method: 'PUT',
            body: JSON.stringify({
                DeviceId: idInput.value,
                HashedPassword: hashedPW
            }),
            headers: {
                'Content-type': 'applicatoin/json'
            }
        }).then(function (response) {
            if(response.ok){
                return response.json()
            }else{
                alert("ID or password false");
            }
        })
            .then(function (token) {

                fetch("/locationDataSize", {
                    method: 'PUT',
                    body: JSON.stringify({
                        AccessToken: token.AccessToken,
                        index: index
                    }),
                    headers: {
                        'Content-type': 'applicatoin/json'
                    }
                })
                    .then(function (response) {
                        return response.json()
                    })
                    .then(function (json) {
                        newestLocationDataIndex = json.DataLength;
                        smallestLocationDataIndex = json.DataBeginningIndex;
                        if (index == -1 || index > newestLocationDataIndex) {
                            index = newestLocationDataIndex;
                            currentLocationDataIndx = newestLocationDataIndex;
                        }
                        document.getElementById("indexView").innerHTML = currentLocationDataIndx;
                    })

                fetch("/location", {
                    method: 'PUT',
                    body: JSON.stringify({
                        AccessToken: token.AccessToken,
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
                                AccessToken: token.AccessToken,
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

                                var key = decryptAES(password, keyBase64)
                                if (key != -1) {
                                    var crypt = new JSEncrypt();
                                    crypt.setPrivateKey(key);

                                    var provider = crypt.decrypt(json.Provider);
                                    var time = new Date(json.Date);
                                    var lon = crypt.decrypt(json.lon);
                                    var lat = crypt.decrypt(json.lat);
                                    var bat = crypt.decrypt(json.Bat);

                                    document.getElementById("deviceInfo").style.visibility = "visible";
                                    document.getElementById("dateView").innerHTML = time.toLocaleDateString();
                                    document.getElementById("timeView").innerHTML = time.toLocaleTimeString();
                                    document.getElementById("providerView").innerHTML = provider;
                                    document.getElementById("batView").innerHTML = bat + "%";

                                    var target = L.latLng(lat, lon);

                                    markers.clearLayers();
                                    L.marker(target).addTo(markers);
                                    map.setView(target, 16);

                                    if (!backgroundSync) {
                                        var interval = setInterval(function () {
                                            idInput = document.getElementById('fmdid');

                                            if (idInput.value != "") {

                                                fetch("/requestAccess", {
                                                    method: 'PUT',
                                                    body: JSON.stringify({
                                                        DeviceId: idInput.value,
                                                        HashedPassword: hashedPW
                                                    }),
                                                    headers: {
                                                        'Content-type': 'applicatoin/json'
                                                    }
                                                }).then(function (response) {
                                                    return response.json()
                                                })
                                                    .then(function (token) {

                                                        fetch("/locationDataSize", {
                                                            method: 'PUT',
                                                            body: JSON.stringify({
                                                                DeviceId: token.AccessToken,
                                                                index: -1
                                                            }),
                                                            headers: {
                                                                'Content-type': 'applicatoin/json'
                                                            }
                                                        })
                                                            .then(function (response) {
                                                                return response.json()
                                                            })
                                                            .then(function (json) {
                                                                if (newestLocationDataIndex < json.DataLength) {
                                                                    newestLocationDataIndex = json.DataLength;
                                                                    smallestLocationDataIndex = json.DataBeginningIndex
                                                                    var toasted = new Toasted({
                                                                        position: 'top-center',
                                                                        duration: 15000
                                                                    })
                                                                    toasted.show('New locationdata available!')
                                                                }
                                                            })
                                                    })
                                            }

                                        }, 180000);
                                    }
                                } else {
                                    alert("Wrong password!");
                                }

                            })
                    })

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
    try {
        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
        keyTemp = null;
        return -1;
    }
}

function clickPress(event) {
    if (event.keyCode == 13) {
        prepareForLocate();
    }
}

function switchWithKeys(event) {
    if (event.keyCode == 111) {
        locateOlder();
    } else if (event.keyCode == 110) {
        locateNewer();
    }
}

function locateOlder() {
    if (keyTemp != null && currentLocationDataIndx > smallestLocationDataIndex) {
        currentLocationDataIndx -= 1;
        locate(currentLocationDataIndx, "");
    } else {
        currentLocationDataIndx = newestLocationDataIndex;
    }
}

function locateNewer() {
    if (keyTemp != null) {
        currentLocationDataIndx += 1;
        locate(currentLocationDataIndx, "");
    }
}

function sendToPhone(message) {
    idInput = document.getElementById('fmdid');
    if (idInput.value != "" && hashedPW != "") {

        fetch("/requestAccess", {
            method: 'PUT',
            body: JSON.stringify({
                DeviceId: idInput.value,
                HashedPassword: hashedPW
            }),
            headers: {
                'Content-type': 'applicatoin/json'
            }
        }).then(function (response) {
            return response.json()
        })
            .then(function (token) {
                fetch("/command", {
                    method: 'POST',
                    body: JSON.stringify({
                        AccessToken: token.AccessToken,
                        Command: message
                    }),
                    headers: {
                        'Content-type': 'applicatoin/json'
                    }
                }).then(function (response){
                    var toasted = new Toasted({
                        position: 'top-center',
                        duration: 2000
                    })
                    toasted.show('Command send!')
                })

            })
    }
}
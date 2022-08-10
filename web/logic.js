var map, markers;

var newestLocationDataIndex;
var smallestLocationDataIndex;
var currentLocationDataIndx = 0;
var currentId;
var keyTemp;
var hashedPW;

var backgroundSync = false;

function init() {
    var div;
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        div = document.getElementById("desktop");
        document.getElementsByClassName("column-left")[1].style.width= "12%";
        document.getElementsByClassName("column-middle")[1].style.width= "85";
    } else {
        div = document.getElementById("mobile");
    }
    div.parentNode.removeChild(div);

    var element = document.getElementById('map');
    map = L.map(element);
    markers = L.layerGroup().addTo(map);

    L.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    var target = L.latLng('57', '13');
    map.setView(target, 1.5);

    var versionView = document.getElementById('version');
    fetch("./version", {
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
    if (currentId == null) {
        idInput = document.getElementById('fmdid');
        currentId = idInput.value;
    }
    if (password != "") {
        hashedPW = CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse("cafe"), {
            keySize: 256 / 32,
            iterations: 1867 * 2
        }).toString();
    }

    if (currentId != "") {


        fetch("./requestAccess", {
            method: 'PUT',
            body: JSON.stringify({
                IDT: currentId,
                Data: hashedPW
            }),
            headers: {
                'Content-type': 'application/json'
            }
        }).then(function (response) {
            if (response.ok) {
                return response.json()
            } else {
                if (response.status == 423) {
                    alert("ID, wether it exists or not is locked.");
                } else if (response.status == 403) {
                    alert("ID or password false");
                } else {
                    alert("Unhandled error: " + response.status);
                }
            }
        })
            .then(function (token) {

                fetch("./locationDataSize", {
                    method: 'PUT',
                    body: JSON.stringify({
                        IDT: token.Data,
                        Data: index.toString()
                    }),
                    headers: {
                        'Content-type': 'application/json'
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
                    })

                fetch("./location", {
                    method: 'PUT',
                    body: JSON.stringify({
                        IDT: token.Data,
                        Data: index.toString()
                    }),
                    headers: {
                        'Content-type': 'application/json'
                    }
                })
                    .then(function (response) {
                        return response.json();
                    })
                    .then(function (json) {

                        fetch("./key", {
                            method: 'PUT',
                            body: JSON.stringify({
                                IDT: token.Data,
                                Data: index.toString()
                            }),
                            headers: {
                                'Content-type': 'application/json'
                            }
                        })
                            .then(function (response) {
                                return response.text()
                            })
                            .then(function (keyBase64) {
                                if (keyTemp == null) {
                                    var key = decryptAES(password, keyBase64)
                                    keyTemp = key
                                } else {
                                    key = keyTemp
                                }
                                if (key != -1) {
                                    var crypt = new JSEncrypt();
                                    crypt.setPrivateKey(key);

                                    var provider = crypt.decrypt(json.Provider);
                                    var time = new Date(json.Date);
                                    var lon = crypt.decrypt(json.lon);
                                    var lat = crypt.decrypt(json.lat);
                                    var bat = crypt.decrypt(json.Bat);


                                    document.getElementsByClassName("deviceInfo")[0].style.display = "block";
                                    document.getElementById("idView").innerHTML = currentId;
                                    document.getElementById("dateView").innerHTML = time.toLocaleDateString();
                                    document.getElementById("timeView").innerHTML = time.toLocaleTimeString();
                                    document.getElementById("providerView").innerHTML = provider;
                                    document.getElementById("batView").innerHTML = bat + "%";

                                    var target = L.latLng(lat, lon);

                                    markers.clearLayers();
                                    L.marker(target).addTo(markers);
                                    map.setView(target, 16);

                                    loginDiv = document.getElementById("login");
                                    if (loginDiv != null) {
                                        loginDiv.parentNode.removeChild(loginDiv);
                                    }

                                    if (!backgroundSync) {
                                        var interval = setInterval(function () {

                                            if (currentId != "") {

                                                fetch("./requestAccess", {
                                                    method: 'PUT',
                                                    body: JSON.stringify({
                                                        DeviceId: currentId,
                                                        HashedPassword: hashedPW
                                                    }),
                                                    headers: {
                                                        'Content-type': 'application/json'
                                                    }
                                                }).then(function (response) {
                                                    return response.json()
                                                })
                                                    .then(function (token) {

                                                        fetch("./locationDataSize", {
                                                            method: 'PUT',
                                                            body: JSON.stringify({
                                                                IDT: token.AccessToken,
                                                                Data: -1
                                                            }),
                                                            headers: {
                                                                'Content-type': 'application/json'
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
    var msg;
    keySize = 256;
    ivSize = 128;
    iterationCount = 1867;

    let ivLength = ivSize / 4;
    let saltLength = keySize / 4;

    let iv = cipherText.substr(saltLength, ivLength);
    let encrypted = cipherText.substring(ivLength + saltLength);

    let salt = cipherText.substr(0, saltLength);
    msg = CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(salt), {
        keySize: keySize / 32,
        iterations: iterationCount
    });

    let cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext: CryptoJS.enc.Base64.parse(encrypted)
    });
    let decrypted = CryptoJS.AES.decrypt(cipherParams, msg, { iv: CryptoJS.enc.Hex.parse(iv) });
    try {
        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
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
    if (currentId != "" && hashedPW != "") {

        fetch("./requestAccess", {
            method: 'PUT',
            body: JSON.stringify({
                IDT: currentId,
                Data: hashedPW
            }),
            headers: {
                'Content-type': 'application/json'
            }
        }).then(function (response) {
            return response.json()
        })
            .then(function (token) {
                fetch("./command", {
                    method: 'POST',
                    body: JSON.stringify({
                        IDT: token.Data,
                        Data: message
                    }),
                    headers: {
                        'Content-type': 'application/json'
                    }
                }).then(function (response) {
                    var toasted = new Toasted({
                        position: 'top-center',
                        duration: 2000
                    })
                    toasted.show('Command send!')
                })

            })
    }
}

function showPicture() {
    if (currentId != "" && hashedPW != "") {

        fetch("./requestAccess", {
            method: 'PUT',
            body: JSON.stringify({
                IDT: currentId,
                Data: hashedPW
            }),
            headers: {
                'Content-type': 'application/json'
            }
        }).then(function (response) {
            return response.json()
        })
            .then(function (token) {
                fetch("./picture", {
                    method: 'PUT',
                    body: JSON.stringify({
                        IDT: token.Data,
                        Data: ""
                    }),
                    headers: {
                        'Content-type': 'application/text'
                    }
                }).then(function (response) {
                    return response.text()
                })
                    .then(function (data) {
                        split = data.split("___PICTURE-DATA___")
                        var crypt = new JSEncrypt();
                        crypt.setPrivateKey(keyTemp);
                        picPassword = crypt.decrypt(split[0])
                        picture = decryptAES(picPassword, split[1])

                        var div = document.createElement("div");
                        div.id = "imagePrompt";

                        var imageDiv = document.createElement("div");
                        var img = document.createElement("img");
                        imageDiv.className = "center"
                        img.id = "imageFromDevice"
                        img.src = "data:image/jpeg;base64," + picture
                        imageDiv.appendChild(img)
                        div.appendChild(imageDiv)

                        var buttonDiv = document.createElement("div");
                        buttonDiv.className = "center"
                        var btn = document.createElement("button");
                        btn.innerHTML = "close"
                        btn.addEventListener('click', function () {
                            document.body.removeChild(div)
                        }, false);
                        buttonDiv.appendChild(btn)
                        div.appendChild(buttonDiv)
                        document.body.appendChild(div);
                    })

            })
    }

}

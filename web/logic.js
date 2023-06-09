var map, markers;

var newestLocationDataIndex;
var currentLocationDataIndx = 0;
var currentId;
var keyTemp;
var globalAccessToken = "";

var newestPictureIndex;
var currentPictureIndex;

function init() {
    var div;
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        div = document.getElementById("desktop");
        document.getElementsByClassName("column-left")[1].style.width = "12%";
        document.getElementsByClassName("column-middle")[1].style.width = "85";
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

    if (getWelcomeCookie() == "") {
        welcomePrompt = document.getElementById('welcomePrompt');
        welcomePrompt.style.visibility = 'visible';
    }

    setupOnClicks()
}

function setupOnClicks() {
    document.getElementById("locateButton").addEventListener("click", async () => await prepareForLogin());
    document.getElementById("locateOlder").addEventListener("click", async () => await locateOlder());
    document.getElementById("locateButton").addEventListener("click", async () => await locateNewer());
}

async function prepareForLogin() {
    let idInput = document.getElementById('fmdid');
    if (idInput.value != "" && keyTemp == null) {

        var div = document.createElement("div");
        div.id = "passwordPrompt";
        div.classList.add("prompt");

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
                    document.body.removeChild(div);
                    doLogin(idInput.value, input.value);
                }
            }
        }, false);

    } else {
        await locate(-1);
    }
}

async function doLogin(fmdid, password) {
    if (currentId == null) {
        currentId = fmdid;
    }
    if (password == "") {
        alert("Password is empty.");
        return;
    }

    let response = await fetch("./salt", {
        method: 'PUT',
        body: JSON.stringify({
            IDT: currentId,
            Data: "unused",
        }),
        headers: {
            'Content-type': 'application/json'
        }
    });
    let saltJson = await response.json();
    let salt = saltJson.Data;

    modernPasswordHash = await hashPasswordForLogin(password, salt);
    legacyPasswordHash = hashPasswordForLoginLegacy(password, salt);

    try {
        await tryLoginWithHash(fmdid, modernPasswordHash);
        // fall through to locate()
    } catch {
        console.log("Modern hash failed, trying legacy hash.");
        try {
            await tryLoginWithHash(fmdid, legacyPasswordHash);
            // fall through to locate()
        } catch (statusCode) {
            if (statusCode == 423) {
                alert("Too many attempts. Try again in 10 minutes.");
            } else if (statusCode == 403) {
                alert("Wrong ID or wrong password.");
            } else {
                alert("Unhandled error: " + statusCode);
            }
            return;
        }
    }
    await locate(-1);
}

async function tryLoginWithHash(fmdid, passwordHash) {
    const response = await fetch("./requestAccess", {
        method: 'PUT',
        body: JSON.stringify({
            IDT: fmdid,
            Data: passwordHash,
        }),
        headers: {
            'Content-type': 'application/json'
        }
    });
    if (response.ok) {
        const tokenJson = await response.json()
        globalAccessToken = tokenJson.Data;
        return globalAccessToken;
    } else {
        throw response.status;
    }
}


async function locate(requestedIndex) {
    if (!globalAccessToken) {
        console.log("Missing accessToken!");
        return;
    }
    let response = await fetch("./locationDataSize", {
        method: 'PUT',
        body: JSON.stringify({
            IDT: globalAccessToken,
            Data: "unused",
        }),
        headers: {
            'Content-type': 'application/json'
        }
    });
    if (!response.ok) {
        throw response.status;
    }
    const locationDataSizeJson = await response.json();
    newestLocationSize = parseInt(locationDataSizeJson.Data, 10);
    newestLocationDataIndex = newestLocationSize - 1;

    if (requestedIndex == -1 || requestedIndex > newestLocationDataIndex) {
        requestedIndex = newestLocationDataIndex;
        currentLocationDataIndx = newestLocationDataIndex;
    }

    if (requestedIndex < 0) {
        document.getElementsByClassName("deviceInfo")[0].style.display = "block";
        document.getElementById("idView").innerHTML = currentId;
        document.getElementById("dateView").innerHTML = "No data available";
        document.getElementById("timeView").innerHTML = "No data available";
        document.getElementById("providerView").innerHTML = "No data available";
        document.getElementById("batView").innerHTML = "? %";
        loginDiv = document.getElementById("login");
        if (loginDiv != null) {
            loginDiv.parentNode.removeChild(loginDiv);
        }
        return
    }

    response = await fetch("./location", {
        method: 'PUT',
        body: JSON.stringify({
            IDT: globalAccessToken,
            Data: requestedIndex.toString()
        }),
        headers: {
            'Content-type': 'application/json'
        }
    });
    if (!response.ok) {
        throw response.status;
    }
    const locationData = await response.json();

    response = await fetch("./key", {
        method: 'PUT',
        body: JSON.stringify({
            IDT: globalAccessToken,
            Data: requestedIndex.toString()
        }),
        headers: {
            'Content-type': 'application/json'
        }
    })
    if (!response.ok) {
        throw response.status;
    }
    const keyData = await response.json();

    if (keyTemp == null) {
        var key = decryptAES(password, keyData.Data)
        keyTemp = key
    } else {
        key = keyTemp
    }
    if (key == -1) {
        alert("Wrong password!");
        return
    }
    var crypt = new JSEncrypt();
    crypt.setPrivateKey(key);

    var provider = crypt.decrypt(locationData.Provider);
    var time = new Date(locationData.Date);
    var lon = crypt.decrypt(locationData.lon);
    var lat = crypt.decrypt(locationData.lat);
    var bat = crypt.decrypt(locationData.Bat);


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
}

function clickPress(event) {
    if (event.keyCode == 13) {
        prepareForLogin();
    }
}

function switchWithKeys(event) {
    if (event.keyCode == 111) {
        locateOlder();
    } else if (event.keyCode == 110) {
        locateNewer();
    }
}

async function locateOlder() {
    if (keyTemp != null && currentLocationDataIndx > 0) {
        currentLocationDataIndx -= 1;
        await locate(currentLocationDataIndx);
    } else {
        currentLocationDataIndx = newestLocationDataIndex;
    }
}

async function locateNewer() {
    if (keyTemp != null) {
        currentLocationDataIndx += 1;
        await locate(currentLocationDataIndx);
    }
}

function sendToPhone(message) {
    if (!globalAccessToken) {
        console.log("Missing accessToken!");
        return;
    }

    fetch("./command", {
        method: 'POST',
        body: JSON.stringify({
            IDT: globalAccessToken,
            Data: message,
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
}

function showPicture() {
    if (!globalAccessToken) {
        console.log("Missing accessToken!");
        return;
    }
    fetch("./pictureSize", {
        method: 'PUT',
        body: JSON.stringify({
            IDT: globalAccessToken,
            Data: ""
        }),
        headers: {
            'Content-type': 'application/json'
        }
    }).then(function (response) {
        return response.json()
    }).then(function (json) {
        if (json.Data == "-1") {
            var toasted = new Toasted({
                position: 'top-center',
                duration: 30000
            })
            toasted.show('No Picture available!')
            return;
        } else {
            newestPictureIndex = Number(json.Data);
            currentPictureIndex = newestPictureIndex;
            loadPicture(newestPictureIndex);
        }
    })
}

function loadPicture(index) {
    if (!globalAccessToken) {
        console.log("Missing accessToken!");
        return;
    }
    fetch("./picture", {
        method: 'PUT',
        body: JSON.stringify({
            IDT: globalAccessToken,
            Data: index.toString()
        }),
        headers: {
            'Content-type': 'application/json'
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

            var beforeBtn = document.createElement("button");
            beforeBtn.innerHTML = "<-"
            beforeBtn.addEventListener('click', function () {
                document.body.removeChild(div)
                currentPictureIndex -= 1;
                if (currentPictureIndex < 0) {
                    currentPictureIndex = newestPictureIndex;
                }
                loadPicture(currentPictureIndex);
            }, false);
            buttonDiv.appendChild(beforeBtn)

            var btn = document.createElement("button");
            btn.innerHTML = "close"
            btn.addEventListener('click', function () {
                document.body.removeChild(div)
            }, false);
            buttonDiv.appendChild(btn)

            var afterBtn = document.createElement("button");
            afterBtn.innerHTML = "->"
            afterBtn.addEventListener('click', function () {
                document.body.removeChild(div)
                currentPictureIndex += 1;
                if (currentPictureIndex > newestPictureIndex) {
                    currentPictureIndex = 0;
                }
                loadPicture(currentPictureIndex);
            }, false);
            buttonDiv.appendChild(afterBtn)
            div.appendChild(buttonDiv)
            document.body.appendChild(div);
        })
}

function dropDownBtn() {
    document.getElementById("cameraDropDown").style.display = "block";
}


window.onclick = function (event) {
    if (!event.target.matches('.imgDopDownBtn')) {
        document.getElementById("cameraDropDown").style.display = "None";
    }
}

function getWelcomeCookie() {
    let name = "welcome=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function welcomeFinish() {
    const d = new Date();
    d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000));
    let expires = "expires=" + d.toUTCString();
    document.cookie = "welcome=true" + ";" + expires + ";path=/";
    welcomePrompt = document.getElementById('welcomePrompt');
    welcomePrompt.style.visibility = 'hidden';
}

function prepareDeleteDevice() {
    var submit = function (pin) {
        document.body.removeChild(div);
        sendToPhone('delete ' + pin);
    };

    var div = document.createElement("div");
    div.id = "passwordPrompt";
    div.classList.add("prompt");

    var label = document.createElement("label");
    label.id = "password_prompt_label";
    label.className = "center"
    label.innerHTML = "Please enter the device pin:";
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
                submit(input.value);
            }
        }
    }, false);

}
var map, markers;

var newestLocationDataIndex;
var currentLocationDataIndx = 0;
var currentId;
var globalPrivateKey;
var globalAccessToken = "";

var newestPictureIndex;
var currentPictureIndex;

const KEYCODE_ENTER = 13;
const KEYCODE_ARROW_LEFT = 37;
const KEYCODE_ARROW_RIGHT = 39;


window.addEventListener("load", (event) => init());

window.onclick = function (event) {
    // hide the dropdowns if clicking outside of their respective buttons
    if (event.target.id != "cameraDropDownButtonInner") {
        document.getElementById("cameraDropDown").style.display = "None";
    }
    if (event.target.id != "locateDropDownButtonInner") {
        document.getElementById("locateDropDown").style.display = "None";
    }
}

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
    checkWebCryptoApiAvailable()
}

function setupOnClicks() {
    document.getElementById("welcomeConfirm").addEventListener("click", () => welcomeFinish());
    document.getElementById("fmdid").addEventListener("keyup", (event) => {
        if (event.key == "Enter") {
            prepareForLogin();
        }
    });

    document.getElementById("locateButton").addEventListener("click", async () => await prepareForLogin());
    document.getElementById("locateOlder").addEventListener("click", async () => await locateOlder());
    document.getElementById("locateNewer").addEventListener("click", async () => await locateNewer());
    document.getElementById("locate").addEventListener("click", () => showLocateDropDown());
    document.getElementById("locateAll").addEventListener("click", () => sendToPhone("locate"));
    document.getElementById("locateGps").addEventListener("click", () => sendToPhone("locate gps"));
    document.getElementById("locateCellular").addEventListener("click", () => sendToPhone("locate cell"));
    document.getElementById("ring").addEventListener("click", () => sendToPhone("ring"));
    document.getElementById("lock").addEventListener("click", () => sendToPhone("lock"));
    document.getElementById("delete").addEventListener("click", () => prepareDeleteDevice());
    document.getElementById("cameraFront").addEventListener("click", () => sendToPhone("camera front"));
    document.getElementById("cameraBack").addEventListener("click", () => sendToPhone("camera back"));
    document.getElementById("takePicture").addEventListener("click", () => showCameraDropDown());
    document.getElementById("showPicture").addEventListener("click", async () => await showLatestPicture());
}

function checkWebCryptoApiAvailable() {
    if (typeof (window.crypto.subtle) == "undefined") {
        alert("FMD Server won't work because the WebCrypto API is not available.\n\n"
            + "This is most likely because you are visiting this site over insecure HTTP. "
            + "Please use HTTPS. If you are self-hosting, see the README.");
    }
}

// Section: Login

function onFmdIdKeyPressed(event) {
    if (event.keyCode == KEYCODE_ENTER) {
        prepareForLogin();
    }
}

async function prepareForLogin() {
    let idInput = document.getElementById('fmdid');
    if (idInput.value != "" && globalPrivateKey == null) {

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
            if (event.keyCode == KEYCODE_ENTER) {
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
    currentId = fmdid;
    if (password == "") {
        alert("Password is empty.");
        return;
    }

    let response = await fetch("./salt", {
        method: 'PUT',
        body: JSON.stringify({
            IDT: fmdid,
            Data: "unused",
        }),
        headers: {
            'Content-type': 'application/json'
        }
    });
    let saltJson = await response.json();
    let salt = saltJson.Data;

    modernPasswordHash = await hashPasswordForLoginModern(password, salt);
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

    await getPrivateKey(password);
    if (globalPrivateKey == -1) {
        alert("Failed to get private key!");
        return;
    }

    loginDiv = document.getElementById("login");
    if (loginDiv != null) {
        loginDiv.parentNode.removeChild(loginDiv);
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

async function getPrivateKey(password) {
    response = await fetch("./key", {
        method: 'PUT',
        body: JSON.stringify({
            IDT: globalAccessToken,
            Data: "unused",
        }),
        headers: {
            'Content-type': 'application/json'
        }
    })
    if (!response.ok) {
        throw response.status;
    }
    const keyData = await response.json();
    globalPrivateKey = await unwrapPrivateKey(password, keyData.Data);
}

// Section: Locate

function showLocateDropDown() {
    document.getElementById("locateDropDown").style.display = "block";
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

    if (requestedIndex > newestLocationDataIndex) {
        currentLocationDataIndx = newestLocationDataIndex; // reset
        const toasted = new Toasted({
            position: 'top-center',
            duration: 3000
        })
        toasted.show('No newer locations');
        return
    }

    if (requestedIndex == -1) {
        requestedIndex = newestLocationDataIndex;
        currentLocationDataIndx = newestLocationDataIndex;
    }

    if (requestedIndex < 0) {
        setNoLocationDataAvailable("No data available");
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
    var loc;
    try {
        loc = await parseLocation(globalPrivateKey, locationData);
    } catch (error) {
        console.log(error);
        setNoLocationDataAvailable("Error parsing location data");
        return;
    }
    const time = new Date(loc.time);

    document.getElementsByClassName("deviceInfo")[0].style.display = "block";
    document.getElementById("idView").innerHTML = currentId;
    document.getElementById("dateView").innerHTML = time.toLocaleDateString();
    document.getElementById("timeView").innerHTML = time.toLocaleTimeString();
    document.getElementById("providerView").innerHTML = loc.provider;
    document.getElementById("batView").innerHTML = loc.bat + " %";

    const target = L.latLng(loc.lat, loc.lon);
    markers.clearLayers();
    L.marker(target).addTo(markers);
    map.setView(target, 16);
}

function setNoLocationDataAvailable(text) {
    document.getElementsByClassName("deviceInfo")[0].style.display = "block";
    document.getElementById("idView").innerHTML = currentId;
    document.getElementById("dateView").innerHTML = text;
    document.getElementById("timeView").innerHTML = text;
    document.getElementById("providerView").innerHTML = text;
    document.getElementById("batView").innerHTML = "? %";
}

document.addEventListener("keydown", function (event) {
    // Don't interfere with navigating the map view
    if (document.activeElement.id != "map") {
        cycleThroughLocationsWithArrowKeys(event);
    }
});

function cycleThroughLocationsWithArrowKeys(event) {
    if (event.keyCode == KEYCODE_ARROW_LEFT) {
        locateOlder();
    } else if (event.keyCode == KEYCODE_ARROW_RIGHT) {
        locateNewer();
    }
}

async function locateOlder() {
    if (globalPrivateKey != null && currentLocationDataIndx > 0) {
        currentLocationDataIndx -= 1;
        await locate(currentLocationDataIndx);
    } else {
        currentLocationDataIndx = newestLocationDataIndex;
    }
}

async function locateNewer() {
    if (globalPrivateKey != null) {
        currentLocationDataIndx += 1;
        await locate(currentLocationDataIndx);
    }
}

// Section: Command

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

// Section: Picture

async function showLatestPicture() {
    if (!globalAccessToken) {
        console.log("Missing accessToken!");
        return;
    }
    const response = await fetch("./pictureSize", {
        method: 'PUT',
        body: JSON.stringify({
            IDT: globalAccessToken,
            Data: ""
        }),
        headers: {
            'Content-type': 'application/json'
        }
    });
    if (!response.ok) {
        throw response.status;
    }
    const json = await response.json();
    if (json.Data == "0") {
        const toasted = new Toasted({
            position: 'top-center',
            duration: 3000
        })
        toasted.show('No picture available')
        return;
    }
    newestPictureSize = parseInt(json.Data, 10);
    newestPictureIndex = newestPictureSize - 1
    currentPictureIndex = newestPictureSize - 1;
    await loadPicture(currentPictureIndex);
}

async function loadPicture(index) {
    if (!globalAccessToken) {
        console.log("Missing accessToken!");
        return;
    }
    const response = await fetch("./picture", {
        method: 'PUT',
        body: JSON.stringify({
            IDT: globalAccessToken,
            Data: index.toString()
        }),
        headers: {
            'Content-type': 'application/json'
        }
    });
    if (!response.ok) {
        throw response.status;
    }
    const data = await response.text();
    const picture = await parsePicture(globalPrivateKey, data);
    displaySinglePicture(picture);
}

function displaySinglePicture(picture) {
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
}

// Section: Camera

function showCameraDropDown() {
    document.getElementById("cameraDropDown").style.display = "block";
}

// Section: Welcome popup

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
    document.cookie = "welcome=true;" + expires + ";path=/;SameSite=Strict";
    welcomePrompt = document.getElementById('welcomePrompt');
    welcomePrompt.style.visibility = 'hidden';
}

// Section: Delete device

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
        if (event.keyCode == KEYCODE_ENTER) {
            if (input.value != "") {
                submit(input.value);
            }
        }
    }, false);

}
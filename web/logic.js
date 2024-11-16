var map, markers;

var newestLocationDataIndex;
var currentLocationDataIndx = 0;
var locCache = new Map();

var currentId;
var globalPrivateKey;
var globalAccessToken = "";

var newestPictureIndex;
var currentPictureIndex;

const KEYCODE_ENTER = 13;
const KEYCODE_ARROW_LEFT = 37;
const KEYCODE_ARROW_RIGHT = 39;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

window.addEventListener("load", (event) => init());

window.onclick = function (event) {
    // hide the dropdowns if clicking outside of their respective buttons
    if (event.target.id != "cameraDropDownButtonInner") {
        document.getElementById("cameraDropDown").style.display = "None";
    }
    if (event.target.id != "locateDropDownButtonInner") {
        document.getElementById("locateDropDown").style.display = "None";
    }
    if (event.target.id != "settingsDropDownButtonInner") {
        document.getElementById("settingsDropDown").style.display = "None";
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

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    var target = L.latLng('57', '13');
    map.setView(target, 1.5);

    var versionView = document.getElementById('version');
    fetch("api/v1/version", {
        method: 'GET'
    })
        .then(function (response) {
            return response.text();
        })
        .then(function (versionCode) {
            versionView.textContent = versionCode;
        })

    setupOnClicks()
    checkWebCryptoApiAvailable()
}

function setupOnClicks() {
    document.getElementById("loginForm").addEventListener("submit", async (event) => {
        // don't send a request to the server, we do it manually
        event.preventDefault();

        let fmdid = document.getElementById("fmdid").value;
        let password = document.getElementById("password").value;
        let useLongSession = document.getElementById("useLongSession").checked;
        await doLogin(fmdid, password, useLongSession);

        return false;
    });

    document.getElementById("locateOlder").addEventListener("click", async () => await locateOlder());
    document.getElementById("locateNewer").addEventListener("click", async () => await locateNewer());
    document.getElementById("locate").addEventListener("click", () => showLocateDropDown());
    document.getElementById("locateAll").addEventListener("click", () => sendToPhone("locate"));
    document.getElementById("locateGps").addEventListener("click", () => sendToPhone("locate gps"));
    document.getElementById("locateCellular").addEventListener("click", () => sendToPhone("locate cell"));
    document.getElementById("locateLast").addEventListener("click", () => sendToPhone("locate last"));
    document.getElementById("ring").addEventListener("click", () => sendToPhone("ring"));
    document.getElementById("lock").addEventListener("click", () => sendToPhone("lock"));
    document.getElementById("delete").addEventListener("click", () => prepareDeleteDevice());
    document.getElementById("cameraFront").addEventListener("click", () => sendToPhone("camera front"));
    document.getElementById("cameraBack").addEventListener("click", () => sendToPhone("camera back"));
    document.getElementById("takePicture").addEventListener("click", () => showCameraDropDown());
    document.getElementById("openSettings").addEventListener("click", () => showSettingsDropDown());
    document.getElementById("showPicture").addEventListener("click", async () => await showLatestPicture());
    //Disabled Feature: CommandLogs
    //document.getElementById("showCommandLogs").addEventListener("click", async () => await showCommandLogs());

    document.getElementById("deleteAccount").addEventListener("click", async () => await deleteAccount());
    document.getElementById("exportData").addEventListener("click", async () => await exportData());

}

function checkWebCryptoApiAvailable() {
    if (typeof (window.crypto.subtle) == "undefined") {
        alert("FMD Server won't work because the WebCrypto API is not available.\n\n"
            + "This is most likely because you are visiting this site over insecure HTTP. "
            + "Please use HTTPS. If you are self-hosting, see the README.");
    }
}

// Section: Login

const DURATION_DEFAULT_SECS = 15 * 60;      // 15 mins
const DURATION_LONG_SECS = 7 * 24 * 60 * 60 // 1 week

async function doLogin(fmdid, password, useLongSession) {
    let sessionDurationSeconds = DURATION_DEFAULT_SECS;
    if (useLongSession) {
        sessionDurationSeconds = DURATION_LONG_SECS;
    }

    currentId = fmdid;
    if (password == "") {
        alert("Password is empty.");
        return;
    }

    let response = await fetch("api/v1/salt", {
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

    try {
        await tryLoginWithHash(fmdid, modernPasswordHash, sessionDurationSeconds);
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

    await getPrivateKey(password);
    if (globalPrivateKey == -1) {
        alert("Failed to get private key!");
        return;
    }

    loginDiv = document.getElementById("loginContainer");
    if (loginDiv != null) {
        loginDiv.parentNode.removeChild(loginDiv);
    }

    setupPushWarning();

    await locate(-1);
}

async function tryLoginWithHash(fmdid, passwordHash, sessionDurationSeconds) {
    const response = await fetch("api/v1/requestAccess", {
        method: 'PUT',
        body: JSON.stringify({
            IDT: fmdid,
            Data: passwordHash,
            SessionDurationSeconds: sessionDurationSeconds,
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
    response = await fetch("api/v1/key", {
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

async function redirectToLogin(toastMessage) {
    const toasted = new Toasted({
        position: 'top-center',
        duration: 3000
    })
    toasted.show(toastMessage);

    await sleep(3000);

    window.location.replace("/");
}

async function tokenExpiredRedirect() {
    redirectToLogin('Session expired, please log in again.');
}

// Section: Push Warning

async function setupPushWarning() {
    const pushUrl = await getPushUrl(globalAccessToken);

    const ele = document.getElementById("pushWarning");
    if (pushUrl) {
        ele.textContent = ""
    } else {
        ele.innerHTML = `
            <p>
                It looks like UnifiedPush is not configured for this device.
                Without push, FMD Server cannot control the device.
                See <a href="https://gitlab.com/Nulide/findmydevice/-/wikis/PushSupport" target="_blank">the wiki</a> for more information.
            </p>
        `
    }
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
    let response = await fetch("api/v1/locationDataSize", {
        method: 'PUT',
        body: JSON.stringify({
            IDT: globalAccessToken,
            Data: "unused",
        }),
        headers: {
            'Content-type': 'application/json'
        }
    });
    if (response.status == 401) {
        tokenExpiredRedirect();
        return
    }
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

    response = await fetch("api/v1/location", {
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
    // Check if location is already in cache
    // If not add the location and rearrange the items
    if (!locCache.has(currentLocationDataIndx)) {
        locCache.set(currentLocationDataIndx, loc);

        const mapArray = Array.from(locCache);

        const sortedByKeyArray = mapArray.sort((a, b) => a[0] - b[0]);

        locCache = new Map(sortedByKeyArray);
    }


    const time = new Date(loc.time);

    document.getElementsByClassName("deviceInfo")[0].style.display = "block";
    document.getElementById("idView").textContent = currentId;
    document.getElementById("dateView").textContent = time.toLocaleDateString();
    document.getElementById("timeView").textContent = time.toLocaleTimeString();
    document.getElementById("providerView").textContent = loc.provider;
    document.getElementById("batView").textContent = loc.bat + " %";

    lat_long = []   // All locations in an array. Needed for the line between points.
    markers.clearLayers();

    //Iterate through the cache and add every point to the map
    locCache.forEach((locEntry, key) => {
        target = L.latLng(locEntry.lat, locEntry.lon);
        lat_long.push(target)
        locTime = new Date(locEntry.time);
        L.marker(target).bindTooltip(time.toLocaleString()).addTo(markers);
    });
    // Add the lines between the points
    L.polyline(lat_long, { color: 'blue' }).addTo(markers);
    //Zoom to the currently selected point
    target = L.latLng(loc.lat, loc.lon);
    map.setView(target, 16);
}

function setNoLocationDataAvailable(text) {
    document.getElementsByClassName("deviceInfo")[0].style.display = "block";
    document.getElementById("idView").textContent = currentId;
    document.getElementById("dateView").textContent = text;
    document.getElementById("timeView").textContent = text;
    document.getElementById("providerView").textContent = text;
    document.getElementById("batView").textContent = "? %";
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
        currentLocationDataIndx = 0;
    }
}

async function locateNewer() {
    if (globalPrivateKey != null) {
        currentLocationDataIndx += 1;
        await locate(currentLocationDataIndx);
    }
}

// Section: Command

async function sendToPhone(message) {
    if (!globalAccessToken) {
        console.log("Missing accessToken!");
        return;
    }

    response = await fetch("api/v1/command", {
        method: 'POST',
        body: JSON.stringify({
            IDT: globalAccessToken,
            Data: message,
        }),
        headers: {
            'Content-type': 'application/json'
        }
    });
    if (response.status == 401) {
        tokenExpiredRedirect();
        return
    }
    if (!response.ok) {
        throw response.status;
    }
    var toasted = new Toasted({
        position: 'top-center',
        duration: 2000
    });
    toasted.show('Command send!');
}

async function showCommandLogs() {
    if (!globalAccessToken) {
        console.log("Missing accessToken!");
        return;
    }

    response = await fetch("api/v1/commandLogs", {
        method: 'PUT',
        body: JSON.stringify({
            IDT: globalAccessToken,
            Data: "",
        }),
        headers: {
            'Content-type': 'application/json'
        }
    });
    if (response.status == 401) {
        tokenExpiredRedirect();
        return
    }
    if (!response.ok) {
        throw response.status;
    }
    const json = await response.json();
    logs = await parseCommandLogs(globalPrivateKey, json.Data);
    displayCommandLogs(logs)
}
// Section: Picture

async function showLatestPicture() {
    if (!globalAccessToken) {
        console.log("Missing accessToken!");
        return;
    }
    const response = await fetch("api/v1/pictureSize", {
        method: 'PUT',
        body: JSON.stringify({
            IDT: globalAccessToken,
            Data: ""
        }),
        headers: {
            'Content-type': 'application/json'
        }
    });
    if (response.status == 401) {
        tokenExpiredRedirect();
        return
    }
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
    const newestPictureSize = parseInt(json.Data, 10);
    newestPictureIndex = newestPictureSize - 1
    currentPictureIndex = newestPictureSize - 1;
    await loadPicture(currentPictureIndex);
}

async function loadPicture(index) {
    if (!globalAccessToken) {
        console.log("Missing accessToken!");
        return;
    }
    const response = await fetch("api/v1/picture", {
        method: 'PUT',
        body: JSON.stringify({
            IDT: globalAccessToken,
            Data: index.toString()
        }),
        headers: {
            'Content-type': 'application/json'
        }
    });
    if (response.status == 401) {
        tokenExpiredRedirect();
        return
    }
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
    div.className = "center-column"

    // Picture header
    var titleDiv = document.createTextNode(`Image ${currentPictureIndex + 1} of ${newestPictureIndex + 1}`)
    div.appendChild(titleDiv)

    // Image view
    var img = document.createElement("img");
    img.id = "imageFromDevice"
    img.src = "data:image/jpeg;base64," + picture
    div.appendChild(img)

    // Button row
    var buttonDiv = document.createElement("div");

    // Back button
    var beforeBtn = document.createElement("button");
    beforeBtn.textContent = "<-"
    beforeBtn.addEventListener('click', function () {
        document.body.removeChild(div)
        currentPictureIndex -= 1;
        if (currentPictureIndex < 0) {
            currentPictureIndex = newestPictureIndex;
        }
        loadPicture(currentPictureIndex);
    }, false);
    buttonDiv.appendChild(beforeBtn)

    // Close button
    var btn = document.createElement("button");
    btn.textContent = "close"
    btn.addEventListener('click', function () {
        document.body.removeChild(div)
    }, false);
    buttonDiv.appendChild(btn)

    // Forward/next button
    var afterBtn = document.createElement("button");
    afterBtn.textContent = "->"
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

function displayCommandLogs(logs) {
    var div = document.createElement("div");
    div.classList.add("prompt");

    var logP = document.createElement("p");
    logP.id = "commandlogs"
    logP.innerHTML = logs;
    div.appendChild(logP);

    var buttonDiv = document.createElement("div");
    buttonDiv.className = "center";

    var btn = document.createElement("button");
    btn.textContent = "close";
    btn.addEventListener('click', function () {
        document.body.removeChild(div);
    }, false);
    buttonDiv.appendChild(btn);

    div.appendChild(buttonDiv);
    document.body.appendChild(div);
}

// Section: Camera

function showCameraDropDown() {
    document.getElementById("cameraDropDown").style.display = "block";
}

// Section: Settings

function showSettingsDropDown() {
    document.getElementById("settingsDropDown").style.display = "block";
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
    label.textContent = "Please enter the device pin:";
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

// Section: Delete Account

async function deleteAccount() {
    if (!confirm("Do you really want to delete this account and all associated data from the server?")) {
        const toasted = new Toasted({
            position: 'top-center',
            duration: 3000
        })
        toasted.show("Account deletion cancelled");
        return;
    }
    if (!globalAccessToken) {
        console.log("Missing accessToken!");
        return;
    }
    const response = await fetch("api/v1/device", {
        method: 'POST',
        body: JSON.stringify({
            IDT: globalAccessToken,
            Data: ""
        }),
        headers: {
            'Content-type': 'application/json'
        }
    });
    if (response.status == 401) {
        tokenExpiredRedirect();
        return;
    }
    if (!response.ok) {
        throw response.status;
    }
    redirectToLogin("Account deleted");
}

// Section: Export Data

async function exportData() {
    if (!globalAccessToken) {
        console.log("Missing accessToken!");
        return;
    }

    // Locations
    var response = await fetch("api/v1/locations", {
        method: 'POST',
        body: JSON.stringify({
            IDT: globalAccessToken,
            Data: ""
        }),
        headers: {
            'Content-type': 'application/json'
        }
    });
    if (response.status == 401) {
        tokenExpiredRedirect();
        return;
    }
    if (!response.ok) {
        throw response.status;
    }
    var locationsCSV = "Date,Provider,Battery Percentage,Longitude,Latitude\n";
    const locationsAsJSON = await response.json();
    for (locationJSON of locationsAsJSON) {
        loc = await parseLocation(globalPrivateKey, JSON.parse(locationJSON))
        locationsCSV += new Date(loc.time).toISOString() + "," + loc.provider + "," + loc.bat + "," + loc.lon + "," + loc.lat + "\n"
    }

    // Pictures
    response = await fetch("api/v1/pictures", {
        method: 'POST',
        body: JSON.stringify({
            IDT: globalAccessToken,
            Data: ""
        }),
        headers: {
            'Content-type': 'application/json'
        }
    });
    if (response.status == 401) {
        tokenExpiredRedirect();
        return
    }
    if (!response.ok) {
        throw response.status;
    }
    const picturesAsJSON = await response.json();
    var pictures = [];
    for (picture of picturesAsJSON) {
        pic = await parsePicture(globalPrivateKey, picture);
        pictures.push(pic);
    }

    // General info
    const pushUrl = await getPushUrl(globalAccessToken);
    const generalInfo = {
        "fmdId": currentId,
        "pushUrl": pushUrl,
    };

    // ZIP everything
    var zip = new JSZip();
    zip.file("info.json", JSON.stringify(generalInfo));
    zip.file("locations.csv", locationsCSV);
    var img = zip.folder("pictures");
    for ([index, pic] of pictures.entries()) {
        img.file(String(index) + ".png", pic, { base64: true });
    }
    const content = await zip.generateAsync({ type: "blob" });

    const formattedDate = new Date().toISOString().split('T')[0];

    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `fmd-export-${formattedDate}.zip`;

    // Append to the document and trigger download
    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
}
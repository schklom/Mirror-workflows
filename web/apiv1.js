// FMD Server API v1
// TODO: move more network APIs here, and leave logic.js for business and UI logic.

async function getPushUrl(accessToken) {
    if (!accessToken) {
        console.log("Missing accessToken!");
        throw "Missing accessToken!";
    }

    const response = await fetch("/push", {
        method: 'POST',
        body: JSON.stringify({
            IDT: accessToken,
            Data: "",
        }),
        headers: {
            'Content-type': 'application/json'
        }
    });
    if (response.status == 401) {
        tokenExpiredRedirect();
        throw "Token expired";
    }
    if (!response.ok) {
        throw response.status;
    }

    const pushUrl = await response.text();
    return pushUrl;
}

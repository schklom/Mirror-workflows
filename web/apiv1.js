// FMD Server API v1
// TODO: move more network APIs here, and leave logic.js for business and UI logic.

async function getPushUrl(accessToken) {
    if (!accessToken) {
        console.log("Missing accessToken!");
        throw Error("Missing accessToken!");
    }

    const response = await fetch("api/v1/push", {
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
        throw Error("Token expired");
    }
    if (!response.ok) {
        throw response.status;
    }

    const pushUrl = await response.text();
    return pushUrl;
}

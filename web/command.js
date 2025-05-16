async function parseCommandLogs(rsaCryptoKey, commandLogsData) {
    const logEntries = commandLogsData.split("\n")
    let logResult = ""
    for (let logEntry of logEntries) {
        if (logEntry != "") {
            const logData = await decryptPacket(rsaCryptoKey, logEntry);
            const logDataObj = JSON.parse(logData)
            const timestamp = new Date(parseInt(logDataObj.TimeStamp) * 1000);
            logResult += timestamp.toLocaleString() + ": " + logDataObj.Log + "\n"
        }
    }
    return logResult
}

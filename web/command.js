async function parseCommandLogs(rsaCryptoKey, commandLogsData) {
    logEntries = commandLogsData.split("\n")
    logResult = ""
    for (logEntry of logEntries) {
        if (logEntry != "") {
            logData = await decryptPacketModern(rsaCryptoKey, logEntry);
            logDataObj = JSON.parse(logData)
            timestamp = new Date(parseInt(logDataObj.TimeStamp)*1000);
            logResult += timestamp.toLocaleString()+": "+logDataObj.Log +"\n"
        }
    }
    return logResult
}
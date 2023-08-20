export function getBaseUrl() {
	const url = new URL(process.env.URL);
	return `${url.protocol}//${url.host}`;
}

export function proxyUrl(url: string) {
	if (process.env.PROXY === "false") return url;
	return `${getBaseUrl()}/api/proxy?url=${encodeURIComponent(url)}`;
}

export function convertToInstagramUrl(url: string): string {
	const urlObj = new URL(url);

	const startIdx = urlObj.hostname.indexOf(".") + 1;
	const endIdx = urlObj.hostname.lastIndexOf(".");
	const provider = urlObj.hostname.substring(startIdx, endIdx);

	switch (provider) {
		case "wizstat":
		case "picuki":
		case "imgsed":
			return urlObj.search.slice(1);
		case "pimg":
			return urlObj.searchParams.get("url") as string;
		case "instastories":
			return urlObj.pathname.replaceAll("/proxy/", "") + urlObj.search;
		default:
			return url;
	}
}

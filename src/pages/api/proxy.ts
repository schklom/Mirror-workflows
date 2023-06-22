import { randomUserAgent } from "@/services";
import { withExeptionFilter } from "@/utils/withExceptionFilter";
import axios, { HttpStatusCode } from "axios";
import type { NextApiRequest, NextApiResponse } from "next";
import { ApiError } from "next/dist/server/api-utils";

const SERVICESRGX = [
	/^https?:\/\/(?:.*\.)?(?:cdninstagram\.com|fbcdn\.net|instagram\.fmci2-1\.fna\.fbcdn\.net)\/.*/,
	/https:\/\/cdn\d+\.([a-zA-Z0-9-]+\.)+[a-zA-Z]+\/v1\/[a-zA-Z0-9]+\.(jpg|png|gif|mp4)/,
];

const getCleanReqHeaders = (headers: NextApiRequest["headers"]) => ({
	...(headers.accept && { accept: headers.accept }),
	...(headers.range && { range: headers.range }),
	...(headers["accept-encoding"] && {
		"accept-encoding": headers["accept-encoding"] as string,
	}),
});

const resHeadersArr = [
	"content-range",
	"content-length",
	"content-type",
	"accept-ranges",
];

async function proxy(req: NextApiRequest, res: NextApiResponse) {
	const url = req.query?.url as string | undefined;
	const requestHeaders = getCleanReqHeaders(req.headers);

	if (process.env.PROXY === "false") {
		throw new ApiError(
			HttpStatusCode.Locked,
			"Proxy is disabled in this instance",
		);
	}

	if (!url) {
		throw new ApiError(HttpStatusCode.BadRequest, "url is required");
	}

	const RGXRESULTS = SERVICESRGX.map((rgx) => rgx.test(url));

	if (!RGXRESULTS.includes(true)) {
		throw new ApiError(HttpStatusCode.BadRequest, "URL not supported");
	}

	const mediaRes = await axios.get(url, {
		responseType: "stream",
		headers: {
			...requestHeaders,
			"User-Agent": randomUserAgent,
			Host: new URL(url).host,
			Accept:
				"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
			"Accept-Language": "en-US,en;q=0.5",
			"Accept-Encoding": "gzip, deflate, br",
			DNT: 1,
			Connection: "keep-alive",
			"Upgrade-Insecure-Requests": 1,
			"Sec-Fetch-Dest": "document",
			"Sec-Fetch-Mode": "navigate",
			"Sec-Fetch-Site": "none",
			"Sec-Fetch-User": "?1",
		},
	});

	res.statusCode = 206;
	resHeadersArr.forEach((key) => {
		const val = mediaRes.headers[key] as string;
		if (val) res.setHeader(key, val);
	});

	mediaRes.data.pipe(res);
	return;
}

export default async function apiHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	await withExeptionFilter(req, res)(proxy);
}

export const config = {
	api: {
		responseLimit: false,
	},
};

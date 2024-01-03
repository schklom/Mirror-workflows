import axios, { HttpStatusCode } from "axios";
import { ApiError } from "next/dist/server/api-utils";
import { randomUserAgent } from "@/services";
import { withExeptionFilter } from "@/utils/withExceptionFilter";
import { NextApiRequest, NextApiResponse } from "next";
import { env } from "env.mjs";

const SERVICESRGX = [
	/^https?:\/\/(?:.*\.)?(?:cdninstagram\.com|fbcdn\.net|instagram\.fmci2-1\.fna\.fbcdn\.net)\/.*/,
	/https:\/\/cdn\d+\.([a-zA-Z0-9-]+\.)+[a-zA-Z]+\/v1\/[a-zA-Z0-9]+\.(jpg|png|gif|mp4)/,
	/^https?:\/\/([a-zA-Z\d-]+\.)?[a-zA-Z\d-]+\.[a-zA-Z]{2,6}\/U2FsdGVkX[a-zA-Z\d-%]*$/,
];

const getCleanReqHeaders = (headers: NextApiRequest["headers"]) => ({
	...(headers.accept && { accept: headers.accept }),
	...(headers.range && { range: headers.range }),
	...(headers["accept-encoding"] && {
		"accept-encoding": headers["accept-encoding"] as string,
	}),
});

const resHeadersArr = ["content-range", "content-length", "content-type", "accept-ranges"];

async function proxy(req: NextApiRequest, res: NextApiResponse) {
	const url = req.query?.url as string | undefined;
	const requestHeaders = getCleanReqHeaders(req.headers);

	if (!env.PROXY) {
		throw new ApiError(HttpStatusCode.Locked, "Proxy is disabled in this instance");
	}

	if (!url) {
		throw new ApiError(HttpStatusCode.BadRequest, "URL is required");
	}

	const RGXRESULTS = SERVICESRGX.map((rgx) => rgx.test(url));

	if (!RGXRESULTS.includes(true)) {
		throw new ApiError(HttpStatusCode.BadRequest, "URL not supported");
	}

	const urlObj = new URL(url);
	const Referer = `${urlObj.protocol}//${urlObj.hostname}`;
	const mediaRes = await axios.get(url, {
		responseType: "stream",
		headers: {
			...requestHeaders,
			Host: urlObj.host,
			Referer,
			DNT: 1,
			Connection: "keep-alive",
			Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
			"User-Agent": randomUserAgent,
			"Accept-Language": "en-US,en;q=0.5",
			"Accept-Encoding": "gzip, deflate, br",
			"Cache-Control": "no-cache",
			"Sec-Fetch-Dest": "image",
			"Sec-Fetch-Mode": "no-cors",
			"Sec-Fetch-Site": "cross-site",
		},
	});

	const contentType = mediaRes.headers["content-type"] as string;
	const isPhoto = contentType.includes("image") || contentType === "application/download";

	res.statusCode = isPhoto ? 200 : 206;
	if (isPhoto) {
		res.setHeader("content-type", "image/jpeg");
	} else {
		resHeadersArr.forEach((key) => {
			const val = mediaRes.headers[key] as string;
			if (val) res.setHeader(key, val);
		});
	}

	mediaRes.data.pipe(res);
	return;
}

export default async function apiHandler(req: NextApiRequest, res: NextApiResponse) {
	await withExeptionFilter(req, res)(proxy);
}

export const config = {
	api: {
		responseLimit: false,
	},
};

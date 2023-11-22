import emere from '@stormking/emere';
import { FetchParams } from '../util/types.js';
const userAgent = process.env.USER_AGENT || 'Feedropolis RSS Generator';

export default function(loadParams: FetchParams) {
	const headers = { ...(loadParams.headers || {}) };
	if (loadParams.cookies) {
		headers.Cookie = loadParams.cookies;
	}
	const params: emere.RunScript = {
		url: loadParams.url,
		header: headers,
		waitAfterLoad: loadParams.waitTime,
		waitForSelector: loadParams.waitForSelector,
		userAgent,
		timeout: 10000
	};
	if (loadParams.body) {
		params.body = loadParams.body;
		params.method = 'POST';
	}
	return emere.default(params)
}

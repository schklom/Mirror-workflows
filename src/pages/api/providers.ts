import redis from "@/utils/redis";
import axios from "axios";
import { Provider } from "@/services/types/provider";
import { convertTTlToTimestamp } from "@/utils/converters/time";
import { withExeptionFilter } from "@/utils/withExceptionFilter";
import { NextApiRequest, NextApiResponse } from "next";
import { env } from "@/utils/env.mjs";

async function Providers(
	_req: NextApiRequest,
	res: NextApiResponse<Provider[]>,
) {
	const providers = await getProviders();
	res.json(providers);
}

async function getProviders() {
	const cachedProviders = await redis.get("providers");
	if (cachedProviders) {
		const providers = JSON.parse(cachedProviders) as Provider[];
		if (!env.USE_HEADLESS_PROVIDERS) {
			return providers.filter((provider) => !provider.headlessBrowser);
		}
		return providers;
	}

	const { data: providers } = await axios.get<Provider[]>(
		env.PROVIDERS_LIST_URL,
	);

	if (!env.FETCH_PROVIDERS) {
		await redis.set("providers", JSON.stringify(providers));
	} else {
		await redis.setex(
			"providers",
			convertTTlToTimestamp(env.FETCH_PROVIDERS_EVERY),
			JSON.stringify(providers),
		);
	}

	if (!env.USE_HEADLESS_PROVIDERS) {
		return providers.filter((provider) => !provider.headlessBrowser);
	}

	return providers;
}

export default async function apiHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	await withExeptionFilter(req, res)(Providers);
}

import UserAgent from "user-agents";
import { Greatfon } from "./greatfon";
import { Imgsed } from "./imgsed";
import { PlaywrightScraper } from "./scrapers/playwright";
import { AxiosScraper } from "./scrapers/axios";
import { convertTTlToTimestamp } from "@/utils/converters/time";
import { Wizstat } from "./wizstat";
import { Provider, ProviderCanGet } from "./types/provider";
import { axiosInstance } from "@/utils";

export const randomUserAgent = new UserAgent().toString();

export function getInstanceProviders(providers: Provider[]) {
	try {
		const providersInstances: (Greatfon | Wizstat | Imgsed)[] = [];

		providers.forEach((currentProvider) => {
			const keys = Object.keys(currentProvider.ttl);
			const values = Object.values(currentProvider.ttl);
			const scraperConfig = {
				baseURL: currentProvider.url,
				ttl: {
					...Object.fromEntries(
						keys.map((_, i) => [keys[i], convertTTlToTimestamp(values[i])]),
					),
				},
			};

			switch (currentProvider.provider) {
				case "Greatfon":
					providersInstances.push(
						new Greatfon(
							currentProvider.headlessBrowser
								? new PlaywrightScraper(scraperConfig)
								: new AxiosScraper(scraperConfig),
						),
					);
					break;
				case "Wizstat":
					providersInstances.push(
						new Wizstat(
							currentProvider.headlessBrowser
								? new PlaywrightScraper(scraperConfig)
								: new AxiosScraper(scraperConfig),
						),
					);
					break;
				case "Imgsed":
					providersInstances.push(
						new Imgsed(
							currentProvider.headlessBrowser
								? new PlaywrightScraper(scraperConfig)
								: new AxiosScraper(scraperConfig),
						),
					);
					break;
			}
		});

		return providersInstances;
	} catch (error) {
		throw new Error("Could not get the instances");
	}
}

export async function getRandomProvider<T>(canget: ProviderCanGet) {
	const { data: providers } = await axiosInstance.get<Provider[]>("/providers");
	const filteredProviders = providers.filter((provider) =>
		provider.canget.includes(canget),
	);
	const RANDOM_PROVIDER_ID = Math.floor(
		Math.random() * filteredProviders.length,
	);
	return getInstanceProviders(filteredProviders)[RANDOM_PROVIDER_ID] as T;
}

import UserAgent from "user-agents";
import { Greatfon } from "./greatfon";
import { Imgsed } from "./imgsed";
import { PlaywrightScraper } from "./scrapers/playwright";
import { AxiosScraper } from "./scrapers/axios";
import { convertTTlToTimestamp } from "@/utils/converters/time";
import { Wizstat } from "./wizstat";
import { Provider, ProviderCanGet } from "./types/provider";
import { axiosInstance } from "@/utils";
import { InstaStories } from "./instastories";
import { StoriesIG } from "./storiesig";
import { Iganony } from "./iganony";
import { InstaNavigation } from "./instanavigation";

export const randomUserAgent = new UserAgent().toString();

export function getInstanceProviders(providers: Provider[]) {
	const providersInstances: (
		| Greatfon
		| Wizstat
		| Imgsed
		| InstaStories
		| StoriesIG
		| Iganony
		| InstaNavigation
	)[] = [];

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
			case "Instastories":
				providersInstances.push(
					new InstaStories(
						currentProvider.headlessBrowser
							? new PlaywrightScraper(scraperConfig)
							: new AxiosScraper(scraperConfig),
					),
				);
				break;
			case "Storiesig":
				providersInstances.push(
					new StoriesIG(
						currentProvider.headlessBrowser
							? new PlaywrightScraper(scraperConfig)
							: new AxiosScraper(scraperConfig),
					),
				);
				break;
			case "Iganony":
				providersInstances.push(new Iganony(new AxiosScraper(scraperConfig)));
				break;
			case "Instanavigation":
				providersInstances.push(
					new InstaNavigation(
						currentProvider.headlessBrowser
							? new PlaywrightScraper(scraperConfig)
							: new AxiosScraper(scraperConfig),
					),
				);
		}
	});

	return providersInstances;
}

export async function getRandomProvider<T>(canget: ProviderCanGet) {
	const providers = await getProviders();
	const filteredProviders = providers.filter((provider) =>
		provider.canget.includes(canget),
	);
	const RANDOM_PROVIDER_ID = Math.floor(
		Math.random() * filteredProviders.length,
	);
	return getInstanceProviders(filteredProviders)[RANDOM_PROVIDER_ID] as T;
}

export async function getProviders() {
	const { data: providers } = await axiosInstance.get<Provider[]>("/providers");
	return providers;
}

export async function getRandomFilteredProvider<T>(
	callback: (value: Provider, index: number, array: Provider[]) => unknown,
) {
	const providers = await getProviders();
	const filteredProviders = providers.filter(callback);
	const RANDOM_PROVIDER_ID = Math.floor(
		Math.random() * filteredProviders.length,
	);
	return getInstanceProviders(filteredProviders)[RANDOM_PROVIDER_ID] as T;
}

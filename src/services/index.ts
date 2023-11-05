import UserAgent from "user-agents";
import { Imgsed } from "./imgsed";
import { Iganony } from "./iganony";
import { Wizstat } from "./wizstat";
import { Greatfon } from "./greatfon";
import { StoriesIG } from "./storiesig";
import { InstaStories } from "./instastories";
import { AxiosScraper } from "./scrapers/axios";
import { axiosInstance } from "@/utils";
import { InstaNavigation } from "./instanavigation";
import { PlaywrightScraper } from "./scrapers/playwright";
import { Provider, ProviderCanGet } from "./types/provider";
import { StoriesDown } from "./storiesdown";

export const randomUserAgent = new UserAgent().toString();

export const supportedProviders = [
	"Greatfon",
	"Wizstat",
	"Imgsed",
	"Instastories",
	"Storiesig",
	"Iganony",
	"Instanavigation",
	"Storiesdown",
];

export function getInstanceProviders(providers: Provider[]) {
	const providersInstances: unknown[] = [];

	providers.forEach((currentProvider) => {
		const scraperConfig = {
			baseURL: currentProvider.url,
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
			case "Storiesdown":
				providersInstances.push(
					new StoriesDown(
						currentProvider.headlessBrowser
							? new PlaywrightScraper(scraperConfig)
							: new AxiosScraper(scraperConfig),
					),
				);
			default:
				return;
		}
	});

	return providersInstances;
}

export async function getRandomProvider<T>(canget: ProviderCanGet) {
	const providers = await getProviders();
	const filteredProviders = providers.filter((provider) => provider.canget.includes(canget));
	const providerInstances = getInstanceProviders(filteredProviders);
	const RANDOM_PROVIDER_ID = Math.floor(Math.random() * providerInstances.length);
	return providerInstances[RANDOM_PROVIDER_ID] as T;
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

	const providerInstances = getInstanceProviders(filteredProviders);
	const RANDOM_PROVIDER_ID = Math.floor(Math.random() * providerInstances.length);
	return providerInstances[RANDOM_PROVIDER_ID] as T;
}

import { SearchForm } from "@/components/SearchForm";
import { Layout } from "@/components/layouts/Layout";

export default function Home() {
	const meta = {
		title: "Home",
		description:
			"Proxigram, an alternative open sorce front-end for Instagram focused on privacy. Watch Instagram accounts without an account and privatly",
	};

	return (
		<Layout className="flex h-96 flex-col justify-center" meta={meta}>
			<h2 className="pb-1 text-center text-4xl font-extrabold text-[#69463d]">
				Welcome to Proxigram!
			</h2>
			<p className="mx-2 text-center text-lg">
				An alternative open source frontend for Instagram
			</p>
			<SearchForm />
		</Layout>
	);
}

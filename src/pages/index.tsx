import { SearchForm } from "@/components/SearchForm";
import { Layout } from "@/components/layouts/Layout";

export default function Home() {
	const meta = {
		title: "Home",
		description:
			"Proxigram, an open source alternative frontend for Instagram. View Instagram profiles privately without an account",
	};

	return (
		<Layout className="flex h-96 flex-col justify-center" meta={meta}>
			<h2 className="pb-1 text-center text-4xl font-extrabold text-[#69463d]">
				Welcome to Proxigram!
			</h2>
			<p className="mx-2 text-center text-lg">
				An open source alternative frontend for Instagram
			</p>
			<SearchForm />
		</Layout>
	);
}

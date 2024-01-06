import { Layout } from "@/components/layouts/Layout";
import NextError from "next/error";

export default function Page404() {
	return (
		<Layout
			meta={{
				title: "We couldn't find what you're looking for",
				description: "We couldn't find what you're looking for",
			}}
		>
			<NextError statusCode={404} title="We couldn't find what you're looking for" />
		</Layout>
	);
}

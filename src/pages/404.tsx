import { Layout } from "@/components/layouts/Layout";
import NextError from "next/error";

export default function Page404() {
	return (
		<Layout>
			<NextError
				statusCode={404}
				title="We couldn't find what your looking for"
			/>
		</Layout>
	);
}

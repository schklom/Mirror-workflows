import ProgressBar from "@/components/ProgressBar";
import useIsPageLoading from "@/hooks/usePageLoading";
import "@/styles/globals.css";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
	const { isPageLoading } = useIsPageLoading();
	return (
		<>
			{isPageLoading && <ProgressBar />}
			<Component {...pageProps} />
		</>
	);
}

/*
    Thanks to https://github.com/zyachel
*/

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";

const useIsPageLoading = () => {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);

	const handleStart = useCallback(() => setIsLoading(true), []);
	const handleEnd = useCallback(() => setIsLoading(false), []);

	useEffect(() => {
		router.events.on("routeChangeStart", handleStart);
		router.events.on("routeChangeComplete", handleEnd);
		router.events.on("routeChangeError", handleEnd);

		return () => {
			router.events.off("routeChangeStart", handleStart);
			router.events.off("routeChangeComplete", handleEnd);
			router.events.off("routeChangeError", handleEnd);
		};
	}, [router, handleStart, handleEnd]);

	return { isPageLoading: isLoading, key: router.asPath };
};

export default useIsPageLoading;

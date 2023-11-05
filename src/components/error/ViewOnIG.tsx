import { useRouter } from "next/router";

export function ViewOnIG() {
	const {
		asPath,
		query: { tag },
	} = useRouter();
	const originalUrl = tag
		? `https://instagram.com/explorer/tag/${tag}`
		: `https://instagram.com${asPath}`;
	return (
		<a href={originalUrl} target="_blank" rel="noreferrer" className="text-[#fa3550] font-bold">
			View this page on Instagram
		</a>
	);
}

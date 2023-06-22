import { useRouter } from "next/router";
import Link from "next/link";

export function LoadMore({ cursor }: { cursor: string }) {
	const router = useRouter();

	return (
		<div className="flex justify-center">
			<Link
				href={`/${router.query.username}?cursor=${cursor}`}
				className="rounded-sm bg-[#69463d] p-2 m-2 text-white"
			>
				Load more
			</Link>
		</div>
	);
}

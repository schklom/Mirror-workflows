import {
	IconCode,
	IconInfoCircle,
	IconRss,
	IconSettings,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import Link from "next/link";

export function Header() {
	const { asPath, query } = useRouter();

	return (
		<header className="flex h-16 items-center justify-between bg-[#69463d] px-2 text-white shadow-sm shadow-slate-500">
			<h1 className="text-xl font-extrabold">
				<Link href="/">Proxigram</Link>
			</h1>
			<nav>
				<ul className="flex gap-2">
					{query.username && (
						<li>
							<Link href={`${asPath}/rss`} target="_blank">
								<IconRss className="h-6 w-6" />
							</Link>
						</li>
					)}
					<li>
						<Link href="/+/settings">
							<IconSettings className="h-6 w-6" />
						</Link>
					</li>
					<li>
						<Link href="/+/about">
							<IconInfoCircle className="h-6 w-6" />
						</Link>
					</li>
					<li>
						<Link
							href="https://codeberg.org/ThePenguinDev/proxigram"
							target="_blank"
						>
							<IconCode className="h-6 w-6" />
						</Link>
					</li>
				</ul>
			</nav>
		</header>
	);
}

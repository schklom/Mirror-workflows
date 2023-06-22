import { IconCode, IconInfoCircle, IconSettings } from "@tabler/icons-react";
import Link from "next/link";

export function Header() {
	return (
		<header className="flex h-16 items-center justify-between bg-[#69463d] px-2 text-white shadow-sm shadow-slate-500">
			<h1 className="text-xl font-extrabold">
				<Link href="/">Proxigram</Link>
			</h1>
			<nav>
				<ul className="flex gap-2">
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

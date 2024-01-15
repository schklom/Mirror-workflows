import { IconSearch } from "@tabler/icons-react";
import { useRouter } from "next/router";
import type { FormEvent } from "react";

export function SearchForm() {
	const router = useRouter();

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		const formData = new FormData(e.currentTarget);
		const query = formData.get("q")?.toString();
		if (query) {
			try {
				const url = new URL(query);
				router.push(url.pathname);
			} catch (error) {
				if (query.startsWith("@")) {
					router.push(`/${query.slice(1)}`);
					return;
				} else if (query.startsWith("#")) {
					router.push(`/tag/${query.slice(1)}`);
					return;
				}
				router.push(`/search?q=${query.toLowerCase()}`);
			}
		}
	};

	return (
		<form
			className="flex flex-col gap-2 p-4 sm:flex-row sm:justify-center"
			onSubmit={handleSubmit}
			action="/search"
			method="get"
		>
			<input
				type="text"
				placeholder="Search..."
				className="rounded border-[#fa3550] p-2 ring-2 ring-[#fa3550] placeholder:italic focus:outline-none"
				required
				name="q"
			/>
			<button
				className="flex justify-center rounded border-[#7fd4a2] p-2 ring-2 ring-[#7fd4a2] transition-colors duration-300 hover:bg-[#7fd4a2] hover:text-white"
				type="submit"
			>
				<IconSearch className="h-5 w-5" />
			</button>
		</form>
	);
}

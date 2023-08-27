import { useRouter } from "next/router";
import { Layout } from "../layouts/Layout";
import NextError from "next/error";

type Props = {
	statusCode: number;
};

export function ErrorInfo({ statusCode }: Props) {
	const { asPath } = useRouter();

	const is404 = statusCode === 404;
	const is403 = statusCode === 403;

	const originalUrl = `https://instagram.com/${asPath}`;
	const msg = is403
		? "This instance is being blocked"
		: is404
		? "We couldn't find what your looking for"
		: "Internal server error";

	return (
		<Layout
			meta={{
				title: msg,
				description: msg,
			}}
			className="h-screen p-8 flex flex-col items-center"
		>
			{is404 && (
				<NextError
					statusCode={404}
					title="We couldn't find what your looking for"
				/>
			)}

			{is403 && (
				<>
					<h2 className="text-5xl font-bold m-4 text-center">403</h2>
					<h1 className="text-2xl font-bold mb-4 text-center">
						This instance is being blocked
					</h1>
					<p className="text-center">
						You could try refreshing the page to select another random provider
						or you could:
					</p>
					<ul className="list-disc m-5 pl-10">
						<li>
							<a
								href="https://codeberg.org/ThePenguinDev/proxigram/wiki/Instances"
								target="_blank"
								rel="noreferrer"
								className="text-[#fa3550] font-bold"
							>
								Use another instance
							</a>
						</li>
						<li>
							<a
								href="https://codeberg.org/ThePenguinDev/Proxigram#user-content-installation"
								target="_blank"
								rel="noreferrer"
								className="text-[#fa3550] font-bold"
							>
								Set up your own instance
							</a>
						</li>
						<li>
							<a
								href={originalUrl}
								target="_blank"
								rel="noreferrer"
								className="text-[#fa3550] font-bold"
							>
								View this page on Instagram
							</a>
						</li>
					</ul>
					<p className="text-center">
						Check out{" "}
						<a
							href="https://pixelfed.org"
							target="_blank"
							rel="noreferrer"
							className="text-[#fa3550] font-bold"
						>
							Pixelfed
						</a>{" "}
						for an alternative to Instagram.
					</p>
				</>
			)}
		</Layout>
	);
}

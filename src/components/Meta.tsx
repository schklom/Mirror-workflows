import Head from "next/head";

type Props = {
	title: string;
	description: string;
};

export function Meta({ title, description }: Props) {
	const defaultTitle = `${title} • Proxigram`;

	return (
		<Head>
			<meta charSet="UTF-8" />
			<meta httpEquiv="X-UA-Compatible" content="IE=edge" />
			<meta name="viewport" content="width=device-width, initial-scale=1.0" />

			<title key="title">{defaultTitle}</title>
			<meta key="desc" name="description" content={description} />
			<link rel="icon" href="/favicon.ico" />

			<meta property="og:title" content={defaultTitle} />
			<meta property="og:description" content={description} />
		</Head>
	);
}

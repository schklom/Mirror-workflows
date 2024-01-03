import { GetServerSidePropsContext } from "next";
import { RSS } from "@/utils/rss";
import { env } from "env.mjs";

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
	if (!env.RSS) {
		ctx.res.write("RSS is disabled");
		ctx.res.end();
		return {
			props: {},
		};
	}

	const username = ctx.params?.username as string;
	const rss = new RSS();
	const feedString = await rss.getPosts(username);

	ctx.res.setHeader("Content-Type", "text/xml");
	ctx.res.write(feedString);
	ctx.res.end();

	return {
		props: {},
	};
};

const RSSPage = () => null;
export default RSSPage;

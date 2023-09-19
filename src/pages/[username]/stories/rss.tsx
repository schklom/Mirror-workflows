import { GetServerSidePropsContext } from "next";
import { RSS } from "@/utils/rss";

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
    if (process.env.RSS === "false") {
        ctx.res.write("RSS are disabled");
        ctx.res.end();
        return {
            props: {},
        };
    }

    const username = ctx.params?.username as string;
    const rss = new RSS();
    const feedString = await rss.getStories(username);

    ctx.res.setHeader("Content-Type", "text/xml");
    ctx.res.write(feedString);
    ctx.res.end();

    return {
        props: {},
    };
};

const RSSStoriesPage = () => null;
export default RSSStoriesPage;

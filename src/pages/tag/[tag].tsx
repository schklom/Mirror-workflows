import type {
	GetServerSidePropsContext,
	InferGetServerSidePropsType,
} from "next";
import "react-loading-skeleton/dist/skeleton.css";

import { LoadMore } from "@/components/LoadMore";
import { Layout } from "@/components/layouts/Layout";
import { SideInfo } from "@/components/profile";
import { Posts } from "@/components/profile/posts";
import { axiosInstance } from "@/utils";
import { TagResponse } from "@/services/types";

export default function Tag({
	tag,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
	const meta = {
		title: tag.tag,
		description: `See posts tagged with #${tag.tag} on Instagram privatly with Proxigram`,
	};

	return (
		<Layout className="h-screen" meta={meta}>
			<section className="h-full sm:grid sm:grid-flow-col">
				<SideInfo
					data={{
						name: tag.tag,
						image: {
							src: tag.image,
							alt: tag.tag,
						},
					}}
				/>
				<div>
					<Posts posts={tag.posts} />
					{tag.cursor && <LoadMore cursor={tag.cursor} />}
				</div>
			</section>
		</Layout>
	);
}

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
	const tag = ctx.params?.tag as string;
	const cursor = ctx.query.cursor as string;
	let data;

	if (cursor) {
		data = await axiosInstance.get<TagResponse>(`tag/${tag}?cursor=${cursor}`);
	} else {
		data = await axiosInstance.get<TagResponse>(`tag/${tag}`);
	}

	return {
		props: {
			tag: data.data,
		},
	};
};

import type { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import "react-loading-skeleton/dist/skeleton.css";

import { LoadMore } from "@/components/LoadMore";
import { Layout } from "@/components/layouts/Layout";
import { SideInfo } from "@/components/profile";
import { Posts } from "@/components/profile/posts";
import { axiosInstance } from "@/utils";
import { TagResponse } from "@/services/types";
import { isAxiosError } from "axios";
import { ErrorInfo } from "@/components/error/ErrorInfo";

type Props = InferGetServerSidePropsType<typeof getServerSideProps>;

export default function Tag({ tag, error }: Props) {
	if (error) return <ErrorInfo {...error} />;

	const meta = {
		title: tag.tag,
		description: `View posts tagged with #${tag.tag} on Instagram privately with Proxigram`,
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
					<Posts
						posts={{
							isError: 0,
							data: {
								posts: tag.posts,
								hasNext: Boolean(tag.hasNext),
								cursor: tag.cursor,
							},
						}}
					/>
					{tag.cursor && <LoadMore cursor={tag.cursor} />}
				</div>
			</section>
		</Layout>
	);
}

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
	try {
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
	} catch (error) {
		if (isAxiosError(error)) {
			if (error.response) {
				const { status, statusText } = error.response;
				ctx.res.statusCode = status;
				ctx.res.statusMessage = statusText;

				return {
					props: {
						error: {
							statusCode: error.response.status,
						},
						tag: null,
					},
				};
			}
		}
	}
};

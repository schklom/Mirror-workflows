import type { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import type { Comment, Post } from "@/services/types";
import { Layout } from "@/components/layouts/Layout";
import { Comments } from "@/components/p/Comments";
import { PostHeader } from "@/components/p/PostHeader";
import { axiosInstance } from "@/utils";
import { Slide, SlideItem } from "@/components/p/Slide";
import { isAxiosError } from "axios";
import { ErrorInfo } from "@/components/error/ErrorInfo";
import { Img, Video } from "@/components/p/Body";

type Props = InferGetServerSidePropsType<typeof getServerSideProps>;

export default function PostPage({ post, comments, error }: Props) {
	if (error) return <ErrorInfo {...error} />;

	const isOneImage = !post.isVideo && !post.isSideCard;
	const isVideo = post.video && !post.isSideCard;
	const isSideCard = post.isSideCard && post.sidecard;

	const meta = {
		title: `@${post.author?.username} posted: "${
			post.description ? post.description : post.id
		}"`,
		description: `@${post.author?.username} posted: "${
			post.description ? post.description : post.id
		}"`,
	};

	return (
		<Layout className="grid sm:grid sm:grid-cols-2" meta={meta}>
			<div className="m-4 bg-gray-50 p-1">
				{post.author && <PostHeader post={post} />}
				<div className="flex flex-col">
					{isOneImage && (
						<Img
							url={post.thumb}
							alt={String(post.description)}
							className="self-center"
						/>
					)}

					{isVideo && <Video url={String(post.video)} className="self-center" />}

					{isSideCard && (
						<Slide length={Number(post.sidecard?.length)} id={post.id}>
							{post.sidecard?.map((media, i) => {
								const id = `${post.id}-${i + 1}`;
								const alt = String(post.description);
								return (
									<SlideItem id={id} key={id}>
										{media.type === "image" ? (
											<Img url={media.url} alt={alt} />
										) : (
											<Video url={media.url} />
										)}
									</SlideItem>
								);
							})}
						</Slide>
					)}

					<p>{post.description && post.description}</p>
				</div>
			</div>
			<div className="overflow-y-scroll overflow-x-hidden max-h-screen m-4 bg-gray-50 p-1">
				{post.commentsCount && <span>Comments: {post.commentsCount}</span>}
				<Comments comments={comments} />
			</div>
		</Layout>
	);
}

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
	try {
		const shortcode = ctx.params?.shortcode as string;
		const [{ data: post }, { data: comments }] = await Promise.all([
			axiosInstance.get<Post>(`p/${shortcode}`),
			axiosInstance.get<Comment[]>(`p/${shortcode}/comments`),
		]);

		return {
			props: {
				post,
				comments,
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
						post: null,
						comments: null,
					},
				};
			}
		}
	}
};

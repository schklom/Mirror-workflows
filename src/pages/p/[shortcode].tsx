import type {
	GetServerSidePropsContext,
	InferGetServerSidePropsType,
} from "next";
import type { Comment, Post } from "@/services/types";
import Image from "next/image";
import { Meta } from "@/components/Meta";
import { Layout } from "@/components/layouts/Layout";
import { Comments } from "@/components/p/Comments";
import { PostHeader } from "@/components/p/PostHeader";
import { axiosInstance } from "@/utils";

export default function PostPage({
	post,
	comments,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
	return (
		<Layout>
			<Meta
				title={`@${post.author?.username} posted: "${
					post.description ? post.description : post.id
				}"`}
				description={`@${post.author?.username} posted: "${
					post.description ? post.description : post.id
				}"`}
			/>
			<div className="m-4 bg-gray-50 p-1">
				{post.author && <PostHeader post={post} />}

				<div>
					<div>
						{!post.isVideo && !post.isSideCard && (
							<Image
								key={post.thumb}
								src={post.thumb}
								alt={post.description as string}
								width={455}
								height={455}
							/>
						)}
						{post.video && (
							<video key={post.video} src={post.video} controls muted={false}>
								<source src={post.video} type="video/mp4" />
							</video>
						)}
						{post.isSideCard &&
							post.sidecard?.map((media) =>
								media.type === "image" ? (
									<Image
										key={media.url}
										src={media.url}
										alt={post.description as string}
										width={455}
										height={455}
									/>
								) : (
									<video key={media.url} src={media.url} controls muted={false}>
										<source src={media.url} type="video/mp4" />
									</video>
								),
							)}
					</div>
				</div>

				<p>{post.description && post.description}</p>
			</div>
			<div className="m-4 bg-gray-50 p-1">
				<span>{post.commentsCount && post.commentsCount}</span>
				<Comments comments={comments} />
			</div>
		</Layout>
	);
}

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
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
};

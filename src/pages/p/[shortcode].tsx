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
import { Slide, SlideItem } from "@/components/p/Slide";

export default function PostPage({
	post,
	comments,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
	const isOneImage = !post.isVideo && !post.isSideCard;
	const isVideo = post.video && !post.isSideCard;
	const isSideCard = post.isSideCard && post.sidecard;

	return (
		<Layout className="grid sm:grid sm:grid-cols-2">
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
					{isOneImage && (
						<Img url={post.thumb} alt={String(post.description)} />
					)}

					{isVideo && <Video url={String(post.video)} />}

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

const Video = ({ url }: { url: string }) => (
	<video src={url} controls muted={false}>
		<source src={url} type="video/mp4" />
	</video>
);

const Img = ({ url, alt }: { url: string; alt: string }) => (
	<Image src={url} alt={alt} width={455} height={455} />
);

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

import type {
	GetServerSidePropsContext,
	InferGetServerSidePropsType,
} from "next";
import type { PostsResponse, Profile } from "@/services/types";
import { LoadMore } from "@/components/LoadMore";
import { Layout } from "@/components/layouts/Layout";
import { ProfileComponent, SideInfo } from "@/components/profile";
import { Posts } from "@/components/profile/posts";
import { axiosInstance } from "@/utils";
import { ErrorInfo } from "@/components/error/ErrorInfo";
import { isAxiosError } from "axios";

type Props = InferGetServerSidePropsType<typeof getServerSideProps>;

export default function ProfilePage({ profile, posts, error }: Props) {
	if (error) return <ErrorInfo {...error} />;

	const meta = {
		title: `${profile.fullname} (@${profile.username})`,
		description: `See Instagram photos and videos from ${profile.fullname} (@${profile.username}) privatly`,
	};

	return (
		<Layout className="h-screen" meta={meta}>
			<section className="h-full sm:grid sm:grid-flow-col">
				<SideInfo
					data={{
						name: profile.fullname,
						bio: profile.biography,
						image: {
							src: profile.profilePicture,
							alt: profile.username,
						},
					}}
				>
					<ProfileComponent data={profile} />
				</SideInfo>
				<div>
					{posts ? (
						<Posts posts={posts.posts} />
					) : (
						<h3>This account is private</h3>
					)}

					{posts?.cursor && <LoadMore cursor={posts.cursor} />}
				</div>
			</section>
		</Layout>
	);
}

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
	try {
		const username = ctx.params?.username as string;
		const cursor = ctx.query.cursor as string;

		const { data: profile } = await axiosInstance.get<Profile>(username);
		let posts: PostsResponse | undefined;

		if (!profile.isPrivate) {
			const path = cursor
				? `${username}/posts?cursor=${cursor}`
				: `${username}/posts`;
			posts = (await axiosInstance.get<PostsResponse>(path)).data;
		}

		return {
			props: {
				profile,
				posts,
				error: null,
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
						profile: null,
						posts: null,
					},
				};
			}
		}
	}
};

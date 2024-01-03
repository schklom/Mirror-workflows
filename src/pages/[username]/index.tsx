import type { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import type { ErrorResponse, PostsResponse, Profile, Story } from "@/services/types";
import { LoadMore } from "@/components/LoadMore";
import { Layout } from "@/components/layouts/Layout";
import { ProfileComponent, SideInfo } from "@/components/profile";
import { Posts } from "@/components/profile/posts";
import { axiosInstance } from "@/utils";
import { ErrorInfo } from "@/components/error/ErrorInfo";
import { isAxiosError } from "axios";

type Props = InferGetServerSidePropsType<typeof getServerSideProps>;

export default function ProfilePage({ profile, posts, stories, error }: Props) {
	if (error) return <ErrorInfo {...error} />;

	const meta = {
		title: `${profile.fullname} (@${profile.username})`,
		description: `View Instagram photos and videos from ${profile.fullname} (@${profile.username}) privately`,
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
							stories,
						},
					}}
				>
					<ProfileComponent data={profile} />
				</SideInfo>
				<section>
					{!profile.isPrivate ? (
						<Posts posts={posts} />
					) : (
						<h3>This account is private</h3>
					)}
					{!posts.isError && posts.data.cursor && <LoadMore cursor={posts.data.cursor} />}
				</section>
			</section>
		</Layout>
	);
}

export type PostsTypeRes =
	| {
			isError: 0;
			data: PostsResponse;
	  }
	| {
			isError: 1;
			data: ErrorResponse;
	  };

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
	try {
		const username = ctx.params?.username as string;
		const cursor = ctx.query.cursor as string;

		const { data: profile } = await axiosInstance.get<Profile>(username);
		let posts: PostsTypeRes = {
			isError: 0,
			data: {
				hasNext: false,
				posts: [],
				cursor: "",
			},
		};
		let storiesLength = 0;

		if (!profile.isPrivate) {
			const path = cursor ? `${username}/posts?cursor=${cursor}` : `${username}/posts`;
			const [postsRes, stories] = await Promise.allSettled([
				axiosInstance.get<PostsResponse>(path),
				axiosInstance.get<Story[]>(`${username}/stories`),
			]);

			if (stories.status === "fulfilled") {
				storiesLength = stories.value.data.length;
			}

			if (postsRes.status === "fulfilled") {
				posts.data = postsRes.value.data;
			} else {
				if (isAxiosError(postsRes.reason)) {
					if (postsRes.reason.response) {
						posts = {
							isError: 1,
							data: {
								statusCode: postsRes.reason.response.data.statusCode,
								message: postsRes.reason.response.data.message,
							},
						};
					}
				}
			}
		}

		return {
			props: {
				profile,
				posts,
				stories: storiesLength,
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
						stories: null,
					},
				};
			}
		}
	}
};

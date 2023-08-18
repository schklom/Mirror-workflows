import type {
	GetServerSidePropsContext,
	InferGetServerSidePropsType,
} from "next";
import type { PostsResponse, Profile } from "@/services/types";
import { LoadMore } from "@/components/LoadMore";
import { Meta } from "@/components/Meta";
import { Layout } from "@/components/layouts/Layout";
import { ProfileComponent, SideInfo } from "@/components/profile";
import { Posts } from "@/components/profile/posts";
import { axiosInstance } from "@/utils";

export default function ProfilePage({
	profile,
	posts,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
	return (
		<Layout className="h-screen">
			<Meta
				title={`${profile?.fullname} (@${profile?.username})`}
				description={`See Instagram photos and videos from ${profile?.fullname} (@${profile?.username}) privatly`}
			/>
			<section className="h-full sm:grid sm:grid-flow-col">
				<SideInfo
					data={{
						name: profile?.fullname,
						bio: profile?.biography,
						image: {
							src: profile?.profilePicture as string,
							alt: profile?.username as string,
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

					{posts?.cursor?.includes("_") && <LoadMore cursor={posts.cursor} />}
				</div>
			</section>
		</Layout>
	);
}

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
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
		},
	};
};

import { ErrorInfo } from "@/components/error/ErrorInfo";
import { Layout } from "@/components/layouts/Layout";
import { ProfileComponent, SideInfo } from "@/components/profile";
import { Img, Video } from "@/components/p/Body";
import { ErrorResponse, Profile, Story } from "@/services/types";
import { axiosInstance } from "@/utils";
import { isAxiosError } from "axios";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import Link from "next/link";

type Props = InferGetServerSidePropsType<typeof getServerSideProps>;

export default function Stories({ profile, stories, error }: Props) {
	if (error) return <ErrorInfo {...error} />;
	if (stories.isError) return <ErrorInfo {...stories.data} />;

	const meta = {
		title: `${profile.fullname} (@${profile.username}) - Stories`,
		description: `View Instagram stories from ${profile.fullname} (@${profile.username}) privately`,
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
							stories: stories.data.length ? stories.data.length : undefined,
						},
					}}
				>
					<ProfileComponent data={profile} />
				</SideInfo>
				{!profile.isPrivate ? (
					<div>
						{stories.data.length > 0 ? (
							<div className="grid grid-cols-2 grid-rows-2 gap-2 p-2 sm:grid-cols-3 sm:grid-rows-3">
								{stories.data.map((story, i) => (
									<div key={story.id} id={story.id}>
										{story.isVideo ? (
											<Video url={String(story.video)} poster={story.thumb} />
										) : (
											<Link href={story.thumb} target="_blank">
												<Img
													url={story.thumb}
													alt={`${profile.username}'s image story #${
														i + 1
													}`}
												/>
											</Link>
										)}
									</div>
								))}
							</div>
						) : (
							<h3>There is nothing here...</h3>
						)}
					</div>
				) : (
					<h3>This account is private</h3>
				)}
			</section>
		</Layout>
	);
}

export type StoriesRes =
	| {
			isError: 0;
			data: Story[];
	  }
	| {
			isError: 1;
			data: ErrorResponse;
	  };
export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
	try {
		const username = ctx.params?.username as string;

		const { data: profile } = await axiosInstance.get<Profile>(username);
		let stories: StoriesRes = {
			isError: 0,
			data: [],
		};

		if (!profile.isPrivate) {
			try {
				stories.data = (await axiosInstance.get<Story[]>(`${username}/stories`)).data;
			} catch (error) {
				if (isAxiosError(error)) {
					if (error.response) {
						stories = {
							isError: 1,
							data: {
								statusCode: error.response.data.statusCode,
								message: error.response.data.message,
							},
						};
					}
				}
			}
		}

		return {
			props: {
				profile,
				stories,
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
						stories: null,
					},
				};
			}
		}
	}
};

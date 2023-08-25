import { Layout } from "@/components/layouts/Layout";
import { Avatar } from "@/components/profile";
import { ResultsQuery } from "@/services/greatfon";
import { axiosInstance } from "@/utils";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import Link from "next/link";
import { useRouter } from "next/router";

export default function Search({
	accounts,
	hashtags,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
	const router = useRouter();
	const meta = {
		title: `Search results for ${router.query.q}`,
		description: `Search results for ${router.query.q} on Proxigram, a privacy frontend alternative to Instagram. Watch accounts without and account`,
	};

	return (
		<Layout meta={meta}>
			<section className="grid sm:grid-cols-2 text-center">
				<div>
					<h3>Users</h3>
					{accounts.map((account) => (
						<Link
							href={`/${account.username}`}
							className="flex m-4 p-2 bg-white
					 rounded-xl justify-between max-w-5xl"
							key={account.username}
						>
							<Avatar
								image={{
									src: account.profilePicture,
									alt: `${account.username}'s profile picture`,
								}}
							/>
							<span className="self-center">@{account.username}</span>
						</Link>
					))}
				</div>
				<div>
					<h3>Tags</h3>
					{hashtags.map((tag) => (
						<Link
							href={`/tag/${tag.tag}`}
							className="flex m-4 p-2 bg-white
					 rounded-xl justify-between max-w-5xl"
							key={tag.tag}
						>
							<span>#{tag.tag}</span>
						</Link>
					))}
				</div>
			</section>
		</Layout>
	);
}

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
	const q = ctx.query.q as string;
	const result = await axiosInstance.get<ResultsQuery>(`search/?q=${q}`);

	return {
		props: {
			...result.data,
		},
	};
};

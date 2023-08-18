import { Post } from "@/services/types";
import Image from "next/image";
import Link from "next/link";
import Skeleton from "react-loading-skeleton";

interface Props {
	posts: Post[] | undefined;
}

export function Posts({ posts }: Props) {
	return (
		<div className="grid grid-cols-2 grid-rows-2 gap-2 p-2 sm:grid-cols-3 sm:grid-rows-3">
			{posts?.map((post) => (
				<div key={post.id}>
					<Link href={`/p/${post.shortcode}`}>
						<Image
							src={post.thumb}
							alt={post.description ? post.description : ""}
							className="aspect-square object-cover"
							width={400}
							height={400}
						/>
					</Link>
				</div>
			))}
			{!posts &&
				Array.from({ length: 12 }, (_, i) => i + 1).map((e) => (
					<div key={e}>
						<Skeleton
							style={{
								aspectRatio: "4/4",
								width: "330px",
								height: "330px",
							}}
						/>
					</div>
				))}
		</div>
	);
}

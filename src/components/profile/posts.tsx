import { Post } from "@/services/types";
import Image from "next/image";
import Link from "next/link";
import { IconVideo, IconBoxMultiple, IconPhoto } from "@tabler/icons-react";

interface Props {
	posts: Post[] | undefined;
}

export function Posts({ posts }: Props) {
	return (
		<div className="grid grid-cols-2 grid-rows-2 gap-2 p-2 sm:grid-cols-3 sm:grid-rows-3">
			{posts ? (
				<>
					{posts.map((post) => (
						<div key={post.id} className="relative">
							<Link href={`/p/${post.shortcode}`}>
								<Image
									src={post.thumb}
									alt={post.description ? post.description : ""}
									className="aspect-square object-cover"
									width={400}
									height={400}
								/>
							</Link>
							{post.isVideo ? (
								<IconVideo className="absolute z-10 h-6 w-6 top-1 right-1 text-white" />
							) : post.isSideCard ? (
								<IconBoxMultiple className="absolute z-10 h-6 w-6 top-1 right-1 text-white" />
							) : (
								<IconPhoto className="absolute z-10 h-6 w-6 top-1 right-1 text-white" />
							)}
						</div>
					))}
				</>
			) : (
				<h3>There is nothing here...</h3>
			)}
		</div>
	);
}

import { Post } from "@/services/types";
import Image from "next/image";
import Link from "next/link";

export function PostHeader({ post }: { post: Post }) {
	return (
		<div className="mb-1 bg-[#69463d] p-2 text-white">
			<Link href={`/${post.author?.username}`} className="flex justify-between">
				<Image
					src={post.author?.avatar as string}
					alt={`${post.author?.name}'s profile picture`}
					width={55}
					height={55}
					className="rounded-full"
				/>
				<p>{post.author?.username}</p>
			</Link>
			<p className="text-end">{post.created_at?.relative}</p>
		</div>
	);
}

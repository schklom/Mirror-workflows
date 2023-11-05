import { Comment } from "@/services/types";
import Image from "next/image";
import Link from "next/link";
import Skeleton from "react-loading-skeleton";

export function Comments({ comments }: { comments: Comment[] }) {
	return (
		<>
			{comments.map((comment) => (
				<div key={comment.username} className="mb-1 bg-[#69463d] p-2 text-white">
					<div className="flex gap-2">
						{comment.avatar ? (
							<Image
								alt={`${comment.username}'s profile picture`}
								src={comment.avatar}
								width={55}
								height={55}
								className="rounded-full"
							/>
						) : (
							<Skeleton circle width={55} height={55} />
						)}
						<Link href={`/${comment.username}`} className="truncate font-semibold">
							@{comment.username}
						</Link>
					</div>
					<p className="mt-2">{comment.comment}</p>
				</div>
			))}
		</>
	);
}

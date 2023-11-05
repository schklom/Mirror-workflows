import { Profile } from "@/services/types";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import Skeleton from "react-loading-skeleton";

const formater = Intl.NumberFormat("en-US", {
	notation: "compact",
	maximumFractionDigits: 1,
});

type Props = {
	data: {
		name?: string;
		bio?: string;
		image?: { src?: string; alt?: string; stories?: number };
	};
	children?: JSX.Element;
};

export function SideInfo({ data, children }: Props) {
	const { query } = useRouter();
	const href = query.username ? `/${query.username}` : `/tag/${query.tag}`;

	return (
		<section className="profile h-max bg-[#97695d] py-2 text-white sm:h-full sm:w-52">
			<div className="flex flex-col gap-1 text-center">
				<Avatar image={data.image} includeImgLink={true} />
				<div className="profile-info">
					<Link href={href}>
						<h3 className="font-bold">{data.name}</h3>
					</Link>
					<p>{data.bio}</p>
				</div>
				<hr />
				{children}
			</div>
		</section>
	);
}

export function ProfileComponent({ data: profile }: { data: Profile | null }) {
	return (
		<>
			<div className="profile-stats">
				<ul className="mx-2 flex justify-center gap-1 sm:flex-col">
					<ListElement profile={profile} text="Publications" property="mediaCount" />
					<ListElement profile={profile} text="Followers" property="followers" />
					<ListElement profile={profile} text="Following" property="following" />
				</ul>
			</div>
			{profile && <LinkToWebsite link={profile?.website} />}
		</>
	);
}

function ListElement({
	profile,
	text,
	property,
}: {
	property: "following" | "followers" | "mediaCount";
	text: string;
	profile: Profile | null;
}) {
	return (
		<li>
			{profile ? (
				<>
					<b>{text}</b>: {formater.format(profile[property])}
				</>
			) : (
				<Skeleton width="40%" />
			)}
		</li>
	);
}

type AvatarProps = {
	image?: { src?: string; alt?: string; stories?: number };
	includeImgLink?: boolean;
};

export function Avatar({ image, includeImgLink = false }: AvatarProps) {
	const { query } = useRouter();

	return (
		<>
			{image?.src && image?.alt ? (
				image.stories ? (
					<Link href={`/${query.username}/stories`} className="self-center">
						<span className="inline-flex items-center gap-1.5 py-1.5 px-3 text-xs font-medium bg-blue-100 text-blue-800 absolute z-10 ml-5 rounded-full">
							{image.stories}
						</span>
						<Image
							src={image.src}
							alt={`${image.alt}'s profile picture`}
							title={`Watch ${query.username}'s stories (${image.stories})`}
							width={100}
							height={100}
							className="border-[#7fd4a2] border-solid border-4 rounded-full object-cover relative"
						/>
					</Link>
				) : includeImgLink ? (
					<Link href={image.src} className="self-center" target="_blank">
						<Image
							src={image.src}
							alt={`${image.alt}'s profile picture`}
							width={100}
							height={100}
							className="rounded-full object-cover"
						/>
					</Link>
				) : (
					<Image
						src={image.src}
						alt={`${image.alt}'s profile picture`}
						width={100}
						height={100}
						className="self-center rounded-full object-cover"
					/>
				)
			) : (
				<Skeleton circle width={100} height={100} />
			)}
		</>
	);
}

function LinkToWebsite({ link }: { link: string | undefined }) {
	return (
		<>
			{link ? (
				<Link href={link} className="truncate text-sky-400 sm:mx-2" target="_blank">
					{link}
				</Link>
			) : (
				<Skeleton width="65%" />
			)}
		</>
	);
}

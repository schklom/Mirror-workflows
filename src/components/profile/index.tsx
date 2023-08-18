import { Profile } from "@/services/types";
import Image from "next/image";
import Link from "next/link";
import Skeleton from "react-loading-skeleton";

const formater = Intl.NumberFormat("en-US", {
	notation: "compact",
	maximumFractionDigits: 1,
});

export function SideInfo({
	data,
	children,
}: {
	data: {
		name?: string;
		bio?: string;
		image?: { src?: string; alt?: string };
	};
	children?: JSX.Element;
}) {
	return (
		<div className="profile h-max bg-[#97695d] py-2 text-white sm:h-full sm:w-52">
			<div className="flex flex-col gap-1 text-center">
				<Avatar image={data.image} />
				<div className="profile-info">
					<h3 className="font-bold">{data.name}</h3>
					<p>{data.bio}</p>
				</div>
				<hr />
				{children}
			</div>
		</div>
	);
}

export function ProfileComponent({ data: profile }: { data: Profile | null }) {
	return (
		<>
			<div className="profile-stats">
				<ul className="mx-2 flex justify-center gap-1 sm:flex-col">
					<ListElement
						profile={profile}
						text="Publications"
						property="mediaCount"
					/>
					<ListElement
						profile={profile}
						text="Followers"
						property="followers"
					/>
					<ListElement
						profile={profile}
						text="Following"
						property="following"
					/>
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

export function Avatar({ image }: { image?: { src?: string; alt?: string } }) {
	return (
		<>
			{image?.src && image?.alt ? (
				<Image
					src={image.src}
					alt={`${image.alt}'s profile picture`}
					width={100}
					height={100}
					className="self-center rounded-full object-cover"
				/>
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
				<Link
					href={link}
					className="truncate text-sky-400 sm:mx-2"
					target="_blank"
				>
					{link}
				</Link>
			) : (
				<Skeleton width="65%" />
			)}
		</>
	);
}

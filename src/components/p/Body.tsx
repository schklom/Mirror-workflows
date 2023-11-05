import Image from "next/image";

export const Video = ({
	url,
	poster,
	className,
}: {
	url: string;
	poster?: string;
	className?: string;
}) => (
	<video src={url} controls muted={false} poster={poster} className={className}>
		<source src={url} type="video/mp4" />
	</video>
);

export const Img = ({ url, alt, className }: { url: string; alt: string; className?: string }) => (
	<Image src={url} alt={alt} width={455} height={455} className={className} />
);

import Image from "next/image";

export const Video = ({ url, poster }: { url: string, poster?: string }) => (
    <video src={url} controls muted={false} poster={poster}>
        <source src={url} type="video/mp4" />
    </video>
);

export const Img = ({ url, alt }: { url: string; alt: string }) => (
    <Image src={url} alt={alt} width={455} height={455} />
);
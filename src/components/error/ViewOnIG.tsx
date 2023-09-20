export function ViewOnIG({ originalUrl }: { originalUrl: string }) {
    return (
        <a
            href={originalUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[#fa3550] font-bold"
        >
            View this page on Instagram
        </a>
    )
}
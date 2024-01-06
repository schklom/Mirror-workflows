import "./env.mjs";

/** @type {import('next').NextConfig} */

const nextConfig = {
	reactStrictMode: true,
	webpack: (config) => {
		config.experiments.topLevelAwait = true;
		return config;
	},
	images: {
		unoptimized: true,
	},
	async redirects() {
		return [
			{
				source: "/explorer/tag/:tag",
				destination: "/tag/:tag",
				permanent: true,
			},
			{
				source: "/reel/:shortcode",
				destination: "/p/:shortcode",
				permanent: true,
			},
			{
				source: "/api/reel/:shortcode",
				destination: "/api/p/:shortcode",
				permanent: true,
			},
		];
	},
};

export default nextConfig;

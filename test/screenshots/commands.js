const sizes = {
	laptop: {
		width: 1366,
		height: 768
	},
	phone: {
		width: 450,
		height: 828
	}
}

const cookies = {
	default: {
		settings: "d8f3967f153a5422ba8bd068da4dca5f"
	},
	ptc: {
		settings: "a513b2b80db331a60f875bc2679ee35e"
	}
}

function generateSetup(pageName, url, sizeName, cookiesName, scrolls = 1) {
	return {
		url: url,
		filename: `${pageName}-${sizeName}-${cookiesName}`,
		size: sizes[sizeName],
		cookies: cookies[cookiesName],
		scrolls: scrolls
	}
}

function generateAllSetups(pageName, url, scrolls) {
	return Object.keys(cookies).map(cookieKey =>
		Object.keys(sizes).map(sizeKey =>
			generateSetup(pageName, url, sizeKey, cookieKey, scrolls)
		)
	).flat()
}

module.exports = [
	...generateAllSetups("home", "/"),
	...generateAllSetups("settings", "/settings"),
	...generateAllSetups("anti__reality", "/u/anti__reality?page=3", 2),
	...generateAllSetups("post", "/p/CCyko7oJ-ta"),
	...generateAllSetups("gallery", "/p/CCbVsCMpizf", 2)
]

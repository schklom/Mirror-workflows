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

function generateSetup(pageName, url, sizeName, cookiesName, scrolls) {
	return {
		url: url,
		filename: `${pageName}-${sizeName}-${cookiesName}`,
		size: sizes[sizeName],
		cookies: cookies[cookiesName],
		scrolls: scrolls
	}
}

module.exports = [
	generateSetup("home", "/", "laptop", "default"),
	generateSetup("settings", "/settings", "laptop", "default"),
	generateSetup("home", "/", "phone", "default"),
	generateSetup("settings", "/settings", "phone", "default"),

	generateSetup("home", "/", "laptop", "ptc"),
	generateSetup("settings", "/settings", "laptop", "ptc"),
	generateSetup("home", "/", "phone", "ptc"),
]

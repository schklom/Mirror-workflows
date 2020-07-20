const tap = require("tap")
const se = require("selenium-webdriver")
const firefox = require("selenium-webdriver/firefox")
const fs = require("fs").promises
const Jimp = require("jimp")
const commands = require("./screenshots/commands")
const child_process = require("child_process")

const browser = "firefox"

const origin = "http://localhost:10407"

const dimensions = new Map([
	["firefox", {
		scrollbar: 12,
		heightDifference: 74,
		widthDifference: 0
	}],
	["chrome", {
		scrollbar: 15,
		heightDifference: 128,
		widthDifference: 8
	}]
])

const browserDimensions = dimensions.get(browser)

const constants = require("../src/lib/constants")
constants.request_backend = "saved" // predictable request results

process.chdir("src/site")
const server = require("../src/site/server")

function exec(command) {
	return new Promise((resolve, reject) => {
		child_process.exec(command, (error, stdout, stderr) => {
			resolve({stdout, stderr})
		})
	})
}

;(async () => {
	await fs.mkdir("../../test/screenshots/diff", {recursive: true})
	await fs.mkdir("../../test/screenshots/staging", {recursive: true})

	const options = new firefox.Options()
	// options.addArguments("-headless")
	const [driver] = await Promise.all([
		new se.Builder().forBrowser(browser).setFirefoxOptions(options).build(),
		server.waitForFirstCompile()
	])

	server.muteLogsStartingWith("/") // we don't need webserver stuff in our test logs

	function setSize(size) {
		return driver.manage().window().setRect({
			width: size.width + browserDimensions.widthDifference + browserDimensions.scrollbar,
			height: size.height + browserDimensions.heightDifference
		})
	}

	await driver.get(origin)

	for (const command of commands) {
		await Promise.all(Object.keys(command.cookies).map(cookieName =>
			driver.manage().addCookie({
				name: cookieName,
				value: command.cookies[cookieName]
			})
		))

		await setSize(command.size) // complete this before driver.get so that srcset doesn't get confused
		await driver.get(origin + command.url)

		for (let scrollNumber = 1; scrollNumber <= command.scrolls; scrollNumber++) {
			const filenameWithScroll = `${command.filename}-${scrollNumber}`
			function screenPath(dir) {
				return `../../test/screenshots/${dir}/${filenameWithScroll}.png`
			}

			if (scrollNumber > 1) {
				await driver.executeScript(`window.scrollByPages(1)`)
			}

			const finalExists = await fs.access(screenPath("final")).then(() => true).catch(() => false)

			const screenshot = Buffer.from(await driver.takeScreenshot(), "base64")

			const message = `equal screens: ${filenameWithScroll}`
			tap.test(message, async childTest => {
				const image = await Jimp.read(screenshot)
				image.crop(0, 0, command.size.width, command.size.height) // crop out page scrollbar

				if (finalExists) {
					await image.writeAsync(screenPath("staging"))
					const message = `screen: ${filenameWithScroll}`
					const result = await exec(`compare -metric AE ${screenPath("staging")} ${screenPath("final")} ${screenPath("diff")}`)
					const diff = +result.stderr
					childTest.ok(diff === 0, message)
					if (diff === 0) { // it worked, so we don't need the files anymore
						fs.unlink(screenPath("staging"))
						fs.unlink(screenPath("diff"))
					}
				} else {
					image.writeAsync(screenPath("final"))
					console.log(`note: creating new screenshot ${filenameWithScroll}`)
				}
			})
		}
	}

	tap.teardown(() => {
		driver.close()
		server.shutdown()
	})
})()

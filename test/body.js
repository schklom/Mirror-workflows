const tap = require("tap")
const constants = require("../src/lib/constants")
const {extractSharedData} = require("../src/lib/utils/body")
const fs = require("fs").promises

tap.test("extract shared data", async childTest => {
	childTest.throws(() => extractSharedData(""), constants.symbols.NO_SHARED_DATA, "not found in blank")
	{
		const page = await fs.readFile("test/files/page-user-instagram.html", "utf8")
		const sharedData = extractSharedData(page)
		childTest.equal(sharedData.entry_data.ProfilePage[0].graphql.user.username, "instagram", "can extract user page")
	}
	{
		const page = await fs.readFile("test/files/page-login.html", "utf8")
		const sharedData = extractSharedData(page)
		childTest.true(sharedData.entry_data.LoginAndSignupPage[0], "can extract login page")
	}
	childTest.end()
})

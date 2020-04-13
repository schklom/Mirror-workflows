const tap = require("tap")
const constants = require("../src/lib/constants")
const {extractSharedData} = require("../src/lib/utils/body")
const fs = require("fs").promises

tap.test("extract shared data", async childTest => {
	{
		const result = extractSharedData("")
		childTest.equal(result.status, constants.symbols.extractor_results.NO_SHARED_DATA, "not found in blank")
	}
	{
		const page = await fs.readFile("test/files/page-user-instagram.html", "utf8")
		const result = extractSharedData(page)
		childTest.equal(result.status, constants.symbols.extractor_results.SUCCESS, "extractor status success")
		childTest.equal(result.value.entry_data.ProfilePage[0].graphql.user.username, "instagram", "can extract user page")
	}
	{
		const page = await fs.readFile("test/files/page-login.html", "utf8")
		const result = extractSharedData(page)
		childTest.equal(result.status, constants.symbols.extractor_results.SUCCESS, "extractor status success")
		childTest.true(result.value.entry_data.LoginAndSignupPage[0], "can extract login page")
	}
	{
		const page = await fs.readFile("test/files/page-age-gated.html", "utf8")
		const result = extractSharedData(page)
		childTest.equal(result.status, constants.symbols.extractor_results.AGE_RESTRICTED, "extractor detects age restricted")
		childTest.equal(result.value, 21, "correct age is extracted")
	}
	childTest.end()
})

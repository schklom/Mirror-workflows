const tap = require("tap")
const {proxyImage, proxyVideo, proxyProfilePic, proxyExtendedOwner, verifyHost, verifyURL} = require("../src/lib/utils/proxyurl")

tap.equal(
	proxyImage("https://scontent-syd2-1.cdninstagram.com/v/t51.2885-15/e35/p1080x1080/83429487_106792960779790_3699017977444758529_n.jpg?_nc_ht=scontent-syd2-1.cdninstagram.com&_nc_cat=1&_nc_ohc=YYmv6lkrblAAX_9u9Kt&oh=81a70f2b92e70873b5ebc9253e7df937&oe=5EBC230A"),
	"/imageproxy?url=https%3A%2F%2Fscontent-syd2-1.cdninstagram.com%2Fv%2Ft51.2885-15%2Fe35%2Fp1080x1080%2F83429487_106792960779790_3699017977444758529_n.jpg%3F_nc_ht%3Dscontent-syd2-1.cdninstagram.com%26_nc_cat%3D1%26_nc_ohc%3DYYmv6lkrblAAX_9u9Kt%26oh%3D81a70f2b92e70873b5ebc9253e7df937%26oe%3D5EBC230A",
	"image is proxied"
)

tap.equal(
	proxyVideo("https://scontent-syd2-1.cdninstagram.com/v/t50.2886-16/85299832_745217319218455_3874701039913515731_n.mp4?_nc_ht=scontent-syd2-1.cdninstagram.com&_nc_cat=107&_nc_ohc=_Em8_pb3RUIAX8S8tUh&oe=5E3CB718&oh=61d15c21a279f618bab0c5df335635cc"),
	"/videoproxy?url=https%3A%2F%2Fscontent-syd2-1.cdninstagram.com%2Fv%2Ft50.2886-16%2F85299832_745217319218455_3874701039913515731_n.mp4%3F_nc_ht%3Dscontent-syd2-1.cdninstagram.com%26_nc_cat%3D107%26_nc_ohc%3D_Em8_pb3RUIAX8S8tUh%26oe%3D5E3CB718%26oh%3D61d15c21a279f618bab0c5df335635cc",
	"video is proxied"
)

tap.test("proxy extended owner", childTest => {
	const originalProfilePicURL = "https://scontent-syd2-1.cdninstagram.com/v/t51.2885-19/s150x150/59381178_2348911458724961_5863612957363011584_n.jpg?_nc_ht=scontent-syd2-1.cdninstagram.com&_nc_ohc=TrMM-1zPSA4AX857GJB&oh=15b843b0c1033784492b64b1170cd048&oe=5EC9125D"
	const owner = {
		id: "25025320",
		username: "instagram",
		is_verified: true,
		full_name: "Instagram",
		profile_pic_url: originalProfilePicURL
	}
	childTest.same(
		proxyExtendedOwner(owner),
		{
			id: "25025320",
			username: "instagram",
			is_verified: true,
			full_name: "Instagram",
			profile_pic_url: "/imageproxy?userID=25025320&url=https%3A%2F%2Fscontent-syd2-1.cdninstagram.com%2Fv%2Ft51.2885-19%2Fs150x150%2F59381178_2348911458724961_5863612957363011584_n.jpg%3F_nc_ht%3Dscontent-syd2-1.cdninstagram.com%26_nc_ohc%3DTrMM-1zPSA4AX857GJB%26oh%3D15b843b0c1033784492b64b1170cd048%26oe%3D5EC9125D"
		},
		"owner was proxied"
	)
	childTest.equal(
		owner.profile_pic_url,
		originalProfilePicURL,
		"original owner was not modified"
	)
	childTest.end()
})

tap.test("check host validation", async childTest => {
	{
		const url = new URL("https://instance.tld/imageproxy?width=320&url=https%3A%2F%2Fscontent-syd2-1.cdninstagram.com%2Fv%2Ft51.2885-15%2Fe35%2Fc0.180.1440.1440a%2Fs320x320%2F89848538_212928513111869_8518822308890932076_n.jpg%3F_nc_ht%3Dscontent-syd2-1.cdninstagram.com%26_nc_cat%3D105%26_nc_ohc%3DjPxGnFMF_ZoAX_Q_-jf%26oh%3D018fd6d752e15dedbdf132e004356c98%26oe%3D5F178951")
		childTest.equal(verifyURL(url).status, "ok", "real cdninstagram syd region")
	}
	{
		const url = new URL("https://instance.tld/imageproxy?url=https%3A%2F%2Fscontent-amt2-1.cdninstagram.com%2Fv%2Ft51.2885-15%2Fe35%2Fp1080x1080%2F101427269_544579909564468_979862184432362192_n.jpg%3F_nc_ht%3Dscontent-amt2-1.cdninstagram.com%26_nc_cat%3D1%26_nc_ohc%3DF-j-3JXkOVgAX_MMJHb%26oh%3De9e0d4ab65a53c15926349bceea9f09d%26oe%3D5F14C4F3")
		childTest.equal(verifyURL(url).status, "ok", "real cdninstagram amt region")
	}
	{
		const url = new URL("https://instance.tld/imageproxy?url=https%3A%2F%2Fscontent-frx5-1.cdninstagram.com%2Fv%2Ft51.2885-19%2Fs150x150%2F29090066_159271188110124_1152068159029641216_n.jpg%3F_nc_ht%3Dscontent-frx5-1.cdninstagram.com%26_nc_ohc%3DDC7QZiTfNtsAX_ZN33H%26oh%3D77fb5103f058121f7afac07e8e11af44%26oe%3D5F153193")
		childTest.equal(verifyURL(url).status, "ok", "real cdninstagram frx region")
	}
	{
		const url = new URL("https://instance.tld/imageproxy?url=wow im cool")
		childTest.same(
			verifyURL(url),
			{
				status: "fail",
				value: [400, "`url` query parameter is not a valid URL"],
			},
			"invalid url"
		)
	}
	{
		const url = new URL("https://instance.tld/imageproxy?url=http%3A%2F%2Fscontent-frx5-1.cdninstagram.com%2Fv%2Ft51.2885-19%2Fs150x150%2F29090066_159271188110124_1152068159029641216_n.jpg%3F_nc_ht%3Dscontent-frx5-1.cdninstagram.com%26_nc_ohc%3DDC7QZiTfNtsAX_ZN33H%26oh%3D77fb5103f058121f7afac07e8e11af44%26oe%3D5F153193")
		childTest.same(
			verifyURL(url),
			{
				status: "fail",
				value: [400, "URL protocol must be `https:`"]
			},
			"http protocol"
		)
	}
	{
		const url = new URL("https://instance.tld/imageproxy?url=https%3A%2F%2Fnotcdninstagram.com")
		childTest.same(
			verifyURL(url),
			{
				status: "fail",
				value: [400, "URL host is not allowed"]
			}
		)
	}
})

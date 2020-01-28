const constants = require("../../lib/constants")
const {fetchUser, getOrFetchShortcode} = require("../../lib/collectors")
const {render, redirect} = require("pinski/plugins")

module.exports = [
	{
		route: `/u`, methods: ["GET"], code: async ({url}) => {
			if (url.searchParams.has("u")) {
				let username = url.searchParams.get("u")
				username = username.replace(/^(https?:\/\/)?([a-z]+\.)?instagram\.com\//, "")
				username = username.replace(/^\@+/, "")
				username = username.replace(/\/+$/, "")
				return redirect(`/u/${username}`, 301)
			} else {
				return render(400, "pug/friendlyerror.pug", {
					statusCode: 400,
					title: "Bad request",
					message: "Expected a username",
					explanation: "Write /u/{username} or /u?u={username}."
				})
			}
		}
	},
	{
		route: `/u/(${constants.external.username_regex})`, methods: ["GET"], code: ({url, fill}) => {
			const params = url.searchParams
			return fetchUser(fill[0]).then(async user => {
				const page = +params.get("page")
				if (typeof page === "number" && !isNaN(page) && page >= 1) {
					await user.timeline.fetchUpToPage(page - 1)
				}
				return render(200, "pug/user.pug", {url, user})
			}).catch(error => {
				if (error === constants.symbols.NOT_FOUND) {
					return render(404, "pug/friendlyerror.pug", {
						statusCode: 404,
						title: "Not found",
						message: "This user doesn't exist."
					})
				} else {
					throw error
				}
			})
		}
	},
	{
		route: `/fragment/user/(${constants.external.username_regex})/(\\d+)`, methods: ["GET"], code: async ({url, fill}) => {
			return fetchUser(fill[0]).then(async user => {
				const pageNumber = +fill[1]
				const pageIndex = pageNumber - 1
				await user.timeline.fetchUpToPage(pageIndex)
				if (user.timeline.pages[pageIndex]) {
					return render(200, "pug/fragments/timeline_page.pug", {page: user.timeline.pages[pageIndex], pageIndex, user, url})
				} else {
					return {
						statusCode: 400,
						contentType: "text/html",
						content: "That page does not exist."
					}
				}
			}).catch(error => {
				if (error === constants.symbols.NOT_FOUND) {
					return render(404, "pug/friendlyerror.pug", {
						statusCode: 404,
						title: "Not found",
						message: "This user doesn't exist."
					})
				} else {
					throw error
				}
			})
		}
	},
	{
		route: "/p", methods: ["GET"], code: async ({url}) => {
			if (url.searchParams.has("p")) {
				let post = url.searchParams.get("p")
				post = post.replace(/^(https?:\/\/)?([a-z]+\.)?instagram\.com\/p\//, "")
				return redirect(`/p/${post}`, 301)
			} else {
				return render(400, "pug/friendlyerror.pug", {
					statusCode: 400,
					title: "Bad request",
					message: "Expected a shortcode",
					explanation: "Write /p/{shortcode} or /p?p={shortcode}."
				})
			}
		}
	},
	{
		route: `/p/(${constants.external.shortcode_regex})`, methods: ["GET"], code: ({fill}) => {
			return getOrFetchShortcode(fill[0]).then(async post => {
				await post.fetchChildren()
				await post.fetchExtendedOwnerP() // parallel await is okay since intermediate fetch result is cached
				return render(200, "pug/post.pug", {post})
			}).catch(error => {
				if (error === constants.symbols.NOT_FOUND) {
					return render(404, "pug/friendlyerror.pug", {
						statusCode: 404,
						title: "Not found",
						message: "Somehow, you reached a post that doesn't exist."
					})
				} else {
					throw error
				}
			})
		}
	}
]

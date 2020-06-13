// ==UserScript==
// @name        Bibliogram unblocker
// @namespace   <website_origin>
// <instance_match_list>
// @downloadURL <website_origin>/userscripts/unblock.user.js
// @updateURL   <website_origin>/userscripts/unblock.user.js
// @grant       none
// @version     1.0
// @author      cloudrac3r
// ==/UserScript==


// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
//
// Be sure to press "Confirm installation" to install this script!
//
// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=


function q(s) {
	return document.querySelector(s)
}

function addChild(parent, tag, content, className) {
	const e = document.createElement(tag)
	e.textContent = content
	if (className) e.className = className
	parent.appendChild(e)
	return e
}

function applyStyles(element, styles) {
	for (const key of Object.keys(styles)) {
		element.style[key] = styles[key]
	}
}

if (q("#bibliogram-identifier-blocked")) {
	const scriptStatus = addChild(q("#dynamic-status-area"), "p", "Unblocker script is processing...", "explanation")
	applyStyles(scriptStatus, {border: "solid orange", borderWidth: "1px 0px", padding: "10px", marginTop: "20px", textAlign: "center"})
	function flashBackground() {
		scriptStatus.animate([
			{"background": "rgba(255, 255, 255, 0.15)", easing: "ease-in"},
			{"background": "rgba(255, 255, 255, 0)"}
		], 1000)
	}

	const username = q("#data").getAttribute("data-username")

	fetch(`https://www.instagram.com/${username}/`).then(res => {

	if (res.status === 200) {
		res.text().then(text => {
			const id = (text.match(/"id":"([0-9]+)"/) || [])[1]

			if (id) {
				const params = new URLSearchParams()
				params.append("username", username)
				params.append("user_id", id)

				fetch(`${window.location.origin}/api/suggest_user/v1`, {
					headers: {
						"content-type": "application/x-www-form-urlencoded"
					},
					method: "POST",
					body: params.toString()
				}).then(res => {
					if (res.status === 201) {
						scriptStatus.textContent = "Done! Please wait to be redirected..."
						flashBackground();
					} else {
						res.json().then(data => {
							console.log(data)
							alert(data.message)
						})
					}
				}).catch(error => {
					scriptStatus.textContent = "Submission request error: " + (error && error.message || error)
				})
			}

			else {
				scriptStatus.textContent = "Couldn't extract ID from page."
				flashBackground();
			}
		})
	}

	else if (res.status === 302) {
		scriptStatus.textContent =
			"Your network is blocked too. To be unblocked, wait several hours without making any more attempts."
			+" VPNs, proxies and Tor are always blocked."
		flashBackground();
	}

	else if (res.status === 404) {
		scriptStatus.textContent = "This profile doesn't exist."
		flashBackground();
	}
})
}

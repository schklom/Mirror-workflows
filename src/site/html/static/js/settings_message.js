const params = new URLSearchParams(window.location.search)
if (params.has("status")) {
	params.delete("status")
	params.delete("message")
	history.replaceState(null, "", "?" + params.toString())
}

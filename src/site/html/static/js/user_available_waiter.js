const data = document.getElementById("data")
const username = data.getAttribute("data-username")
const source = new EventSource(`/api/user_available_stream/v1/${username}`)
source.addEventListener("open", () => {
	console.log("Connected to profile waiter stream")
})
source.addEventListener("profile_available", () => {
	window.location.reload()
})

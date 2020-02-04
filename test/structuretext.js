const tap = require("tap")
const {structure, partsHashtag, partsUsername} = require("../src/lib/utils/structuretext.js")

// lone test hashtag
tap.same(
	partsHashtag([
		{type: "user", text: "@person"},
		{type: "text", text: " #epic"}
	]),
	[
		{type: "user", text: "@person"},
		{type: "text", text: " "},
		{type: "hashtag", text: "#epic", hashtag: "epic"},
		{type: "text", text: ""}
	]
)

// lone test username
tap.same(
	partsUsername([
		{type: "hashtag", text: "#drawing", hashtag: "drawing"},
		{type: "text", text: " with @person"}
	]),
	[
		{type: "hashtag", text: "#drawing", hashtag: "drawing"},
		{type: "text", text: " with "},
		{type: "user", text: "@person", user: "person"},
		{type: "text", text: ""}
	]
)

// plain text
tap.same(
	structure("hello world"),
	[
		{type: "text", text: "hello world"}
	]
)

// username
tap.same(
	structure("hello @person world"),
	[
		{type: "text", text: "hello "},
		{type: "user", text: "@person", user: "person"},
		{type: "text", text: " world"}
	]
)

// username at start
tap.same(
	structure("@person hello"),
	[
		{type: "text", text: ""},
		{type: "user", text: "@person", user: "person"},
		{type: "text", text: " hello"}
	]
)

// username at end
tap.same(
	structure("hello @person"),
	[
		{type: "text", text: "hello "},
		{type: "user", text: "@person", user: "person"},
		{type: "text", text: ""},
	]
)

// multiple usernames
tap.same(
	structure("hello @person1 @person2"),
	[
		{type: "text", text: "hello "},
		{type: "user", text: "@person1", user: "person1"},
		{type: "text", text: " "},
		{type: "user", text: "@person2", user: "person2"},
		{type: "text", text: ""}
	]
)


// hashtag
tap.same(
	structure("what a #beautiful day"),
	[
		{type: "text", text: "what a "},
		{type: "hashtag", text: "#beautiful", hashtag: "beautiful"},
		{type: "text", text: " day"}
	]
)


// mixed
tap.same(
	structure("@person what a #beautiful #day in @city"),
	[
		{type: "text", text: ""},
		{type: "user", text: "@person", user: "person"},
		{type: "text", text: " what a "},
		{type: "hashtag", text: "#beautiful", hashtag: "beautiful"},
		{type: "text", text: " "},
		{type: "hashtag", text: "#day", hashtag: "day"},
		{type: "text", text: " in "},
		{type: "user", text: "@city", user: "city"},
		{type: "text", text: ""}
	]
)

// special characters
tap.same(
	structure("#goodmorning! @city.planner, #parks\nare awesome"),
	[
		{type: "text", text: ""},
		{type: "hashtag", text: "#goodmorning", hashtag: "goodmorning"},
		{type: "text", text: "! "},
		{type: "user", text: "@city.planner", user: "city.planner"},
		{type: "text", text: ", "},
		{type: "hashtag", text: "#parks", hashtag: "parks"},
		{type: "text", text: "\nare awesome"}
	]
)

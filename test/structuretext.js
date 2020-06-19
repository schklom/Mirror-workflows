const tap = require("tap")
const {structure, partsHashtag, partsUsername, removeTrailingHashtags} = require("../src/lib/utils/structuretext.js")

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
	],
	"partsHashtag works"
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
	],
	"partsUsername works"
)

tap.test("entire structure works", childTest => {
	// plain text
	childTest.same(
		structure("hello world"),
		[
			{type: "text", text: "hello world"}
		],
		"plain text"
	)

	// username
	childTest.same(
		structure("hello @person world"),
		[
			{type: "text", text: "hello "},
			{type: "user", text: "@person", user: "person"},
			{type: "text", text: " world"}
		],
		"username"
	)

	// username at start
	childTest.same(
		structure("@person hello"),
		[
			{type: "text", text: ""},
			{type: "user", text: "@person", user: "person"},
			{type: "text", text: " hello"}
		],
		"username at start"
	)

	// username at end
	childTest.same(
		structure("hello @person"),
		[
			{type: "text", text: "hello "},
			{type: "user", text: "@person", user: "person"},
			{type: "text", text: ""},
		],
		"username at end"
	)

	// multiple usernames
	childTest.same(
		structure("hello @person1 @person2"),
		[
			{type: "text", text: "hello "},
			{type: "user", text: "@person1", user: "person1"},
			{type: "text", text: " "},
			{type: "user", text: "@person2", user: "person2"},
			{type: "text", text: ""}
		],
		"multiple usernames"
	)


	// hashtag
	childTest.same(
		structure("what a #beautiful day"),
		[
			{type: "text", text: "what a "},
			{type: "hashtag", text: "#beautiful", hashtag: "beautiful"},
			{type: "text", text: " day"}
		],
		"hashtag"
	)


	// mixed
	childTest.same(
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
		],
		"mixed"
	)

	// special characters
	childTest.same(
		structure("#goodmorning! @city.planner, #parks\nare awesome"),
		[
			{type: "text", text: ""},
			{type: "hashtag", text: "#goodmorning", hashtag: "goodmorning"},
			{type: "text", text: "! "},
			{type: "user", text: "@city.planner", user: "city.planner"},
			{type: "text", text: ", "},
			{type: "hashtag", text: "#parks", hashtag: "parks"},
			{type: "text", text: "\nare awesome"}
		],
		"special characters"
	)

	// email address
	childTest.same(
		structure("someaddress@gmail.com"),
		[
			{type: "text", text: "someaddress@gmail.com"}
		],
		"email address"
	)

	// email address + username
	childTest.same(
		structure("someaddress@gmail.com @gmail.com"),
		[
			{type: "text", text: "someaddress@gmail.com "},
			{type: "user", text: "@gmail.com", user: "gmail.com"},
			{type: "text", text: ""}
		],
		"email address"
	)

	childTest.end()
})

tap.test("remove trailing hashtags", childTest => {
	childTest.same(
		removeTrailingHashtags(structure(
			"Happy earth day folks #flyingfish"
		)),
		[
			{type: "text", text: "Happy earth day folks"}
		],
		"earth day"
	)

	childTest.same(
		removeTrailingHashtags(structure(
			"🍌HELLO OLIVE HERE🍌...and we have been working hard on this magic trick for youuuUuu."
			+ "\n."
			+ "\n. ."
			+ "\n."
			+ "\n."
			+ "\n#guineapig #cavy #guineapigs #guineapigsofinstagram #cute #babyanimals #cavylove #babyguineapig #guineapigsof_ig #cavy #thedodo #spoiltpets #funny #pets #guineapigpopcorning #popcorning #guineapigsleeping #vipmischief #tiktok #tiktokmemes"
		)),
		[
			{type: "text", text: "🍌HELLO OLIVE HERE🍌...and we have been working hard on this magic trick for youuuUuu."}
		],
		"olive"
	)

	childTest.same(
		removeTrailingHashtags(structure(
			"PINK HOUSE. ."
			+ "\n."
			+ "\n."
			+ "\n."
			+ "\n."
			+ "\n."
			+ "\n#antireality #archicage #arqsketch #thebna #next_top_architects #architecturedose #architecture_hunter #morpholio #archdaily #designboom #arch_more #designmilk #arch_impressive #designwanted #nextarch #dezeen #amazingarchitecture #koozarch #superarchitects #thearchitecturestudentblog #architecturestudents #architecturefactor #allofarchitecture #archinect #soarch #"
		)),
		[
			{type: "text", text: "PINK HOUSE."}
		],
		"pink house"
	)

	childTest.same(
		removeTrailingHashtags(structure(
			"This some research I’ve been doing for #FuturePlay at @futuredeluxe together with @curtisbaigent Expressive Computer Vision #1"
		)),
		[
			{type: "text", text: "This some research I’ve been doing for "},
			{type: "hashtag", text: "#FuturePlay", hashtag: "FuturePlay"},
			{type: "text", text: " at "},
			{type: "user", text: "@futuredeluxe", user: "futuredeluxe"},
			{type: "text", text: " together with "},
			{type: "user", text: "@curtisbaigent", user: "curtisbaigent"},
			{type: "text", text: " Expressive Computer Vision"}
		],
		"computer vision"
	)

	childTest.same(
		removeTrailingHashtags(structure(
			"It is a flourishing building in"
			+ "\nthe midst of a great bustling city."
			+ "\nPeople will get out from difficulty,"
			+ "\nand this will be the resurrection time."
			+ "\n#hellofrom Chongqing China"
			+ "\n・"
			+ "\n・"
			+ "\n・"
			+ "\n・"
			+ "\n#earthfocus #earthoffcial #earthpix #discoverearth  #lifeofadventure #livingonearth #theweekoninstagram  #theglobewanderer #visualambassadors #welivetoexplore #IamATraveler #wonderful_places #TLPics #depthobsessed #voyaged @sonyalpha @hypebeast @highsnobiety @lightroom @soul.planet @earthfever @9gag @500px"
		)),
		[
			{type: "text", text:
				"It is a flourishing building in"
				+ "\nthe midst of a great bustling city."
				+ "\nPeople will get out from difficulty,"
				+ "\nand this will be the resurrection time."
				+ "\n"
			},
			{type: "hashtag", text: "#hellofrom", hashtag: "hellofrom"},
			{type: "text", text: " Chongqing China"}
		],
		"chongquing china"
	)

	childTest.same(
		removeTrailingHashtags(structure("#justice #onlyhashtags")),
		[
			{type: "text", text: ""},
			{type: "hashtag", text: "#justice", hashtag: "justice"},
			{type: "text", text: " "},
			{type: "hashtag", text: "#onlyhashtags", hashtag: "onlyhashtags"},
			{type: "text", text: ""}
		],
		"only hashtags"
	)

	childTest.same(
		removeTrailingHashtags(structure("")),
		[
			{type: "text", text: ""}
		],
		"no content"
	)

	childTest.end()
})

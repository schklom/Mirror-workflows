const data = {...require("./base")}
const {pug} = require("./utils/functions")
const constants = require("../lib/constants")
if (!constants.language_dev) Object.assign(data, require("./en.js"))

;(() => {
	data.meta_direction = "ltr"

	data.go_to_profile = "Balik ke profil"
	data.go_to_post = "Balik pos"
	data.go_username_or_url = "Username ataupun URL"
	data.go_shortcode_or_url = "Shortcode ataupun URL"
	data.go_button = "Go"
	data.about_bibliogram_header = "Sejarah Bibliogram"
	data.pug_about_bibliogram_content = pug(`
		p.
			Bibliogram adalah website yang mengubahsuai data Instagram (profil-profil awam)
			lalu susunan yang kemas, lebih cepat, khidmat download gambar, tiada iklan,
			khidmat RSS feeds, dan tidak perlu akaun. #[a(href=(link_to_featured_profiles ? "#featured-profiles" : "/u/instagram")).example-link See an example.]
		p.
			Bibliogram #[em tidak] membenarkan anda post, like, comment, follow, atau view profil yang private secara rahsia.
			Bibligram tidak boleh save deleted posts.
	`)
	data.about_this_instance_header = "Soal instance ini"
	data.onion_site_available = "terdapat URL Onion"
	data.t_settings = "Settings"
	data.t_privacy_policy = "Policy privacy"
	data.has_not_written_privacy_policy = "Masih perlu didaftar oleh tuan instance"
	data.instance_not_blocked = "Instance menerima tetamu tanpa larangan"
	data.instance_partially_blocked = "Instance boleh menyambut tetamu dengan isyarat "
	data.instance_blocked = "Instance dilarang menerima tetamu langsung"
	data.rss_disabled = "RSS feeds tidak berfungsi"
	data.rss_enabled = "RSS feeds berfungsi"
	data.external_links_header = "Links external"
	data.source_link = "Code di sourcehut"
	data.matrix_link = "Ayuh bergaul di Matrix"
	data.instances_link = "Instance Biblogram dll"
	data.contact_link = "Tanya khabar developer"
	data.featured_profiles_header = "Profil Featured"
	data.featured_profiles_whats_this = "Apa ini?"
	data.html_featured_profiles_disclaimer = pug(`
		p Tuan instance website ini berpendapat profil2 sedemikian gerek.
		p Projek Bibliogram tidak berpendapat seerti tuan instance.
	`)()
	data.verified_badge_title = "Verified"
	data.verified_badge_alt = "Verified."
	data.post_counter_label = "posts"
	data.outgoing_follows_counter_label = "following"
	data.incoming_follows_counter_label = "followed by"
	data.t_home = "Home"
	data.tab_timeline = "Timeline"
	data.tab_igtv = "IGTV"
	data.next_page_button = "Mukasurat berikut"
	data.next_page_button_loading = "Loading,,,"
	data.profile_is_private_notice = "Maaf, ini profil private,"
	data.no_posts_notice = "Tiada post langsung,"
	data.no_more_posts_notice = "Tiada lagi posts,"
	data.fn_page_divider = number => `Page ${number}`
	data.pug_post_timestamp = pug(`
		| Posted on #[time(datetime=post.date.toISOString() data-local-date)= post.getDisplayDate()].
	`)
})()

module.exports = data

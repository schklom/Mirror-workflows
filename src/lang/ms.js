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
			lalu susunan yang lebih kemas, lebih cepat khidmat download gambar, tiada iklan,
			terada khidmat RSS feeds, dan tidak perlu akaun. #[a(href=(link_to_featured_profiles ? "#featured-profiles" : "/u/instagram")).example-link Lihatla contoh ini.]
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
	data.quota_left = "Quota yg tertinggal:"
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
	// settings
	data.t_features = "Feature2"
	data.t_language = "Bahasa"
	data.save_data = "Selamatkan data"
	data.t_automatic = "Auto"
	data.t_off = "Off"
	data.lazy_load = "Lazy load"
	data.t_full = "Load semua"
	data.rewrite_youtube = "Pangkar URL YouTube"
	data.rewrite_twitter = "Pangkar URL Twitter"
	data.remove_trailing_hashtags = "Sembunyikan hashtag2 melebih"
	data.t_hide = "Disembunyikan"
	data.link_hashtags = "Hidupkan hashtags"
	data.t_clickable = "Dihidupkan"
	data.show_comments = "Bentang kommen-kommen"
	data.t_display = "Akan bentang"
	data.fast_navigation = "Fast navigation"
	data.t_enabled = "Dibenarkan"
	data.infinite_scroll = "Scroll Infinite"
	data.t_normal = "Biasa"
	data.t_eager = "Eager"
	data.t_manual = "Manual"
	data.t_appearance = "Hiasan rupa"
	data.t_theme = "Thema"
	data.display_top_nav = "Tampal top bar"
	data.t_always = "Selalu"
	data.timeline_columns = "Barisan Timeline"
	data.t_dynamic = "Dynamik"
	data.three_columns = "3 barisan"
	data.four_columns = "4 barisan"
	data.six_columns = "6 barisan"
	data.caption_side = "Merengan Caption"
	data.left_caption = "Kiri (Bibliogram)"
	data.right_caption = "Kanan (Instagram)"
	data.display_alt_text = "Bentang alt text inline"
	data.t_return = "Pulang semula"
	data.t_save = "Save"
	data.save_and_return = "Putaralik selepas Save"
	data.pug_restore_sync_settings = pug(`
		| Anda boleh menyusun semula settings! Hanya harus #[a(href="/applysettings/"+token)#restore-link melayari semula/bookmarking link ini.]
	`)
	data.settings_saved = "Data Selamat..."

})()

module.exports = data

const data = {...require("./base")}
const {pug} = require("./utils/functions")

;(() => {
	data.meta_direction = "ltr"

	data.go_to_profile = "Go to profile"
	data.go_to_post = "Go to post"
	data.go_username_or_url = "Username or URL"
	data.go_shortcode_or_url = "Shortcode or URL"
	data.go_button = "Go"
	data.about_bibliogram_header = "About Bibliogram"
	data.pug_about_bibliogram_content = pug(`
		p.
			Bibliogram is a website that takes data from Instagram's public profile views and puts it into
			a friendlier page that loads faster, gives downloadable images, eliminates ads,
			generates RSS feeds, and doesn't urge you to sign up. #[a(href=(link_to_featured_profiles ? "#featured-profiles" : "/u/instagram")).example-link See an example.]
		p.
			Bibliogram does #[em not] allow you to anonymously post, like, comment, follow, or view private profiles.
			It does not preserve deleted posts.
	`)
	data.experiencing_problems_header = "Experiencing problems with Bibliogram?"
	data.t_read_more_here = "Read more here."
	data.about_this_instance_header = "About this instance"
	data.onion_site_available = "Onion site available"
	data.t_settings = "Settings"
	data.t_privacy_policy = "Privacy policy"
	data.has_not_written_privacy_policy = "Owner has not written a privacy policy"
	data.instance_not_blocked = "Instance is not blocked"
	data.instance_partially_blocked = "Instance is partially blocked"
	data.instance_blocked = "Instance is blocked"
	data.rss_disabled = "RSS feeds are disabled"
	data.rss_enabled = "RSS feeds are enabled"
	data.external_links_header = "External links"
	data.source_link = "Code on sourcehut"
	data.matrix_link = "Discussion room on Matrix"
	data.instances_link = "Other Bibliogram instances"
	data.contact_link = "Contact the developer"
	data.featured_profiles_header = "Featured profiles"
	data.featured_profiles_whats_this = "What's this?"
	data.html_featured_profiles_disclaimer = pug(`
		p The owner of this website personally thinks that these profiles are interesting.
		p These are not endorsements from the Bibliogram project.
	`)()
	data.verified_badge_title = "Verified"
	data.verified_badge_alt = "Verified."
	data.post_counter_label = "posts"
	data.outgoing_follows_counter_label = "Following"
	data.incoming_follows_counter_label = "Followed by"
	data.quota_left = "Quota left:"
	data.t_home = "Home"
	data.tab_timeline = "Timeline"
	data.tab_igtv = "IGTV"
	data.next_page_button = "Next page"
	data.next_page_button_loading = "Loading..."
	data.profile_is_private_notice = "Profile is private."
	data.no_posts_notice = "No posts."
	data.no_more_posts_notice = "No more posts."
	data.fn_page_divider = number => `Page ${number}`
	data.pug_post_timestamp = pug(`
		| Posted on #[time(datetime=post.date.toISOString() data-local-date)= post.getDisplayDate()].
	`)
	// settings
	data.t_features = "Features"
	data.t_language = "Language"
	data.save_data = "Save data"
	data.t_automatic = "Automatic"
	data.t_off = "Off"
	data.lazy_load = "Lazy load"
	data.t_full = "Full"
	data.rewrite_youtube = "Rewrite YouTube domain"
	data.rewrite_twitter = "Rewrite Twitter domain"
	data.remove_trailing_hashtags = "Hide trailing hashtags"
	data.t_hide = "Hide"
	data.link_hashtags = "Clickable hashtags"
	data.t_clickable = "Clickable"
	data.show_comments = "Display comments"
	data.t_display = "Display"
	data.fast_navigation = "Fast navigation"
	data.t_enabled = "Enabled"
	data.infinite_scroll = "Infinite scroll"
	data.t_normal = "Normal"
	data.t_eager = "Eager"
	data.t_manual = "Manual"
	data.t_appearance = "Appearance"
	data.t_theme = "Theme"
	data.display_top_nav = "Display top bar"
	data.t_always = "Always"
	data.timeline_columns = "Timeline columns"
	data.t_dynamic = "Dynamic"
	data.three_columns = "3 columns"
	data.four_columns = "4 columns"
	data.six_columns = "6 columns"
	data.caption_side = "Caption side"
	data.left_caption = "Left (Bibliogram)"
	data.right_caption = "Right (Instagram)"
	data.display_alt_text = "Display alt text inline"
	data.t_return = "Return"
	data.t_save = "Save"
	data.save_and_return = "Save & return"
	data.pug_restore_sync_settings = pug(`
		| You can restore and sync saved settings by #[a(href="/applysettings/"+token)#restore-link bookmarking this link.]
	`)
	data.settings_saved = "Saved."

})()

module.exports = data

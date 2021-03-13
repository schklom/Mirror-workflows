const data = {...require("./base")}
const {pug} = require("./utils/functions")
const constants = require("../lib/constants")
if (!constants.language_dev) Object.assign(data, require("./en.js"))

;(() => {
	data.meta_direction = "ltr"

	data.go_to_profile = "Gehe zu Profile"
	data.go_to_post = "Gehe zu Post"
	data.go_username_or_url = "Benutzername oder URL"
	data.go_shortcode_or_url = "Shortcode oder URL"
	data.go_button = "Los"
	data.about_bibliogram_header = "Über Bibliogram"
	data.pug_about_bibliogram_content = pug(`
		p.
			Bibliogram ist eine Website, die Daten aus den öffentlichen Profilansichten von Instagram nimmt und sie in
			eine freundlichere Seite einsetzt, die schneller lädt, herunterladbare Bilder anbietet, Werbung eliminiert
			RSS-Feeds generiert und Sie nicht dazu auffordert, sich zu registrieren. #[a(href=(link_to_featured_profiles ? "#featured-profiles" : "/u/instagram")).example-link Hier ein Beispiel.]
		p.
			Bibliogram erlaubt es Ihnen #[em nicht] anonym zu posten, zu liken, zu kommentieren, zu folgen oder private
			Profile anzusehen.
	`)
	data.experiencing_problems_header = "Hast du Probleme mit Bibliogram?"
	data.t_read_more_here = "Lies hier für mehr Informationen."
	data.about_this_instance_header = "Über diese Instanz"
	data.onion_site_available = "Onion Seite verfügbar"
	data.t_settings = "Einstellungen"
	data.t_privacy_policy = "Hinweise zum Datenschutz"
	data.has_not_written_privacy_policy = "Der Eigentümer hat keine Datenschutzrichtlinie verfasst."
	data.instance_not_blocked = "Instanz ist nicht blockiert"
	data.instance_partially_blocked = "Instanz ist teilweise blockiert"
	data.instance_blocked = "Instanz ist blockiert"
	data.rss_disabled = "RSS Feeds sind ausgeschaltet"
	data.rss_enabled = "RSS Feeds sind eingeschaltet"
	data.external_links_header = "Externer Link"
	data.source_link = "Code auf sourcehut"
	data.matrix_link = "Diskussionsraum auf Matrix"
	data.instances_link = "Andere Bibliogram Instanzen"
	data.contact_link = "Kontaktiere den Entwickler"
	data.featured_profiles_header = "Ausgewählte Profile"
	data.featured_profiles_whats_this = "Was ist das ?"
	data.html_featured_profiles_disclaimer = pug(`
		p Der Betreiber dieser Webseite findet persönlich diese Profile interessant.
		p Sie werden nicht vom Bibliogram Projekt gebilligt oder befürwortet.
	`)()
	data.verified_badge_title = "Verifiziert"
	data.verified_badge_alt = "Verifiziert."
	data.post_counter_label = "Posts"
	data.outgoing_follows_counter_label = "folgt er"
	data.incoming_follows_counter_label = "folgen ihm"
	data.quota_left = "Quote übrig:"
	data.t_home = "Startseite"
	data.tab_timeline = "Zeitleiste"
	data.tab_igtv = "IGTV"
	data.next_page_button = "Nächste Seite"
	data.next_page_button_loading = "Lade..."
	data.profile_is_private_notice = "Dieses Profil ist privat."
	data.no_posts_notice = "Keine Posts."
	data.no_more_posts_notice = "Keine weiteren Posts."
	data.fn_page_divider = number => `Seite ${number}`
	data.pug_post_timestamp = pug(`
		| Geposted am #[time(datetime=post.date.toISOString() data-local-date)= post.getDisplayDate()].
	`)
	// settings
	data.t_features = "Features"
	data.t_language = "Sprache"
	data.save_data = "Speichere Daten"
	data.t_automatic = "Automatisch"
	data.t_off = "Aus"
	data.lazy_load = "Lazy load"
	data.t_full = "Vollständig"
	data.rewrite_youtube = "Youtube Domain Umschreibservice"
	data.rewrite_twitter = "Twitter Domain Umschreibservice"
	data.remove_trailing_hashtags = "Hashtags am Ende ausblenden"
	data.t_hide = "Ausblenden"
	data.link_hashtags = "Anklickbare Hashtags"
	data.t_clickable = "Anklickbar"
	data.show_comments = "Kommentare anzeigen"
	data.t_display = "Anzeigen"
	data.fast_navigation = "Schnelle Navigation"
	data.t_enabled = "Ein"
	data.infinite_scroll = "Unendlich Scrollen"
	data.t_normal = "Normal"
	data.t_eager = "Eifrig"
	data.t_manual = "Manuell"
	data.t_appearance = "Aussehen"
	data.t_theme = "Theme"
	data.display_top_nav = "Zeige obere Leiste"
	data.t_always = "Immer"
	data.timeline_columns = "Zeitleiste Spalten"
	data.t_dynamic = "Dynamisch"
	data.three_columns = "3 Spalten"
	data.four_columns = "4 Spalten"
	data.six_columns = "6 Spalten"
	data.caption_side = "Beschreibungsseite"
	data.left_caption = "Links (Bibliogram)"
	data.right_caption = "Rechts (Instagram)"
	data.display_alt_text = "Alt-Text inline anzeigen"
	data.t_return = "Zurück"
	data.t_save = "Speichern"
	data.save_and_return = "Speichern & zurück"
	data.pug_restore_sync_settings = pug(`
		| Du kannst gespeicherte Einstellungen wiederhestellen/synchronisieren durch setzen eines Lesezeichens auf diesen #[a(href="/applysettings/"+token)#restore-link Link.]
	`)
	data.settings_saved = "Gespeichert."

})()

module.exports = data

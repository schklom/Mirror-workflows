const data = {...require("./base")}
const {pug} = require("./utils/functions")
const constants = require("../lib/constants")
if (!constants.language_dev) Object.assign(data, require("./en.js"))

;(() => {
	data.meta_direction = "ltr"

	data.go_to_profile = "Profil besuchen"
	data.go_to_post = "Beitrag ansehen"
	data.go_username_or_url = "Nutzername oder URL"
	data.go_shortcode_or_url = "Kennung oder URL"
	data.go_button = "Los geht's!"
	data.about_bibliogram_header = "Über Bibliogram"
	data.pug_about_bibliogram_content = pug(`
		p.
			Bibliogram ist eine Internetseite, welche es Dir erlaubt, öffentliche Instagram-Profile in
			einer angenehmeren, schneller ladenden Seite ohne Werbung zu betrachten. Sie gibt Dir 
			außerdem die Möglichkeit, Bilder herunterzuladen, RSS-Einträge zu abonnieren und nervt
			Dich nicht, sich ein Konto zu erstellen. #[a(href=(link_to_featured_profiles ? "#featured-profiles" : "/u/instagram")).example-link Schaue Dir ein paar Beispiele an.]
		p.
			Bibliogram erlaubt es Dir #[em nicht], anonym Beiträge zu erstellen, zu bewerten oder zu kommentieren.
			Du kannst weder Profilen folgen noch private Profile einsehen. Bibliogram ist kein Archiv gelöschter Beiträge.
	`)
	data.experiencing_problems_header = "Hast Du Probleme mit Bibliogram?"
	data.t_read_more_here = "Erfahre hier mehr darüber."
	data.about_this_instance_header = "Über diese Instanz"
	data.onion_site_available = ".onion-Seite ist verfügbar"
	data.t_settings = "Einstellungen"
	data.t_privacy_policy = "Datenschutzerklärung"
	data.has_not_written_privacy_policy = "Keine Datenschutzerklärung verfügbar"
	data.instance_not_blocked = "Instanz ist nicht blockiert"
	data.instance_partially_blocked = "Instanz ist teilweise blockiert"
	data.instance_blocked = "Instanz ist blockiert"
	data.rss_disabled = "RSS-Einträge sind nicht verfügbar"
	data.rss_enabled = "RSS-Einträge sind verfügbar"
	data.external_links_header = "Weiterführende Seiten"
	data.source_link = "Quelltext bei sourcehut"
	data.matrix_link = "Diskussionsraum auf Matrix"
	data.instances_link = "Andere Bibliogram-Instanzen"
	data.contact_link = "Kontaktiere die Entwicklerin"
	data.featured_profiles_header = "Ausgewählte Profile"
	data.featured_profiles_whats_this = "Was ist das?"
	data.html_featured_profiles_disclaimer = pug(`
		p Die BetreiberInnen dieser Seite sind der Meinung, dass diese Profile interessant sind.
		p Das Bibliogram-Projekt war nicht an der Auswahl der Profile beteiligt.
	`)()
	data.verified_badge_title = "verifiziert"
	data.verified_badge_alt = "Verifiziert."
	data.post_counter_label = "Beiträge"
	data.outgoing_follows_counter_label = "folgt"
	data.incoming_follows_counter_label = "gefolgt von"
	data.quota_left = "Kontingent:"
	data.t_home = "Startseite"
	data.tab_timeline = "Zeitleiste"
	data.tab_igtv = "IGTV"
	data.next_page_button = "Nächste Seite"
	data.next_page_button_loading = "Wird geladen..."
	data.profile_is_private_notice = "Dieses Profil ist privat."
	data.no_posts_notice = "Keine Beiträge."
	data.no_more_posts_notice = "Keine weiteren Beiträge."
	data.fn_page_divider = number => `Seite ${number}`
	data.pug_post_timestamp = pug(`
		| Publiziert am #[time(datetime=post.date.toISOString() data-local-date)= post.getDisplayDate()].
	`)
	// settings
	data.t_features = "Funktionalität"
	data.t_language = "Sprache"
	data.save_data = "Datenvolumen reduzieren"
	data.t_automatic = "automatisch"
	data.t_off = "aus"
	data.lazy_load = "Laden auf Anfrage"
	data.t_full = "an"
	data.rewrite_youtube = "YouTube-URLs umschreiben zu"
	data.rewrite_twitter = "Twitter-URLs umschreiben zu"
	data.remove_trailing_hashtags = "nachgestellte Stichworte ausblenden"
	data.t_hide = "ausblenden"
	data.link_hashtags = "anklickbare Stichworte"
	data.t_clickable = "anklickbar"
	data.show_comments = "Kommentare anzeigen"
	data.t_display = "anzeigen"
	data.fast_navigation = "schnelle Navigation"
	data.t_enabled = "an"
	data.infinite_scroll = "unbegrenztes Scrollen"
	data.t_normal = "normal"
	data.t_eager = "eifrig"
	data.t_manual = "manuell"
	data.t_appearance = "Aussehen"
	data.t_theme = "Farbschema"
	data.display_top_nav = "obere Leiste anzeigen"
	data.t_always = "immer"
	data.timeline_columns = "Spaltenzahl der Zeitleiste"
	data.t_dynamic = "dynamisch"
	data.three_columns = "3 Spalten"
	data.four_columns = "4 Spalten"
	data.six_columns = "6 Spalten"
	data.caption_side = "Bildtext anzeigen"
	data.left_caption = "links (Bibliogram)"
	data.right_caption = "rechts (Instagram)"
	data.display_alt_text = "alternativen Text ungebrochen anzeigen"
	data.t_return = "zurück"
	data.t_save = "speichern"
	data.save_and_return = "speichern & zurück"
	data.pug_restore_sync_settings = pug(`
		| Du kannst Deine gespeicherten Einstellungen wiederherstellen und synchronisieren, indem Du #[a(href="/applysettings/"+token)#restore-link diese Adresse] zu Deinen Lesezeichen hinzufügst.
	`)
	data.settings_saved = "Gespeichert."

})()

module.exports = data

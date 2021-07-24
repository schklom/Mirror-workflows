const data = {...require("./base")}
const {pug} = require("./utils/functions")
const constants = require("../lib/constants")
if (!constants.language_dev) Object.assign(data, require("./en.js"))

;(() => {
	data.meta_direction = "ltr"

	data.go_to_profile = "Przejdź do profilu"
	data.go_to_post = "Przejdź do postu"
	data.go_username_or_url = "Nazwa użytkownika lub URL"
	data.go_shortcode_or_url = "Shortcode lub URL"
	data.go_button = "Przejdź"
	data.about_bibliogram_header = "O Bibliogram"
	data.pug_about_bibliogram_content = pug(`
		p.
			Bibliogram jest stroną która pobiera dane z publicznych profili Instagram i umieszcza je w
			przyjaźniejszej stronie która ładuje się szybciej, daje możliwość pobierania zdjęć, eliminuje reklamy,
			generuje kanały RSS, i nie wymusza na tobie rejestracji konta. #[a(href=(link_to_featured_profiles ? "#featured-profiles" : "/u/instagram")).example-link Zobacz przykład(y).]
		p.
			Bibliogram #[em nie] pozwala tobie na anonimowe publikowanie postów, lajkowanie, komentowanie, obserwowanie, lub przeglądanie prywatnych profili.
			Oraz nie zachowuje usuniętych postów.
	`)
	data.experiencing_problems_header = "Doświadczasz problemów z Bibliogram?"
	data.t_read_more_here = "Przeczytaj więcej tutaj."
	data.about_this_instance_header = "O tej instancji"
	data.onion_site_available = "Dostępna strona onion"
	data.t_settings = "Ustawienia"
	data.t_privacy_policy = "Polityka prywatności"
	data.has_not_written_privacy_policy = "Osoba właścicielska instancji nie napisała polityki prywatności"
	data.instance_not_blocked = "Instancja nie jest zablokowana"
	data.instance_partially_blocked = "Instancja jest częściowo zablokowana"
	data.instance_blocked = "Instance jest zablokowana"
	data.rss_disabled = "Kanały RSS są wyłączone"
	data.rss_enabled = "Kanały RSS są włączone"
	data.external_links_header = "Zewnętrzne linki"
	data.source_link = "Kod źródłowy na sourcehut"
	data.matrix_link = "Pokój dyskusyjny na Matrix"
	data.instances_link = "Pozostałe instancje Bibliogram"
	data.contact_link = "Skontaktuj się z osobą programistyczną"
	data.featured_profiles_header = "Wyróżnione profile"
	data.featured_profiles_whats_this = "Co to?"
	data.html_featured_profiles_disclaimer = pug(`
		p Osoba właścicielska tej strony osobiście myśli że poniższe profile są warte uwagi.
		p Nie są one aprobowane przez projekt Bibliogram.
	`)()
	data.verified_badge_title = "Konto zweryfikowane"
	data.verified_badge_alt = "Konto zweryfikowane."
	data.post_counter_label = "post(y/ów)"
	data.outgoing_follows_counter_label = "Obserwowani:"
	data.incoming_follows_counter_label = "Obserwujących:"
	data.quota_left = "Pozostały limit:"
	data.t_home = "Strona główna"
	data.tab_timeline = "Oś czasu"
	data.tab_igtv = "IGTV"
	data.next_page_button = "Następna strona"
	data.next_page_button_loading = "Ładowanie..."
	data.profile_is_private_notice = "Profil jest prywatny."
	data.no_posts_notice = "Brak postów."
	data.no_more_posts_notice = "Brak następnych postów."
	data.fn_page_divider = number => `Strona ${number}`
	data.pug_post_timestamp = pug(`
		| Opublikowano #[time(datetime=post.date.toISOString() data-local-date)= post.getDisplayDate()].
	`)
	// settings
	data.t_features = "Funkcje"
	data.t_language = "Język"
	data.save_data = "Zapisuj dane"
	data.t_automatic = "Automatycznie"
	data.t_off = "Nie zapisuj (wyłączone)"
	data.lazy_load = "Powolne ładowanie"
	data.t_full = "W pełni"
	data.rewrite_youtube = "Przepisz domenę YouTube"
	data.rewrite_twitter = "Przepisz domenę Twitter"
	data.remove_trailing_hashtags = "Ukryj końcowe hashtagi"
	data.t_hide = "Ukryj"
	data.link_hashtags = "Klikalne hashtagi"
	data.t_clickable = "Klikalne"
	data.show_comments = "Wyświetlaj komentarze"
	data.t_display = "Wyświetlaj"
	data.fast_navigation = "Szybka nawigacja"
	data.t_enabled = "Włączona"
	data.infinite_scroll = "Nieskończone przewijanie"
	data.t_normal = "Normalne"
	data.t_eager = "Żarliwe"
	data.t_manual = "Ręczne"
	data.t_appearance = "Wygląd"
	data.t_theme = "Motyw"
	data.display_top_nav = "Wyświetlaj górny pasek"
	data.t_always = "Zawsze"
	data.timeline_columns = "Kolumny osi czasu"
	data.t_dynamic = "Dynamiczne"
	data.three_columns = "3 kolumny"
	data.four_columns = "4 kolumny"
	data.six_columns = "6 kolumn"
	data.caption_side = "Strona napisów"
	data.left_caption = "Lewa (Bibliogram)"
	data.right_caption = "Prawa (Instagram)"
	data.display_alt_text = "Wyświetlaj tekst alternatywny w linii"
	data.t_return = "Wróć"
	data.t_save = "Zapisz"
	data.save_and_return = "Zapisz i wróć"
	data.pug_restore_sync_settings = pug(`
		| Możesz przywracać i synchronizować zapisane ustawienia przez #[a(href="/applysettings/"+token)#restore-link dodanie do zakładek tego linku.]
	`)
	data.settings_saved = "Zapisano."

})()

module.exports = data

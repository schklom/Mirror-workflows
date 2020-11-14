const data = {...require("./base")}
const {pug} = require("./utils/functions")
const constants = require("../lib/constants")
if (!constants.language_dev) Object.assign(data, require("./en.js"))

;(() => {
	data.meta_direction = "ltr"

	data.go_to_profile = "Виж профил"
	data.go_to_post = "Виж публикация"
	data.go_username_or_url = "Потребител или URL"
	data.go_shortcode_or_url = "Кратък код или URL"
	data.go_button = "Отвори"
	data.about_bibliogram_header = "За Bibliogram"
	data.pug_about_bibliogram_content = pug(`
		p.
			Bibliogram е уебсайт, който събира данни от публично достъпни Instagram профили и ги организира в
			по-удобни за разглеждане и по-бързо зареждащи се страници. Позволява изтеглянето на изображения, спира рекламите,
			дава възможност за абонамент във формат RSS и не подтиква потребителите да се регистрират. #[a(href=(link_to_featured_profiles ? "#featured-profiles" : "/u/instagram")).example-link Вижте пример.]
		p.
			Bibliogram #[em не] позволява анонимно публикуване, харесване, коментиране, следене на потребители или разглеждане на скрити профили.
			Също така, не пази архив от изтрити публикации.
	`)
	data.about_this_instance_header = "За този сървър"
	data.onion_site_available = "Onion сайт е достъпен"
	data.t_settings = "Настройки"
	data.t_privacy_policy = "Политика за поверителност"
	data.has_not_written_privacy_policy = "Администраторът няма политика за поверителност"
	data.instance_not_blocked = "Сървърът не е блокиран"
	data.instance_partially_blocked = "Сървърът е частично блокиран"
	data.instance_blocked = "Сървърът е блокиран"
	data.rss_disabled = "RSS каналите са изключени"
	data.rss_enabled = "RSS каналите са включени"
	data.external_links_header = "Външни препратки"
	data.source_link = "Изходен код в sourcehut"
	data.matrix_link = "Чат стая в Matrix"
	data.instances_link = "Други Bibliogram сървъри"
	data.contact_link = "Свържете се с разработчика на Bibliogram"
	data.featured_profiles_header = "Избрани профили"
	data.featured_profiles_whats_this = "Какво е това?"
	data.html_featured_profiles_disclaimer = pug(`
		p Администраторът на този уебсайт намира тези профили за интересни.
		p Те по никакъв начин не изразяват своята подкрепа за проекта Bibliogram.
	`)()
	data.verified_badge_title = "Верифициран"
	data.verified_badge_alt = "Верифициран."
	data.post_counter_label = "публикации"
	data.outgoing_follows_counter_label = "следвани"
	data.incoming_follows_counter_label = "последователи"
	data.t_home = "Начало"
	data.tab_timeline = "Публикации"
	data.tab_igtv = "IGTV"
	data.next_page_button = "Следваща страница"
	data.next_page_button_loading = "Зареждане..."
	data.profile_is_private_notice = "Профилът е скрит."
	data.no_posts_notice = "Няма публикации."
	data.no_more_posts_notice = "Няма повече публикации."
	data.fn_page_divider = number => `Страница ${number}`
	data.pug_post_timestamp = pug(`
		| Публикувано на #[time(datetime=post.date.toISOString() data-local-date)= post.getDisplayDate()].
	`)
})()

module.exports = data

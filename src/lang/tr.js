const data = {...require("./base")}
const {pug} = require("./utils/functions")

const constants = require("../lib/constants")
if (!constants.language_dev) Object.assign(data, require("./en.js"))

;(() => {
	data.meta_direction = "ltr"

	data.go_to_profile = "Profile git"
	data.go_to_post = "Gönderiye git"
	data.go_username_or_url = "Kullanıcı adı veya URL"
	data.go_shortcode_or_url = "Kısa kod veya URL"
	data.go_button = "Git"
	data.about_bibliogram_header = "Bibliogram Hakkında"
	data.pug_about_bibliogram_content = pug(`
		p.
			Bibliogram, Instagram'ın genel profil görünümlerinden veri alan ve daha hızlı yüklenen, indirilebilir resimler veren,
			reklamları ortadan kaldıran, RSS beslemeleri oluşturan ve sizi kaydolmaya teşvik etmeyen daha arkadaşça
			bir sayfaya yerleştiren bir web sitesidir. #[a(href=(link_to_featured_profiles ? "#featured-profiles" : "/u/instagram")).example-link Bir örneğe bakın.]
		p.
			Bibliogram, özel profilleri anonim olarak paylaşmanıza, beğenmenize, yorum yapmanıza, takip etmenize veya görüntülemenize izin #[em vermez].
			Silinen gönderileri korumaz.
	`)
	data.experiencing_problems_header = "Bibliogram ile ilgili sorunlar mı yaşıyorsunuz?"
	data.t_read_more_here = "Buradan daha fazlasını okuyun."
	data.about_this_instance_header = "Bu örnek hakkında"
	data.onion_site_available = "Onion sitesi var"
	data.t_settings = "Ayarlar"
	data.t_privacy_policy = "Gizlilik politikası"
	data.has_not_written_privacy_policy = "Sahibi gizlilik politikası yazmadı"
	data.instance_not_blocked = "Örnek engellenmedi"
	data.instance_partially_blocked = "Örnek kısmen engellendi"
	data.instance_blocked = "Örnek engellendi"
	data.rss_disabled = "RSS beslemeleri devre dışı bırakıldı"
	data.rss_enabled = "RSS beslemeleri etkinleştirildi"
	data.external_links_header = "Dış bağlantılar"
	data.source_link = "Sourcehut üzerindeki kod"
	data.matrix_link = "Matrix tartışma odası"
	data.instances_link = "Diğer Bibliogram örnekleri"
	data.contact_link = "Geliştiriciyle iletişime geçin"
	data.featured_profiles_header = "Öne çıkan profiller"
	data.featured_profiles_whats_this = "Bu ne?"
	data.html_featured_profiles_disclaimer = pug(`
		p Bu web sitesinin sahibi şahsen bu profillerin ilginç olduğunu düşünüyor.
		p Bunlar Bibliogram projesinin onayları değildir.
	`)()
	data.verified_badge_title = "Doğrulandı"
	data.verified_badge_alt = "Doğrulandı."
	data.post_counter_label = "gönderiler"
	data.outgoing_follows_counter_label = "Takip edilen"
	data.incoming_follows_counter_label = "Takip eden"
	data.quota_left = "Kalan kota:"
	data.t_home = "Ana Sayfa"
	data.tab_timeline = "Zaman Çizelgesi"
	data.tab_igtv = "IGTV"
	data.next_page_button = "Sonraki sayfa"
	data.next_page_button_loading = "Yükleniyor..."
	data.profile_is_private_notice = "Profil özeldir."
	data.no_posts_notice = "Gönderi yok."
	data.no_more_posts_notice = "Başka gönderi yok."
	data.fn_page_divider = number => `Sayfa ${number}`
	data.pug_post_timestamp = pug(`
		| Gönderi tarihi: #[time(datetime=post.date.toISOString() data-local-date)= post.getDisplayDate()].
	`)
	// settings
	data.t_features = "Özellikler"
	data.t_language = "Dil"
	data.save_data = "Veri tasarrufu"
	data.t_automatic = "Otomatik"
	data.t_off = "Kapalı"
	data.lazy_load = "Tembel yükleme"
	data.t_full = "Tam"
	data.rewrite_youtube = "YouTube alanını yeniden yaz"
	data.rewrite_twitter = "Twitter alanını yeniden yaz"
	data.remove_trailing_hashtags = "Sondaki hashtagleri gizle"
	data.t_hide = "Gizle"
	data.link_hashtags = "Tıklanabilir hashtagler"
	data.t_clickable = "Tıklanabilir"
	data.show_comments = "Yorumları görüntüle"
	data.t_display = "Görüntüle"
	data.fast_navigation = "Hızlı gezinme"
	data.t_enabled = "Etkin"
	data.infinite_scroll = "Sonsuz kaydırma"
	data.t_normal = "Normal"
	data.t_eager = "İstekli"
	data.t_manual = "El ile"
	data.t_appearance = "Görünüm"
	data.t_theme = "Tema"
	data.display_top_nav = "Üst çubuğu göster"
	data.t_always = "Her zaman"
	data.timeline_columns = "Zaman çizelgesi sütunları"
	data.t_dynamic = "Dinamik"
	data.three_columns = "3 sütun"
	data.four_columns = "4 sütun"
	data.six_columns = "6 sütun"
	data.caption_side = "Başlık tarafı"
	data.left_caption = "Sol (Bibliogram)"
	data.right_caption = "Sağ (Instagram)"
	data.display_alt_text = "Alternatif metni satır içinde görüntüle"
	data.t_return = "Geri dön"
	data.t_save = "Kaydet"
	data.save_and_return = "Kaydet ve geri dön"
	data.pug_restore_sync_settings = pug(`
		| Kaydedilen ayarları #[a(href="/applysettings/"+token)#restore-link bu bağlantıyı yer imlerine ekleyerek] geri yükleyebilir ve eşzamanlayabilirsiniz.
	`)
	data.settings_saved = "Kaydedildi."

})()

module.exports = data

const data = {...require("./base")}
const {pug} = require("./utils/functions")

;(() => {
	data.meta_direction = "ltr"

	data.go_to_profile = "Pergi ke profil"
	data.go_to_post = "Pergi ke pos"
	data.go_username_or_url = "Nama pengguna atau URL"
	data.go_shortcode_or_url = "Kode Pendek atau URL"
	data.go_button = "Pergi"
	data.about_bibliogram_header = "Tentang Bibliogram"
	data.pug_about_bibliogram_content = pug(`
		p.
			Bibliogram adalah situs yang mengambil data dari penglihatan profil publik Instagram dan menaruhnya ke
			halaman yang lebih akrab, yang memuat lebih cepat, memberikan gambar yang bisa diunduh, menghilangkan iklan,
			menghasilkan umpan RSS, dan tidak memaksa Anda untuk mendaftar #[a(href=(link_to_featured_profiles ? "#featured-profiles" : "/u/instagram")).example-link Lihat contohnya.]
		p.
			Bibliogram #[em tidak] memperbolehkan Anda secara anonim mengepos, menyukai, mengkomentari, mengikuti, atau melihat profil privat.
			Tidak juga mengarsipkan pos yang dihapus.
	`)
	data.experiencing_problems_header = "Mengalami masalah dengan Bibliogram?"
	data.t_read_more_here = "Baca lebih lanjut di sini."
	data.about_this_instance_header = "Tentang peladen ini"
	data.onion_site_available = "Situs Onion tersedia"
	data.t_settings = "Pengaturan"
	data.t_privacy_policy = "Kebijakan privasi"
	data.has_not_written_privacy_policy = "Pemilik belum menulis kebijakan privasi"
	data.instance_not_blocked = "Peladen tidak diblokir"
	data.instance_partially_blocked = "Peladen diblokir sebagian"
	data.instance_blocked = "Peladen diblokir"
	data.rss_disabled = "Umpan RSS dimatikan"
	data.rss_enabled = "Umpan RSS dihidupkan"
	data.external_links_header = "Tautan luar"
	data.source_link = "Kode di sourcehut"
	data.matrix_link = "Ruang diskusi di Matrix"
	data.instances_link = "Peladen Bibliogram lainnya"
	data.contact_link = "Kontak sang pengembang"
	data.featured_profiles_header = "Profil terpilih"
	data.featured_profiles_whats_this = "Apa ini?"
	data.html_featured_profiles_disclaimer = pug(`
		p Pemilik situs ini secara pribadi pikir profil tersebut menarik.
		p Ini bukan dukungan dari proyek Bibliogram.
	`)()
	data.verified_badge_title = "Terverifikasi"
	data.verified_badge_alt = "Terverifikasi."
	data.post_counter_label = "pos"
	data.outgoing_follows_counter_label = "mengikuti"
	data.incoming_follows_counter_label = "pengikut"
	data.quota_left = "Kuota tersisa:"
	data.t_home = "Beranda"
	data.tab_timeline = "Lini masa"
	data.tab_igtv = "IGTV"
	data.next_page_button = "Halaman selanjutnya"
	data.next_page_button_loading = "Memuat..."
	data.profile_is_private_notice = "Profil privat."
	data.no_posts_notice = "Tidak ada pos."
	data.no_more_posts_notice = "Tidak ada pos lagi."
	data.fn_page_divider = number => `Halaman ${number}`
	data.pug_post_timestamp = pug(`
		| Dipos pada #[time(datetime=post.date.toISOString() data-local-date)= post.getDisplayDate()].
	`)
	// settings
	data.t_features = "Fitur"
	data.t_language = "Bahasa"
	data.save_data = "Menyimpan data"
	data.t_automatic = "Otomatis"
	data.t_off = "Mati"
	data.lazy_load = "Muat malas"
	data.t_full = "Penuh"
	data.rewrite_youtube = "Tulis ulang domain YouTube"
	data.rewrite_twitter = "Tulis ulang domain Twitter"
	data.remove_trailing_hashtags = "Sembunyikan tanda pagar yang mengikuti"
	data.t_hide = "Sembunyikan"
	data.link_hashtags = "Tanda pagar bisa diklik"
	data.t_clickable = "Bisa diklik"
	data.show_comments = "Tampilkan komentar"
	data.t_display = "Tampilkan"
	data.fast_navigation = "Navigasi cepat"
	data.t_enabled = "Hidupkan"
	data.infinite_scroll = "Gulir tak terbatas"
	data.t_normal = "Normal"
	data.t_eager = "Ingin Sekali"
	data.t_manual = "Manual"
	data.t_appearance = "Tampilan"
	data.t_theme = "Tema"
	data.display_top_nav = "Tampilkan bar atas"
	data.t_always = "Selalu"
	data.timeline_columns = "Kolom lini masa"
	data.t_dynamic = "Dinamis"
	data.three_columns = "3 kolom"
	data.four_columns = "4 kolom"
	data.six_columns = "6 kolom"
	data.caption_side = "Sisi keterangan"
	data.left_caption = "Kiri (Bibliogram)"
	data.right_caption = "Kanan (Instagram)"
	data.display_alt_text = "Tampilkan teks alternatif sebaris"
	data.t_return = "Kembali"
	data.t_save = "Simpan"
	data.save_and_return = "Simpan & kembali"
	data.pug_restore_sync_settings = pug(`
		| Anda bisa memulihkan dan menyinkronkan pengaturan dengan #[a(href="/applysettings/"+token)#restore-link memarkahkan tautan ini.]
	`)
	data.settings_saved = "Tersimpan."

})()

module.exports = data

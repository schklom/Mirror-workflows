const data = {...require("./base")}
const {pug} = require("./utils/functions")
const constants = require("../lib/constants")
if (!constants.language_dev) Object.assign(data, require("./en.js"))

;(() => {
	data.meta_direction = "rtl"

	data.go_to_profile = "اذهب إلى الملف الشخصي"
	data.go_to_post = "اذهب إلى المنشور"
	data.go_username_or_url = "اسم المستخدم أو عنوان الـurl"
	data.go_shortcode_or_url = "الرمز القصير أو عنوان الـurl"
	data.go_button = "اذهب"
	data.about_bibliogram_header = "عن بيبليوغرام"
	data.pug_about_bibliogram_content = pug(`
		p.
			بيبليوغرام هو موقع يأخذ بياناته من الملفات الشخصية العامة في إنستغرام ويضعها في صفحة تُحمل بشكل أسرع وذات شكل أبسط للمستخدم، يعطي صور قابلة للتحميل، يزيل الإعلانات، فيه خدمة RSS، ولا يزعجك بتنبيهات تسجيل الدخول. #[a(href=(link_to_featured_profiles ? "#featured-profiles" : "/u/instagram")).example-link انظر إلى هذا المثال.]

		p.
			بيبليوغرام #[em لا] يسمح لك بأن تنشر بشخصية مجهول، أن تضع لايك، أن تُعلق، أو بأن تشاهد ملفات شخصية خاصة. ولا يحفظ المنشورات المحذوفة.
	`)
	data.experiencing_problems_header = "تواجه مشاكل مع بيبليوغرام؟"
	data.t_read_more_here = "اقرأ أكثر هنا."
	data.about_this_instance_header = "عن هذا المثيل"
	data.onion_site_available = "موقع onion متاح"
	data.t_settings = "الإعدادات"
	data.t_privacy_policy = "سياسة الخصوصية"
	data.has_not_written_privacy_policy = "لم يكتب المالك سياسة للخصوصية"
	data.instance_not_blocked = "المثيل ليس محظور"
	data.instance_partially_blocked = "المثيل محظور بشكل جزئي"
	data.instance_blocked = "المثيل محظور"
	data.rss_disabled = "تقليمات RSS غير مفعلة"
	data.rss_enabled = "تقليمات RSS مفعلة"
	data.external_links_header = "روابط خارجية"
	data.source_link = "الكود على sourcehut"
	data.matrix_link = "غرفة المناقشة على Matrix"
	data.instances_link = "مُثلاء بيبليوغرام أُخَر"
	data.contact_link = "تواصل مع المطور"
	data.featured_profiles_header = "الملفات الشخصية المميزة"
	data.featured_profiles_whats_this = "ما هذا؟"
	data.html_featured_profiles_disclaimer = pug(`
		p يرى مالك هذا الموقع أن هذه الحسابات مثيرة للاهتمام.
		p هذه ليست مصادقات من مشروع بيبليوغرام.
	`)()
	data.verified_badge_title = "موثَّق"
	data.verified_badge_alt = "موثَّق."
	data.post_counter_label = "المنشورات"
	data.outgoing_follows_counter_label = "يتابِع"
	data.incoming_follows_counter_label = "متابَع من"
	data.quota_left = "الحصة النسبية الباقية:"
	data.t_home = "الرئيسية"
	data.tab_timeline = "الخط الزمني"
	data.tab_igtv = "IGTV"
	data.next_page_button = "الصفحة التالية"
	data.next_page_button_loading = "جار التحميل..."
	data.profile_is_private_notice = "الملف الشخصي خاص"
	data.no_posts_notice = "لا توجد منشورات."
	data.no_more_posts_notice = "لا توجد منشورات أكثر."
	data.fn_page_divider = number => `الصفحة ${number}`
	data.pug_post_timestamp = pug(`
		| نُشر في #[time(datetime=post.date.toISOString() data-local-date)= post.getDisplayDate()].
	`)
	// settings
	data.t_features = "الميزات"
	data.t_language = "اللغة"
	data.save_data = "حفظ البيانات"
	data.t_automatic = "تلقائي"
	data.t_off = "إيقاف"
	data.lazy_load = "التحميل الكسول"
	data.t_full = "ممتلئ"
	data.rewrite_youtube = "إعادة كتابة نطاق يوتيوب"
	data.rewrite_twitter = "إعادة كتابة نطاق تويتر"
	data.remove_trailing_hashtags = "إخفاء الرموز الزائدة"
	data.t_hide = "إخفاء"
	data.link_hashtags = "الرموز القابلة للضغط"
	data.t_clickable = "قابلة للضغط"
	data.show_comments = "عرض التعليقات"
	data.t_display = "عرض"
	data.fast_navigation = "التنقل السريع"
	data.t_enabled = "مفعل"
	data.infinite_scroll = "التمرير اللانهائي"
	data.t_normal = "عادي"
	data.t_eager = "حريص"
	data.t_manual = "يدوي"
	data.t_appearance = "المظهر"
	data.t_theme = "السمة"
	data.display_top_nav = "عرض الشريط العلوي"
	data.t_always = "دائماً"
	data.timeline_columns = "أعمدة الخط الزمني"
	data.t_dynamic = "متحرك"
	data.three_columns = "3 أعمدة"
	data.four_columns = "4 أعمدة"
	data.six_columns = "6 أعمدة"
	data.caption_side = "جانب الترجمة النصية"
	data.left_caption = "اليسار (بيبليوغرام)"
	data.right_caption = "اليمين (إنستغرام)"
	data.display_alt_text = "عرض النص المُضَمَّن البديل"
	data.t_return = "رجوع"
	data.t_save = "حفظ"
	data.save_and_return = "حفظ ورجوع"
	data.pug_restore_sync_settings = pug(`
		| تستطيع أن تُرجع وتزامن الإعدادات المحفوظة عبر وضع إشارة مرجعية على هذا #[a(href="/applysettings/"+token)#restore-link الرابط.]
	`)
	data.settings_saved = "محفوظ."

})()

module.exports = data

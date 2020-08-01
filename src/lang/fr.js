const data = {...require("./base")}
const {pug} = require("./utils/functions")

;(() => {
	data.meta_direction = "ltr"

	data.go_to_profile = "Voir le profil"
	data.go_to_post = "Voir le post"
	data.go_username_or_url = "Nom d'utilisateur ou URL"
	data.go_shortcode_or_url = "Identifiant ou URL"
	data.go_button = "Voir"
	data.about_bibliogram_header = "À propos de Bibliogram"
	data.pug_about_bibliogram_content = pug(`
		p.
			Bibliogram est un site qui prend ses données des profils publics Instagram et les met dans
			une page plus conviviale, qui charge plus rapidement, dont les images sont téléchargeables, enlève les publicités,
			génère des flux RSS, et ne vous exhorte pas de vous enregistrer. #[a(href=(link_to_featured_profiles ? "#featured-profiles" : "/u/instagram")).example-link Voir un exemple.]
		p.
			Bibliogram #[em ne] vous permet #[em pas] de poster anonymement, d'aimer les publications, de les commenter, de s'abonner ou voir des profils privés.
			Les posts supprimés ne sont pas conservés.
	`)
	data.about_this_instance_header = "À propos de cette instance"
	data.onion_site_available = "Un site Onion est disponible"
	data.t_settings = "Paramètres"
	data.t_privacy_policy = "Politique de confidentialité"
	data.has_not_written_privacy_policy = "Le propriétaire du site n'a pas écrit de politique de confidentialité"
	data.instance_not_blocked = "L'instance n'est pas bloquée"
	data.instance_partially_blocked = "L'instance est partiellement bloquée"
	data.instance_blocked = "L'instance est bloquée"
	data.rss_disabled = "Les flux RSS sont désactivés"
	data.rss_enabled = "Les flux RSS sont activés"
	data.external_links_header = "Liens externes"
	data.source_link = "Code sur sourcehut"
	data.matrix_link = "Salon de discussion sur Matrix"
	data.instances_link = "Autres instances Bibliogram"
	data.contact_link = "Contacter le développeur"
	data.featured_profiles_header = "Profils en vedette"
	data.featured_profiles_whats_this = "Qu'est-ce que c'est ?"
	data.html_featured_profiles_disclaimer = pug(`
		p Le propriétaire de ce site pense personnellement que ces profils sont intéressants.
		p Ils ne sont pas approuvés par le projet Bibliogram.
	`)()
	data.verified_badge_title = "Vérifié"
	data.verified_badge_alt = "Vérifié."
	data.post_counter_label = "posts"
	data.outgoing_follows_counter_label = "abonnements"
	data.incoming_follows_counter_label = "abonnés"
	data.t_home = "Accueil"
	data.tab_timeline = "Publications"
	data.tab_igtv = "IGTV"
	data.next_page_button = "Page suivante"
	data.next_page_button_loading = "Chargement…"
	data.profile_is_private_notice = "Ce profil est privé."
	data.no_posts_notice = "Aucun post."
	data.no_more_posts_notice = "Plus de posts."
	data.fn_page_divider = number => `Page ${number}`
	data.pug_post_timestamp = pug(`
		| Posté le #[time(datetime=post.date.toISOString() data-local-date)= post.getDisplayDate()].
	`)
})()

module.exports = data

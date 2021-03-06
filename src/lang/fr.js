const data = {...require("./base")}
const {pug} = require("./utils/functions")
const constants = require("../lib/constants")
if (!constants.language_dev) Object.assign(data, require("./en.js"))

// \u202f = narrow no-break space and \u00a0 = no-break space
// will be used to clearly show they aren't regular spaces
// see https://fr.wikipedia.org/wiki/Espace_insécable#En_France (fr)
// or https://en.wikipedia.org/wiki/Non-breaking_space (en)

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
	data.experiencing_problems_header = "Rencontrez-vous des problèmes avec Bibliogram\u202f?"
	data.t_read_more_here = "En savoir plus ici."
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
	data.featured_profiles_whats_this = "Qu'est-ce que c'est\u202f?"
	data.html_featured_profiles_disclaimer = pug(`
		p Le propriétaire de ce site pense personnellement que ces profils sont intéressants.
		p Ils ne sont pas approuvés par le projet Bibliogram.
	`)()
	data.verified_badge_title = "Vérifié"
	data.verified_badge_alt = "Vérifié."
	data.post_counter_label = "posts"
	data.outgoing_follows_counter_label = "abonnements"
	data.incoming_follows_counter_label = "abonnés"
	data.quota_left = "Quota restant\u00a0:"
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
	// paramètres
	data.t_features = "Fonctionnalités"
	data.t_language = "Langue"
	data.save_data = "Économiser des données"
	data.t_automatic = "Automatique"
	data.t_off = "Éteint"
	data.lazy_load = "Chargement paresseux"
	data.t_full = "Complet"
	data.rewrite_youtube = "Réécrire le domaine de YouTube"
	data.rewrite_twitter = "Réécrire le domaine de Twitter"
	data.remove_trailing_hashtags = "Supprimer les hashtags en fin de post"
	data.t_hide = "Cacher"
	data.link_hashtags = "Hashtags cliquables"
	data.t_clickable = "Cliquable"
	data.show_comments = "Afficher les commentaires"
	data.t_display = "Afficher"
	data.fast_navigation = "Navigation rapide"
	data.t_enabled = "Activé"
	data.infinite_scroll = "Défilement infini"
	data.t_normal = "Normal"
	data.t_eager = "Fervent"
	data.t_manual = "Manuel"
	data.t_appearance = "Apparence"
	data.t_theme = "Thème"
	data.display_top_nav = "Afficher la barre en haut de la page"
	data.t_always = "Toujours"
	data.timeline_columns = "Publications\u00a0: nombre de colonnes"
	data.t_dynamic = "Dynamique"
	data.three_columns = "3 colonnes"
	data.four_columns = "4 colonnes"
	data.six_columns = "6 colonnes"
	data.caption_side = "Côté des sous-titres"
	data.left_caption = "Gauche (Bibliogram)"
	data.right_caption = "Droite (Instagram)"
	data.display_alt_text = "Afficher le texte alternatif en ligne"
	data.t_return = "Revenir"
	data.t_save = "Sauvegarder"
	data.save_and_return = "Sauvegarder & revenir"
	data.pug_restore_sync_settings = pug(`
		| Vous pouvez sauvegarder et synchroniser vos préférences sauvegardées en #[a(href="/applysettings/"+token)#restore-link ajoutant ce lien à vos favoris.]
	`)
	data.settings_saved = "Sauvegardé."

})()

module.exports = data

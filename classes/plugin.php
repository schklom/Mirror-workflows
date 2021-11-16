<?php
abstract class Plugin {
	const API_VERSION_COMPAT = 1;

	/** @var PDO $pdo */
	protected $pdo;

	/**
	 * @param PluginHost $host
	 *
	 * @return void
	 * */
	abstract function init($host);

	/** @return array<null|float|string|bool> */
	abstract function about();
	// return array(1.0, "plugin", "No description", "No author", false);

	function __construct() {
		$this->pdo = Db::pdo();
	}

	/** @return array<string,bool> */
	function flags() {
		/* associative array, possible keys:
			needs_curl = boolean
		*/
		return array();
	}

	/**
	 * @param string $method
	 *
	 * @return bool */
	function is_public_method($method) {
		return false;
	}

	/**
	 * @param string $method
	 *
	 * @return bool */
	function csrf_ignore($method) {
		return false;
	}

	/** @return string */
	function get_js() {
		return "";
	}

	/** @return string */
	function get_css() {
		return "";
	}

	/** @return string */
	function get_prefs_js() {
		return "";
	}

	/** @return int */
	function api_version() {
		return Plugin::API_VERSION_COMPAT;
	}

	/* gettext-related helpers */

	/**
	 * @param string $msgid
	 *
	 * @return string */
	function __($msgid) {
		/** @var Plugin $this -- this is a strictly template-related hack */
		return _dgettext(PluginHost::object_to_domain($this), $msgid);
	}

	/**
	 * @param string $singular
	 * @param string $plural
	 * @param int $number
	 *
	 * @return string */
	function _ngettext($singular, $plural, $number) {
		/** @var Plugin $this -- this is a strictly template-related hack */
		return _dngettext(PluginHost::object_to_domain($this), $singular, $plural, $number);
	}

	/** @return string */
	function T_sprintf() {
		$args = func_get_args();
		$msgid = array_shift($args);

		return vsprintf($this->__($msgid), $args);
	}

	/* plugin hook methods */

	/* GLOBAL hooks are invoked in global context, only available to system plugins (loaded via .env for all users) */

	/**
	 * @param array<string,mixed> $line
	 * @return string
	 * @see PluginHost::HOOK_ARTICLE_BUTTON
	 */
	function hook_article_button($line) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return "";
	}

	/**
	 * @param array<string,mixed> $article
	 * @return array<string,mixed>
	 * @see PluginHost::HOOK_ARTICLE_FILTER
	 */
	function hook_article_filter($article) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return [];
	}

	/**
	 * @param string $tab
	 * @return void
	 * @see PluginHost::HOOK_PREFS_TAB
	 */
	function hook_prefs_tab($tab) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	/**
	 * @param string $section
	 * @return void
	 * @see PluginHost::HOOK_PREFS_TAB_SECTION
	 */
	function hook_prefs_tab_section($section) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	/** @return void
	 * @see PluginHost::HOOK_PREFS_TABS
	*/
	function hook_prefs_tabs() {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	/**
	 * @param FeedParser $parser
	 * @param int $feed_id
	 * @return void
	 * @see PluginHost::HOOK_FEED_PARSED
	 */
	function hook_feed_parsed($parser, $feed_id) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	/** GLOBAL
	 * @param array<string,string> $cli_options
	 * @return void
	 * @see PluginHost::HOOK_UPDATE_TASK
	 */
	function hook_update_task($cli_options) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	/** this is a pluginhost compatibility wrapper that invokes $this->authenticate(...$args) (Auth_Base)
	 * @param string $login
	 * @param string $password
	 * @param string $service
	 * @return int|false user_id
	 * @see PluginHost::HOOK_AUTH_USER
	 */
	function hook_auth_user($login, $password, $service = '') {
		user_error("Dummy method invoked.", E_USER_ERROR);
		return false;
	}

	/** IAuthModule only
	 * @param string $login
	 * @param string $password
	 * @param string $service
	 * @return int|false user_id
	 */
	function authenticate($login, $password, $service = '') {
		user_error("Dummy method invoked.", E_USER_ERROR);
		return false;
	}

	/**
	 * @param array<string, string> $hotkeys
	 * @return array<string, string>
	 * @see PluginHost::HOOK_HOTKEY_MAP
	 */
	function hook_hotkey_map($hotkeys) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return [];
	}

	/**
	 * @param array<string, mixed> $article
	 * @return array<string, mixed>
	 * @see PluginHost::HOOK_RENDER_ARTICLE
	 */
	function hook_render_article($article) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return [];
	}

	/**
	 * @param array<string, mixed> $article
	 * @return array<string, mixed>
	 * @see PluginHost::HOOK_RENDER_ARTICLE_CDM
	 */
	function hook_render_article_cdm($article) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return [];
	}

	/**
	 * @param string $feed_data
	 * @param string $fetch_url
	 * @param int $owner_uid
	 * @param int $feed
	 * @return string
	 * @see PluginHost::HOOK_FEED_FETCHED
	 */
	function hook_feed_fetched($feed_data, $fetch_url, $owner_uid, $feed) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return "";
	}

	/**
	 * @param DOMDocument $doc
	 * @param string $site_url
	 * @param array<string> $allowed_elements
	 * @param array<string> $disallowed_attributes
	 * @param int $article_id
	 * @return DOMDocument|array<int,DOMDocument|array<string>>
	 * @see PluginHost::HOOK_SANITIZE
	 */
	function hook_sanitize($doc, $site_url, $allowed_elements, $disallowed_attributes, $article_id) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return $doc;
	}

	/**
	 * @param array{'article': array<string,mixed>|null, 'headline': array<string,mixed>|null} $params
	 * @return array<string, string>
	 * @see PluginHost::HOOK_RENDER_ARTICLE_API
	 */
	function hook_render_article_api($params) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return [];
	}

	/**
	 * @return string
	 * @see PluginHost::HOOK_TOOLBAR_BUTTON
	 */
	function hook_toolbar_button() {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return "";
	}

	/**
	 * @return string
	 * @see PluginHost::HOOK_ACTION_ITEM
	 */
	function hook_action_item() {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return "";
	}

	/**
	 * @param int $feed_id
	 * @param bool $is_cat
	 * @return string
	 * @see PluginHost::HOOK_HEADLINE_TOOLBAR_BUTTON
	 */
	function hook_headline_toolbar_button($feed_id, $is_cat) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return "";
	}

	/**
	 * @param array<string, array<string, string>> $hotkeys
	 * @return array<string, array<string, string>>
	 * @see PluginHost::HOOK_HOTKEY_INFO
	 */
	function hook_hotkey_info($hotkeys) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return [];
	}

	/**
	 * @param array<string,mixed> $row
	 * @return string
	 * @see PluginHost::HOOK_ARTICLE_LEFT_BUTTON
	 */
	function hook_article_left_button($row) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return "";
	}

	/**
	 * @param int $feed_id
	 * @return void
	 * @see PluginHost::HOOK_PREFS_EDIT_FEED
	 */
	function hook_prefs_edit_feed($feed_id) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	/**
	 * @param int $feed_id
	 * @return void
	 * @see PluginHost::HOOK_PREFS_SAVE_FEED
	 */
	function hook_prefs_save_feed($feed_id) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	/**
	 * @param string $feed_data
	 * @param string $fetch_url
	 * @param int $owner_uid
	 * @param int $feed
	 * @param int $last_article_timestamp
	 * @param string $auth_login
	 * @param string $auth_pass
	 * @return string (possibly mangled feed data)
	 * @see PluginHost::HOOK_FETCH_FEED
	 */
	function hook_fetch_feed($feed_data, $fetch_url, $owner_uid, $feed, $last_article_timestamp, $auth_login, $auth_pass) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return "";
	}

	/**
	 * @param array<string,mixed> $row
	 * @param int $excerpt_length
	 * @return array<string,mixed>
	 * @see PluginHost::HOOK_QUERY_HEADLINES
	 */
	function hook_query_headlines($row, $excerpt_length) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return [];
	}

	/** GLOBAL
	 * @return void
	 * @see PluginHost::HOOK_HOUSE_KEEPING */
	function hook_house_keeping() {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	/**
	 * @param string $query
	 * @return array<int, string|array<string>>
	 * @see PluginHost::HOOK_SEARCH
	 */
	function hook_search($query) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return [];
	}

	/**
	 * @param string $enclosures_formatted
	 * @param array<int, array<string, mixed>> $enclosures
	 * @param int $article_id
	 * @param bool $always_display_enclosures
	 * @param string $article_content
	 * @param bool $hide_images
	 * @return string|array<string,array<int, array<string, mixed>>> ($enclosures_formatted, $enclosures)
	 * @see PluginHost::HOOK_FORMAT_ENCLOSURES
	 */
	function hook_format_enclosures($enclosures_formatted, $enclosures, $article_id, $always_display_enclosures, $article_content, $hide_images) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return "";
	}

	/**
	 * @param string $contents
	 * @param string $url
	 * @param string $auth_login
	 * @param string $auth_pass
	 * @return string (possibly mangled feed data)
	 * @see PluginHost::HOOK_SUBSCRIBE_FEED
	 */
	function hook_subscribe_feed($contents, $url, $auth_login, $auth_pass) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return "";
	}

	/**
	 * @param int $feed
	 * @param bool $is_cat
	 * @param array<string,mixed> $qfh_ret (headlines object)
	 * @return string
	 * @see PluginHost::HOOK_HEADLINES_BEFORE
	 */
	function hook_headlines_before($feed, $is_cat, $qfh_ret) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return "";
	}

	/**
	 * @param array<string,mixed> $entry
	 * @param int $article_id
	 * @param array<string,mixed> $rv
	 * @return string
	 * @see PluginHost::HOOK_RENDER_ENCLOSURE
	 */
	function hook_render_enclosure($entry, $article_id, $rv) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return "";
	}

	/**
	 * @param array<string,mixed> $article
	 * @param string $action
	 * @return array<string,mixed> ($article)
	 * @see PluginHost::HOOK_ARTICLE_FILTER_ACTION
	 */
	function hook_article_filter_action($article, $action) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return [];
	}

	/**
	 * @param array<string,mixed> $line
	 * @param int $feed
	 * @param bool $is_cat
	 * @param int $owner_uid
	 * @return array<string,mixed> ($line)
	 * @see PluginHost::HOOK_ARTICLE_EXPORT_FEED
	 */
	function hook_article_export_feed($line, $feed, $is_cat, $owner_uid) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return [];
	}

	/**
	 * @return void
	 * @see PluginHost::HOOK_MAIN_TOOLBAR_BUTTON
	*/
	function hook_main_toolbar_button() {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	/**
	 * @param array<string,string> $entry
	 * @param int $id
	 * @param array{'formatted': string, 'entries': array<int, array<string, mixed>>} $rv
	 * @return array<string,string> ($entry)
	 * @see PluginHost::HOOK_ENCLOSURE_ENTRY
	 */
	function hook_enclosure_entry($entry, $id, $rv) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return [];
	}

	/**
	 * @param string $html
	 * @param array<string,mixed> $row
	 * @return string ($html)
	 * @see PluginHost::HOOK_FORMAT_ARTICLE
	 */
	function hook_format_article($html, $row) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return "";
	}

	/**
	 * @param array{"title": string, "site_url": string} $basic_info
	 * @param string $fetch_url
	 * @param int $owner_uid
	 * @param int $feed_id
	 * @param string $auth_login
	 * @param string $auth_pass
	 * @return array{"title": string, "site_url": string}
	 * @see PluginHost::HOOK_FEED_BASIC_INFO
	 */
	function hook_feed_basic_info($basic_info, $fetch_url, $owner_uid, $feed_id, $auth_login, $auth_pass) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return $basic_info;
	}

	/**
	 * @param string $filename
	 * @return bool
	 * @see PluginHost::HOOK_SEND_LOCAL_FILE
	 */
	function hook_send_local_file($filename) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return false;
	}

	/**
	 * @param int $feed_id
	 * @param int $owner_uid
	 * @return bool
	 * @see PluginHost::HOOK_UNSUBSCRIBE_FEED
	 */
	function hook_unsubscribe_feed($feed_id, $owner_uid) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return false;
	}

	/**
	 * @param Mailer $mailer
	 * @param array<string,mixed> $params
	 * @return int
	 * @see PluginHost::HOOK_SEND_MAIL
	 */
	function hook_send_mail($mailer, $params) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return -1;
	}

	/** NOTE: $article_filters should be renamed $filter_actions because that's what this is
	 * @param int $feed_id
	 * @param int $owner_uid
	 * @param array<string,mixed> $article
	 * @param array<string,mixed> $matched_filters
	 * @param array<string,string|bool|int> $matched_rules
	 * @param array<string,string> $article_filters
	 * @return void
	 * @see PluginHost::HOOK_FILTER_TRIGGERED
	 */
	function hook_filter_triggered($feed_id, $owner_uid, $article, $matched_filters, $matched_rules, $article_filters) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	/**
	 * @param string $url
	 * @return string|false
	 * @see PluginHost::HOOK_GET_FULL_TEXT
	 */
	function hook_get_full_text($url) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return "";
	}

	/**
	 * @param array<string,string> $enclosures
	 * @param string $content
	 * @param string $site_url
	 * @param array<string,mixed> $article
	 * @return string|array<int,string>
	 * @see PluginHost::HOOK_ARTICLE_IMAGE
	 */
	function hook_article_image($enclosures, $content, $site_url, $article) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return "";
	}

	/**
	 * @return string
	 * @see PluginHost::HOOK_FEED_TREE
	 * */
	function hook_feed_tree() {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return "";
	}

	/**
	 * @param string $url
	 * @return bool
	 * @see PluginHost::HOOK_IFRAME_WHITELISTED
	 */
	function hook_iframe_whitelisted($url) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return false;
	}

	/**
	 * @param object $enclosure
	 * @param int $feed
	 * @return object ($enclosure)
	 * @see PluginHost::HOOK_ENCLOSURE_IMPORTED
	 */
	function hook_enclosure_imported($enclosure, $feed) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return $enclosure;
	}

	/**
	 * @return array<string,string>
	 * @see PluginHost::HOOK_HEADLINES_CUSTOM_SORT_MAP
	 */
	function hook_headlines_custom_sort_map() {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return ["" => ""];
	}

	/**
	 * @param string $order
	 * @return array<int, string|bool> -- query, skip_first_id
	 * @see PluginHost::HOOK_HEADLINES_CUSTOM_SORT_OVERRIDE
	 */
	function hook_headlines_custom_sort_override($order) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return ["", false];
	}

	/**
	 * @param int $feed_id
	 * @param int $is_cat
	 * @return string
	 * @see PluginHost::HOOK_HEADLINE_TOOLBAR_SELECT_MENU_ITEM
	 */
	function hook_headline_toolbar_select_menu_item($feed_id, $is_cat) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return "";
	}

	/**
	 * @param string $url
	 * @param string $auth_login
	 * @param string $auth_pass
	 * @return bool
	 * @see PluginHost::HOOK_PRE_SUBSCRIBE
	 */
	function hook_pre_subscribe(&$url, $auth_login, $auth_pass) {
		user_error("Dummy method invoked.", E_USER_ERROR);

		return false;
	}
}

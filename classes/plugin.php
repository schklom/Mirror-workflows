<?php
abstract class Plugin {
	const API_VERSION_COMPAT = 1;

	/** @var PDO $pdo */
	protected $pdo;

	abstract function init(PluginHost $host) : void;

	/** @return array<float|string|bool> */
	abstract function about() : array;
	// return array(1.0, "plugin", "No description", "No author", false);

	function __construct() {
		$this->pdo = Db::pdo();
	}

	/** @return array<string,int> */
	function flags() : array {
		/* associative array, possible keys:
			needs_curl = boolean
		*/
		return array();
	}

	function is_public_method(string $method) : bool {
		return false;
	}

	function csrf_ignore(string $method) : bool {
		return false;
	}

	function get_js() : string {
		return "";
	}

	function get_prefs_js() : string {
		return "";
	}

	function api_version() : int {
		return Plugin::API_VERSION_COMPAT;
	}

	/* gettext-related helpers */

	function __(string $msgid) : string {
		/** @var Plugin $this -- this is a strictly template-related hack */
		return _dgettext(PluginHost::object_to_domain($this), $msgid);
	}

	function _ngettext(string $singular, string $plural, int $number) : string {
		/** @var Plugin $this -- this is a strictly template-related hack */
		return _dngettext(PluginHost::object_to_domain($this), $singular, $plural, $number);
	}

	function T_sprintf() : string {
		$args = func_get_args();
		$msgid = array_shift($args);

		return vsprintf($this->__($msgid), $args);
	}

	/* plugin hook methods (auto-generated) */

	function hook_article_button($line) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_article_filter($article) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_prefs_tab($tab) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_prefs_tab_section($section) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_prefs_tabs() {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_feed_parsed($parser, $feed_id) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_update_task($cli_options) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_auth_user($login, $password, $service) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_hotkey_map($hotkeys) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_render_article($article) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_render_article_cdm($article) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_feed_fetched($feed_data, $fetch_url, $owner_uid, $feed) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_sanitize($doc, $site_url, $allowed_elements, $disallowed_attributes, $article_id) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_render_article_api($params) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_toolbar_button() {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_action_item() {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_headline_toolbar_button($feed_id, $is_cat) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_hotkey_info($hotkeys) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_article_left_button($row) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_prefs_edit_feed($feed_id) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_prefs_save_feed($feed_id) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_fetch_feed($feed_data, $fetch_url, $owner_uid, $feed, $last_article_timestamp, $auth_login, $auth_pass) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_query_headlines($row) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_house_keeping() {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_search($query) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_format_enclosures($rv, $result, $id, $always_display_enclosures, $article_content, $hide_images) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_subscribe_feed($contents, $url, $auth_login, $auth_pass) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_headlines_before($feed, $is_cat, $qfh_ret) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_render_enclosure($entry, $id, $rv) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_article_filter_action($article, $action) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_article_export_feed($line, $feed, $is_cat, $owner_uid) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_main_toolbar_button() {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_enclosure_entry($entry, $id, $rv) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_format_article($html, $row) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_feed_basic_info($basic_info, $fetch_url, $owner_uid, $feed_id, $auth_login, $auth_pass) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_send_local_file($filename) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_unsubscribe_feed($feed_id, $owner_uid) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_send_mail(Mailer $mailer, $params) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_filter_triggered($feed_id, $owner_uid, $article, $matched_filters, $matched_rules, $article_filters) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_get_full_text($url) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_article_image($enclosures, $content, $site_url) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_feed_tree() {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_iframe_whitelisted($url) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_enclosure_imported($enclosure, $feed) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_headlines_custom_sort_map() {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_headlines_custom_sort_override($order) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_headline_toolbar_select_menu_item($feed_id, $is_cat) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

	function hook_pre_subscribe($url, $auth_login, $auth_pass) {
		user_error("Dummy method invoked.", E_USER_ERROR);
	}

}

<?php

class Pref_Prefs extends Handler_Protected {

	private $pref_help = [];
	private $pref_item_map = [];
	private $pref_help_bottom = [];
	private $pref_blacklist = [];
	private $profile_blacklist = [];

	function csrf_ignore($method) {
		$csrf_ignored = array("index", "updateself", "otpqrcode");

		return array_search($method, $csrf_ignored) !== false;
	}

	function __construct($args) {
		parent::__construct($args);

		$this->pref_item_map = [
			__('General') => [
				'USER_LANGUAGE',
				'USER_TIMEZONE',
				'BLOCK_SEPARATOR',
				'USER_CSS_THEME',
				'BLOCK_SEPARATOR',
				'ENABLE_API_ACCESS',
			],
			__('Feeds') => [
				'DEFAULT_UPDATE_INTERVAL',
				'FRESH_ARTICLE_MAX_AGE',
				'DEFAULT_SEARCH_LANGUAGE',
				'BLOCK_SEPARATOR',
				'ENABLE_FEED_CATS',
				'BLOCK_SEPARATOR',
				'CONFIRM_FEED_CATCHUP',
				'ON_CATCHUP_SHOW_NEXT_FEED',
				'BLOCK_SEPARATOR',
				'HIDE_READ_FEEDS',
				'HIDE_READ_SHOWS_SPECIAL',
			],
			__('Articles') => [
				'PURGE_OLD_DAYS',
				'PURGE_UNREAD_ARTICLES',
				'BLOCK_SEPARATOR',
				'COMBINED_DISPLAY_MODE',
				'CDM_EXPANDED',
				'BLOCK_SEPARATOR',
				'CDM_AUTO_CATCHUP',
				'VFEED_GROUP_BY_FEED',
				'BLOCK_SEPARATOR',
				'SHOW_CONTENT_PREVIEW',
				'STRIP_IMAGES',
			],
			__('Digest') => [
				'DIGEST_ENABLE',
				'DIGEST_CATCHUP',
				'DIGEST_PREFERRED_TIME',
			],
			__('Advanced') => [
				'BLACKLISTED_TAGS',
				'BLOCK_SEPARATOR',
				'LONG_DATE_FORMAT',
				'SHORT_DATE_FORMAT',
				'BLOCK_SEPARATOR',
				'SSL_CERT_SERIAL',
			]
		];

		$this->pref_help_bottom = [
			"BLACKLISTED_TAGS" => __("Never apply these tags automatically (comma-separated list)."),
		];

		$this->pref_help = [
			"ALLOW_DUPLICATE_POSTS" => array(__("Allow duplicate articles"), ""),
			"BLACKLISTED_TAGS" => array(__("Blacklisted tags"), ""),
			"DEFAULT_SEARCH_LANGUAGE" => array(__("Default language"), __("Used for full-text search")),
			"CDM_AUTO_CATCHUP" => array(__("Mark read on scroll"), __("Mark articles as read as you scroll past them")),
			"CDM_EXPANDED" => array(__("Always expand articles")),
			"COMBINED_DISPLAY_MODE" => array(__("Combined mode"), __("Show flat list of articles instead of separate panels")),
			"CONFIRM_FEED_CATCHUP" => array(__("Confirm marking feeds as read")),
			"DEFAULT_ARTICLE_LIMIT" => array(__("Amount of articles to display at once")),
			"DEFAULT_UPDATE_INTERVAL" => array(__("Default update interval")),
			"DIGEST_CATCHUP" => array(__("Mark sent articles as read")),
			"DIGEST_ENABLE" => array(__("Enable digest"), __("Send daily digest of new (and unread) headlines to your e-mail address")),
			"DIGEST_PREFERRED_TIME" => array(__("Try to send around this time"), __("Time in UTC")),
			"ENABLE_API_ACCESS" => array(__("Enable API"), __("Allows accessing this account through the API")),
			"ENABLE_FEED_CATS" => array(__("Enable categories")),
			"FEEDS_SORT_BY_UNREAD" => array(__("Sort feeds by unread articles count"), ""),
			"FRESH_ARTICLE_MAX_AGE" => array(__("Maximum age of fresh articles"), "<strong>" . __("hours") . "</strong>"),
			"HIDE_READ_FEEDS" => array(__("Hide read feeds")),
			"HIDE_READ_SHOWS_SPECIAL" => array(__("Always show special feeds"), __("While hiding read feeds")),
			"LONG_DATE_FORMAT" => array(__("Long date format"), __("Syntax is identical to PHP <a href='http://php.net/manual/function.date.php'>date()</a> function.")),
			"ON_CATCHUP_SHOW_NEXT_FEED" => array(__("Automatically show next feed"), __("After marking one as read")),
			"PURGE_OLD_DAYS" => array(__("Purge articles older than"), __("<strong>days</strong> (0 disables)")),
			"PURGE_UNREAD_ARTICLES" => array(__("Purge unread articles")),
			"REVERSE_HEADLINES" => array(__("Reverse headline order (oldest first)")),
			"SHORT_DATE_FORMAT" => array(__("Short date format")),
			"SHOW_CONTENT_PREVIEW" => array(__("Show content preview in headlines")),
			"SORT_HEADLINES_BY_FEED_DATE" => array(__("Sort headlines by feed date"), __("Use feed-specified date to sort headlines instead of local import date.")),
			"SSL_CERT_SERIAL" => array(__("SSL client certificate")),
			"STRIP_IMAGES" => array(__("Do not embed media")),
			"STRIP_UNSAFE_TAGS" => array(__("Strip unsafe tags from articles"), __("Strip all but most common HTML tags when reading articles.")),
			"USER_STYLESHEET" => array(__("Customize stylesheet")),
			"USER_TIMEZONE" => array(__("Time zone")),
			"VFEED_GROUP_BY_FEED" => array(__("Group by feed"), __("Group multiple-feed output by originating feed")),
			"USER_LANGUAGE" => array(__("Language")),
			"USER_CSS_THEME" => array(__("Theme"))
		];

		$this->pref_blacklist = ["ALLOW_DUPLICATE_POSTS", "STRIP_UNSAFE_TAGS", "REVERSE_HEADLINES",
			"SORT_HEADLINES_BY_FEED_DATE", "DEFAULT_ARTICLE_LIMIT",
			"FEEDS_SORT_BY_UNREAD", "USER_STYLESHEET"];

		/* "FEEDS_SORT_BY_UNREAD", "HIDE_READ_FEEDS", "REVERSE_HEADLINES" */

		$this->profile_blacklist = ["ALLOW_DUPLICATE_POSTS", "PURGE_OLD_DAYS",
			"PURGE_UNREAD_ARTICLES", "DIGEST_ENABLE", "DIGEST_CATCHUP",
			"BLACKLISTED_TAGS", "ENABLE_API_ACCESS", "UPDATE_POST_ON_CHECKSUM_CHANGE",
			"DEFAULT_UPDATE_INTERVAL", "USER_TIMEZONE", "SORT_HEADLINES_BY_FEED_DATE",
			"SSL_CERT_SERIAL", "DIGEST_PREFERRED_TIME"];
	}

	function changepassword() {

		if (defined('_TTRSS_DEMO_INSTANCE')) {
			print "ERROR: ".format_error("Disabled in demo version.");
			return;
		}

		$old_pw = clean($_POST["old_password"]);
		$new_pw = clean($_POST["new_password"]);
		$new_unclean_pw = $_POST["new_password"];
		$con_pw = clean($_POST["confirm_password"]);

		if ($new_unclean_pw != $new_pw) {
			print "ERROR: ".format_error("New password contains disallowed characters.");
			return;
		}

		if ($old_pw == $new_pw) {
			print "ERROR: ".format_error("New password must be different from the old one.");
			return;
		}

		if ($old_pw == "") {
			print "ERROR: ".format_error("Old password cannot be blank.");
			return;
		}

		if ($new_pw == "") {
			print "ERROR: ".format_error("New password cannot be blank.");
			return;
		}

		if ($new_pw != $con_pw) {
			print "ERROR: ".format_error("Entered passwords do not match.");
			return;
		}

		$authenticator = PluginHost::getInstance()->get_plugin($_SESSION["auth_module"]);

		if (method_exists($authenticator, "change_password")) {
			print format_notice($authenticator->change_password($_SESSION["uid"], $old_pw, $new_pw));
		} else {
			print "ERROR: ".format_error("Function not supported by authentication module.");
		}
	}

	function saveconfig() {
		$boolean_prefs = explode(",", clean($_POST["boolean_prefs"]));

		foreach ($boolean_prefs as $pref) {
			if (!isset($_POST[$pref])) $_POST[$pref] = 'false';
		}

		$need_reload = false;

		foreach (array_keys($_POST) as $pref_name) {

			$value = $_POST[$pref_name];

			switch ($pref_name) {
				case 'DIGEST_PREFERRED_TIME':
					if (get_pref('DIGEST_PREFERRED_TIME') != $value) {

						$sth = $this->pdo->prepare("UPDATE ttrss_users SET
						last_digest_sent = NULL WHERE id = ?");
						$sth->execute([$_SESSION['uid']]);

					}
					break;
				case 'USER_LANGUAGE':
					if (!$need_reload) $need_reload = $_SESSION["language"] != $value;
					break;

				case 'USER_CSS_THEME':
					if (!$need_reload) $need_reload = get_pref($pref_name) != $value;
					break;

				case 'BLACKLISTED_TAGS':
					$cats = FeedItem_Common::normalize_categories(explode(",", $value));
					asort($cats);
					$value = implode(", ", $cats);
					break;
			}

			set_pref($pref_name, $value);
		}

		if ($need_reload) {
			print "PREFS_NEED_RELOAD";
		} else {
			print __("The configuration was saved.");
		}
	}

	function changeemail() {

		$email = clean($_POST["email"]);
		$full_name = clean($_POST["full_name"]);
		$active_uid = $_SESSION["uid"];

		$sth = $this->pdo->prepare("SELECT email, login, full_name FROM ttrss_users WHERE id = ?");
		$sth->execute([$active_uid]);

		if ($row = $sth->fetch()) {
			$old_email = $row["email"];

			if ($old_email != $email) {
				$mailer = new Mailer();

				$tpl = new Templator();

				$tpl->readTemplateFromFile("mail_change_template.txt");

				$tpl->setVariable('LOGIN', $row["login"]);
				$tpl->setVariable('NEWMAIL', $email);
				$tpl->setVariable('TTRSS_HOST', Config::get(Config::SELF_URL_PATH));

				$tpl->addBlock('message');

				$tpl->generateOutputToString($message);

				$mailer->mail(["to_name" => $row["login"],
					"to_address" => $row["email"],
					"subject" => "[tt-rss] Mail address change notification",
					"message" => $message]);

			}
		}

		$sth = $this->pdo->prepare("UPDATE ttrss_users SET email = ?,
			full_name = ? WHERE id = ?");
		$sth->execute([$email, $full_name, $active_uid]);

		print __("Your personal data has been saved.");

		return;
	}

	function resetconfig() {

		$_SESSION["prefs_op_result"] = "reset-to-defaults";

		$sth = $this->pdo->prepare("DELETE FROM ttrss_user_prefs
			WHERE (profile = :profile OR (:profile IS NULL AND profile IS NULL))
				AND owner_uid = :uid");
		$sth->execute([":profile" => $_SESSION['profile'], ":uid" => $_SESSION['uid']]);

		$this->_init_user_prefs($_SESSION["uid"], $_SESSION["profile"]);

		echo __("Your preferences are now set to default values.");
	}

	private function index_auth_personal() {

		$sth = $this->pdo->prepare("SELECT email,full_name,otp_enabled,
			access_level FROM ttrss_users
			WHERE id = ?");
		$sth->execute([$_SESSION["uid"]]);
		$row = $sth->fetch();

		$email = htmlspecialchars($row["email"]);
		$full_name = htmlspecialchars($row["full_name"]);
		$otp_enabled = sql_bool_to_bool($row["otp_enabled"]);

		?>
		<form dojoType='dijit.form.Form'>

			<?= \Controls\hidden_tag("op", "pref-prefs") ?>
			<?= \Controls\hidden_tag("method", "changeemail") ?>

			<script type="dojo/method" event="onSubmit" args="evt">
					evt.preventDefault();
					if (this.validate()) {
						Notify.progress('Saving data...', true);
						xhr.post("backend.php", this.getValues(), (reply) => {
							Notify.info(reply);
						})
					}
			</script>

			<fieldset>
				<label><?= __('Full name:') ?></label>
				<input dojoType='dijit.form.ValidationTextBox' name='full_name' required='1' value="<?= $full_name ?>">
			</fieldset>

			<fieldset>
				<label><?= __('E-mail:') ?></label>
				<input dojoType='dijit.form.ValidationTextBox' name='email' required='1' value="<?= $email ?>">
			</fieldset>

			<hr/>

			<button dojoType='dijit.form.Button' type='submit' class='alt-primary'>
				<?= __("Save data") ?>
			</button>
		</form>
		<?php
	}

	private function index_auth_password() {
		if ($_SESSION["auth_module"]) {
			$authenticator = PluginHost::getInstance()->get_plugin($_SESSION["auth_module"]);
		} else {
			$authenticator = false;
		}

		$otp_enabled = $this->is_otp_enabled();

		if ($authenticator && method_exists($authenticator, "change_password")) {
			?>

			<div style='display : none' id='pwd_change_infobox'></div>

			<form dojoType='dijit.form.Form'>

				<?= \Controls\hidden_tag("op", "pref-prefs") ?>
				<?= \Controls\hidden_tag("method", "changepassword") ?>

				<!-- TODO: return JSON the backend call -->
				<script type="dojo/method" event="onSubmit" args="evt">
					evt.preventDefault();
					if (this.validate()) {
						Notify.progress('Saving data...', true);
						xhr.post("backend.php", this.getValues(), (reply) => {
							Notify.close();
							if (reply.indexOf('ERROR: ') == 0) {

								App.byId('pwd_change_infobox').innerHTML =
								reply.replace('ERROR: ', '');

							} else {
								App.byId('pwd_change_infobox').innerHTML =
								reply.replace('ERROR: ', '');

								const warn = App.byId('default_pass_warning');
								if (warn) Element.hide(warn);
							}

							Element.show('pwd_change_infobox');
						})
					}
				</script>

				<?php if ($otp_enabled) {
					print_notice(__("Changing your current password will disable OTP."));
				} ?>

				<fieldset>
					<label><?= __("Old password:") ?></label>
					<input dojoType='dijit.form.ValidationTextBox' type='password' required='1' name='old_password'>
				</fieldset>

				<fieldset>
					<label><?= __("New password:") ?></label>
					<input dojoType='dijit.form.ValidationTextBox' type='password' regexp='^[^<>]+' required='1' name='new_password'>
				</fieldset>

				<fieldset>
					<label><?= __("Confirm password:") ?></label>
					<input dojoType='dijit.form.ValidationTextBox' type='password' regexp='^[^<>]+' required='1' name='confirm_password'>
				</fieldset>

				<hr/>

				<button dojoType='dijit.form.Button' type='submit' class='alt-primary'>
					<?= __("Change password") ?>
				</button>
			</form>

			<?php

		} else {
			print_notice(T_sprintf("Authentication module used for this session (<b>%s</b>) does not provide an ability to set passwords.",
				$_SESSION["auth_module"]));
		}
	}

	private function index_auth_app_passwords() {
		print_notice("You can create separate passwords for API clients. Using one is required if you enable OTP.");
		?>

		<div id='app_passwords_holder'>
			<?php $this->appPasswordList() ?>
		</div>

		<hr>

		<button style='float : left' class='alt-primary' dojoType='dijit.form.Button' onclick="Helpers.AppPasswords.generate()">
			<?= __('Generate new password') ?>
		</button>

		<button style='float : left' class='alt-danger' dojoType='dijit.form.Button'
			onclick="Helpers.AppPasswords.removeSelected()">
			<?= __('Remove selected passwords') ?>
		</button>

		<?php
	}

	private function is_otp_enabled() {
		$sth = $this->pdo->prepare("SELECT otp_enabled FROM ttrss_users
			WHERE id = ?");
		$sth->execute([$_SESSION["uid"]]);

		if ($row = $sth->fetch()) {
			return sql_bool_to_bool($row["otp_enabled"]);
		}

		return false;
	}

	private function index_auth_2fa() {
		$otp_enabled = $this->is_otp_enabled();

		if ($_SESSION["auth_module"] == "auth_internal") {
			if ($otp_enabled) {
				print_warning("One time passwords are currently enabled. Enter your current password below to disable.");
				?>

				<form dojoType='dijit.form.Form'>
					<?= \Controls\hidden_tag("op", "pref-prefs") ?>
					<?= \Controls\hidden_tag("method", "otpdisable") ?>

					<!-- TODO: return JSON from the backend call -->
					<script type="dojo/method" event="onSubmit" args="evt">
						evt.preventDefault();
						if (this.validate()) {
							Notify.progress('Saving data...', true);
							xhr.post("backend.php", this.getValues(), (reply) => {
								Notify.close();

								if (reply.indexOf('ERROR: ') == 0) {
									Notify.error(reply.replace('ERROR: ', ''));
								} else {
									window.location.reload();
								}
							})
						}
					</script>

					<fieldset>
						<label><?= __("Your password:") ?></label>
						<input dojoType='dijit.form.ValidationTextBox' type='password' required='1' name='password'>
					</fieldset>

					<hr/>

					<button dojoType='dijit.form.Button' type='submit' class='alt-danger'>
						<?= __("Disable OTP") ?>
					</button>

				</form>

				<?php

			} else {

				print_warning("You will need a compatible Authenticator to use this. Changing your password would automatically disable OTP.");
				print_notice("You will need to generate app passwords for the API clients if you enable OTP.");

				if (function_exists("imagecreatefromstring")) {
					print "<h3>" . __("Scan the following code by the Authenticator application or copy the key manually") . "</h3>";
					$csrf_token_hash = sha1($_SESSION["csrf_token"]);
					print "<img alt='otp qr-code' src='backend.php?op=pref-prefs&method=otpqrcode&csrf_token_hash=$csrf_token_hash'>";
				} else {
					print_error("PHP GD functions are required to generate QR codes.");
					print "<h3>" . __("Use the following OTP key with a compatible Authenticator application") . "</h3>";
				}

				$otp_secret = $this->otpsecret();
				?>

				<form dojoType='dijit.form.Form'>

					<?= \Controls\hidden_tag("op", "pref-prefs") ?>
					<?= \Controls\hidden_tag("method", "otpenable") ?>

					<fieldset>
						<label><?= __("OTP Key:") ?></label>
						<input dojoType='dijit.form.ValidationTextBox' disabled='disabled' value="<?= $otp_secret ?>" size='32'>
					</fieldset>

					<!-- TODO: return JSON from the backend call -->
					<script type="dojo/method" event="onSubmit" args="evt">
						evt.preventDefault();
						if (this.validate()) {
							Notify.progress('Saving data...', true);
							xhr.post("backend.php", this.getValues(), (reply) => {
								Notify.close();

								if (reply.indexOf('ERROR:') == 0) {
									Notify.error(reply.replace('ERROR:', ''));
								} else {
									window.location.reload();
								}
							})
						}
					</script>

					<fieldset>
						<label><?= __("Your password:") ?></label>
						<input dojoType='dijit.form.ValidationTextBox' type='password' required='1' name='password'>
					</fieldset>

					<fieldset>
						<label><?= __("One time password:") ?></label>
						<input dojoType='dijit.form.ValidationTextBox' autocomplete='off' required='1' name='otp'>
					</fieldset>

					<hr/>

					<button dojoType='dijit.form.Button' type='submit' class='alt-primary'>
						<?= __("Enable OTP") ?>
					</button>

				</form>
				<?php
			}
		} else {
			print_notice("OTP is only available when using <b>auth_internal</b> authentication module.");
		}
	}

	function index_auth() {
		?>
		<div dojoType='dijit.layout.TabContainer'>
			<div dojoType='dijit.layout.ContentPane' title="<?= __('Personal data') ?>">
				<?php $this->index_auth_personal() ?>
			</div>
			<div dojoType='dijit.layout.ContentPane' title="<?= __('Password') ?>">
				<?php $this->index_auth_password() ?>
			</div>
			<div dojoType='dijit.layout.ContentPane' title="<?= __('App passwords') ?>">
				<?php $this->index_auth_app_passwords() ?>
			</div>
			<div dojoType='dijit.layout.ContentPane' title="<?= __('Authenticator (OTP)') ?>">
				<?php $this->index_auth_2fa() ?>
			</div>
		</div>
		<?php
	}

	private function index_prefs_list() {
		$profile = $_SESSION["profile"] ?? null;

		if ($profile) {
			print_notice(__("Some preferences are only available in default profile."));
			$this->_init_user_prefs($_SESSION["uid"], $profile);
		} else {
			$this->_init_user_prefs($_SESSION["uid"]);
		}

		$prefs_available = [];

		$sth = $this->pdo->prepare("SELECT DISTINCT
			ttrss_user_prefs.pref_name,value,type_name,
			ttrss_prefs_sections.order_id,
			def_value,section_id
			FROM ttrss_prefs,ttrss_prefs_types,ttrss_prefs_sections,ttrss_user_prefs
			WHERE type_id = ttrss_prefs_types.id AND
				(profile = :profile OR (:profile IS NULL AND profile IS NULL)) AND
				section_id = ttrss_prefs_sections.id AND
				ttrss_user_prefs.pref_name = ttrss_prefs.pref_name AND
				owner_uid = :uid
			ORDER BY ttrss_prefs_sections.order_id,pref_name");
		$sth->execute([":uid" => $_SESSION['uid'], ":profile" => $profile]);

		$listed_boolean_prefs = [];

		while ($line = $sth->fetch()) {

			if (in_array($line["pref_name"], $this->pref_blacklist)) {
				continue;
			}

			if ($profile && in_array($line["pref_name"], $this->profile_blacklist)) {
				continue;
			}

			$pref_name = $line["pref_name"];
			$short_desc = $this->_get_short_desc($pref_name);

			if (!$short_desc)
				continue;

			$prefs_available[$pref_name] = [
				'type_name' => $line["type_name"],
				'value' => $line['value'],
				'help_text' => $this->_get_help_text($pref_name),
				'short_desc' => $short_desc
			];
		}

		foreach (array_keys($this->pref_item_map) as $section) {

			print "<h2>$section</h2>";

			foreach ($this->pref_item_map[$section] as $pref_name) {

				if ($pref_name == 'BLOCK_SEPARATOR' && !$profile) {
					print "<hr/>";
					continue;
				}

				if ($pref_name == "DEFAULT_SEARCH_LANGUAGE" && Config::get(Config::DB_TYPE) != "pgsql") {
					continue;
				}

				if (isset($prefs_available[$pref_name])) {

					$item = $prefs_available[$pref_name];

					print "<fieldset class='prefs'>";

					print "<label for='CB_$pref_name'>";
					print $item['short_desc'] . ":";
					print "</label>";

					$value = $item['value'];
					$type_name = $item['type_name'];

					if ($pref_name == "USER_LANGUAGE") {
						print \Controls\select_hash($pref_name, $value, get_translations(),
							["style" => 'width : 220px; margin : 0px']);

					} else if ($pref_name == "USER_TIMEZONE") {

						$timezones = explode("\n", file_get_contents("lib/timezones.txt"));

						print \Controls\select_tag($pref_name, $value, $timezones, ["dojoType" => "dijit.form.FilteringSelect"]);

					} else if ($pref_name == "BLACKLISTED_TAGS") { # TODO: other possible <textarea> prefs go here

						print "<div>";

						print "<textarea dojoType='dijit.form.SimpleTextarea' rows='4'
							style='width: 500px; font-size : 12px;'
							name='$pref_name'>$value</textarea><br/>";

						print "<div class='help-text-bottom text-muted'>" . $this->pref_help_bottom[$pref_name] . "</div>";

						print "</div>";

					} else if ($pref_name == "USER_CSS_THEME") {

						$themes = array_merge(glob("themes/*.php"), glob("themes/*.css"), glob("themes.local/*.css"));
						$themes = array_map("basename", $themes);
						$themes = array_filter($themes, "theme_exists");
						asort($themes);

						if (!theme_exists($value)) $value = "";

						print "<select name='$pref_name' id='$pref_name' dojoType='fox.form.Select'>";

						$issel = $value == "" ? "selected='selected'" : "";
						print "<option $issel value=''>".__("default")."</option>";

						foreach ($themes as $theme) {
							$issel = $value == $theme ? "selected='selected'" : "";
							print "<option $issel value='$theme'>$theme</option>";
						}

						print "</select>";

						print " <button dojoType=\"dijit.form.Button\" class='alt-info'
							onclick=\"Helpers.Prefs.customizeCSS()\">" . __('Customize') . "</button>";

						print " <button dojoType='dijit.form.Button' onclick='window.open(\"https://tt-rss.org/wiki/Themes\")'>
							<i class='material-icons'>open_in_new</i> ".__("More themes...")."</button>";

					} else if ($pref_name == "DEFAULT_UPDATE_INTERVAL") {

						global $update_intervals_nodefault;

						print \Controls\select_hash($pref_name, $value, $update_intervals_nodefault);

					} else if ($pref_name == "DEFAULT_SEARCH_LANGUAGE") {

						print \Controls\select_tag($pref_name, $value, Pref_Feeds::get_ts_languages());

					} else if ($type_name == "bool") {

						array_push($listed_boolean_prefs, $pref_name);

						if ($pref_name == "PURGE_UNREAD_ARTICLES" && Config::get(Config::FORCE_ARTICLE_PURGE) != 0) {
							$is_disabled = true;
							$is_checked = true;
						} else {
							$is_disabled = false;
							$is_checked = ($value == "true");
						}

						print \Controls\checkbox_tag($pref_name, $is_checked, "true",
							["disabled" => $is_disabled], "CB_$pref_name");

					} else if (in_array($pref_name, ['FRESH_ARTICLE_MAX_AGE',
							'PURGE_OLD_DAYS', 'LONG_DATE_FORMAT', 'SHORT_DATE_FORMAT'])) {

						if ($pref_name == "PURGE_OLD_DAYS" && Config::get(Config::FORCE_ARTICLE_PURGE) != 0) {
							$attributes = ["disabled" => true, "required" => true];
							$value = Config::get(Config::FORCE_ARTICLE_PURGE);
						} else {
							$attributes = ["required" => true];
						}

						if ($type_name == 'integer')
							print \Controls\number_spinner_tag($pref_name, $value, $attributes);
						else
							print \Controls\input_tag($pref_name, $value, "text", $attributes);

					} else if ($pref_name == "SSL_CERT_SERIAL") {

						print \Controls\input_tag($pref_name, $value, "text", ["readonly" => true], "SSL_CERT_SERIAL");

						$cert_serial = htmlspecialchars(get_ssl_certificate_id());
						$has_serial = ($cert_serial) ? true : false;

						print \Controls\button_tag(__('Register'), "", [
							"disabled" => !$has_serial,
							"onclick" => "dijit.byId('SSL_CERT_SERIAL').attr('value', '$cert_serial')"]);

						print \Controls\button_tag(__('Clear'), "", [
							"class" => "alt-danger",
							"onclick" => "dijit.byId('SSL_CERT_SERIAL').attr('value', '')"]);

						print \Controls\button_tag(\Controls\icon("help") . " " . __("More info..."), "", [
							"class" => "alt-info",
							"onclick" => "window.open('https://tt-rss.org/wiki/SSL%20Certificate%20Authentication')"]);

					} else if ($pref_name == 'DIGEST_PREFERRED_TIME') {
						print "<input dojoType=\"dijit.form.ValidationTextBox\"
							id=\"$pref_name\" regexp=\"[012]?\d:\d\d\" placeHolder=\"12:00\"
							name=\"$pref_name\" value=\"$value\">";

						$item['help_text'] .= ". " . T_sprintf("Current server time: %s", date("H:i"));
					} else {
						$regexp = ($type_name == 'integer') ? 'regexp="^\d*$"' : '';

						print "<input dojoType=\"dijit.form.ValidationTextBox\" $regexp name=\"$pref_name\" value=\"$value\">";
					}

					if ($item['help_text'])
						print "<div class='help-text text-muted'><label for='CB_$pref_name'>".$item['help_text']."</label></div>";

					print "</fieldset>";
				}
			}
		}
		print \Controls\hidden_tag("boolean_prefs", htmlspecialchars(join(",", $listed_boolean_prefs)));
	}

	private function index_prefs() {
		?>
		<form dojoType='dijit.form.Form' id='changeSettingsForm'>
			<?= \Controls\hidden_tag("op", "pref-prefs") ?>
			<?= \Controls\hidden_tag("method", "saveconfig") ?>

			<script type="dojo/method" event="onSubmit" args="evt, quit">
				if (evt) evt.preventDefault();
				if (this.validate()) {
					xhr.post("backend.php", this.getValues(), (reply) => {
						if (quit) {
							document.location.href = 'index.php';
						} else {
							if (reply == 'PREFS_NEED_RELOAD') {
								window.location.reload();
							} else {
								Notify.info(reply);
							}
						}
					})
				}
			</script>

			<div dojoType="dijit.layout.BorderContainer" gutters="false">
				<div dojoType="dijit.layout.ContentPane" region="center" style="overflow-y : auto">
					<?php $this->index_prefs_list() ?>
					<?php PluginHost::getInstance()->run_hooks(PluginHost::HOOK_PREFS_TAB_SECTION, "prefPrefsPrefsInside") ?>
				</div>
				<div dojoType="dijit.layout.ContentPane" region="bottom">

					<div dojoType="fox.form.ComboButton" type="submit" class="alt-primary">
						<span><?= __('Save configuration') ?></span>
						<div dojoType="dijit.DropDownMenu">
							<div dojoType="dijit.MenuItem" onclick="dijit.byId('changeSettingsForm').onSubmit(null, true)">
								<?= __("Save and exit preferences") ?>
							</div>
						</div>
					</div>

					<button dojoType="dijit.form.Button" onclick="return Helpers.Profiles.edit()">
						<?= __('Manage profiles') ?>
					</button>

					<button dojoType="dijit.form.Button" class="alt-danger" onclick="return Helpers.Prefs.confirmReset()">
						<?= __('Reset to defaults') ?>
					</button>

					<?php PluginHost::getInstance()->run_hooks(PluginHost::HOOK_PREFS_TAB_SECTION, "prefPrefsPrefsOutside") ?>
				</div>
			</div>
		</form>
		<?php
	}

	private function index_plugins_system() {
		print_notice("System plugins are enabled in <strong>config.php</strong> for all users.");

		$system_enabled = array_map("trim", explode(",", (string)Config::get(Config::PLUGINS)));

		$tmppluginhost = new PluginHost();
		$tmppluginhost->load_all($tmppluginhost::KIND_ALL, $_SESSION["uid"], true);

		foreach ($tmppluginhost->get_plugins() as $name => $plugin) {
			$about = $plugin->about();

			if ($about[3] ?? false) {
				$is_checked = in_array($name, $system_enabled) ? "checked" : "";
				?>
				<fieldset class='prefs plugin'>
					<label><?= $name ?>:</label>
					<label class='checkbox description text-muted' id="PLABEL-<?= htmlspecialchars($name) ?>">
						<input disabled='1' dojoType='dijit.form.CheckBox' <?= $is_checked ?> type='checkbox'><?= htmlspecialchars($about[1]) ?>
					</label>

					<?php if ($about[4] ?? false) { ?>
						<button dojoType='dijit.form.Button' class='alt-info'
							onclick='window.open("<?= htmlspecialchars($about[4]) ?>")'>
								<i class='material-icons'>open_in_new</i> <?= __("More info...") ?></button>
					<?php } ?>

					<div dojoType='dijit.Tooltip' connectId='PLABEL-<?= htmlspecialchars($name) ?>' position='after'>
						<?= htmlspecialchars(T_sprintf("v%.2f, by %s", $about[0], $about[2])) ?>
					</div>
				</fieldset>
				<?php
			}
		}
	}

	private function index_plugins_user() {
		$system_enabled = array_map("trim", explode(",", (string)Config::get(Config::PLUGINS)));
		$user_enabled = array_map("trim", explode(",", get_pref("_ENABLED_PLUGINS")));

		$tmppluginhost = new PluginHost();
		$tmppluginhost->load_all($tmppluginhost::KIND_ALL, $_SESSION["uid"], true);

		foreach ($tmppluginhost->get_plugins() as $name => $plugin) {
			$about = $plugin->about();

			if (empty($about[3]) || $about[3] == false) {

				$is_checked = "";
				$is_disabled = "";

				if (in_array($name, $system_enabled)) {
					$is_checked = "checked='1'";
					$is_disabled = "disabled='1'";
				} else if (in_array($name, $user_enabled)) {
					$is_checked = "checked='1'";
				}

				?>

				<fieldset class='prefs plugin'>
					<label><?= $name ?>:</label>
					<label class='checkbox description text-muted' id="PLABEL-<?= htmlspecialchars($name) ?>">
						<input name='plugins[]' value="<?= htmlspecialchars($name) ?>"
							dojoType='dijit.form.CheckBox' <?= $is_checked ?> <?= $is_disabled ?> type='checkbox'>
							<?= htmlspecialchars($about[1]) ?>
						</input>
					</label>

					<?php if (count($tmppluginhost->get_all($plugin)) > 0) {
						if (in_array($name, $system_enabled) || in_array($name, $user_enabled)) { ?>
							<button dojoType='dijit.form.Button'
								onclick='Helpers.Prefs.clearPluginData("<?= htmlspecialchars($name) ?>")'>
									<i class='material-icons'>clear</i> <?= __("Clear data") ?></button>
					<?php }
					} ?>

					<?php if ($about[4] ?? false) { ?>
						<button dojoType='dijit.form.Button' class='alt-info'
								onclick='window.open("<?= htmlspecialchars($about[4]) ?>")'>
									<i class='material-icons'>open_in_new</i> <?= __("More info...") ?></button>
					<?php } ?>

					<div dojoType='dijit.Tooltip' connectId="PLABEL-<?= htmlspecialchars($name) ?>" position='after'>
						<?= htmlspecialchars(T_sprintf("v%.2f, by %s", $about[0], $about[2])) ?>
					</div>

				</fieldset>
				<?php
			}
		}
	}

	function index_plugins() {
		?>
		<form dojoType="dijit.form.Form" id="changePluginsForm">
			<script type="dojo/method" event="onSubmit" args="evt">
					evt.preventDefault();
					if (this.validate()) {
						xhr.post("backend.php", this.getValues(), () => {
							Notify.close();
							if (confirm(__('Selected plugins have been enabled. Reload?'))) {
								window.location.reload();
							}
						})
					}
			</script>

			<?= \Controls\hidden_tag("op", "pref-prefs") ?>
			<?= \Controls\hidden_tag("method", "setplugins") ?>

			<div dojoType="dijit.layout.BorderContainer" gutters="false">
				<div dojoType="dijit.layout.ContentPane" region="center" style="overflow-y : auto">
					<?php
						if (!empty($_SESSION["safe_mode"])) {
							print_error("You have logged in using safe mode, no user plugins will be actually enabled until you login again.");
						}

						$feed_handler_whitelist = [ "Af_Comics" ];

						$feed_handlers = array_merge(
							PluginHost::getInstance()->get_hooks(PluginHost::HOOK_FEED_FETCHED),
							PluginHost::getInstance()->get_hooks(PluginHost::HOOK_FEED_PARSED),
							PluginHost::getInstance()->get_hooks(PluginHost::HOOK_FETCH_FEED));

						$feed_handlers = array_filter($feed_handlers, function($plugin) use ($feed_handler_whitelist) {
							return in_array(get_class($plugin), $feed_handler_whitelist) === false; });

						if (count($feed_handlers) > 0) {
							print_error(
								T_sprintf("The following plugins use per-feed content hooks. This may cause excessive data usage and origin server load resulting in a ban of your instance: <b>%s</b>" ,
									implode(", ", array_map(function($plugin) { return get_class($plugin); }, $feed_handlers))
								) . " (<a href='https://tt-rss.org/wiki/FeedHandlerPlugins' target='_blank'>".__("More info...")."</a>)"
							);
						}
					?>

					<h2><?= __("System plugins") ?></h2>

					<?php $this->index_plugins_system() ?>

					<h2><?= __("User plugins") ?></h2>

					<?php $this->index_plugins_user() ?>

				</div>
				<div dojoType="dijit.layout.ContentPane" region="bottom">
					<button dojoType='dijit.form.Button' style='float : left' class='alt-info' onclick='window.open("https://tt-rss.org/wiki/Plugins")'>
						<i class='material-icons'>help</i> <?= __("More info...") ?>
					</button>
					<button dojoType='dijit.form.Button' class='alt-primary' type='submit'>
						<?= __("Enable selected plugins") ?>
					</button>
				</div>
			</div>
		</form>
		<?php
	}

	function index() {
		?>
			<div dojoType='dijit.layout.AccordionContainer' region='center'>
				<div dojoType='dijit.layout.AccordionPane' title="<i class='material-icons'>person</i> <?= __('Personal data / Authentication')?>">
					<script type='dojo/method' event='onSelected' args='evt'>
						if (this.domNode.querySelector('.loading'))
							window.setTimeout(() => {
								xhr.post("backend.php", {op: 'pref-prefs', method: 'index_auth'}, (reply) => {
									this.attr('content', reply);
								});
							}, 100);
					</script>
					<span class='loading'><?= __("Loading, please wait...") ?></span>
				</div>
				<div dojoType='dijit.layout.AccordionPane' selected='true' title="<i class='material-icons'>settings</i> <?= __('Preferences') ?>">
					<?php $this->index_prefs() ?>
				</div>
				<div dojoType='dijit.layout.AccordionPane' title="<i class='material-icons'>extension</i> <?= __('Plugins') ?>">
					<script type='dojo/method' event='onSelected' args='evt'>
						if (this.domNode.querySelector('.loading'))
							window.setTimeout(() => {
								xhr.post("backend.php", {op: 'pref-prefs', method: 'index_plugins'}, (reply) => {
									this.attr('content', reply);
								});
							}, 200);
					</script>
					<span class='loading'><?= __("Loading, please wait...") ?></span>
				</div>
				<?php PluginHost::getInstance()->run_hooks(PluginHost::HOOK_PREFS_TAB, "prefPrefs") ?>
			</div>
		<?php
	}

	function toggleAdvanced() {
		$_SESSION["prefs_show_advanced"] = !$_SESSION["prefs_show_advanced"];
	}

	function otpsecret() {
		$sth = $this->pdo->prepare("SELECT salt, otp_enabled
			FROM ttrss_users
			WHERE id = ?");
		$sth->execute([$_SESSION['uid']]);

		if ($row = $sth->fetch()) {
			$otp_enabled = sql_bool_to_bool($row["otp_enabled"]);

			if (!$otp_enabled) {
				$base32 = new \OTPHP\Base32();
				$secret = $base32->encode(mb_substr(sha1($row["salt"]), 0, 12), false);

				return $secret;
			}
		}

		return false;
	}

	function otpqrcode() {
		$csrf_token_hash = clean($_REQUEST["csrf_token_hash"]);

		if (sha1($_SESSION["csrf_token"]) === $csrf_token_hash) {
			require_once "lib/phpqrcode/phpqrcode.php";

			$sth = $this->pdo->prepare("SELECT login
				FROM ttrss_users
				WHERE id = ?");
			$sth->execute([$_SESSION['uid']]);

			if ($row = $sth->fetch()) {
				$secret = $this->otpsecret();
				$login = $row['login'];

				if ($secret) {
					QRcode::png("otpauth://totp/".urlencode($login).
						"?secret=$secret&issuer=".urlencode("Tiny Tiny RSS"));
				}
			}
		} else {
			header("Content-Type: text/json");
			print error_json(6);
		}
	}

	function otpenable() {

		$password = clean($_REQUEST["password"]);
		$otp = clean($_REQUEST["otp"]);

		$authenticator = PluginHost::getInstance()->get_plugin($_SESSION["auth_module"]);

		if ($authenticator->check_password($_SESSION["uid"], $password)) {

			$secret = $this->otpsecret();

			if ($secret) {

				$base32 = new \OTPHP\Base32();

				$topt = new \OTPHP\TOTP($secret);

				$otp_check = $topt->now();

				if ($otp == $otp_check) {
					$sth = $this->pdo->prepare("UPDATE ttrss_users
					SET otp_enabled = true WHERE id = ?");

					$sth->execute([$_SESSION['uid']]);

					print "OK";
				} else {
					print "ERROR:".__("Incorrect one time password");
				}
			}

		} else {
			print "ERROR:".__("Incorrect password");
		}

	}

	static function isdefaultpassword() {
		$authenticator = PluginHost::getInstance()->get_plugin($_SESSION["auth_module"]);

		if ($authenticator &&
                method_exists($authenticator, "check_password") &&
                $authenticator->check_password($_SESSION["uid"], "password")) {

			return true;
		}

		return false;
	}

	function otpdisable() {
		$password = clean($_REQUEST["password"]);

		$authenticator = PluginHost::getInstance()->get_plugin($_SESSION["auth_module"]);

		if ($authenticator->check_password($_SESSION["uid"], $password)) {

			$sth = $this->pdo->prepare("SELECT email, login FROM ttrss_users WHERE id = ?");
			$sth->execute([$_SESSION['uid']]);

			if ($row = $sth->fetch()) {
				$mailer = new Mailer();

				$tpl = new Templator();

				$tpl->readTemplateFromFile("otp_disabled_template.txt");

				$tpl->setVariable('LOGIN', $row["login"]);
				$tpl->setVariable('TTRSS_HOST', Config::get(Config::SELF_URL_PATH));

				$tpl->addBlock('message');

				$tpl->generateOutputToString($message);

				$mailer->mail(["to_name" => $row["login"],
					"to_address" => $row["email"],
					"subject" => "[tt-rss] OTP change notification",
					"message" => $message]);
			}

			$sth = $this->pdo->prepare("UPDATE ttrss_users SET otp_enabled = false WHERE
				id = ?");
			$sth->execute([$_SESSION['uid']]);

			print "OK";
		} else {
			print "ERROR: ".__("Incorrect password");
		}

	}

	function setplugins() {
		if (is_array(clean($_REQUEST["plugins"])))
			$plugins = join(",", clean($_REQUEST["plugins"]));
		else
			$plugins = "";

		set_pref("_ENABLED_PLUGINS", $plugins);
	}

	function clearplugindata() {
		$name = clean($_REQUEST["name"]);

		PluginHost::getInstance()->clear_data(PluginHost::getInstance()->get_plugin($name));
	}

	function customizeCSS() {
		$value = get_pref("USER_STYLESHEET");
		$value = str_replace("<br/>", "\n", $value);

		print json_encode(["value" => $value]);
	}

	function activateprofile() {
		$_SESSION["profile"] = (int) clean($_REQUEST["id"]);

		// default value
		if (!$_SESSION["profile"]) $_SESSION["profile"] = null;
	}

	function remprofiles() {
		$ids = explode(",", clean($_REQUEST["ids"]));

		foreach ($ids as $id) {
			if ($_SESSION["profile"] != $id) {
				$sth = $this->pdo->prepare("DELETE FROM ttrss_settings_profiles WHERE id = ? AND
							owner_uid = ?");
				$sth->execute([$id, $_SESSION['uid']]);
			}
		}
	}

	function addprofile() {
		$title = clean($_REQUEST["title"]);

		if ($title) {
			$this->pdo->beginTransaction();

			$sth = $this->pdo->prepare("SELECT id FROM ttrss_settings_profiles
				WHERE title = ? AND owner_uid = ?");
			$sth->execute([$title, $_SESSION['uid']]);

			if (!$sth->fetch()) {

				$sth = $this->pdo->prepare("INSERT INTO ttrss_settings_profiles (title, owner_uid)
							VALUES (?, ?)");

				$sth->execute([$title, $_SESSION['uid']]);

				$sth = $this->pdo->prepare("SELECT id FROM ttrss_settings_profiles WHERE
					title = ? AND owner_uid = ?");
				$sth->execute([$title, $_SESSION['uid']]);

				if ($row = $sth->fetch()) {
					$profile_id = $row['id'];

					if ($profile_id) {
						Pref_Prefs::_init_user_prefs($_SESSION["uid"], $profile_id);
					}
				}
			}

			$this->pdo->commit();
		}
	}

	function saveprofile() {
		$id = clean($_REQUEST["id"]);
		$title = clean($_REQUEST["title"]);

		if ($id == 0) {
			print __("Default profile");
			return;
		}

		if ($title) {
			$sth = $this->pdo->prepare("UPDATE ttrss_settings_profiles
				SET title = ? WHERE id = ? AND
					owner_uid = ?");

			$sth->execute([$title, $id, $_SESSION['uid']]);
			print $title;
		}
	}

	// TODO: this maybe needs to be unified with Public::getProfiles()
	function getProfiles() {
		$rv = [];

		$sth = $this->pdo->prepare("SELECT title,id FROM ttrss_settings_profiles
			WHERE owner_uid = ? ORDER BY title");
		$sth->execute([$_SESSION['uid']]);

		array_push($rv, ["title" => __("Default profile"),
				"id" => 0,
				"active" => empty($_SESSION["profile"])
			]);

		while ($row = $sth->fetch(PDO::FETCH_ASSOC)) {
			$row["active"] = isset($_SESSION["profile"]) && $_SESSION["profile"] == $row["id"];
			array_push($rv, $row);
		};

		print json_encode($rv);
	}

	private function _get_short_desc($pref_name) {
		if (isset($this->pref_help[$pref_name][0])) {
			return $this->pref_help[$pref_name][0];
		}
		return "";
	}

	private function _get_help_text($pref_name) {
		if (isset($this->pref_help[$pref_name][1])) {
			return $this->pref_help[$pref_name][1];
		}
		return "";
	}

	private function appPasswordList() {
		?>
		<div dojoType='fox.Toolbar'>
			<div dojoType='fox.form.DropDownButton'>
				<span><?= __('Select') ?></span>
				<div dojoType='dijit.Menu' style='display: none'>
					<div onclick="Tables.select('app-password-list', true)"
						dojoType="dijit.MenuItem"><?= __('All') ?></div>
					<div onclick="Tables.select('app-password-list', false)"
						dojoType="dijit.MenuItem"><?= __('None') ?></div>
				</div>
			</div>
		</div>

		<div class='panel panel-scrollable'>
			<table width='100%' id='app-password-list'>
				<tr>
					<th width='2%'> </th>
					<th align='left'><?= __("Description") ?></th>
					<th align='right'><?= __("Created") ?></th>
					<th align='right'><?= __("Last used") ?></th>
				</tr>
				<?php
				$sth = $this->pdo->prepare("SELECT id, title, created, last_used
					FROM ttrss_app_passwords WHERE owner_uid = ?");
				$sth->execute([$_SESSION['uid']]);

				while ($row = $sth->fetch()) { ?>
					<tr data-row-id='<?= $row['id'] ?>'>
						<td align='center'>
							<input onclick='Tables.onRowChecked(this)' dojoType='dijit.form.CheckBox' type='checkbox'>
						</td>
						<td>
							<?= htmlspecialchars($row["title"]) ?>
						</td>
						<td align='right' class='text-muted'>
							<?= TimeHelper::make_local_datetime($row['created'], false) ?>
						</td>
						<td align='right' class='text-muted'>
							<?= TimeHelper::make_local_datetime($row['last_used'], false) ?>
						</td>
					</tr>
				<?php } ?>
			</table>
		</div>
		<?php
	}

	private function _encrypt_app_password($password) {
		$salt = substr(bin2hex(get_random_bytes(24)), 0, 24);

		return "SSHA-512:".hash('sha512', $salt . $password). ":$salt";
	}

	function deleteAppPassword() {
		$ids = explode(",", clean($_REQUEST['ids']));
		$ids_qmarks = arr_qmarks($ids);

		$sth = $this->pdo->prepare("DELETE FROM ttrss_app_passwords WHERE id IN ($ids_qmarks) AND owner_uid = ?");
		$sth->execute(array_merge($ids, [$_SESSION['uid']]));

		$this->appPasswordList();
	}

	function generateAppPassword() {
		$title = clean($_REQUEST['title']);
		$new_password = make_password(16);
		$new_password_hash = $this->_encrypt_app_password($new_password);

		print_warning(T_sprintf("Generated password <strong>%s</strong> for %s. Please remember it for future reference.", $new_password, $title));

		$sth = $this->pdo->prepare("INSERT INTO ttrss_app_passwords
    			(title, pwd_hash, service, created, owner_uid)
    		 VALUES
    		    (?, ?, ?, NOW(), ?)");

		$sth->execute([$title, $new_password_hash, Auth_Base::AUTH_SERVICE_API, $_SESSION['uid']]);

		$this->appPasswordList();
	}

	static function _init_user_prefs($uid, $profile = false) {

		if (get_schema_version() < 63) $profile_qpart = "";

		$pdo = Db::pdo();
		$in_nested_tr = false;

		try {
			$pdo->beginTransaction();
		} catch (Exception $e) {
			$in_nested_tr = true;
		}

		$sth = $pdo->query("SELECT pref_name,def_value FROM ttrss_prefs");

		if (!is_numeric($profile) || !$profile || get_schema_version() < 63) $profile = null;

		$u_sth = $pdo->prepare("SELECT pref_name
			FROM ttrss_user_prefs WHERE owner_uid = :uid AND
				(profile = :profile OR (:profile IS NULL AND profile IS NULL))");
		$u_sth->execute([':uid' => $uid, ':profile' => $profile]);

		$active_prefs = array();

		while ($line = $u_sth->fetch()) {
			array_push($active_prefs, $line["pref_name"]);
		}

		while ($line = $sth->fetch()) {
			if (array_search($line["pref_name"], $active_prefs) === false) {
//				print "adding " . $line["pref_name"] . "<br>";

				if (get_schema_version() < 63) {
					$i_sth = $pdo->prepare("INSERT INTO ttrss_user_prefs
						(owner_uid,pref_name,value) VALUES
						(?, ?, ?)");
					$i_sth->execute([$uid, $line["pref_name"], $line["def_value"]]);

				} else {
					$i_sth = $pdo->prepare("INSERT INTO ttrss_user_prefs
						(owner_uid,pref_name,value, profile) VALUES
						(?, ?, ?, ?)");
					$i_sth->execute([$uid, $line["pref_name"], $line["def_value"], $profile]);
				}

			}
		}

		if (!$in_nested_tr) $pdo->commit();

	}

}

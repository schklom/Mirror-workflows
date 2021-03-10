<?php
use chillerlan\QRCode;

class Pref_Prefs extends Handler_Protected {

	private $pref_help = [];
	private $pref_item_map = [];
	private $pref_help_bottom = [];
	private $pref_blacklist = [];

	const PI_RES_ALREADY_INSTALLED = "PI_RES_ALREADY_INSTALLED";
	const PI_RES_SUCCESS = "PI_RES_SUCCESS";
	const PI_ERR_NO_CLASS = "PI_ERR_NO_CLASS";
	const PI_ERR_NO_INIT_PHP = "PI_ERR_NO_INIT_PHP";
	const PI_ERR_EXEC_FAILED = "PI_ERR_EXEC_FAILED";
	const PI_ERR_NO_TEMPDIR = "PI_ERR_NO_TEMPDIR";
	const PI_ERR_PLUGIN_NOT_FOUND = "PI_ERR_PLUGIN_NOT_FOUND";
	const PI_ERR_NO_WORKDIR = "PI_ERR_NO_WORKDIR";

	function csrf_ignore($method) {
		$csrf_ignored = array("index", "updateself", "otpqrcode");

		return array_search($method, $csrf_ignored) !== false;
	}

	function __construct($args) {
		parent::__construct($args);

		$this->pref_item_map = [
			__('General') => [
				Prefs::USER_LANGUAGE,
				Prefs::USER_TIMEZONE,
				'BLOCK_SEPARATOR',
				Prefs::USER_CSS_THEME,
				'BLOCK_SEPARATOR',
				Prefs::ENABLE_API_ACCESS,
			],
			__('Feeds') => [
				Prefs::DEFAULT_UPDATE_INTERVAL,
				Prefs::FRESH_ARTICLE_MAX_AGE,
				Prefs::DEFAULT_SEARCH_LANGUAGE,
				'BLOCK_SEPARATOR',
				Prefs::ENABLE_FEED_CATS,
				'BLOCK_SEPARATOR',
				Prefs::CONFIRM_FEED_CATCHUP,
				Prefs::ON_CATCHUP_SHOW_NEXT_FEED,
				'BLOCK_SEPARATOR',
				Prefs::HIDE_READ_FEEDS,
				Prefs::HIDE_READ_SHOWS_SPECIAL,
			],
			__('Articles') => [
				Prefs::PURGE_OLD_DAYS,
				Prefs::PURGE_UNREAD_ARTICLES,
				'BLOCK_SEPARATOR',
				Prefs::COMBINED_DISPLAY_MODE,
				Prefs::CDM_EXPANDED,
				Prefs::CDM_ENABLE_GRID,
				'BLOCK_SEPARATOR',
				Prefs::CDM_AUTO_CATCHUP,
				Prefs::VFEED_GROUP_BY_FEED,
				'BLOCK_SEPARATOR',
				Prefs::SHOW_CONTENT_PREVIEW,
				Prefs::STRIP_IMAGES,
			],
			__('Digest') => [
				Prefs::DIGEST_ENABLE,
				Prefs::DIGEST_CATCHUP,
				Prefs::DIGEST_PREFERRED_TIME,
			],
			__('Advanced') => [
				Prefs::BLACKLISTED_TAGS,
				'BLOCK_SEPARATOR',
				Prefs::LONG_DATE_FORMAT,
				Prefs::SHORT_DATE_FORMAT,
				'BLOCK_SEPARATOR',
				Prefs::SSL_CERT_SERIAL,
				'BLOCK_SEPARATOR',
				Prefs::DISABLE_CONDITIONAL_COUNTERS,
				Prefs::HEADLINES_NO_DISTINCT,
			],
			__('Debugging') => [
				Prefs::DEBUG_HEADLINE_IDS,
			],
		];

		$this->pref_help_bottom = [
			Prefs::BLACKLISTED_TAGS => __("Never apply these tags automatically (comma-separated list)."),
		];

		$this->pref_help = [
			Prefs::BLACKLISTED_TAGS => array(__("Blacklisted tags"), ""),
			Prefs::DEFAULT_SEARCH_LANGUAGE => array(__("Default language"), __("Used for full-text search")),
			Prefs::CDM_AUTO_CATCHUP => array(__("Mark read on scroll"), __("Mark articles as read as you scroll past them")),
			Prefs::CDM_EXPANDED => array(__("Always expand articles")),
			Prefs::COMBINED_DISPLAY_MODE => array(__("Combined mode"), __("Show flat list of articles instead of separate panels")),
			Prefs::CONFIRM_FEED_CATCHUP => array(__("Confirm marking feeds as read")),
			Prefs::DEFAULT_UPDATE_INTERVAL => array(__("Default update interval")),
			Prefs::DIGEST_CATCHUP => array(__("Mark sent articles as read")),
			Prefs::DIGEST_ENABLE => array(__("Enable digest"), __("Send daily digest of new (and unread) headlines to your e-mail address")),
			Prefs::DIGEST_PREFERRED_TIME => array(__("Try to send around this time"), __("Time in UTC")),
			Prefs::ENABLE_API_ACCESS => array(__("Enable API"), __("Allows accessing this account through the API")),
			Prefs::ENABLE_FEED_CATS => array(__("Enable categories")),
			Prefs::FRESH_ARTICLE_MAX_AGE => array(__("Maximum age of fresh articles"), "<strong>" . __("hours") . "</strong>"),
			Prefs::HIDE_READ_FEEDS => array(__("Hide read feeds")),
			Prefs::HIDE_READ_SHOWS_SPECIAL => array(__("Always show special feeds"), __("While hiding read feeds")),
			Prefs::LONG_DATE_FORMAT => array(__("Long date format"), __("Syntax is identical to PHP <a href='http://php.net/manual/function.date.php'>date()</a> function.")),
			Prefs::ON_CATCHUP_SHOW_NEXT_FEED => array(__("Automatically show next feed"), __("After marking one as read")),
			Prefs::PURGE_OLD_DAYS => array(__("Purge articles older than"), __("<strong>days</strong> (0 disables)")),
			Prefs::PURGE_UNREAD_ARTICLES => array(__("Purge unread articles")),
			Prefs::SHORT_DATE_FORMAT => array(__("Short date format")),
			Prefs::SHOW_CONTENT_PREVIEW => array(__("Show content preview in headlines")),
			Prefs::SSL_CERT_SERIAL => array(__("SSL client certificate")),
			Prefs::STRIP_IMAGES => array(__("Do not embed media")),
			Prefs::USER_TIMEZONE => array(__("Time zone")),
			Prefs::VFEED_GROUP_BY_FEED => array(__("Group by feed"), __("Group multiple-feed output by originating feed")),
			Prefs::USER_LANGUAGE => array(__("Language")),
			Prefs::USER_CSS_THEME => array(__("Theme")),
			Prefs::HEADLINES_NO_DISTINCT => array(__("Don't enforce DISTINCT headlines"), __("May produce duplicate entries")),
			Prefs::DEBUG_HEADLINE_IDS => array(__("Show article and feed IDs"), __("In the headlines buffer")),
			Prefs::DISABLE_CONDITIONAL_COUNTERS => array(__("Disable conditional counter updates"), __("May increase server load")),
			Prefs::CDM_ENABLE_GRID => array(__("Grid view"), __("On wider screens, if always expanded")),
		];

		// hidden in the main prefs UI (use to hide things that have description set above)
		$this->pref_blacklist = [
			//
		];
	}

	function changepassword() {

		if (Config::get(Config::FORBID_PASSWORD_CHANGES)) {
			print "ERROR: ".format_error("Access forbidden.");
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
				case Prefs::DIGEST_PREFERRED_TIME:
					if (get_pref(Prefs::DIGEST_PREFERRED_TIME) != $value) {

						$sth = $this->pdo->prepare("UPDATE ttrss_users SET
							last_digest_sent = NULL WHERE id = ?");
						$sth->execute([$_SESSION['uid']]);

					}
					break;
				case Prefs::USER_LANGUAGE:
					if (!$need_reload) $need_reload = $_SESSION["language"] != $value;
					break;

				case Prefs::USER_CSS_THEME:
					if (!$need_reload) $need_reload = get_pref($pref_name) != $value;
					break;

				case Prefs::BLACKLISTED_TAGS:
					$cats = FeedItem_Common::normalize_categories(explode(",", $value));
					asort($cats);
					$value = implode(", ", $cats);
					break;
			}

			if (Prefs::is_valid($pref_name)) {
				Prefs::set($pref_name, $value, $_SESSION["uid"], $_SESSION["profile"] ?? null);
			}
		}

		if ($need_reload) {
			print "PREFS_NEED_RELOAD";
		} else {
			print __("The configuration was saved.");
		}
	}

	function changePersonalData() {

		$user = ORM::for_table('ttrss_users')->find_one($_SESSION['uid']);
		$new_email = clean($_POST['email']);

		if ($user) {
			$user->full_name = clean($_POST['full_name']);

			if ($user->email != $new_email)
				Logger::log(E_USER_NOTICE, "Email address of user ".$user->login." has been changed to ${new_email}.");

			if ($user->email && $user->email != $new_email) {

				$mailer = new Mailer();

				$tpl = new Templator();

				$tpl->readTemplateFromFile("mail_change_template.txt");

				$tpl->setVariable('LOGIN', $user->login);
				$tpl->setVariable('NEWMAIL', $new_email);
				$tpl->setVariable('TTRSS_HOST', Config::get(Config::SELF_URL_PATH));

				$tpl->addBlock('message');

				$tpl->generateOutputToString($message);

				$mailer->mail(["to_name" => $user->login,
					"to_address" => $user->email,
					"subject" => "[tt-rss] Email address change notification",
					"message" => $message]);

				$user->email = $new_email;
			}

			$user->save();
		}

		print __("Your personal data has been saved.");
	}

	function resetconfig() {
		Prefs::reset($_SESSION["uid"], $_SESSION["profile"]);

		print "PREFS_NEED_RELOAD";
	}

	private function index_auth_personal() {

		$user = ORM::for_table('ttrss_users')->find_one($_SESSION['uid']);

		?>
		<form dojoType='dijit.form.Form'>

			<?= \Controls\hidden_tag("op", "pref-prefs") ?>
			<?= \Controls\hidden_tag("method", "changePersonalData") ?>

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
				<input dojoType='dijit.form.ValidationTextBox' name='full_name' required='1' value="<?= htmlspecialchars($user->full_name) ?>">
			</fieldset>

			<fieldset>
				<label><?= __('E-mail:') ?></label>
				<input dojoType='dijit.form.ValidationTextBox' name='email' required='1' value="<?= htmlspecialchars($user->email) ?>">
			</fieldset>

			<hr/>

			<button dojoType='dijit.form.Button' type='submit' class='alt-primary'>
				<?= \Controls\icon("save") ?>
				<?= __("Save") ?>
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

		$otp_enabled = UserHelper::is_otp_enabled($_SESSION["uid"]);

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
					<?= \Controls\icon("security") ?>
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
		print_notice("Separate passwords used for API clients. Required if you enable OTP.");
		?>

		<div id='app_passwords_holder'>
			<?php $this->appPasswordList() ?>
		</div>

		<hr>

		<button style='float : left' class='alt-primary' dojoType='dijit.form.Button' onclick="Helpers.AppPasswords.generate()">
		<?= \Controls\icon("add") ?>
			<?= __('Generate password') ?>
		</button>

		<button style='float : left' class='alt-danger' dojoType='dijit.form.Button'
			onclick="Helpers.AppPasswords.removeSelected()">
			<?= \Controls\icon("delete") ?>
			<?= __('Remove selected') ?>
		</button>

		<?php
	}

	private function index_auth_2fa() {
		$otp_enabled = UserHelper::is_otp_enabled($_SESSION["uid"]);

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
						<?= \Controls\icon("lock_open") ?>
						<?= __("Disable OTP") ?>
					</button>

				</form>

				<?php

			} else {

				print "<img src=".($this->_get_otp_qrcode_img()).">";

				print_notice("You will need to generate app passwords for API clients if you enable OTP.");

				$otp_secret = UserHelper::get_otp_secret($_SESSION["uid"]);
				?>

				<form dojoType='dijit.form.Form'>

					<?= \Controls\hidden_tag("op", "pref-prefs") ?>
					<?= \Controls\hidden_tag("method", "otpenable") ?>

					<fieldset>
						<label><?= __("OTP Key:") ?></label>
						<input dojoType='dijit.form.ValidationTextBox' disabled='disabled' value="<?= $otp_secret ?>" style='width : 215px'>
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
						<?= \Controls\icon("lock") ?>
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
		}

		$prefs_available = [];
		$listed_boolean_prefs = [];

		foreach (Prefs::get_all($_SESSION["uid"], $profile) as $line) {

			if (in_array($line["pref_name"], $this->pref_blacklist)) {
				continue;
			}

			if ($profile && in_array($line["pref_name"], Prefs::_PROFILE_BLACKLIST)) {
				continue;
			}

			$pref_name = $line["pref_name"];
			$short_desc = $this->_get_short_desc($pref_name);

			if (!$short_desc)
				continue;

			$prefs_available[$pref_name] = [
				'type_hint' => $line['type_hint'],
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
					$type_hint = $item['type_hint'];

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

						$theme_files = array_map("basename",
							array_merge(glob("themes/*.php"),
								glob("themes/*.css"),
								glob("themes.local/*.css")));

						asort($theme_files);

						$themes = [ "" => __("default") ];

						foreach ($theme_files as $file) {
							$themes[$file] = basename($file, ".css");
						}
						?>

						<?= \Controls\select_hash($pref_name, $value, $themes) ?>
						<?= \Controls\button_tag(\Controls\icon("palette") . " " . __("Customize"), "",
								["onclick" => "Helpers.Prefs.customizeCSS()"]) ?>
						<?= \Controls\button_tag(\Controls\icon("open_in_new") . " " . __("More themes..."), "",
								["class" => "alt-info", "onclick" => "window.open(\"https://tt-rss.org/wiki/Themes\")"]) ?>

						<?php

					} else if ($pref_name == "DEFAULT_UPDATE_INTERVAL") {

						global $update_intervals_nodefault;

						print \Controls\select_hash($pref_name, $value, $update_intervals_nodefault);

					} else if ($pref_name == "DEFAULT_SEARCH_LANGUAGE") {

						print \Controls\select_tag($pref_name, $value, Pref_Feeds::get_ts_languages());

					} else if ($type_hint == Config::T_BOOL) {

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

						if ($pref_name == Prefs::DIGEST_ENABLE) {
							print \Controls\button_tag(\Controls\icon("info") . " " . __('Preview'), '',
								['onclick' => 'Helpers.Digest.preview()', 'style' => 'margin-left : 10px']);
						}

					} else if (in_array($pref_name, ['FRESH_ARTICLE_MAX_AGE',
							'PURGE_OLD_DAYS', 'LONG_DATE_FORMAT', 'SHORT_DATE_FORMAT'])) {

						if ($pref_name == "PURGE_OLD_DAYS" && Config::get(Config::FORCE_ARTICLE_PURGE) != 0) {
							$attributes = ["disabled" => true, "required" => true];
							$value = Config::get(Config::FORCE_ARTICLE_PURGE);
						} else {
							$attributes = ["required" => true];
						}

						if ($type_hint == Config::T_INT)
							print \Controls\number_spinner_tag($pref_name, $value, $attributes);
						else
							print \Controls\input_tag($pref_name, $value, "text", $attributes);

					} else if ($pref_name == "SSL_CERT_SERIAL") {

						print \Controls\input_tag($pref_name, $value, "text", ["readonly" => true], "SSL_CERT_SERIAL");

						$cert_serial = htmlspecialchars(self::_get_ssl_certificate_id());
						$has_serial = ($cert_serial) ? true : false;

						print \Controls\button_tag(\Controls\icon("security") . " " . __('Register'), "", [
							"disabled" => !$has_serial,
							"onclick" => "dijit.byId('SSL_CERT_SERIAL').attr('value', '$cert_serial')"]);

						print \Controls\button_tag(\Controls\icon("clear") . " " . __('Clear'), "", [
							"class" => "alt-danger",
							"onclick" => "dijit.byId('SSL_CERT_SERIAL').attr('value', '')"]);

						print \Controls\button_tag(\Controls\icon("help") . " " . __("More info..."), "", [
							"class" => "alt-info",
							"onclick" => "window.open('https://tt-rss.org/wiki/SSL%20Certificate%20Authentication')"]);

					} else if ($pref_name == Prefs::DIGEST_PREFERRED_TIME) {
						print "<input dojoType=\"dijit.form.ValidationTextBox\"
							id=\"$pref_name\" regexp=\"[012]?\d:\d\d\" placeHolder=\"12:00\"
							name=\"$pref_name\" value=\"$value\">";
						$item['help_text'] .= ". " . T_sprintf("Current server time: %s", date("H:i"));
					} else {
						$regexp = ($type_hint == Config::T_INT) ? 'regexp="^\d*$"' : '';

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
						<span>	<?= __('Save configuration') ?></span>
						<div dojoType="dijit.DropDownMenu">
							<div dojoType="dijit.MenuItem" onclick="dijit.byId('changeSettingsForm').onSubmit(null, true)">
								<?= __("Save and exit") ?>
							</div>
						</div>
					</div>

					<button dojoType="dijit.form.Button" onclick="return Helpers.Profiles.edit()">
						<?= \Controls\icon("settings") ?>
						<?= __('Manage profiles') ?>
					</button>

					<button dojoType="dijit.form.Button" class="alt-danger" onclick="return Helpers.Prefs.confirmReset()">
						<?= \Controls\icon("clear") ?>
						<?= __('Reset to defaults') ?>
					</button>

					<?php PluginHost::getInstance()->run_hooks(PluginHost::HOOK_PREFS_TAB_SECTION, "prefPrefsPrefsOutside") ?>
				</div>
			</div>
		</form>
		<?php
	}

	function getPluginsList() {
		$system_enabled = array_map("trim", explode(",", (string)Config::get(Config::PLUGINS)));
		$user_enabled = array_map("trim", explode(",", get_pref(Prefs::_ENABLED_PLUGINS)));

		$tmppluginhost = new PluginHost();
		$tmppluginhost->load_all($tmppluginhost::KIND_ALL, $_SESSION["uid"], true);

		$rv = [];

		foreach ($tmppluginhost->get_plugins() as $name => $plugin) {
			$about = $plugin->about();
			$is_local = $tmppluginhost->is_local($plugin);
			$version = htmlspecialchars($this->_get_plugin_version($plugin));

			array_push($rv, [
				"name" => $name,
				"is_local" => $is_local,
				"system_enabled" => in_array($name, $system_enabled),
				"user_enabled" => in_array($name, $user_enabled),
				"has_data" => count($tmppluginhost->get_all($plugin)) > 0,
				"is_system" => (bool)($about[3] ?? false),
				"version" => $version,
				"author" => $about[2] ?? "",
				"description" => $about[1] ?? "",
				"more_info" => $about[4] ?? "",
			]);
		}

		usort($rv, function($a, $b) { return strcmp($a["name"], $b["name"]); });

		print json_encode(['plugins' => $rv, 'is_admin' => $_SESSION['access_level'] >= 10]);
	}

	function index_plugins() {
		?>
		<form dojoType="dijit.form.Form" id="changePluginsForm">

			<?= \Controls\hidden_tag("op", "pref-prefs") ?>
			<?= \Controls\hidden_tag("method", "setplugins") ?>

			<div dojoType="dijit.layout.BorderContainer" gutters="false">
				<div region="top" dojoType='fox.Toolbar'>
					<div class='pull-right'>
						<input name="search" type="search" onkeyup='Helpers.Plugins.search()' dojoType="dijit.form.TextBox">
						<button dojoType='dijit.form.Button' onclick='Helpers.Plugins.search()'>
							<?= __('Search') ?>
						</button>
					</div>

					<div dojoType='fox.form.DropDownButton'>
						<span><?= __('Select') ?></span>
						<div dojoType='dijit.Menu' style='display: none'>
							<div onclick="Lists.select('prefs-plugin-list', true)"
								dojoType='dijit.MenuItem'><?= __('All') ?></div>
							<div onclick="Lists.select('prefs-plugin-list', false)"
								dojoType='dijit.MenuItem'><?= __('None') ?></div>
						</div>
					</div>
				</div>

				<div dojoType="dijit.layout.ContentPane" region="center" style="overflow-y : auto">

					<script type="dojo/method" event="onShow">
						Helpers.Plugins.reload();
					</script>

					<!-- <?php
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
					?> -->

					<ul id="prefs-plugin-list" class="prefs-plugin-list list-unstyled">
						<li class='text-center'><?= __("Loading, please wait...") ?></li>
					</ul>

				</div>
				<div dojoType="dijit.layout.ContentPane" region="bottom">

					<button dojoType='dijit.form.Button' class="alt-info pull-right" onclick='window.open("https://tt-rss.org/wiki/Plugins")'>
						<i class='material-icons'>help</i>
						<?= __("More info") ?>
					</button>

					<?= \Controls\button_tag(\Controls\icon("check") . " " .__("Enable selected"), "", ["class" => "alt-primary",
						"onclick" => "Helpers.Plugins.enableSelected()"]) ?>

					<?= \Controls\button_tag(\Controls\icon("refresh"), "", ["title" => __("Reload"), "onclick" => "Helpers.Plugins.reload()"]) ?>

					<?php if ($_SESSION["access_level"] >= 10) { ?>
						<?php if (Config::get(Config::CHECK_FOR_UPDATES) && Config::get(Config::CHECK_FOR_PLUGIN_UPDATES)) { ?>

							<button class='alt-warning' dojoType='dijit.form.Button' onclick="Helpers.Plugins.update()">
								<?= \Controls\icon("update") ?>
								<?= __("Check for updates") ?>
							</button>
						<?php } ?>

						<?php if (Config::get(Config::ENABLE_PLUGIN_INSTALLER)) { ?>
							<button dojoType='dijit.form.Button' onclick="Helpers.Plugins.install()">
								<?= \Controls\icon("add") ?>
								<?= __("Install plugin") ?>
							</button>
						<?php } ?>
					<?php } ?>
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
				<div dojoType='dijit.layout.AccordionPane' style='padding : 0' title="<i class='material-icons'>extension</i> <?= __('Plugins') ?>">
				<?php $this->index_plugins() ?>
				</div>
				<?php PluginHost::getInstance()->run_hooks(PluginHost::HOOK_PREFS_TAB, "prefPrefs") ?>
			</div>
		<?php
	}

	function _get_otp_qrcode_img() {
		$secret = UserHelper::get_otp_secret($_SESSION["uid"]);
		$login = UserHelper::get_login_by_id($_SESSION["uid"]);

		if ($secret && $login) {
			$qrcode = new \chillerlan\QRCode\QRCode();

			$otpurl = "otpauth://totp/".urlencode($login)."?secret=$secret&issuer=".urlencode("Tiny Tiny RSS");

			return $qrcode->render($otpurl);
		}

		return false;
	}

	function otpenable() {
		$password = clean($_REQUEST["password"]);
		$otp_check = clean($_REQUEST["otp"]);

		$authenticator = PluginHost::getInstance()->get_plugin($_SESSION["auth_module"]);

		if ($authenticator->check_password($_SESSION["uid"], $password)) {
			if (UserHelper::enable_otp($_SESSION["uid"], $otp_check)) {
				print "OK";
			} else {
				print "ERROR:".__("Incorrect one time password");
			}
		} else {
			print "ERROR:".__("Incorrect password");
		}
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

			UserHelper::disable_otp($_SESSION["uid"]);

			print "OK";
		} else {
			print "ERROR: ".__("Incorrect password");
		}

	}

	function setplugins() {
		$plugins = array_filter($_REQUEST["plugins"], 'clean') ?? [];

		set_pref(Prefs::_ENABLED_PLUGINS, implode(",", $plugins));
	}

	function _get_plugin_version(Plugin $plugin) {
		$about = $plugin->about();

		if (!empty($about[0])) {
			return T_sprintf("v%.2f, by %s", $about[0], $about[2]);
		} else {
			$ref = new ReflectionClass(get_class($plugin));

			$plugin_dir = dirname($ref->getFileName());

			if (basename($plugin_dir) == "plugins") {
				return "";
			}

			if (is_dir("$plugin_dir/.git")) {
				$ver = Config::get_version_from_git($plugin_dir);

				return $ver["status"] == 0 ? T_sprintf("v%s, by %s", $ver["version"], $about[2]) : $ver["version"];
			}
		}
	}

	static function _get_updated_plugins() {
		$root_dir = dirname(dirname(__DIR__)); # we're in classes/pref/
		$plugin_dirs = array_filter(glob("$root_dir/plugins.local/*"), "is_dir");

		$rv = [];

		foreach ($plugin_dirs as $dir) {
			if (is_dir("$dir/.git")) {
				$plugin_name = basename($dir);

				array_push($rv, ["plugin" => $plugin_name, "rv" => self::_plugin_needs_update($root_dir, $plugin_name)]);
			}
		}

		$rv = array_values(array_filter($rv, function ($item) {
			return $item["rv"]["need_update"];
		}));

		return $rv;
	}

	private static function _plugin_needs_update($root_dir, $plugin_name) {
		$plugin_dir = "$root_dir/plugins.local/" . basename($plugin_name);
		$rv = null;

		if (is_dir($plugin_dir) && is_dir("$plugin_dir/.git")) {
			$pipes = [];

			$descriptorspec = [
				//0 => ["pipe", "r"], // STDIN
				1 => ["pipe", "w"], // STDOUT
				2 => ["pipe", "w"], // STDERR
			];

			$proc = proc_open("git fetch -q origin -a && git log HEAD..origin/master --oneline", $descriptorspec, $pipes, $plugin_dir);

			if (is_resource($proc)) {
				$rv = [
					"stdout" => stream_get_contents($pipes[1]),
					"stderr" => stream_get_contents($pipes[2]),
					"git_status" => proc_close($proc),
				];
				$rv["need_update"] = !empty($rv["stdout"]);
			}
		}

		return $rv;
	}


	private function _update_plugin($root_dir, $plugin_name) {
		$plugin_dir = "$root_dir/plugins.local/" . basename($plugin_name);
		$rv = [];

		if (is_dir($plugin_dir) && is_dir("$plugin_dir/.git")) {
			$pipes = [];

			$descriptorspec = [
				//0 => ["pipe", "r"], // STDIN
				1 => ["pipe", "w"], // STDOUT
				2 => ["pipe", "w"], // STDERR
			];

			$proc = proc_open("git fetch origin -a && git log HEAD..origin/master --oneline && git pull --ff-only origin master", $descriptorspec, $pipes, $plugin_dir);

			if (is_resource($proc)) {
				$rv["stdout"] = stream_get_contents($pipes[1]);
				$rv["stderr"] = stream_get_contents($pipes[2]);
				$rv["git_status"] = proc_close($proc);
			}
		}

		return $rv;
	}

	// https://gist.github.com/mindplay-dk/a4aad91f5a4f1283a5e2#gistcomment-2036828
	private function _recursive_rmdir(string $dir, bool $keep_root = false) {
		// Handle bad arguments.
		if (empty($dir) || !file_exists($dir)) {
			 return true; // No such file/dir$dir exists.
		} elseif (is_file($dir) || is_link($dir)) {
			 return unlink($dir); // Delete file/link.
		}

		// Delete all children.
		$files = new \RecursiveIteratorIterator(
			 new \RecursiveDirectoryIterator($dir, \RecursiveDirectoryIterator::SKIP_DOTS),
			 \RecursiveIteratorIterator::CHILD_FIRST
		);

		foreach ($files as $fileinfo) {
			 $action = $fileinfo->isDir() ? 'rmdir' : 'unlink';
			 if (!$action($fileinfo->getRealPath())) {
				  return false; // Abort due to the failure.
			 }
		}

		return $keep_root ? true : rmdir($dir);
	}

	// https://stackoverflow.com/questions/7153000/get-class-name-from-file
	private function _get_class_name_from_file($file) {
		$tokens = token_get_all(file_get_contents($file));

		for ($i = 0; $i < count($tokens); $i++) {
			if (isset($tokens[$i][0]) && $tokens[$i][0] == T_CLASS) {
				for ($j = $i+1; $j < count($tokens); $j++) {
					if (isset($tokens[$j][1]) && $tokens[$j][1] != " ") {
						return $tokens[$j][1];
					}
				}
			}
		}
	}

	function uninstallPlugin() {
		if ($_SESSION["access_level"] >= 10) {
			$plugin_name = basename(clean($_REQUEST['plugin']));
			$status = 0;

			$plugin_dir = dirname(dirname(__DIR__)) . "/plugins.local/$plugin_name";

			if (is_dir($plugin_dir)) {
				$status = $this->_recursive_rmdir($plugin_dir);
			}

			print json_encode(['status' => $status]);
		}
	}

	function installPlugin() {
		if ($_SESSION["access_level"] >= 10 && Config::get(Config::ENABLE_PLUGIN_INSTALLER)) {
			$plugin_name = basename(clean($_REQUEST['plugin']));
			$all_plugins = $this->_get_available_plugins();
			$plugin_dir = dirname(dirname(__DIR__)) . "/plugins.local";

			$work_dir = "$plugin_dir/plugin-installer";

			$rv = [ ];

			if (is_dir($work_dir) || mkdir($work_dir)) {
				foreach ($all_plugins as $plugin) {
					if ($plugin['name'] == $plugin_name) {

						$tmp_dir = tempnam($work_dir, $plugin_name);

						if (file_exists($tmp_dir)) {
							unlink($tmp_dir);

							$pipes = [];

							$descriptorspec = [
								1 => ["pipe", "w"], // STDOUT
								2 => ["pipe", "w"], // STDERR
							];

							$proc = proc_open("git clone " . escapeshellarg($plugin['clone_url']) . " " . $tmp_dir,
											$descriptorspec, $pipes, sys_get_temp_dir());

							$status = 0;

							if (is_resource($proc)) {
								$rv["stdout"] = stream_get_contents($pipes[1]);
								$rv["stderr"] = stream_get_contents($pipes[2]);
								$status = proc_close($proc);
								$rv["git_status"] = $status;

								// yeah I know about mysterious RC = -1
								if (file_exists("$tmp_dir/init.php")) {
									$class_name = strtolower(basename($this->_get_class_name_from_file("$tmp_dir/init.php")));

									if ($class_name) {
										$dst_dir = "$plugin_dir/$class_name";

										if (is_dir($dst_dir)) {
											$rv['result'] = self::PI_RES_ALREADY_INSTALLED;
										} else {
											if (rename($tmp_dir, "$plugin_dir/$class_name")) {
												$rv['result'] = self::PI_RES_SUCCESS;
											}
										}
									} else {
										$rv['result'] = self::PI_ERR_NO_CLASS;
									}
								} else {
									$rv['result'] = self::PI_ERR_NO_INIT_PHP;
								}

							} else {
								$rv['result'] = self::PI_ERR_EXEC_FAILED;
							}
						} else {
							$rv['result'] = self::PI_ERR_NO_TEMPDIR;
						}

						// cleanup after failure
						if ($tmp_dir && is_dir($tmp_dir)) {
							$this->_recursive_rmdir($tmp_dir);
						}

						break;
					}
				}

				if (empty($rv['result']))
					$rv['result'] = self::PI_ERR_PLUGIN_NOT_FOUND;

			} else {
				$rv["result"] = self::PI_ERR_NO_WORKDIR;
			}

			print json_encode($rv);
		}
	}

	private function _get_available_plugins() {
		if ($_SESSION["access_level"] >= 10 && Config::get(Config::ENABLE_PLUGIN_INSTALLER)) {
			return json_decode(UrlHelper::fetch(['url' => 'https://tt-rss.org/plugins.json']), true);
		}
	}
	function getAvailablePlugins() {
		if ($_SESSION["access_level"] >= 10) {
			print json_encode($this->_get_available_plugins());
		}
	}

	function checkForPluginUpdates() {
		if ($_SESSION["access_level"] >= 10 && Config::get(Config::CHECK_FOR_UPDATES) && Config::get(Config::CHECK_FOR_PLUGIN_UPDATES)) {
			$plugin_name = $_REQUEST["name"] ?? "";

			$root_dir = dirname(dirname(__DIR__)); # we're in classes/pref/

			if (!empty($plugin_name)) {
				$rv = [["plugin" => $plugin_name, "rv" => self::_plugin_needs_update($root_dir, $plugin_name)]];
			} else {
				$rv = self::_get_updated_plugins();
			}

			print json_encode($rv);
		}
	}

	function updateLocalPlugins() {
		if ($_SESSION["access_level"] >= 10) {
			$plugins = explode(",", $_REQUEST["plugins"] ?? "");

			# we're in classes/pref/
			$root_dir = dirname(dirname(__DIR__));

			$rv = [];

			if (count($plugins) > 0) {
				foreach ($plugins as $plugin_name) {
					array_push($rv, ["plugin" => $plugin_name, "rv" => $this->_update_plugin($root_dir, $plugin_name)]);
				}
			// @phpstan-ignore-next-line
			} else {
				$plugin_dirs = array_filter(glob("$root_dir/plugins.local/*"), "is_dir");

				foreach ($plugin_dirs as $dir) {
					if (is_dir("$dir/.git")) {
						$plugin_name = basename($dir);

						$test = self::_plugin_needs_update($root_dir, $plugin_name);

						if (!empty($test["o"]))
							array_push($rv, ["plugin" => $plugin_name, "rv" => $this->_update_plugin($root_dir, $plugin_name)]);
					}
				}
			}

			print json_encode($rv);
		}
	}

	function clearplugindata() {
		$name = clean($_REQUEST["name"]);

		PluginHost::getInstance()->clear_data(PluginHost::getInstance()->get_plugin($name));
	}

	function customizeCSS() {
		$value = get_pref(Prefs::USER_STYLESHEET);
		$value = str_replace("<br/>", "\n", $value);

		print json_encode(["value" => $value]);
	}

	function activateprofile() {
		$id = (int) $_REQUEST['id'] ?? 0;

		$profile = ORM::for_table('ttrss_settings_profiles')
			->where('owner_uid', $_SESSION['uid'])
			->find_one($id);

		if ($profile) {
			$_SESSION["profile"] = $id;
		} else {
			$_SESSION["profile"] = null;
		}
	}

	function remprofiles() {
		$ids = $_REQUEST["ids"] ?? [];

		ORM::for_table('ttrss_settings_profiles')
			->where('owner_uid', $_SESSION['uid'])
			->where_in('id', $ids)
			->where_not_equal('id', $_SESSION['profile'] ?? 0)
			->delete_many();
	}

	function addprofile() {
		$title = clean($_REQUEST["title"]);

		if ($title) {
			$profile = ORM::for_table('ttrss_settings_profiles')
				->where('owner_uid', $_SESSION['uid'])
				->where('title', $title)
				->find_one();

			if (!$profile) {
				$profile = ORM::for_table('ttrss_settings_profiles')->create();

				$profile->title = $title;
				$profile->owner_uid = $_SESSION['uid'];
				$profile->save();
			}
		}
	}

	function saveprofile() {
		$id = (int)$_REQUEST["id"];
		$title = clean($_REQUEST["value"]);

		if ($title && $id) {
			$profile = ORM::for_table('ttrss_settings_profiles')
								->where('owner_uid', $_SESSION['uid'])
								->find_one($id);

			if ($profile) {
				$profile->title = $title;
				$profile->save();
			}
		}
	}

	// TODO: this maybe needs to be unified with Public::getProfiles()
	function getProfiles() {
		$rv = [];

		$profiles = ORM::for_table('ttrss_settings_profiles')
							->where('owner_uid', $_SESSION['uid'])
							->order_by_expr('title')
							->find_many();

		array_push($rv, ["title" => __("Default profile"),
				"id" => 0,
				"active" => empty($_SESSION["profile"])
			]);

		foreach ($profiles as $profile) {
			$profile['active'] = ($_SESSION["profile"] ?? 0) == $profile->id;
			array_push($rv, $profile->as_array());
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
					<th class="checkbox"> </th>
					<th width='50%'><?= __("Description") ?></th>
					<th><?= __("Created") ?></th>
					<th><?= __("Last used") ?></th>
				</tr>
				<?php

				$passwords = ORM::for_table('ttrss_app_passwords')
					->where('owner_uid', $_SESSION['uid'])
					->order_by_asc('title')
					->find_many();

				foreach ($passwords as $pass) { ?>
					<tr data-row-id='<?= $pass['id'] ?>'>
						<td class="checkbox">
							<input onclick='Tables.onRowChecked(this)' dojoType='dijit.form.CheckBox' type='checkbox'>
						</td>
						<td>
							<?= htmlspecialchars($pass["title"]) ?>
						</td>
						<td class='text-muted'>
							<?= TimeHelper::make_local_datetime($pass['created'], false) ?>
						</td>
						<td class='text-muted'>
							<?= TimeHelper::make_local_datetime($pass['last_used'], false) ?>
						</td>
					</tr>
				<?php } ?>
			</table>
		</div>
		<?php
	}

	function deleteAppPasswords() {
		$passwords = ORM::for_table('ttrss_app_passwords')
			->where('owner_uid', $_SESSION['uid'])
			->where_in('id', $_REQUEST['ids'] ?? [])
			->delete_many();

		$this->appPasswordList();
	}

	function generateAppPassword() {
		$title = clean($_REQUEST['title']);
		$new_password = make_password(16);
		$new_salt = UserHelper::get_salt();
		$new_password_hash = UserHelper::hash_password($new_password, $new_salt, UserHelper::HASH_ALGOS[0]);

		print_warning(T_sprintf("Generated password <strong>%s</strong> for %s. Please remember it for future reference.", $new_password, $title));

		$password = ORM::for_table('ttrss_app_passwords')->create();

		$password->title = $title;
		$password->owner_uid = $_SESSION['uid'];
		$password->pwd_hash = "$new_password_hash:$new_salt";
		$password->service = Auth_Base::AUTH_SERVICE_API;
		$password->created = Db::NOW();

		$password->save();

		$this->appPasswordList();
	}

	function previewDigest() {
		print json_encode(Digest::prepare_headlines_digest($_SESSION["uid"], 1, 16));
	}

	static function _get_ssl_certificate_id() {
		if ($_SERVER["REDIRECT_SSL_CLIENT_M_SERIAL"] ?? false) {
			return sha1($_SERVER["REDIRECT_SSL_CLIENT_M_SERIAL"] .
				$_SERVER["REDIRECT_SSL_CLIENT_V_START"] .
				$_SERVER["REDIRECT_SSL_CLIENT_V_END"] .
				$_SERVER["REDIRECT_SSL_CLIENT_S_DN"]);
		}
		if ($_SERVER["SSL_CLIENT_M_SERIAL"] ?? false) {
			return sha1($_SERVER["SSL_CLIENT_M_SERIAL"] .
				$_SERVER["SSL_CLIENT_V_START"] .
				$_SERVER["SSL_CLIENT_V_END"] .
				$_SERVER["SSL_CLIENT_S_DN"]);
		}
		return "";
	}
}

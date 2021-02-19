<?php
class Mail extends Plugin {

	/* @var PluginHost $host */
	private $host;

	function about() {
		return array(1.0,
			"Share article via email",
			"fox");
	}

	function init($host) {
		$this->host = $host;

		$host->add_hook($host::HOOK_ARTICLE_BUTTON, $this);
		$host->add_hook($host::HOOK_PREFS_TAB, $this);
		$host->add_hook($host::HOOK_HEADLINE_TOOLBAR_SELECT_MENU_ITEM, $this);
	}

	function get_js() {
		return file_get_contents(__DIR__ . "/mail.js");
	}

	function hook_headline_toolbar_select_menu_item($feed_id, $is_cat) {
		return "<div dojoType='dijit.MenuItem' onclick='Plugins.Mail.send()'>".__('Forward by email')."</div>";
	}

	function save() {
		$addresslist = $_POST["addresslist"];

		$this->host->set($this, "addresslist", $addresslist);

		echo __("Mail addresses saved.");
	}

	function hook_prefs_tab($args) {
		if ($args != "prefPrefs") return;

		$addresslist = $this->host->get($this, "addresslist");

		?>

		<div dojoType="dijit.layout.AccordionPane"
			title="<i class='material-icons'>mail</i> <?= __('Mail plugin') ?>">

			<form dojoType="dijit.form.Form">
				<?= \Controls\pluginhandler_tags($this, "save") ?>

				<script type="dojo/method" event="onSubmit" args="evt">
					evt.preventDefault();
					if (this.validate()) {
						Notify.progress('Saving data...', true);
						xhr.post("backend.php", this.getValues(), (reply) => {
							Notify.info(reply);
						})
					}
				</script>

				<header><?= __("You can set predefined email addressed here (comma-separated list):") ?></header>

				<textarea dojoType="dijit.form.SimpleTextarea" style='font-size : 12px; width : 50%' rows="3"
					name='addresslist'><?= $addresslist ?></textarea>

				<hr/>

				<?= \Controls\submit_tag(__("Save")) ?>

			</form>
		</div>
		<?php
	}

	function hook_article_button($line) {
		return "<i class='material-icons' style=\"cursor : pointer\"
					onclick=\"Plugins.Mail.send(".$line["id"].")\"
					title='".__('Forward by email')."'>mail</i>";
	}

	function emailArticle() {

		$ids = explode(",", clean($_REQUEST['ids']));
		$ids_qmarks = arr_qmarks($ids);


		$sth = $this->pdo->prepare("SELECT email, full_name FROM ttrss_users WHERE
			id = ?");
		$sth->execute([$_SESSION['uid']]);

		if ($row = $sth->fetch()) {
			$user_email = htmlspecialchars($row['email']);
			$user_name = htmlspecialchars($row['full_name']);
		} else {
			$user_name = "";
			$user_email = "";
		}

		if (!$user_name)
			$user_name = $_SESSION['name'];

		$tpl = new Templator();

		$tpl->readTemplateFromFile("email_article_template.txt");

		$tpl->setVariable('USER_NAME', $_SESSION["name"], true);
		$tpl->setVariable('USER_EMAIL', $user_email, true);
		$tpl->setVariable('TTRSS_HOST', $_SERVER["HTTP_HOST"], true);

		$sth = $this->pdo->prepare("SELECT DISTINCT link, content, title, note
			FROM ttrss_user_entries, ttrss_entries WHERE id = ref_id AND
			id IN ($ids_qmarks) AND owner_uid = ?");
		$sth->execute(array_merge($ids, [$_SESSION['uid']]));

		if (count($ids) > 1) {
			$subject = __("[Forwarded]") . " " . __("Multiple articles");
		} else {
			$subject = "";
		}

		while ($line = $sth->fetch()) {

			if (!$subject)
				$subject = __("[Forwarded]") . " " . htmlspecialchars($line["title"]);

			$tpl->setVariable('ARTICLE_TITLE', strip_tags($line["title"]));
			$tnote = strip_tags($line["note"]);
			if( $tnote != ''){
				$tpl->setVariable('ARTICLE_NOTE', $tnote, true);
				$tpl->addBlock('note');
			}
			$tpl->setVariable('ARTICLE_URL', strip_tags($line["link"]));

			$tpl->addBlock('article');
		}

		$tpl->addBlock('email');

		$content = "";
		$tpl->generateOutputToString($content);

		$addresslist = explode(",", $this->host->get($this, "addresslist"));

		?>

		<form dojoType='dijit.form.Form'>

			<?= \Controls\pluginhandler_tags($this, "sendemail") ?>

			<?= \Controls\hidden_tag("from_email", $user_email) ?>
			<?= \Controls\hidden_tag("from_name", $user_name) ?>

			<script type='dojo/method' event='onSubmit' args='evt'>
				evt.preventDefault();
				if (this.validate()) {
					xhr.json("backend.php", this.getValues(), (reply) => {
						if (reply && reply.error)
							Notify.error(reply.error);
						else
							this.hide();
					});
				}
			</script>

			<section>
				<fieldset class='narrow'>
					<label><?= __('To:') ?></label>
					<?= \Controls\select_tag("destination", "", $addresslist,
											["style" => "width: 380px", "required" => 1, "dojoType" => "dijit.form.ComboBox"]) ?>
				</fieldset>
			</section>

			<section>
				<fieldset class='narrow'>
					<label><?= __('Subject:') ?></label>
					<input dojoType='dijit.form.ValidationTextBox' required='true'
						style='width : 380px' name='subject' value="<?= htmlspecialchars($subject) ?>" id='subject'>
				</fieldset>
			</section>

			<textarea dojoType='dijit.form.SimpleTextarea'
				style='height : 200px; font-size : 12px; width : 98%' rows="20"
				name='content'><?= $content ?></textarea>

			<footer>
				<?= \Controls\submit_tag(__('Send email')) ?>
				<?= \Controls\cancel_dialog_tag(__('Cancel')) ?>
			</footer>

		</form>
		<?php
	}

	function sendEmail() {
		$reply = array();

		/*$mail->AddReplyTo(strip_tags($_REQUEST['from_email']),
			strip_tags($_REQUEST['from_name']));
		//$mail->AddAddress($_REQUEST['destination']);
		$addresses = explode(';', $_REQUEST['destination']);
		foreach($addresses as $nextaddr)
			$mail->AddAddress($nextaddr);

		$mail->IsHTML(false);
		$mail->Subject = $_REQUEST['subject'];
		$mail->Body = $_REQUEST['content'];

		$rc = $mail->Send(); */

		$to = $_REQUEST["destination"];
		$subject = strip_tags($_REQUEST["subject"]);
		$message = strip_tags($_REQUEST["content"]);
		$from = strip_tags($_REQUEST["from_email"]);

		$mailer = new Mailer();

		$rc = $mailer->mail(["to_address" => $to,
			"headers" => ["Reply-To: $from"],
			"subject" => $subject,
			"message" => $message]);

		if (!$rc) {
			$reply['error'] =  $mailer->error();
		} else {
			//save_email_address($destination);
			$reply['message'] = "UPDATE_COUNTERS";
		}

		print json_encode($reply);
	}

	function api_version() {
		return 2;
	}

}

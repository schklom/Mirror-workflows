<?php
class MailTo extends Plugin {
	private $host;

	function about() {
		return array(null,
			"Share article via email (using mailto: links, invoking your mail client)",
			"fox");
	}

	function init($host) {
		$this->host = $host;

		$host->add_hook($host::HOOK_ARTICLE_BUTTON, $this);
		$host->add_hook($host::HOOK_HEADLINE_TOOLBAR_SELECT_MENU_ITEM, $this);
	}

	function hook_headline_toolbar_select_menu_item($feed_id, $is_cat) {
		return "<div dojoType='dijit.MenuItem' onclick='Plugins.Mailto.send()'>".__('Forward by email (mailto:)')."</div>";
	}

	function get_js() {
		return file_get_contents(__DIR__ . "/init.js");
	}

	function hook_article_button($line) {
		return "<i class='material-icons' style=\"cursor : pointer\"
					onclick=\"Plugins.Mailto.send(".$line["id"].")\"
					title='".__('Forward by email (mailto:)')."'>mail_outline</i>";
	}

	function emailArticle() {

		$ids = explode(",", clean($_REQUEST['ids']));
		$ids_qmarks = arr_qmarks($ids);

		$tpl = new Templator();

		$tpl->readTemplateFromFile("email_article_template.txt");

		$tpl->setVariable('USER_NAME', $_SESSION["name"], true);
		//$tpl->setVariable('USER_EMAIL', $user_email, true);
		$tpl->setVariable('TTRSS_HOST', $_SERVER["HTTP_HOST"], true);

		$sth = $this->pdo->prepare("SELECT DISTINCT link, content, title
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
			$tpl->setVariable('ARTICLE_URL', strip_tags($line["link"]));

			$tpl->addBlock('article');
		}

		$tpl->addBlock('email');

		$content = "";
		$tpl->generateOutputToString($content);

		$mailto_link = "mailto:?subject=".rawurlencode($subject)."&body=".rawurlencode($content);

		?>

		<section>
			<div class='panel text-center'>
				<a target="_blank" href="<?= htmlspecialchars($mailto_link) ?>">
					<?= __("Click to open your mail client") ?>
				</a>
			</div>
		</section>

		<footer class='text-center'>
			<?= \Controls\submit_tag(__('Close this dialog')) ?>
		</footer>

		<?php
	}

	function api_version() {
		return 2;
	}

}

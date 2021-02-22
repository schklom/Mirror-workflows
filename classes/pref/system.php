<?php

class Pref_System extends Handler_Administrative {

	private $log_page_limit = 15;

	function csrf_ignore($method) {
		$csrf_ignored = array("index");

		return array_search($method, $csrf_ignored) !== false;
	}

	function clearLog() {
		$this->pdo->query("DELETE FROM ttrss_error_log");
	}

	function getphpinfo() {
		ob_start();
		phpinfo();
		$info = ob_get_contents();
		ob_end_clean();

		print preg_replace( '%^.*<body>(.*)</body>.*$%ms','$1', (string)$info);
	}

	private function _log_viewer(int $page, int $severity) {
		$errno_values = [];

		switch ($severity) {
			case E_USER_ERROR:
				$errno_values = [ E_ERROR, E_USER_ERROR, E_PARSE ];
				break;
			case E_USER_WARNING:
				$errno_values = [ E_ERROR, E_USER_ERROR, E_PARSE, E_WARNING, E_USER_WARNING, E_DEPRECATED, E_USER_DEPRECATED ];
				break;
		}

		if (count($errno_values) > 0) {
			$errno_qmarks = arr_qmarks($errno_values);
			$errno_filter_qpart = "errno IN ($errno_qmarks)";
		} else {
			$errno_filter_qpart = "true";
		}

		$limit = $this->log_page_limit;
		$offset = $limit * $page;

		$sth = $this->pdo->prepare("SELECT
				COUNT(id) AS total_pages
			FROM
				ttrss_error_log
			WHERE
				$errno_filter_qpart");

		$sth->execute($errno_values);

		if ($res = $sth->fetch()) {
			$total_pages = (int)($res["total_pages"] / $limit);
		} else {
			$total_pages = 0;
		}

		?>
		<div dojoType='dijit.layout.BorderContainer' gutters='false'>
			<div region='top' dojoType='fox.Toolbar'>

				<button dojoType='dijit.form.Button' onclick='Helpers.EventLog.refresh()'>
					<?= __('Refresh') ?>
				</button>

				<button dojoType='dijit.form.Button' <?= ($page <= 0 ? "disabled" : "") ?>
					onclick='Helpers.EventLog.prevPage()'>
					<?= __('&lt;&lt;') ?>
				</button>

				<button dojoType='dijit.form.Button' disabled>
					<?= T_sprintf('Page %d of %d', $page+1, $total_pages+1) ?>
				</button>

				<button dojoType='dijit.form.Button' <?= ($page >= $total_pages ? "disabled" : "") ?>
					onclick='Helpers.EventLog.nextPage()'>
					<?= __('&gt;&gt;') ?>
				</button>

				<button dojoType='dijit.form.Button'
					onclick='Helpers.EventLog.clear()'>
					<?= __('Clear') ?>
				</button>

				<div class='pull-right'>
					<?= __("Severity:") ?>

					<?= \Controls\select_hash("severity", $severity,
						[
							E_USER_ERROR => __("Errors"),
							E_USER_WARNING => __("Warnings"),
							E_USER_NOTICE => __("Everything")
						], ["onchange"=> "Helpers.EventLog.refresh()"], "severity") ?>
				</div>
			</div>

			<div style="padding : 0px" dojoType="dijit.layout.ContentPane" region="center">

				<table width='100%' class='event-log'>

					<tr class='title'>
						<td width='5%'><?= __("Error") ?></td>
						<td><?= __("Filename") ?></td>
						<td><?= __("Message") ?></td>
						<td width='5%'><?= __("User") ?></td>
						<td width='5%'><?= __("Date") ?></td>
					</tr>

					<?php
					$sth = $this->pdo->prepare("SELECT
							errno, errstr, filename, lineno, created_at, login, context
						FROM
							ttrss_error_log LEFT JOIN ttrss_users ON (owner_uid = ttrss_users.id)
						WHERE
							$errno_filter_qpart
						ORDER BY
							ttrss_error_log.id DESC
						LIMIT $limit OFFSET $offset");

					$sth->execute($errno_values);

					while ($line = $sth->fetch()) {
						foreach ($line as $k => $v) { $line[$k] = htmlspecialchars($v); }
						?>
						<tr>
							<td class='errno'>
								<?= Logger::$errornames[$line["errno"]] . " (" . $line["errno"] . ")" ?>
							</td>
							<td class='filename'><?= $line["filename"] . ":" . $line["lineno"] ?></td>
							<td class='errstr'><?= $line["errstr"] . "\n" .  $line["context"] ?></td>
							<td class='login'><?= $line["login"] ?></td>
							<td class='timestamp'>
								<?= TimeHelper::make_local_datetime($line["created_at"], false) ?>
							</td>
						</tr>
					<?php } ?>
				</table>
			</div>
		</div>
		<?php
	}

	function index() {

		$severity = (int) ($_REQUEST["severity"] ?? E_USER_WARNING);
		$page = (int) ($_REQUEST["page"] ?? 0);
		?>
		<div dojoType='dijit.layout.AccordionContainer' region='center'>
			<div dojoType='dijit.layout.AccordionPane' style='padding : 0' title='<i class="material-icons">report</i> <?= __('Event Log') ?>'>
				<?php
					if (Config::get(Config::LOG_DESTINATION) == "sql") {
						$this->_log_viewer($page, $severity);
					} else {
						print_notice("Please set Config::get(Config::LOG_DESTINATION) to 'sql' in config.php to enable database logging.");
					}
				?>
			</div>

			<div dojoType='dijit.layout.AccordionPane' title='<i class="material-icons">info</i> <?= __('PHP Information') ?>'>
					<script type='dojo/method' event='onSelected' args='evt'>
						if (this.domNode.querySelector('.loading'))
							window.setTimeout(() => {
								xhr.post("backend.php", {op: 'pref-system', method: 'getphpinfo'}, (reply) => {
									this.attr('content', `<div class='phpinfo'>${reply}</div>`);
								});
							}, 200);
					</script>
					<span class='loading'><?= __("Loading, please wait...") ?></span>
			</div>

			<?php PluginHost::getInstance()->run_hooks(PluginHost::HOOK_PREFS_TAB, "prefSystem") ?>
		</div>
		<?php
	}
}

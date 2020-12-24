<?php

class Pref_System extends Handler_Protected {

	function before($method) {
		if (parent::before($method)) {
			if ($_SESSION["access_level"] < 10) {
				print __("Your access level is insufficient to open this tab.");
				return false;
			}
			return true;
		}
		return false;
	}

	function csrf_ignore($method) {
		$csrf_ignored = array("index");

		return array_search($method, $csrf_ignored) !== false;
	}

	function clearLog() {
		$this->pdo->query("DELETE FROM ttrss_error_log");
	}

	function index() {

		$severity = isset($_REQUEST["severity"]) ? (int) clean($_REQUEST["severity"]) : E_USER_WARNING;

		print "<div dojoType='dijit.layout.AccordionContainer' region='center'>";
		print "<div dojoType='dijit.layout.AccordionPane' style='padding : 0'
			title='<i class=\"material-icons\">report</i> ".__('Event Log')."'>";

		if (LOG_DESTINATION == "sql") {

			print "<div dojoType='dijit.layout.BorderContainer' gutters='false'>";

			print "<div region='top' dojoType='fox.Toolbar'>";

			print "<button dojoType='dijit.form.Button'
				onclick='Helpers.updateEventLog()'>".__('Refresh')."</button>";

			print "<button dojoType='dijit.form.Button'
				onclick='Helpers.clearEventLog()'>".__('Clear')."</button>";

			print "<div class='pull-right'>";

			print __("Severity:") . " ";
			print_select_hash("severity", $severity,
				[
					E_USER_ERROR => __("Errors"),
					E_USER_WARNING => __("Warnings"),
					E_USER_NOTICE => __("Everything")
				], 'dojoType="fox.form.Select" onchange="Helpers.updateEventLog()"');

			print "</div>"; # pull-right

			print "</div>"; # toolbar

			print '<div style="padding : 0px" dojoType="dijit.layout.ContentPane" region="center">';

			print "<table width='100%' cellspacing='10' class='prefErrorLog'>";

			print "<tr class='title'>
				<td width='5%'>".__("Error")."</td>
				<td>".__("Filename")."</td>
				<td>".__("Message")."</td>
				<td width='5%'>".__("User")."</td>
				<td width='5%'>".__("Date")."</td>
				</tr>";

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

			$sth = $this->pdo->prepare("SELECT
					errno, errstr, filename, lineno, created_at, login, context
				FROM
					ttrss_error_log LEFT JOIN ttrss_users ON (owner_uid = ttrss_users.id)
				WHERE
					$errno_filter_qpart
				ORDER BY
					ttrss_error_log.id DESC
				LIMIT 100");

			$sth->execute($errno_values);

			while ($line = $sth->fetch()) {
				print "<tr>";

				foreach ($line as $k => $v) {
					$line[$k] = htmlspecialchars($v);
				}

				print "<td class='errno'>" . Logger::$errornames[$line["errno"]] . " (" . $line["errno"] . ")</td>";
				print "<td class='filename'>" . $line["filename"] . ":" . $line["lineno"] . "</td>";
				print "<td class='errstr'>" . $line["errstr"] . "<hr/>" . nl2br($line["context"]) . "</td>";
				print "<td class='login'>" . $line["login"] . "</td>";

				print "<td class='timestamp'>" .
					TimeHelper::make_local_datetime($line["created_at"], false) . "</td>";

				print "</tr>";
			}

			print "</table>";
		} else {
			print_notice("Please set LOG_DESTINATION to 'sql' in config.php to enable database logging.");
		}

		print "</div>"; # content pane
		print "</div>"; # container
		print "</div>"; # accordion pane

		print "<div dojoType='dijit.layout.AccordionPane'
			title='<i class=\"material-icons\">info</i> ".__('PHP Information')."'>";

		ob_start();
		phpinfo();
		$info = ob_get_contents();
		ob_end_clean();

		print "<div class='phpinfo'>";
		print preg_replace( '%^.*<body>(.*)</body>.*$%ms','$1', $info);
		print "</div>";

		print "</div>"; # accordion pane

		PluginHost::getInstance()->run_hooks(PluginHost::HOOK_PREFS_TAB,
			"hook_prefs_tab", "prefSystem");

		print "</div>"; #container
	}

}

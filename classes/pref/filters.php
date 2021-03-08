<?php
class Pref_Filters extends Handler_Protected {

	function csrf_ignore($method) {
		$csrf_ignored = array("index", "getfiltertree", "savefilterorder");

		return array_search($method, $csrf_ignored) !== false;
	}

	function filtersortreset() {
		$sth = $this->pdo->prepare("UPDATE ttrss_filters2
				SET order_id = 0 WHERE owner_uid = ?");
		$sth->execute([$_SESSION['uid']]);
		return;
	}

	function savefilterorder() {
		$data = json_decode($_POST['payload'], true);

		#file_put_contents("/tmp/saveorder.json", clean($_POST['payload']));
		#$data = json_decode(file_get_contents("/tmp/saveorder.json"), true);

		if (!is_array($data['items']))
			$data['items'] = json_decode($data['items'], true);

		$index = 0;

		if (is_array($data) && is_array($data['items'])) {

			$sth = $this->pdo->prepare("UPDATE ttrss_filters2 SET
						order_id = ? WHERE id = ? AND
						owner_uid = ?");

			foreach ($data['items'][0]['items'] as $item) {
				$filter_id = (int) str_replace("FILTER:", "", $item['_reference']);

				if ($filter_id > 0) {
					$sth->execute([$index, $filter_id, $_SESSION['uid']]);
					++$index;
				}
			}
		}

		return;
	}

	function testFilterDo() {
		$offset = (int) clean($_REQUEST["offset"]);
		$limit = (int) clean($_REQUEST["limit"]);

		$filter = array();

		$filter["enabled"] = true;
		$filter["match_any_rule"] = checkbox_to_sql_bool(clean($_REQUEST["match_any_rule"] ?? false));
		$filter["inverse"] = checkbox_to_sql_bool(clean($_REQUEST["inverse"] ?? false));

		$filter["rules"] = array();
		$filter["actions"] = array("dummy-action");

		$res = $this->pdo->query("SELECT id,name FROM ttrss_filter_types");

		$filter_types = array();
		while ($line = $res->fetch()) {
			$filter_types[$line["id"]] = $line["name"];
		}

		$scope_qparts = array();

		$rctr = 0;
		foreach (clean($_REQUEST["rule"]) AS $r) {
			$rule = json_decode($r, true);

			if ($rule && $rctr < 5) {
				$rule["type"] = $filter_types[$rule["filter_type"]];
				unset($rule["filter_type"]);

				$scope_inner_qparts = [];
				foreach ($rule["feed_id"] as $feed_id) {

                    if (strpos($feed_id, "CAT:") === 0) {
                        $cat_id = (int) substr($feed_id, 4);
                        array_push($scope_inner_qparts, "cat_id = " . $this->pdo->quote($cat_id));
                    } else if ($feed_id > 0) {
                        array_push($scope_inner_qparts, "feed_id = " . $this->pdo->quote($feed_id));
                    }
                }

                if (count($scope_inner_qparts) > 0) {
				    array_push($scope_qparts, "(" . implode(" OR ", $scope_inner_qparts) . ")");
                }

				array_push($filter["rules"], $rule);

				++$rctr;
			} else {
				break;
			}
		}

		if (count($scope_qparts) == 0) $scope_qparts = ["true"];

		$glue = $filter['match_any_rule'] ? " OR " :  " AND ";
		$scope_qpart = join($glue, $scope_qparts);

		if (!$scope_qpart) $scope_qpart = "true";

		$rv = array();

		//while ($found < $limit && $offset < $limit * 1000 && time() - $started < ini_get("max_execution_time") * 0.7) {

		$sth = $this->pdo->prepare("SELECT ttrss_entries.id,
				ttrss_entries.title,
				ttrss_feeds.id AS feed_id,
				ttrss_feeds.title AS feed_title,
				ttrss_feed_categories.id AS cat_id,
				content,
				date_entered,
				link,
				author,
				tag_cache
			FROM
				ttrss_entries, ttrss_user_entries
					LEFT JOIN ttrss_feeds ON (feed_id = ttrss_feeds.id)
					LEFT JOIN ttrss_feed_categories ON (ttrss_feeds.cat_id = ttrss_feed_categories.id)
			WHERE
				ref_id = ttrss_entries.id AND
				($scope_qpart) AND
				ttrss_user_entries.owner_uid = ?
			ORDER BY date_entered DESC LIMIT $limit OFFSET $offset");

		$sth->execute([$_SESSION['uid']]);

		while ($line = $sth->fetch()) {

			$rc = RSSUtils::get_article_filters(array($filter), $line['title'], $line['content'], $line['link'],
				$line['author'], explode(",", $line['tag_cache']));

			if (count($rc) > 0) {

				$line["content_preview"] = truncate_string(strip_tags($line["content"]), 200, '&hellip;');

				$excerpt_length = 100;

				PluginHost::getInstance()->chain_hooks_callback(PluginHost::HOOK_QUERY_HEADLINES,
					function ($result) use (&$line) {
						$line = $result;
					},
					$line, $excerpt_length);

				$content_preview = $line["content_preview"];

				$tmp = "<li><span class='title'>" . $line["title"] . "</span><br/>" .
					"<span class='feed'>" . $line['feed_title'] . "</span>, <span class='date'>" . mb_substr($line["date_entered"], 0, 16) . "</span>" .
					"<div class='preview text-muted'>" . $content_preview . "</div>" .
					"</li>";

				array_push($rv, $tmp);

			}
		}

		print json_encode($rv);
	}

	private function _get_rules_list($filter_id) {
		$sth = $this->pdo->prepare("SELECT reg_exp,
			inverse,
			match_on,
			feed_id,
			cat_id,
			cat_filter,
			ttrss_filter_types.description AS field
			FROM
				ttrss_filters2_rules, ttrss_filter_types
			WHERE
				filter_id = ? AND filter_type = ttrss_filter_types.id
			ORDER BY reg_exp");
		$sth->execute([$filter_id]);

		$rv = "";

		while ($line = $sth->fetch()) {

		    if ($line["match_on"]) {
		        $feeds = json_decode($line["match_on"], true);
		        $feeds_fmt = [];

                foreach ($feeds as $feed_id) {

                    if (strpos($feed_id, "CAT:") === 0) {
                        $feed_id = (int)substr($feed_id, 4);
                        array_push($feeds_fmt, Feeds::_get_cat_title($feed_id));
                    } else {
                        if ($feed_id)
                            array_push($feeds_fmt, Feeds::_get_title((int)$feed_id));
                        else
                            array_push($feeds_fmt, __("All feeds"));
                    }
                }

                $where = implode(", ", $feeds_fmt);

            } else {

                $where = $line["cat_filter"] ?
                    Feeds::_get_cat_title($line["cat_id"]) :
                    ($line["feed_id"] ?
                        Feeds::_get_title($line["feed_id"]) : __("All feeds"));
            }

#			$where = $line["cat_id"] . "/" . $line["feed_id"];

			$inverse = $line["inverse"] ? "inverse" : "";

			$rv .= "<li class='$inverse'>" . T_sprintf("%s on %s in %s %s",
				htmlspecialchars($line["reg_exp"]),
				$line["field"],
				$where,
				$line["inverse"] ? __("(inverse)") : "") . "</li>";
		}

		return $rv;
	}

	function getfiltertree() {
		$root = array();
		$root['id'] = 'root';
		$root['name'] = __('Filters');
		$root['enabled'] = true;
		$root['items'] = array();

		$filter_search = ($_SESSION["prefs_filter_search"] ?? "");

		$sth = $this->pdo->prepare("SELECT *,
			(SELECT action_param FROM ttrss_filters2_actions
				WHERE filter_id = ttrss_filters2.id ORDER BY id LIMIT 1) AS action_param,
			(SELECT action_id FROM ttrss_filters2_actions
				WHERE filter_id = ttrss_filters2.id ORDER BY id LIMIT 1) AS action_id,
			(SELECT description FROM ttrss_filter_actions
				WHERE id = (SELECT action_id FROM ttrss_filters2_actions
					WHERE filter_id = ttrss_filters2.id ORDER BY id LIMIT 1)) AS action_name,
			(SELECT reg_exp FROM ttrss_filters2_rules
				WHERE filter_id = ttrss_filters2.id ORDER BY id LIMIT 1) AS reg_exp
			FROM ttrss_filters2 WHERE
			owner_uid = ? ORDER BY order_id, title");
		$sth->execute([$_SESSION['uid']]);

		$folder = array();
		$folder['items'] = array();

		while ($line = $sth->fetch()) {

			$name = $this->_get_name($line["id"]);

			$match_ok = false;
			if ($filter_search) {
				if (mb_strpos($line['title'], $filter_search) !== false) {
					$match_ok = true;
				}

				$rules_sth = $this->pdo->prepare("SELECT reg_exp
					FROM ttrss_filters2_rules WHERE filter_id = ?");
				$rules_sth->execute([$line['id']]);

				while ($rule_line = $rules_sth->fetch()) {
					if (mb_strpos($rule_line['reg_exp'], $filter_search) !== false) {
						$match_ok = true;
						break;
					}
				}
			}

			if ($line['action_id'] == 7) {
				$label_sth = $this->pdo->prepare("SELECT fg_color, bg_color
					FROM ttrss_labels2 WHERE caption = ? AND
						owner_uid = ?");
				$label_sth->execute([$line['action_param'], $_SESSION['uid']]);

				if ($label_row = $label_sth->fetch()) {
					//$fg_color = $label_row["fg_color"];
					$bg_color = $label_row["bg_color"];

					$name[1] = "<i class=\"material-icons\" style='color : $bg_color; margin-right : 4px'>label</i>" . $name[1];
				}
			}

			$filter = array();
			$filter['id'] = 'FILTER:' . $line['id'];
			$filter['bare_id'] = $line['id'];
			$filter['name'] = $name[0];
			$filter['param'] = $name[1];
			$filter['checkbox'] = false;
			$filter['last_triggered'] = $line["last_triggered"] ? TimeHelper::make_local_datetime($line["last_triggered"], false) : null;
			$filter['enabled'] = sql_bool_to_bool($line["enabled"]);
			$filter['rules'] = $this->_get_rules_list($line['id']);

			if (!$filter_search || $match_ok) {
				array_push($folder['items'], $filter);
			}
		}

		$root['items'] = $folder['items'];

		$fl = array();
		$fl['identifier'] = 'id';
		$fl['label'] = 'name';
		$fl['items'] = array($root);

		print json_encode($fl);
		return;
	}

	function edit() {

		$filter_id = (int) clean($_REQUEST["id"] ?? 0);

		$sth = $this->pdo->prepare("SELECT * FROM ttrss_filters2
			WHERE id = ? AND owner_uid = ?");
		$sth->execute([$filter_id, $_SESSION['uid']]);

		if (empty($filter_id) || $row = $sth->fetch()) {
			$rv = [
				"id" => $filter_id,
				"enabled" => $row["enabled"] ?? true,
				"match_any_rule" => $row["match_any_rule"] ?? false,
				"inverse" => $row["inverse"] ?? false,
				"title" => $row["title"] ?? "",
				"rules" => [],
				"actions" => [],
				"filter_types" => [],
				"action_types" => [],
				"plugin_actions" => [],
				"labels" => Labels::get_all($_SESSION["uid"])
			];

			$res = $this->pdo->query("SELECT id,description
				FROM ttrss_filter_types WHERE id != 5 ORDER BY description");

			while ($line = $res->fetch()) {
				$rv["filter_types"][$line["id"]] = __($line["description"]);
			}

			$res = $this->pdo->query("SELECT id,description FROM ttrss_filter_actions
				ORDER BY name");

			while ($line = $res->fetch()) {
				$rv["action_types"][$line["id"]] = __($line["description"]);
			}

			$filter_actions = PluginHost::getInstance()->get_filter_actions();

			foreach ($filter_actions as $fclass => $factions) {
				foreach ($factions as $faction) {

					$rv["plugin_actions"][$fclass . ":" . $faction["action"]] =
						$fclass . ": " . $faction["description"];
				}
			}

			if ($filter_id) {
				$rules_sth = $this->pdo->prepare("SELECT * FROM ttrss_filters2_rules
					WHERE filter_id = ? ORDER BY reg_exp, id");
				$rules_sth->execute([$filter_id]);

				while ($rrow = $rules_sth->fetch(PDO::FETCH_ASSOC)) {
					if ($rrow["match_on"]) {
						$rrow["feed_id"] = json_decode($rrow["match_on"], true);
					} else {
						if ($rrow["cat_filter"]) {
							$feed_id = "CAT:" . (int)$rrow["cat_id"];
						} else {
							$feed_id = (int)$rrow["feed_id"];
						}

						$rrow["feed_id"] = ["" . $feed_id]; // set item type to string for in_array()
					}

					unset($rrow["cat_filter"]);
					unset($rrow["cat_id"]);
					unset($rrow["filter_id"]);
					unset($rrow["id"]);
					if (!$rrow["inverse"]) unset($rrow["inverse"]);
					unset($rrow["match_on"]);

					$rrow["name"] = $this->_get_rule_name($rrow);

					array_push($rv["rules"], $rrow);
				}

				$actions_sth = $this->pdo->prepare("SELECT * FROM ttrss_filters2_actions
					WHERE filter_id = ? ORDER BY id");
				$actions_sth->execute([$filter_id]);

				while ($arow = $actions_sth->fetch(PDO::FETCH_ASSOC)) {
					$arow["action_param_label"] = $arow["action_param"];

					unset($arow["filter_id"]);
					unset($arow["id"]);

					$arow["name"] = $this->_get_action_name($arow);

					array_push($rv["actions"], $arow);
				}
			}
			print json_encode($rv);
		}
	}

	private function _get_rule_name($rule) {
		if (!$rule) $rule = json_decode(clean($_REQUEST["rule"]), true);

		$feeds = $rule["feed_id"];
		$feeds_fmt = [];

		if (!is_array($feeds)) $feeds = [$feeds];

		foreach ($feeds as $feed_id) {

            if (strpos($feed_id, "CAT:") === 0) {
                $feed_id = (int)substr($feed_id, 4);
                array_push($feeds_fmt, Feeds::_get_cat_title($feed_id));
            } else {
                if ($feed_id)
                    array_push($feeds_fmt, Feeds::_get_title((int)$feed_id));
                else
                    array_push($feeds_fmt, __("All feeds"));
            }
        }

        $feed = implode(", ", $feeds_fmt);

		$sth = $this->pdo->prepare("SELECT description FROM ttrss_filter_types
			WHERE id = ?");
		$sth->execute([(int)$rule["filter_type"]]);

		if ($row = $sth->fetch()) {
			$filter_type = $row["description"];
		} else {
			$filter_type = "?UNKNOWN?";
		}

		$inverse = isset($rule["inverse"]) ? "inverse" : "";

		return "<span class='filterRule $inverse'>" .
			T_sprintf("%s on %s in %s %s", htmlspecialchars($rule["reg_exp"]),
			"<span class='field'>$filter_type</span>", "<span class='feed'>$feed</span>", isset($rule["inverse"]) ? __("(inverse)") : "") . "</span>";
	}

	function printRuleName() {
		print $this->_get_rule_name(json_decode(clean($_REQUEST["rule"]), true));
	}

	private function _get_action_name($action) {
		$sth = $this->pdo->prepare("SELECT description FROM
			ttrss_filter_actions WHERE id = ?");
		$sth->execute([(int)$action["action_id"]]);

		$title = "";

		if ($row = $sth->fetch()) {

			$title = __($row["description"]);

			if ($action["action_id"] == 4 || $action["action_id"] == 6 ||
				$action["action_id"] == 7)
				$title .= ": " . $action["action_param"];

			if ($action["action_id"] == 9) {
				list ($pfclass, $pfaction) = explode(":", $action["action_param"]);

				$filter_actions = PluginHost::getInstance()->get_filter_actions();

				foreach ($filter_actions as $fclass => $factions) {
					foreach ($factions as $faction) {
						if ($pfaction == $faction["action"] && $pfclass == $fclass) {
							$title .= ": " . $fclass . ": " . $faction["description"];
							break;
						}
					}
				}
			}
		}

		return $title;
	}

	function printActionName() {
		print $this->_get_action_name(json_decode(clean($_REQUEST["action"]), true));
	}

	function editSave() {
		$filter_id = clean($_REQUEST["id"]);
		$enabled = checkbox_to_sql_bool(clean($_REQUEST["enabled"] ?? false));
		$match_any_rule = checkbox_to_sql_bool(clean($_REQUEST["match_any_rule"] ?? false));
		$inverse = checkbox_to_sql_bool(clean($_REQUEST["inverse"] ?? false));
		$title = clean($_REQUEST["title"]);

		$this->pdo->beginTransaction();

		$sth = $this->pdo->prepare("UPDATE ttrss_filters2 SET enabled = ?,
			match_any_rule = ?,
			inverse = ?,
			title = ?
			WHERE id = ? AND owner_uid = ?");

		$sth->execute([$enabled, $match_any_rule, $inverse, $title, $filter_id, $_SESSION['uid']]);

		$this->_save_rules_and_actions($filter_id);

		$this->pdo->commit();
	}

	function remove() {

		$ids = explode(",", clean($_REQUEST["ids"]));
		$ids_qmarks = arr_qmarks($ids);

		$sth = $this->pdo->prepare("DELETE FROM ttrss_filters2 WHERE id IN ($ids_qmarks)
			AND owner_uid = ?");
		$sth->execute(array_merge($ids, [$_SESSION['uid']]));
	}

	private function _save_rules_and_actions($filter_id) {

		$sth = $this->pdo->prepare("DELETE FROM ttrss_filters2_rules WHERE filter_id = ?");
		$sth->execute([$filter_id]);

		$sth = $this->pdo->prepare("DELETE FROM ttrss_filters2_actions WHERE filter_id = ?");
		$sth->execute([$filter_id]);

		if (!is_array(clean($_REQUEST["rule"] ?? ""))) $_REQUEST["rule"] = [];
		if (!is_array(clean($_REQUEST["action"] ?? ""))) $_REQUEST["action"] = [];

		if ($filter_id) {
			/* create rules */

			$rules = array();
			$actions = array();

			foreach (clean($_REQUEST["rule"]) as $rule) {
				$rule = json_decode($rule, true);
				unset($rule["id"]);

				if (array_search($rule, $rules) === false) {
					array_push($rules, $rule);
				}
			}

			foreach (clean($_REQUEST["action"]) as $action) {
				$action = json_decode($action, true);
				unset($action["id"]);

				if (array_search($action, $actions) === false) {
					array_push($actions, $action);
				}
			}

			$rsth = $this->pdo->prepare("INSERT INTO ttrss_filters2_rules
						(filter_id, reg_exp,filter_type,feed_id,cat_id,match_on,inverse) VALUES
						(?, ?, ?, NULL, NULL, ?, ?)");

			foreach ($rules as $rule) {
				if ($rule) {

					$reg_exp = trim($rule["reg_exp"]);
					$inverse = isset($rule["inverse"]) ? 1 : 0;

					$filter_type = (int)trim($rule["filter_type"]);
					$match_on = json_encode($rule["feed_id"]);

					$rsth->execute([$filter_id, $reg_exp, $filter_type, $match_on, $inverse]);
				}
			}

			$asth = $this->pdo->prepare("INSERT INTO ttrss_filters2_actions
						(filter_id, action_id, action_param) VALUES
						(?, ?, ?)");

			foreach ($actions as $action) {
				if ($action) {

					$action_id = (int)$action["action_id"];
					$action_param = $action["action_param"];
					$action_param_label = $action["action_param_label"];

					if ($action_id == 7) {
						$action_param = $action_param_label;
					}

					if ($action_id == 6) {
						$action_param = (int)str_replace("+", "", $action_param);
					}

					$asth->execute([$filter_id, $action_id, $action_param]);
				}
			}
		}
	}

	function add () {
		$enabled = checkbox_to_sql_bool(clean($_REQUEST["enabled"] ?? false));
		$match_any_rule = checkbox_to_sql_bool(clean($_REQUEST["match_any_rule"] ?? false));
		$title = clean($_REQUEST["title"]);
		$inverse = checkbox_to_sql_bool(clean($_REQUEST["inverse"] ?? false));

		$this->pdo->beginTransaction();

		/* create base filter */

		$sth = $this->pdo->prepare("INSERT INTO ttrss_filters2
			(owner_uid, match_any_rule, enabled, title, inverse) VALUES
			(?, ?, ?, ?, ?)");

		$sth->execute([$_SESSION['uid'], $match_any_rule, $enabled, $title, $inverse]);

		$sth = $this->pdo->prepare("SELECT MAX(id) AS id FROM ttrss_filters2
			WHERE owner_uid = ?");
		$sth->execute([$_SESSION['uid']]);

		if ($row = $sth->fetch()) {
			$filter_id = $row['id'];
			$this->_save_rules_and_actions($filter_id);
		}

		$this->pdo->commit();
	}

	function index() {
		if (array_key_exists("search", $_REQUEST)) {
			$filter_search = clean($_REQUEST["search"]);
			$_SESSION["prefs_filter_search"] = $filter_search;
		} else {
			$filter_search = ($_SESSION["prefs_filter_search"] ?? "");
		}

		?>
		<div dojoType='dijit.layout.BorderContainer' gutters='false'>
			<div style='padding : 0px' dojoType='dijit.layout.ContentPane' region='top'>
				<div dojoType='fox.Toolbar'>

					<div style='float : right; padding-right : 4px;'>
						<input dojoType="dijit.form.TextBox" id="filter_search" size="20" type="search"
							value="<?= htmlspecialchars($filter_search) ?>">
						<button dojoType="dijit.form.Button" onclick="dijit.byId('filterTree').reload()">
							<?= __('Search') ?></button>
					</div>

					<div dojoType="fox.form.DropDownButton">
						<span><?= __('Select') ?></span>
						<div dojoType="dijit.Menu" style="display: none;">
							<div onclick="dijit.byId('filterTree').model.setAllChecked(true)"
								dojoType="dijit.MenuItem"><?= __('All') ?></div>
							<div onclick="dijit.byId('filterTree').model.setAllChecked(false)"
								dojoType="dijit.MenuItem"><?= __('None') ?></div>
						</div>
					</div>

					<button dojoType="dijit.form.Button" onclick="return Filters.edit()">
						<?= __('Create filter') ?></button>
					<button dojoType="dijit.form.Button" onclick="return dijit.byId('filterTree').joinSelectedFilters()">
						<?= __('Combine') ?></button>
					<button dojoType="dijit.form.Button" onclick="return dijit.byId('filterTree').resetFilterOrder()">
						<?= __('Reset sort order') ?></button>
					<button dojoType="dijit.form.Button" onclick="return dijit.byId('filterTree').removeSelectedFilters()">
						<?= __('Remove') ?></button>

				</div>
			</div>
			<div style='padding : 0px' dojoType='dijit.layout.ContentPane' region='center'>
				<div dojoType="fox.PrefFilterStore" jsId="filterStore"
					url="backend.php?op=pref-filters&method=getfiltertree">
				</div>
				<div dojoType="lib.CheckBoxStoreModel" jsId="filterModel" store="filterStore"
					query="{id:'root'}" rootId="root" rootLabel="Filters"
					childrenAttrs="items" checkboxStrict="false" checkboxAll="false">
				</div>
				<div dojoType="fox.PrefFilterTree" id="filterTree" dndController="dijit.tree.dndSource"
					betweenThreshold="5" model="filterModel" openOnClick="true">
					<script type="dojo/method" event="onClick" args="item">
						var id = String(item.id);
						var bare_id = id.substr(id.indexOf(':')+1);

						if (id.match('FILTER:')) {
							Filters.edit(bare_id);
						}
					</script>
				</div>
			</div>
			<?php PluginHost::getInstance()->run_hooks(PluginHost::HOOK_PREFS_TAB, "prefFilters") ?>
		</div>
		<?php
	}

	function editrule() {
		$feed_ids = explode(",", clean($_REQUEST["ids"]));

		print json_encode([
			"multiselect" => $this->_feed_multi_select("feed_id", $feed_ids, 'required="1" style="width : 100%; height : 300px" dojoType="fox.form.ValidationMultiSelect"')
		]);
	}

	private function _get_name($id) {

		$sth = $this->pdo->prepare(
			"SELECT title,match_any_rule,f.inverse AS inverse,COUNT(DISTINCT r.id) AS num_rules,COUNT(DISTINCT a.id) AS num_actions
				FROM ttrss_filters2 AS f LEFT JOIN ttrss_filters2_rules AS r
					ON (r.filter_id = f.id)
						LEFT JOIN ttrss_filters2_actions AS a
							ON (a.filter_id = f.id) WHERE f.id = ? GROUP BY f.title, f.match_any_rule, f.inverse");
		$sth->execute([$id]);

		if ($row = $sth->fetch()) {

			$title = $row["title"];
			$num_rules = $row["num_rules"];
			$num_actions = $row["num_actions"];
			$match_any_rule = $row["match_any_rule"];
			$inverse = $row["inverse"];

			if (!$title) $title = __("[No caption]");

			$title = sprintf(_ngettext("%s (%d rule)", "%s (%d rules)", (int) $num_rules), $title, $num_rules);

			$sth = $this->pdo->prepare("SELECT * FROM ttrss_filters2_actions
				WHERE filter_id = ? ORDER BY id LIMIT 1");
			$sth->execute([$id]);

			$actions = "";

			if ($line = $sth->fetch()) {
				$actions = $this->_get_action_name($line);

				$num_actions -= 1;
			}

			if ($match_any_rule) $title .= " (" . __("matches any rule") . ")";
			if ($inverse) $title .= " (" . __("inverse") . ")";

			if ($num_actions > 0)
				$actions = sprintf(_ngettext("%s (+%d action)", "%s (+%d actions)", (int) $num_actions), $actions, $num_actions);

			return [$title, $actions];
		}

		return [];
	}

	function join() {
		$ids = explode(",", clean($_REQUEST["ids"]));

		if (count($ids) > 1) {
			$base_id = array_shift($ids);
			$ids_qmarks = arr_qmarks($ids);

			$this->pdo->beginTransaction();

			$sth = $this->pdo->prepare("UPDATE ttrss_filters2_rules
				SET filter_id = ? WHERE filter_id IN ($ids_qmarks)");
			$sth->execute(array_merge([$base_id], $ids));

			$sth = $this->pdo->prepare("UPDATE ttrss_filters2_actions
				SET filter_id = ? WHERE filter_id IN ($ids_qmarks)");
			$sth->execute(array_merge([$base_id], $ids));

			$sth = $this->pdo->prepare("DELETE FROM ttrss_filters2 WHERE id IN ($ids_qmarks)");
			$sth->execute($ids);

			$sth = $this->pdo->prepare("UPDATE ttrss_filters2 SET match_any_rule = true WHERE id = ?");
			$sth->execute([$base_id]);

			$this->pdo->commit();

			$this->_optimize($base_id);

		}
	}

	private function _optimize($id) {

		$this->pdo->beginTransaction();

		$sth = $this->pdo->prepare("SELECT * FROM ttrss_filters2_actions
			WHERE filter_id = ?");
		$sth->execute([$id]);

		$tmp = array();
		$dupe_ids = array();

		while ($line = $sth->fetch()) {
			$id = $line["id"];
			unset($line["id"]);

			if (array_search($line, $tmp) === false) {
				array_push($tmp, $line);
			} else {
				array_push($dupe_ids, $id);
			}
		}

		if (count($dupe_ids) > 0) {
			$ids_str = join(",", $dupe_ids);

			$this->pdo->query("DELETE FROM ttrss_filters2_actions WHERE id IN ($ids_str)");
		}

		$sth = $this->pdo->prepare("SELECT * FROM ttrss_filters2_rules
			WHERE filter_id = ?");
		$sth->execute([$id]);

		$tmp = array();
		$dupe_ids = array();

		while ($line = $sth->fetch()) {
			$id = $line["id"];
			unset($line["id"]);

			if (array_search($line, $tmp) === false) {
				array_push($tmp, $line);
			} else {
				array_push($dupe_ids, $id);
			}
		}

		if (count($dupe_ids) > 0) {
			$ids_str = join(",", $dupe_ids);

			$this->pdo->query("DELETE FROM ttrss_filters2_rules WHERE id IN ($ids_str)");
		}

		$this->pdo->commit();
	}

	private function _feed_multi_select($id, $default_ids = [],
						   $attributes = "", $include_all_feeds = true,
						   $root_id = null, $nest_level = 0) {

		$pdo = Db::pdo();

		$rv = "";

		//	print_r(in_array("CAT:6",$default_ids));

		if (!$root_id) {
			$rv .= "<select multiple=\true\" id=\"$id\" name=\"$id\" $attributes>";
			if ($include_all_feeds) {
				$is_selected = (in_array("0", $default_ids)) ? "selected=\"1\"" : "";
				$rv .= "<option $is_selected value=\"0\">".__('All feeds')."</option>";
			}
		}

		if (get_pref(Prefs::ENABLE_FEED_CATS)) {

			if (!$root_id) $root_id = null;

			$sth = $pdo->prepare("SELECT id,title,
					(SELECT COUNT(id) FROM ttrss_feed_categories AS c2 WHERE
						c2.parent_cat = ttrss_feed_categories.id) AS num_children
					FROM ttrss_feed_categories
					WHERE owner_uid = :uid AND
					(parent_cat = :root_id OR (:root_id IS NULL AND parent_cat IS NULL)) ORDER BY title");

			$sth->execute([":uid" => $_SESSION['uid'], ":root_id" => $root_id]);

			while ($line = $sth->fetch()) {

				for ($i = 0; $i < $nest_level; $i++)
					$line["title"] = " " . $line["title"];

				$is_selected = in_array("CAT:".$line["id"], $default_ids) ? "selected=\"1\"" : "";

				$rv .= sprintf("<option $is_selected value='CAT:%d'>%s</option>",
					$line["id"], htmlspecialchars($line["title"]));

				if ($line["num_children"] > 0)
					$rv .= $this->_feed_multi_select($id, $default_ids, $attributes,
						$include_all_feeds, $line["id"], $nest_level+1);

				$f_sth = $pdo->prepare("SELECT id,title FROM ttrss_feeds
						WHERE cat_id = ? AND owner_uid = ? ORDER BY title");

				$f_sth->execute([$line['id'], $_SESSION['uid']]);

				while ($fline = $f_sth->fetch()) {
					$is_selected = (in_array($fline["id"], $default_ids)) ? "selected=\"1\"" : "";

					$fline["title"] = " " . $fline["title"];

					for ($i = 0; $i < $nest_level; $i++)
						$fline["title"] = " " . $fline["title"];

					$rv .= sprintf("<option $is_selected value='%d'>%s</option>",
						$fline["id"], htmlspecialchars($fline["title"]));
				}
			}

			if (!$root_id) {
				$is_selected = in_array("CAT:0", $default_ids) ? "selected=\"1\"" : "";

				$rv .= sprintf("<option $is_selected value='CAT:0'>%s</option>",
					__("Uncategorized"));

				$f_sth = $pdo->prepare("SELECT id,title FROM ttrss_feeds
						WHERE cat_id IS NULL AND owner_uid = ? ORDER BY title");
				$f_sth->execute([$_SESSION['uid']]);

				while ($fline = $f_sth->fetch()) {
					$is_selected = in_array($fline["id"], $default_ids) ? "selected=\"1\"" : "";

					$fline["title"] = " " . $fline["title"];

					for ($i = 0; $i < $nest_level; $i++)
						$fline["title"] = " " . $fline["title"];

					$rv .= sprintf("<option $is_selected value='%d'>%s</option>",
						$fline["id"], htmlspecialchars($fline["title"]));
				}
			}

		} else {
			$sth = $pdo->prepare("SELECT id,title FROM ttrss_feeds
					WHERE owner_uid = ? ORDER BY title");
			$sth->execute([$_SESSION['uid']]);

			while ($line = $sth->fetch()) {

				$is_selected = (in_array($line["id"], $default_ids)) ? "selected=\"1\"" : "";

				$rv .= sprintf("<option $is_selected value='%d'>%s</option>",
					$line["id"], htmlspecialchars($line["title"]));
			}
		}

		if (!$root_id) {
			$rv .= "</select>";
		}

		return $rv;
	}
}

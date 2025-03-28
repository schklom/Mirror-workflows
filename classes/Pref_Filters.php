<?php
class Pref_Filters extends Handler_Protected {

	const ACTION_TAG = 4;
	const ACTION_SCORE = 6;
	const ACTION_LABEL = 7;
	const ACTION_PLUGIN = 9;
	const ACTION_REMOVE_TAG = 10;

	const PARAM_ACTIONS = [self::ACTION_TAG, self::ACTION_SCORE,
		self::ACTION_LABEL, self::ACTION_PLUGIN, self::ACTION_REMOVE_TAG];

	const MAX_ACTIONS_TO_DISPLAY = 3;

	/** @var array<int,array<mixed>> $action_descriptions */
	private array $action_descriptions = [];

	function before(string $method) : bool {

		$descriptions = ORM::for_table("ttrss_filter_actions")->find_array();

		foreach ($descriptions as $desc) {
			$this->action_descriptions[$desc['id']] = $desc;
		}

		return parent::before($method);
	}

	function csrf_ignore(string $method): bool {
		$csrf_ignored = array("index", "getfiltertree", "savefilterorder");

		return array_search($method, $csrf_ignored) !== false;
	}

	function filtersortreset(): void {
		$sth = $this->pdo->prepare("UPDATE ttrss_filters2
				SET order_id = 0 WHERE owner_uid = ?");
		$sth->execute([$_SESSION['uid']]);
	}

	function savefilterorder(): void {
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
	}

	function testFilterDo(): void {
		$offset = (int) clean($_REQUEST["offset"]);
		$limit = (int) clean($_REQUEST["limit"]);

		// catchall fake filter which includes all rules
		$filter = [
			'enabled' => true,
			'match_any_rule' => checkbox_to_sql_bool($_REQUEST['match_any_rule'] ?? false),
			'inverse' => checkbox_to_sql_bool($_REQUEST['inverse'] ?? false),
			'rules' => [],
			'actions' => ['dummy-action'],
		];

		/** @var array<int, string> */
		$filter_types = [];

		foreach (ORM::for_table('ttrss_filter_types')->find_many() as $filter_type) {
			$filter_types[$filter_type->id] = $filter_type->name;
		}

		$scope_qparts = [];

		/** @var string $rule_json */
		foreach (clean($_REQUEST['rule']) as $rule_json) {
			/** @var array{'reg_exp': string, 'filter_type': int, 'feed_id': array<int, int|string>, 'name': string}|null */
			$rule = json_decode($rule_json, true);

			if (is_array($rule)) {
				$rule['type'] = $filter_types[$rule['filter_type']];
				unset($rule['filter_type']);
				array_push($filter['rules'], $rule);

				$scope_inner_qparts = [];

				/** @var int|string $feed_id may be a category string (e.g. 'CAT:7') or feed ID int */
				foreach ($rule["feed_id"] as $feed_id) {
					if (str_starts_with("$feed_id", "CAT:")) {
						$cat_id = (int) substr("$feed_id", 4);
						if ($cat_id > 0)
							array_push($scope_inner_qparts, "cat_id = " . $cat_id);
						else
							array_push($scope_inner_qparts, "cat_id IS NULL");
					} else if (is_numeric($feed_id) && $feed_id > 0) {
						array_push($scope_inner_qparts, "feed_id = " . (int)$feed_id);
					}
				}

				if (count($scope_inner_qparts) > 0)
					array_push($scope_qparts, '(' . implode(' OR ', $scope_inner_qparts) . ')');
			}
		}

		$query = ORM::for_table('ttrss_entries')
			->table_alias('e')
			->select_many('e.title', 'e.content', 'e.date_entered', 'e.link', 'e.author', 'ue.tag_cache',
				['feed_id' => 'f.id', 'feed_title' => 'f.title', 'cat_id' => 'fc.id'])
			->join('ttrss_user_entries', [ 'ue.ref_id', '=', 'e.id'], 'ue')
			->left_outer_join('ttrss_feeds', ['f.id', '=', 'ue.feed_id'], 'f')
			->left_outer_join('ttrss_feed_categories', ['fc.id', '=', 'f.cat_id'], 'fc')
			->where('ue.owner_uid', $_SESSION['uid'])
			->order_by_desc('e.date_entered')
			->limit($limit)
			->offset($offset);

		if (count($scope_qparts) > 0)
			$query->where_raw(join($filter['match_any_rule'] ? ' OR ' : ' AND ', $scope_qparts));

		$entries = $query->find_array();

		$rv = [
			'pre_filtering_count' => count($entries),
			'items' => [],
		];

		foreach ($entries as $entry) {

			// temporary filter which will be used to compare against returned article
			$feed_filter = $filter;
			$feed_filter['rules'] = [];

			// only add rules which match result from specific feed or category ID or rules matching all feeds
			// @phpstan-ignore foreach.emptyArray
			foreach ($filter['rules'] as $rule) {
				foreach ($rule['feed_id'] as $rule_feed) {
					if (($rule_feed === 'CAT:0' && $entry['cat_id'] === null) || 			// rule matches Uncategorized
							$rule_feed === 'CAT:' . $entry['cat_id'] ||                    // rule matches category
							$rule_feed === $entry['feed_id'] ||                            // rule matches feed
							$rule_feed === '0') {                                          // rule matches all feeds

						$feed_filter['rules'][] = $rule;
					}
				}
			}

			$matched_rules = [];

			$rc = RSSUtils::get_article_filters([$feed_filter], $entry['title'], $entry['content'], $entry['link'],
				$entry['author'], explode(",", $entry['tag_cache']), $matched_rules);

			if (count($rc) > 0) {
				$entry["content_preview"] = truncate_string(strip_tags($entry["content"]), 200, '&hellip;');

				$excerpt_length = 100;

				PluginHost::getInstance()->chain_hooks_callback(PluginHost::HOOK_QUERY_HEADLINES,
					function ($result) use (&$entry) {
						$entry = $result;
					},
					$entry, $excerpt_length);

				$matches = [];

				$content_preview = $entry["content_preview"];
				$content_title = $entry["title"];

				// is it even possible to have multiple matched rules here?
				foreach ($matched_rules as $rule) {
					$can_highlight_content = false;
					$can_highlight_title = false;

					$matches[] = $rule['regexp_matches'][0];

					switch ($rule['type']) {
						case "both":
							$can_highlight_title = true;
							$can_highlight_content = true;
							break;
						case "title":
							$can_highlight_title = true;
							break;
						case "content":
							$can_highlight_content = true;
							break;
					}

					if ($can_highlight_content)
						$content_preview = Sanitizer::highlight_words_str($content_preview, $matches);

					if ($can_highlight_title)
						$content_title = Sanitizer::highlight_words_str($content_title, $matches);
				}

				$rv['items'][] = [
					'title' => $content_title,
					'feed_title' => $entry['feed_title'],
					'date' => mb_substr($entry['date_entered'], 0, 16),
					'content_preview' => $content_preview,
					'matched_rules' => $matched_rules,
				];
			}
		}

		print json_encode($rv);
	}

	private function _get_rules_list(int $filter_id): string {
		$rules = ORM::for_table('ttrss_filters2_rules')
			->table_alias('r')
			->join('ttrss_filter_types', ['r.filter_type', '=', 't.id'], 't')
			->where('filter_id', $filter_id)
			->select_many(['r.*', 'field' => 't.description'])
			->find_many();

		$rv = "";

		foreach ($rules as $rule) {
			if ($rule->match_on) {
					$feeds = json_decode($rule->match_on, true);
					$feeds_fmt = [];

					foreach ($feeds as $feed_id) {

						if (str_starts_with($feed_id, "CAT:")) {
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
				$where = $rule->cat_filter ?
						Feeds::_get_cat_title($rule->cat_id ?? 0) :
					($rule->feed_id ?
						Feeds::_get_title($rule->feed_id) : __("All feeds"));
			}

			$inverse_class = $rule->inverse ? "inverse" : "";

			$rv .= "<li class='$inverse_class'>" . T_sprintf("%s on %s in %s %s",
				htmlspecialchars($rule->reg_exp),
				$rule->field,
				$where,
				$rule->inverse ? __("(inverse)") : "") . "</li>";
		}

		return $rv;
	}

	function getfiltertree(): void {
		$root = [
			'id' => 'root',
			'name' =>  __('Filters'),
			'enabled' => true,
			'items' => []
		];

		$filter_search = ($_SESSION["prefs_filter_search"] ?? "");

		$filters = ORM::for_table('ttrss_filters2')
			->where('owner_uid', $_SESSION['uid'])
			->order_by_asc(['order_id', 'title'])
			->find_many();

		$folder = [
			'items' => []
		];

		foreach ($filters as $filter) {
			$details = $this->_get_details($filter->id);

			if ($filter_search &&
				mb_stripos($filter->title, $filter_search) === false &&
					!ORM::for_table('ttrss_filters2_rules')
						->where('filter_id', $filter->id)
						->where_raw('LOWER(reg_exp) LIKE LOWER(?)', ["%$filter_search%"])
						->find_one()) {

					continue;
			}

			$item = [
				'id' => 'FILTER:' . $filter->id,
				'bare_id' => $filter->id,
				'bare_name' => $details['title'],
				'name' => $details['title_summary'],
				'param' => $details['actions_summary'],
				'checkbox' => false,
				'last_triggered' => $filter->last_triggered ? TimeHelper::make_local_datetime($filter->last_triggered) : null,
				'enabled' => sql_bool_to_bool($filter->enabled),
				'rules' => $this->_get_rules_list($filter->id)
			];

			array_push($folder['items'], $item);
		}

		$root['items'] = $folder['items'];

		$fl = [
			'identifier' => 'id',
			'label' => 'name',
			'items' => [$root]
		];

		print json_encode($fl);
	}

	function edit(): void {

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

	/**
	 * @param array<string, mixed>|null $rule
	 */
	private function _get_rule_name(?array $rule = null): string {
		if (!$rule) $rule = json_decode(clean($_REQUEST["rule"]), true);

		$feeds = $rule["feed_id"];
		$feeds_fmt = [];

		if (!is_array($feeds)) $feeds = [$feeds];

		foreach ($feeds as $feed_id) {

            if (str_starts_with($feed_id, "CAT:")) {
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

	function printRuleName(): void {
		print $this->_get_rule_name(json_decode(clean($_REQUEST["rule"]), true));
	}

	/**
	 * @param array<string,mixed>|ArrayAccess<string, mixed>|null $action
	 */
	private function _get_action_name(array|ArrayAccess|null $action = null): string {
		if (!$action) {
			return "";
		}

		$title = __($this->action_descriptions[$action['action_id']]['description']) ??
			T_sprintf('Unknown action: %d', $action['action_id']);

		if ($action["action_id"] == self::ACTION_PLUGIN) {
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
		} else if (in_array($action["action_id"], self::PARAM_ACTIONS)) {
			$title .= ": " . $action["action_param"];
		}

		return $title;
	}

	function printActionName(): void {
		print $this->_get_action_name(json_decode(clean($_REQUEST["action"] ?? ""), true));
	}

	function editSave(): void {
		$filter_id = (int) clean($_REQUEST["id"]);
		$enabled = checkbox_to_sql_bool($_REQUEST["enabled"] ?? false);
		$match_any_rule = checkbox_to_sql_bool($_REQUEST["match_any_rule"] ?? false);
		$inverse = checkbox_to_sql_bool($_REQUEST["inverse"] ?? false);
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

	function remove(): void {

		$ids = explode(",", clean($_REQUEST["ids"]));
		$ids_qmarks = arr_qmarks($ids);

		$sth = $this->pdo->prepare("DELETE FROM ttrss_filters2 WHERE id IN ($ids_qmarks)
			AND owner_uid = ?");
		$sth->execute([...$ids, $_SESSION['uid']]);
	}

	private function _clone_rules_and_actions(int $filter_id, ?int $src_filter_id = null): bool {
		$sth = $this->pdo->prepare('INSERT INTO ttrss_filters2_rules
					(filter_id, reg_exp, inverse, filter_type, feed_id, cat_id, match_on, cat_filter)
					SELECT :filter_id, reg_exp, inverse, filter_type, feed_id, cat_id, match_on, cat_filter
					FROM ttrss_filters2_rules
					WHERE filter_id = :src_filter_id');

		if (!$sth->execute(['filter_id' => $filter_id, 'src_filter_id' => $src_filter_id]))
			return false;

		$sth = $this->pdo->prepare('INSERT INTO ttrss_filters2_actions
			(filter_id, action_id, action_param)
			SELECT :filter_id, action_id, action_param
			FROM ttrss_filters2_actions
			WHERE filter_id = :src_filter_id');

		return $sth->execute(['filter_id' => $filter_id, 'src_filter_id' => $src_filter_id]);
	}

	private function _save_rules_and_actions(int $filter_id): void {

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

					if ($action_id == self::ACTION_LABEL) {
						$action_param = $action_param_label;
					}

					if ($action_id == self::ACTION_SCORE) {
						$action_param = (int)str_replace("+", "", $action_param);
					}

					if (in_array($action_id, [self::ACTION_TAG, self::ACTION_REMOVE_TAG])) {
						$action_param = implode(", ", FeedItem_Common::normalize_categories(
							explode(",", $action_param)));
					}

					$asth->execute([$filter_id, $action_id, $action_param]);
				}
			}
		}
	}

	/**
	 * @param null|array{'src_filter_id': int, 'title': string, 'enabled': 0|1, 'match_any_rule': 0|1, 'inverse': 0|1} $props
	 */
	function add(?array $props = null): void {
		if ($props === null) {
			$src_filter_id = null;
			$title = clean($_REQUEST['title']);
			$enabled = checkbox_to_sql_bool($_REQUEST['enabled'] ?? false);
			$match_any_rule = checkbox_to_sql_bool($_REQUEST['match_any_rule'] ?? false);
			$inverse = checkbox_to_sql_bool($_REQUEST['inverse'] ?? false);
		} else {
			// see checkbox_to_sql_bool() for 0 vs false justification
			$src_filter_id = $props['src_filter_id'];
			$title = clean($props['title']);
			$enabled = $props['enabled'];
			$match_any_rule = $props['match_any_rule'];
			$inverse = $props['inverse'];
		}

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

			if ($src_filter_id === null)
				$this->_save_rules_and_actions($filter_id);
			else
				$this->_clone_rules_and_actions($filter_id, $src_filter_id);
		}

		$this->pdo->commit();
	}

	function clone(): void {
		/** @var array<int, int> */
		$src_filter_ids = array_map('intval', array_filter(explode(',', clean($_REQUEST['ids'] ?? ''))));
		$new_filter_title = count($src_filter_ids) === 1 ? clean($_REQUEST['new_filter_title'] ?? null) : null;

		$src_filters = ORM::for_table('ttrss_filters2')
			->where('owner_uid', $_SESSION['uid'])
			->where_id_in($src_filter_ids)
			->find_many();

		foreach ($src_filters as $src_filter) {
			// see checkbox_to_sql_bool() for 0+1 justification
			$this->add([
				'src_filter_id' => $src_filter->id,
				'title' => $new_filter_title ?? sprintf(__('Clone of %s'), $src_filter->title),
				'enabled' => 0,
				'match_any_rule' => $src_filter->match_any_rule ? 1 : 0,
				'inverse' => $src_filter->inverse ? 1 : 0,
			]);
		}
	}

	function index(): void {
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
						<form dojoType="dijit.form.Form" onsubmit="dijit.byId('filterTree').reload(); return false;">
							<input dojoType="dijit.form.TextBox" id="filter_search" size="20" type="search"
								value="<?= htmlspecialchars($filter_search) ?>">
							<button dojoType="dijit.form.Button" type="submit">
								<?= __('Search') ?></button>
						</form>
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
					<button dojoType="dijit.form.Button" onclick="return dijit.byId('filterTree').cloneSelectedFilters()">
						<?= __('Clone') ?></button>
					<button dojoType="dijit.form.Button" onclick="return dijit.byId('filterTree').joinSelectedFilters()">
						<?= __('Combine') ?></button>
					<button dojoType="dijit.form.Button" onclick="return dijit.byId('filterTree').removeSelectedFilters()">
						<?= __('Remove') ?></button>
					<button dojoType="dijit.form.Button" onclick="return dijit.byId('filterTree').resetFilterOrder()">
						<?= __('Reset sort order') ?></button>
					<button dojoType="dijit.form.Button" onclick="return dijit.byId('filterTree').toggleRules()">
						<?= __('Toggle rule display') ?></button>

				</div>
			</div>
			<div style='padding : 0px' dojoType='dijit.layout.ContentPane' region='center'>
				<div dojoType="fox.PrefFilterStore" jsId="filterStore"
					url="backend.php?op=Pref_Filters&method=getfiltertree">
				</div>
				<div dojoType="lib.CheckBoxStoreModel" jsId="filterModel" store="filterStore"
					query="{id:'root'}" rootId="root" rootLabel="Filters"
					childrenAttrs="items" checkboxStrict="false" checkboxAll="false">
				</div>
				<div dojoType="fox.PrefFilterTree" id="filterTree" dndController="dijit.tree.dndSource"
					betweenThreshold="5" model="filterModel" openOnClick="true">
				</div>
			</div>
			<?php PluginHost::getInstance()->run_hooks(PluginHost::HOOK_PREFS_TAB, "prefFilters") ?>
		</div>
		<?php
	}

	function editrule(): void {
		$feed_ids = explode(",", clean($_REQUEST["ids"]));

		print json_encode([
			"multiselect" => $this->_feed_multi_select("feed_id", $feed_ids, 'required="1" style="width : 100%; height : 300px" dojoType="fox.form.ValidationMultiSelect"')
		]);
	}

	/**
	 * @return array{'title': string, 'title_summary': string, 'actions_summary': string}
	 */
	private function _get_details(int $id): array {

		$filter = ORM::for_table("ttrss_filters2")
			->table_alias('f')
			->select('f.title')
			->select('f.match_any_rule')
			->select('f.inverse')
			->select_expr('COUNT(DISTINCT r.id)', 'num_rules')
			->select_expr('COUNT(DISTINCT a.id)', 'num_actions')
			->left_outer_join('ttrss_filters2_rules', ['r.filter_id', '=', 'f.id'], 'r')
			->left_outer_join('ttrss_filters2_actions', ['a.filter_id', '=', 'f.id'], 'a')
			->where('f.id', $id)
			->group_by_expr('f.title, f.match_any_rule, f.inverse')
			->find_one();

		$title = $filter->title ?: __('[No caption]');
		$title_summary = [
			sprintf(
			_ngettext("%s (%d rule)", "%s (%d rules)", (int) $filter->num_rules),
			$title,
			$filter->num_rules)];

		if ($filter->match_any_rule) array_push($title_summary, __("matches any rule"));
		if ($filter->inverse) array_push($title_summary, __("inverse"));

		$actions = ORM::for_table("ttrss_filters2_actions")
			->where("filter_id", $id)
			->order_by_asc('id')
			->find_many();

		/** @var array<string> $actions_summary */
		$actions_summary = [];
		$cumulative_score = 0;

		// we're going to show a summary adjustment so we skip individual score action descriptions here
		foreach ($actions as $action) {
			if ($action->action_id == self::ACTION_SCORE) {
				$cumulative_score += (int) $action->action_param;
				continue;
			}

			array_push($actions_summary, "<li>" . self::_get_action_name($action) . "</li>");
		}

		// inject a fake action description using cumulative filter score
		if ($cumulative_score != 0) {
			array_unshift($actions_summary,
				"<li>" . self::_get_action_name(["action_id" => self::ACTION_SCORE, "action_param" => $cumulative_score]) . "</li>");
		}

		if (count($actions_summary) > self::MAX_ACTIONS_TO_DISPLAY) {
			$actions_not_shown = count($actions_summary) - self::MAX_ACTIONS_TO_DISPLAY;
			$actions_summary = array_slice($actions_summary, 0, self::MAX_ACTIONS_TO_DISPLAY);

			array_push($actions_summary,
				"<li class='text-muted'><em>" . sprintf(_ngettext("(+%d action)", "(+%d actions)", $actions_not_shown), $actions_not_shown)) . "</em></li>";
		}

		return [
			'title' => $title,
			'title_summary' => implode(', ', $title_summary),
			'actions_summary' => implode('', $actions_summary),
		];
	}

	function join(): void {
		/** @var array<int, int> */
		$ids = array_map("intval", explode(",", clean($_REQUEST["ids"])));

		if (count($ids) > 1) {
			$base_id = array_shift($ids);
			$ids_qmarks = arr_qmarks($ids);

			$this->pdo->beginTransaction();

			$sth = $this->pdo->prepare("UPDATE ttrss_filters2_rules
				SET filter_id = ? WHERE filter_id IN ($ids_qmarks)");
			$sth->execute([$base_id, ...$ids]);

			$sth = $this->pdo->prepare("UPDATE ttrss_filters2_actions
				SET filter_id = ? WHERE filter_id IN ($ids_qmarks)");
			$sth->execute([$base_id, ...$ids]);

			$sth = $this->pdo->prepare("DELETE FROM ttrss_filters2 WHERE id IN ($ids_qmarks)");
			$sth->execute($ids);

			$sth = $this->pdo->prepare("UPDATE ttrss_filters2 SET match_any_rule = true WHERE id = ?");
			$sth->execute([$base_id]);

			$this->pdo->commit();

			$this->_optimize($base_id);

		}
	}

	private function _optimize(int $id): void {

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

	/**
	 * @param array<int, int|string> $default_ids
	 */
	private function _feed_multi_select(string $id, array $default_ids = [], string $attributes = "",
		bool $include_all_feeds = true, ?int $root_id = null, int $nest_level = 0): string {

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

		if (Prefs::get(Prefs::ENABLE_FEED_CATS, $_SESSION['uid'], $_SESSION['profile'] ?? null)) {

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

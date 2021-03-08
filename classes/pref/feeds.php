<?php
class Pref_Feeds extends Handler_Protected {
	const E_ICON_FILE_TOO_LARGE = 'E_ICON_FILE_TOO_LARGE';
	const E_ICON_RENAME_FAILED = 'E_ICON_RENAME_FAILED';
	const E_ICON_UPLOAD_FAILED = 'E_ICON_UPLOAD_FAILED';
	const E_ICON_UPLOAD_SUCCESS = 'E_ICON_UPLOAD_SUCCESS';

	function csrf_ignore($method) {
		$csrf_ignored = array("index", "getfeedtree", "savefeedorder");

		return array_search($method, $csrf_ignored) !== false;
	}

	public static function get_ts_languages() {
		$rv = [];

		if (Config::get(Config::DB_TYPE) == "pgsql") {
			$dbh = Db::pdo();

			$res = $dbh->query("SELECT cfgname FROM pg_ts_config");

			while ($row = $res->fetch()) {
				array_push($rv, ucfirst($row['cfgname']));
			}
		}

		return $rv;
	}

	function renameCat() {
		$cat = ORM::for_table("ttrss_feed_categories")
			->where("owner_uid", $_SESSION["uid"])
			->find_one($_REQUEST['id']);

		$title = clean($_REQUEST['title']);

		if ($cat && $title) {
			$cat->title = $title;
			$cat->save();
		}
	}

	private function get_category_items($cat_id) {

		if (clean($_REQUEST['mode'] ?? 0) != 2)
			$search = $_SESSION["prefs_feed_search"] ?? "";
		else
			$search = "";

		// first one is set by API
		$show_empty_cats = clean($_REQUEST['force_show_empty'] ?? false) ||
			(clean($_REQUEST['mode'] ?? 0) != 2 && !$search);

		$items = array();

		$sth = $this->pdo->prepare("SELECT id, title FROM ttrss_feed_categories
				WHERE owner_uid = ? AND parent_cat = ? ORDER BY order_id, title");
		$sth->execute([$_SESSION['uid'], $cat_id]);

		while ($line = $sth->fetch()) {

			$cat = array();
			$cat['id'] = 'CAT:' . $line['id'];
			$cat['bare_id'] = (int)$line['id'];
			$cat['name'] = $line['title'];
			$cat['items'] = array();
			$cat['checkbox'] = false;
			$cat['type'] = 'category';
			$cat['unread'] = -1;
			$cat['child_unread'] = -1;
			$cat['auxcounter'] = -1;
			$cat['parent_id'] = $cat_id;

			$cat['items'] = $this->get_category_items($line['id']);

			$num_children = $this->calculate_children_count($cat);
			$cat['param'] = sprintf(_ngettext('(%d feed)', '(%d feeds)', (int) $num_children), $num_children);

			if ($num_children > 0 || $show_empty_cats)
				array_push($items, $cat);

		}

		$fsth = $this->pdo->prepare("SELECT id, title, last_error,
			".SUBSTRING_FOR_DATE."(last_updated,1,19) AS last_updated, update_interval
			FROM ttrss_feeds
			WHERE cat_id = :cat AND
			owner_uid = :uid AND
			(:search = '' OR (LOWER(title) LIKE :search OR LOWER(feed_url) LIKE :search))
			ORDER BY order_id, title");

		$fsth->execute([":cat" => $cat_id, ":uid" => $_SESSION['uid'], ":search" => $search ? "%$search%" : ""]);

		while ($feed_line = $fsth->fetch()) {
			$feed = array();
			$feed['id'] = 'FEED:' . $feed_line['id'];
			$feed['bare_id'] = (int)$feed_line['id'];
			$feed['auxcounter'] = -1;
			$feed['name'] = $feed_line['title'];
			$feed['checkbox'] = false;
			$feed['unread'] = -1;
			$feed['error'] = $feed_line['last_error'];
			$feed['icon'] = Feeds::_get_icon($feed_line['id']);
			$feed['param'] = TimeHelper::make_local_datetime(
				$feed_line['last_updated'], true);
			$feed['updates_disabled'] = (int)($feed_line['update_interval'] < 0);

			array_push($items, $feed);
		}

		return $items;
	}

	function getfeedtree() {
		print json_encode($this->_makefeedtree());
	}

	function _makefeedtree() {

		if (clean($_REQUEST['mode'] ?? 0) != 2)
			$search = $_SESSION["prefs_feed_search"] ?? "";
		else
			$search = "";

		$root = array();
		$root['id'] = 'root';
		$root['name'] = __('Feeds');
		$root['items'] = array();
		$root['param'] = 0;
		$root['type'] = 'category';

		$enable_cats = get_pref(Prefs::ENABLE_FEED_CATS);

		if (clean($_REQUEST['mode'] ?? 0) == 2) {

			if ($enable_cats) {
				$cat = $this->feedlist_init_cat(-1);
			} else {
				$cat['items'] = array();
			}

			foreach (array(-4, -3, -1, -2, 0, -6) as $i) {
				array_push($cat['items'], $this->feedlist_init_feed($i));
			}

			/* Plugin feeds for -1 */

			$feeds = PluginHost::getInstance()->get_feeds(-1);

			if ($feeds) {
				foreach ($feeds as $feed) {
					$feed_id = PluginHost::pfeed_to_feed_id($feed['id']);

					$item = array();
					$item['id'] = 'FEED:' . $feed_id;
					$item['bare_id'] = (int)$feed_id;
					$item['auxcounter'] = -1;
					$item['name'] = $feed['title'];
					$item['checkbox'] = false;
					$item['error'] = '';
					$item['icon'] = $feed['icon'];

					$item['param'] = '';
					$item['unread'] = -1;
					$item['type'] = 'feed';

					array_push($cat['items'], $item);
				}
			}

			if ($enable_cats) {
				array_push($root['items'], $cat);
			} else {
				$root['items'] = array_merge($root['items'], $cat['items']);
			}

			$sth = $this->pdo->prepare("SELECT * FROM
				ttrss_labels2 WHERE owner_uid = ? ORDER by caption");
			$sth->execute([$_SESSION['uid']]);

			if (get_pref(Prefs::ENABLE_FEED_CATS)) {
				$cat = $this->feedlist_init_cat(-2);
			} else {
				$cat['items'] = array();
			}

			$num_labels = 0;
			while ($line = $sth->fetch()) {
				++$num_labels;

				$label_id = Labels::label_to_feed_id($line['id']);

				$feed = $this->feedlist_init_feed($label_id, false, 0);

				$feed['fg_color'] = $line['fg_color'];
				$feed['bg_color'] = $line['bg_color'];

				array_push($cat['items'], $feed);
			}

			if ($num_labels) {
				if ($enable_cats) {
					array_push($root['items'], $cat);
				} else {
					$root['items'] = array_merge($root['items'], $cat['items']);
				}
			}
		}

		if ($enable_cats) {
			$show_empty_cats = clean($_REQUEST['force_show_empty'] ?? false) ||
				(clean($_REQUEST['mode'] ?? 0) != 2 && !$search);

			$sth = $this->pdo->prepare("SELECT id, title FROM ttrss_feed_categories
				WHERE owner_uid = ? AND parent_cat IS NULL ORDER BY order_id, title");
			$sth->execute([$_SESSION['uid']]);

			while ($line = $sth->fetch()) {
				$cat = array();
				$cat['id'] = 'CAT:' . $line['id'];
				$cat['bare_id'] = (int)$line['id'];
				$cat['auxcounter'] = -1;
				$cat['name'] = $line['title'];
				$cat['items'] = array();
				$cat['checkbox'] = false;
				$cat['type'] = 'category';
				$cat['unread'] = -1;
				$cat['child_unread'] = -1;

				$cat['items'] = $this->get_category_items($line['id']);

				$num_children = $this->calculate_children_count($cat);
				$cat['param'] = sprintf(_ngettext('(%d feed)', '(%d feeds)', (int) $num_children), $num_children);

				if ($num_children > 0 || $show_empty_cats)
					array_push($root['items'], $cat);

				$root['param'] += count($cat['items']);
			}

			/* Uncategorized is a special case */

			$cat = array();
			$cat['id'] = 'CAT:0';
			$cat['bare_id'] = 0;
			$cat['auxcounter'] = -1;
			$cat['name'] = __("Uncategorized");
			$cat['items'] = array();
			$cat['type'] = 'category';
			$cat['checkbox'] = false;
			$cat['unread'] = -1;
			$cat['child_unread'] = -1;

			$fsth = $this->pdo->prepare("SELECT id, title,last_error,
				".SUBSTRING_FOR_DATE."(last_updated,1,19) AS last_updated, update_interval
				FROM ttrss_feeds
				WHERE cat_id IS NULL AND
				owner_uid = :uid AND
				(:search = '' OR (LOWER(title) LIKE :search OR LOWER(feed_url) LIKE :search))
				ORDER BY order_id, title");
			$fsth->execute([":uid" => $_SESSION['uid'], ":search" => $search ? "%$search%" : ""]);

			while ($feed_line = $fsth->fetch()) {
				$feed = array();
				$feed['id'] = 'FEED:' . $feed_line['id'];
				$feed['bare_id'] = (int)$feed_line['id'];
				$feed['auxcounter'] = -1;
				$feed['name'] = $feed_line['title'];
				$feed['checkbox'] = false;
				$feed['error'] = $feed_line['last_error'];
				$feed['icon'] = Feeds::_get_icon($feed_line['id']);
				$feed['param'] = TimeHelper::make_local_datetime(
					$feed_line['last_updated'], true);
				$feed['unread'] = -1;
				$feed['type'] = 'feed';
				$feed['updates_disabled'] = (int)($feed_line['update_interval'] < 0);

				array_push($cat['items'], $feed);
			}

			$cat['param'] = sprintf(_ngettext('(%d feed)', '(%d feeds)', count($cat['items'])), count($cat['items']));

			if (count($cat['items']) > 0 || $show_empty_cats)
				array_push($root['items'], $cat);

			$num_children = $this->calculate_children_count($root);
			$root['param'] = sprintf(_ngettext('(%d feed)', '(%d feeds)', (int) $num_children), $num_children);

		} else {
			$fsth = $this->pdo->prepare("SELECT id, title, last_error,
				".SUBSTRING_FOR_DATE."(last_updated,1,19) AS last_updated, update_interval
				FROM ttrss_feeds
				WHERE owner_uid = :uid AND
				(:search = '' OR (LOWER(title) LIKE :search OR LOWER(feed_url) LIKE :search))
				ORDER BY order_id, title");
			$fsth->execute([":uid" => $_SESSION['uid'], ":search" => $search ? "%$search%" : ""]);

			while ($feed_line = $fsth->fetch()) {
				$feed = array();
				$feed['id'] = 'FEED:' . $feed_line['id'];
				$feed['bare_id'] = (int)$feed_line['id'];
				$feed['auxcounter'] = -1;
				$feed['name'] = $feed_line['title'];
				$feed['checkbox'] = false;
				$feed['error'] = $feed_line['last_error'];
				$feed['icon'] = Feeds::_get_icon($feed_line['id']);
				$feed['param'] = TimeHelper::make_local_datetime(
					$feed_line['last_updated'], true);
				$feed['unread'] = -1;
				$feed['type'] = 'feed';
				$feed['updates_disabled'] = (int)($feed_line['update_interval'] < 0);

				array_push($root['items'], $feed);
			}

			$root['param'] = sprintf(_ngettext('(%d feed)', '(%d feeds)', count($root['items'])), count($root['items']));
		}

		$fl = array();
		$fl['identifier'] = 'id';
		$fl['label'] = 'name';

		if (clean($_REQUEST['mode'] ?? 0) != 2) {
			$fl['items'] = array($root);
		} else {
			$fl['items'] = $root['items'];
		}

		return $fl;
	}

	function catsortreset() {
		$sth = $this->pdo->prepare("UPDATE ttrss_feed_categories
				SET order_id = 0 WHERE owner_uid = ?");
		$sth->execute([$_SESSION['uid']]);
	}

	function feedsortreset() {
		$sth = $this->pdo->prepare("UPDATE ttrss_feeds
				SET order_id = 0 WHERE owner_uid = ?");
		$sth->execute([$_SESSION['uid']]);
	}

	private function process_category_order(&$data_map, $item_id, $parent_id = false, $nest_level = 0) {

		$prefix = "";
		for ($i = 0; $i < $nest_level; $i++)
			$prefix .= "   ";

		Debug::log("$prefix C: $item_id P: $parent_id");

		$bare_item_id = substr($item_id, strpos($item_id, ':')+1);

		if ($item_id != 'root') {
			if ($parent_id && $parent_id != 'root') {
				$parent_bare_id = substr($parent_id, strpos($parent_id, ':')+1);
				$parent_qpart = $parent_bare_id;
			} else {
				$parent_qpart = null;
			}

			$sth = $this->pdo->prepare("UPDATE ttrss_feed_categories
				SET parent_cat = ? WHERE id = ? AND
				owner_uid = ?");
			$sth->execute([$parent_qpart, $bare_item_id, $_SESSION['uid']]);
		}

		$order_id = 1;

		$cat = $data_map[$item_id];

		if ($cat && is_array($cat)) {
			foreach ($cat as $item) {
				$id = $item['_reference'];
				$bare_id = substr($id, strpos($id, ':')+1);

				Debug::log("$prefix [$order_id] $id/$bare_id");

				if ($item['_reference']) {

					if (strpos($id, "FEED") === 0) {

						$cat_id = ($item_id != "root") ? $bare_item_id : null;

						$sth = $this->pdo->prepare("UPDATE ttrss_feeds
							SET order_id = ?, cat_id = ?
							WHERE id = ? AND owner_uid = ?");

						$sth->execute([$order_id, $cat_id ? $cat_id : null, $bare_id, $_SESSION['uid']]);

					} else if (strpos($id, "CAT:") === 0) {
						$this->process_category_order($data_map, $item['_reference'], $item_id,
							$nest_level+1);

						$sth = $this->pdo->prepare("UPDATE ttrss_feed_categories
								SET order_id = ? WHERE id = ? AND
								owner_uid = ?");
						$sth->execute([$order_id, $bare_id, $_SESSION['uid']]);
					}
				}

				++$order_id;
			}
		}
	}

	function savefeedorder() {
		$data = json_decode($_POST['payload'], true);

		#file_put_contents("/tmp/saveorder.json", clean($_POST['payload']));
		#$data = json_decode(file_get_contents("/tmp/saveorder.json"), true);

		if (!is_array($data['items']))
			$data['items'] = json_decode($data['items'], true);

#		print_r($data['items']);

		if (is_array($data) && is_array($data['items'])) {
#			$cat_order_id = 0;

			$data_map = array();
			$root_item = false;

			foreach ($data['items'] as $item) {

#				if ($item['id'] != 'root') {
					if (is_array($item['items'])) {
						if (isset($item['items']['_reference'])) {
							$data_map[$item['id']] = array($item['items']);
						} else {
							$data_map[$item['id']] = $item['items'];
						}
					}
				if ($item['id'] == 'root') {
					$root_item = $item['id'];
				}
			}

			$this->process_category_order($data_map, $root_item);
		}
	}

	function removeIcon() {
		$feed_id = (int) $_REQUEST["feed_id"];
		$icon_file = Config::get(Config::ICONS_DIR) . "/$feed_id.ico";

		$feed = ORM::for_table('ttrss_feeds')
			->where('owner_uid', $_SESSION['uid'])
			->find_one($feed_id);

		if ($feed && file_exists($icon_file)) {
			if (unlink($icon_file)) {
				$feed->set([
					'favicon_avg_color' => null,
					'favicon_last_checked' => '1970-01-01',
					'favicon_is_custom' => false,
				]);
				$feed->save();
			}
		}
	}

	function uploadIcon() {
		$feed_id = (int) $_REQUEST['feed_id'];
		$tmp_file = tempnam(Config::get(Config::CACHE_DIR) . '/upload', 'icon');

		// default value
		$rc = self::E_ICON_UPLOAD_FAILED;

		$feed = ORM::for_table('ttrss_feeds')
			->where('owner_uid', $_SESSION['uid'])
			->find_one($feed_id);

		if ($feed && $tmp_file && move_uploaded_file($_FILES['icon_file']['tmp_name'], $tmp_file)) {
			if (filesize($tmp_file) < Config::get(Config::MAX_FAVICON_FILE_SIZE)) {

				$new_filename = Config::get(Config::ICONS_DIR) . "/$feed_id.ico";

				if (file_exists($new_filename)) unlink($new_filename);
					if (rename($tmp_file, $new_filename)) {
						chmod($new_filename, 0644);

						$feed->set([
							'favicon_avg_color' => null,
							'favicon_is_custom' => true,
						]);

						if ($feed->save()) {
							$rc = self::E_ICON_UPLOAD_SUCCESS;
						}

					} else {
						$rc = self::E_ICON_RENAME_FAILED;
					}
			} else {
				$rc = self::E_ICON_FILE_TOO_LARGE;
			}
		}

		if (file_exists($tmp_file))
			unlink($tmp_file);

		print json_encode(['rc' => $rc, 'icon_url' => Feeds::_get_icon($feed_id)]);
	}

	function editfeed() {
		global $purge_intervals;
		global $update_intervals;

		$feed_id = (int)clean($_REQUEST["id"]);

		$row = ORM::for_table('ttrss_feeds')
			->where("owner_uid", $_SESSION["uid"])
			->find_one($feed_id)->as_array();

		if ($row) {

			ob_start();
			PluginHost::getInstance()->run_hooks(PluginHost::HOOK_PREFS_EDIT_FEED, $feed_id);
			$plugin_data = trim((string)ob_get_contents());
			ob_end_clean();

			$row["icon"] = Feeds::_get_icon($feed_id);

			$local_update_intervals = $update_intervals;
			$local_update_intervals[0] .= sprintf(" (%s)", $update_intervals[get_pref(Prefs::DEFAULT_UPDATE_INTERVAL)]);

			if (Config::get(Config::FORCE_ARTICLE_PURGE) == 0) {
				$local_purge_intervals = $purge_intervals;
				$default_purge_interval = get_pref(Prefs::PURGE_OLD_DAYS);

				if ($default_purge_interval > 0)
				$local_purge_intervals[0] .= " " . T_nsprintf('(%d day)', '(%d days)', $default_purge_interval, $default_purge_interval);
			else
				$local_purge_intervals[0] .= " " . sprintf("(%s)", __("Disabled"));

			} else {
				$purge_interval = Config::get(Config::FORCE_ARTICLE_PURGE);
				$local_purge_intervals = [ T_nsprintf('%d day', '%d days', $purge_interval, $purge_interval) ];
			}

			print json_encode([
				"feed" => $row,
				"cats" => [
					"enabled" => get_pref(Prefs::ENABLE_FEED_CATS),
					"select" => \Controls\select_feeds_cats("cat_id", $row["cat_id"]),
				],
				"plugin_data" => $plugin_data,
				"force_purge" => (int)Config::get(Config::FORCE_ARTICLE_PURGE),
				"intervals" => [
					"update" => $local_update_intervals,
					"purge" => $local_purge_intervals,
				],
				"lang" => [
					"enabled" => Config::get(Config::DB_TYPE) == "pgsql",
					"default" => get_pref(Prefs::DEFAULT_SEARCH_LANGUAGE),
					"all" => $this::get_ts_languages(),
					]
				]);
		}
	}

	private function _batch_toggle_checkbox($name) {
		return \Controls\checkbox_tag("", false, "",
					["data-control-for" => $name, "title" => __("Check to enable field"), "onchange" => "App.dialogOf(this).toggleField(this)"]);
	}

	function editfeeds() {
		global $purge_intervals;
		global $update_intervals;

		$feed_ids = clean($_REQUEST["ids"]);

		$local_update_intervals = $update_intervals;
		$local_update_intervals[0] .= sprintf(" (%s)", $update_intervals[get_pref(Prefs::DEFAULT_UPDATE_INTERVAL)]);

		$local_purge_intervals = $purge_intervals;
		$default_purge_interval = get_pref(Prefs::PURGE_OLD_DAYS);

		if ($default_purge_interval > 0)
			$local_purge_intervals[0] .= " " . T_sprintf("(%d days)", $default_purge_interval);
		else
			$local_purge_intervals[0] .= " " . sprintf("(%s)", __("Disabled"));

		$options = [
			"include_in_digest" => __('Include in e-mail digest'),
			"always_display_enclosures" => __('Always display image attachments'),
			"hide_images" => __('Do not embed media'),
			"cache_images" => __('Cache media'),
			"mark_unread_on_update" => __('Mark updated articles as unread')
		];

		print_notice("Enable the options you wish to apply using checkboxes on the right.");
		?>

		<?= \Controls\hidden_tag("ids", $feed_ids) ?>
		<?= \Controls\hidden_tag("op", "pref-feeds") ?>
		<?= \Controls\hidden_tag("method", "batchEditSave") ?>

		<div dojoType="dijit.layout.TabContainer" style="height : 450px">
			<div dojoType="dijit.layout.ContentPane" title="<?= __('General') ?>">
				<section>
				<?php if (get_pref(Prefs::ENABLE_FEED_CATS)) { ?>
					<fieldset>
						<label><?= __('Place in category:') ?></label>
						<?= \Controls\select_feeds_cats("cat_id", null, ['disabled' => '1']) ?>
						<?= $this->_batch_toggle_checkbox("cat_id") ?>
					</fieldset>
				<?php } ?>

				<?php	if (Config::get(Config::DB_TYPE) == "pgsql") { ?>
					<fieldset>
						<label><?= __('Language:') ?></label>
						<?= \Controls\select_tag("feed_language", "", $this::get_ts_languages(), ["disabled"=> 1]) ?>
						<?= $this->_batch_toggle_checkbox("feed_language") ?>
					</fieldset>
				<?php } ?>
				</section>

				<hr/>

				<section>
					<fieldset>
						<label><?= __("Update interval:") ?></label>
						<?= \Controls\select_hash("update_interval", "", $local_update_intervals, ["disabled" => 1]) ?>
						<?= $this->_batch_toggle_checkbox("update_interval") ?>
					</fieldset>

					<?php if (Config::get(Config::FORCE_ARTICLE_PURGE) == 0) { ?>
						<fieldset>
							<label><?= __('Article purging:') ?></label>
							<?= \Controls\select_hash("purge_interval", "", $local_purge_intervals, ["disabled" => 1]) ?>
							<?= $this->_batch_toggle_checkbox("purge_interval") ?>
						</fieldset>
					<?php } ?>
				</section>
			</div>
			<div dojoType="dijit.layout.ContentPane" title="<?= __('Authentication') ?>">
				<section>
					<fieldset>
						<label><?= __("Login:") ?></label>
						<input dojoType='dijit.form.TextBox'
							disabled='1' autocomplete='new-password' name='auth_login' value=''>
						<?= $this->_batch_toggle_checkbox("auth_login") ?>
					</fieldset>
					<fieldset>
						<label><?= __("Password:") ?></label>
						<input dojoType='dijit.form.TextBox' type='password' name='auth_pass'
							autocomplete='new-password' disabled='1' value=''>
						<?= $this->_batch_toggle_checkbox("auth_pass") ?>
					</fieldset>
				</section>
			</div>
			<div dojoType="dijit.layout.ContentPane" title="<?= __('Options') ?>">
			<?php
				foreach ($options as $name => $caption) {
					?>
						<fieldset class='narrow'>
							<label class="checkbox text-muted">
								<?= \Controls\checkbox_tag($name, false, "", ["disabled" => "1"]) ?>
								<?= $caption ?>
								<?= $this->_batch_toggle_checkbox($name) ?>
							</label>
						</fieldset>
			<?php } ?>
			</div>
		</div>

		<footer>
			<?= \Controls\submit_tag(__("Save")) ?>
			<?= \Controls\cancel_dialog_tag(__("Cancel")) ?>
		</footer>
		<?php
	}

	function batchEditSave() {
		return $this->editsaveops(true);
	}

	function editSave() {
		return $this->editsaveops(false);
	}

	private function editsaveops($batch) {

		$feed_title = clean($_POST["title"]);
		$feed_url = clean($_POST["feed_url"]);
		$site_url = clean($_POST["site_url"]);
		$upd_intl = (int) clean($_POST["update_interval"] ?? 0);
		$purge_intl = (int) clean($_POST["purge_interval"] ?? 0);
		$feed_id = (int) clean($_POST["id"] ?? 0); /* editSave */
		$feed_ids = explode(",", clean($_POST["ids"] ?? "")); /* batchEditSave */
		$cat_id = (int) clean($_POST["cat_id"] ?? 0);
		$auth_login = clean($_POST["auth_login"]);
		$auth_pass = clean($_POST["auth_pass"]);
		$private = checkbox_to_sql_bool(clean($_POST["private"] ?? ""));
		$include_in_digest = checkbox_to_sql_bool(
			clean($_POST["include_in_digest"] ?? ""));
		$cache_images = checkbox_to_sql_bool(
			clean($_POST["cache_images"] ?? ""));
		$hide_images = checkbox_to_sql_bool(
			clean($_POST["hide_images"] ?? ""));
		$always_display_enclosures = checkbox_to_sql_bool(
			clean($_POST["always_display_enclosures"] ?? ""));

		$mark_unread_on_update = checkbox_to_sql_bool(
			clean($_POST["mark_unread_on_update"] ?? ""));

		$feed_language = clean($_POST["feed_language"] ?? "");

		if (!$batch) {

			/* $sth = $this->pdo->prepare("SELECT feed_url FROM ttrss_feeds WHERE id = ?");
			$sth->execute([$feed_id]);
			$row = $sth->fetch();$orig_feed_url = $row["feed_url"];

			$reset_basic_info = $orig_feed_url != $feed_url; */

			$feed = ORM::for_table('ttrss_feeds')
				->where('owner_uid', $_SESSION['uid'])
				->find_one($feed_id);

			if ($feed) {

				$feed->title = 							$feed_title;
				$feed->cat_id = 							$cat_id ? $cat_id : null;
				$feed->feed_url = 						$feed_url;
				$feed->site_url = 						$site_url;
				$feed->update_interval =				$upd_intl;
				$feed->purge_interval =					$purge_intl;
				$feed->auth_login = 						$auth_login;
				$feed->auth_pass = 						$auth_pass;
				$feed->private = 							(int)$private;
				$feed->cache_images = 					(int)$cache_images;
				$feed->hide_images = 					(int)$hide_images;
				$feed->feed_language = 					$feed_language;
				$feed->include_in_digest = 			(int)$include_in_digest;
				$feed->always_display_enclosures =	(int)$always_display_enclosures;
				$feed->mark_unread_on_update = 		(int)$mark_unread_on_update;

				$feed->save();

				PluginHost::getInstance()->run_hooks(PluginHost::HOOK_PREFS_SAVE_FEED, $feed_id);
			}

		} else {
			$feed_data = array();

			foreach (array_keys($_POST) as $k) {
				if ($k != "op" && $k != "method" && $k != "ids") {
					$feed_data[$k] = clean($_POST[$k]);
				}
			}

			$this->pdo->beginTransaction();

			$feed_ids_qmarks = arr_qmarks($feed_ids);

			foreach (array_keys($feed_data) as $k) {

				$qpart = "";

				switch ($k) {
					case "title":
						$qpart = "title = " . $this->pdo->quote($feed_title);
						break;

					case "feed_url":
						$qpart = "feed_url = " . $this->pdo->quote($feed_url);
						break;

					case "update_interval":
						$qpart = "update_interval = " . $this->pdo->quote($upd_intl);
						break;

					case "purge_interval":
						$qpart = "purge_interval =" . $this->pdo->quote($purge_intl);
						break;

					case "auth_login":
						$qpart = "auth_login = " . $this->pdo->quote($auth_login);
						break;

					case "auth_pass":
						$qpart = "auth_pass =" . $this->pdo->quote($auth_pass). ", auth_pass_encrypted = false";
						break;

					case "private":
						$qpart = "private = " . $this->pdo->quote($private);
						break;

					case "include_in_digest":
						$qpart = "include_in_digest = " . $this->pdo->quote($include_in_digest);
						break;

					case "always_display_enclosures":
						$qpart = "always_display_enclosures = " . $this->pdo->quote($always_display_enclosures);
						break;

					case "mark_unread_on_update":
						$qpart = "mark_unread_on_update = " . $this->pdo->quote($mark_unread_on_update);
						break;

					case "cache_images":
						$qpart = "cache_images = " . $this->pdo->quote($cache_images);
						break;

					case "hide_images":
						$qpart = "hide_images = " . $this->pdo->quote($hide_images);
						break;

					case "cat_id":
						if (get_pref(Prefs::ENABLE_FEED_CATS)) {
							if ($cat_id) {
								$qpart = "cat_id = " . $this->pdo->quote($cat_id);
							} else {
								$qpart = 'cat_id = NULL';
							}
						} else {
							$qpart = "";
						}

						break;

					case "feed_language":
						$qpart = "feed_language = " . $this->pdo->quote($feed_language);
						break;

				}

				if ($qpart) {
					$sth = $this->pdo->prepare("UPDATE ttrss_feeds SET $qpart WHERE id IN ($feed_ids_qmarks)
						AND owner_uid = ?");
					$sth->execute(array_merge($feed_ids, [$_SESSION['uid']]));
				}
			}

			$this->pdo->commit();
		}
		return;
	}

	function remove() {

		$ids = explode(",", clean($_REQUEST["ids"]));

		foreach ($ids as $id) {
			self::remove_feed($id, $_SESSION["uid"]);
		}

		return;
	}

	function removeCat() {
		$ids = explode(",", clean($_REQUEST["ids"]));
		foreach ($ids as $id) {
			Feeds::_remove_cat((int)$id, $_SESSION["uid"]);
		}
	}

	function addCat() {
		$feed_cat = clean($_REQUEST["cat"]);

		Feeds::_add_cat($feed_cat, $_SESSION['uid']);
	}

	function importOpml() {
		$opml = new OPML($_REQUEST);
		$opml->opml_import($_SESSION["uid"]);
	}

	private function index_feeds() {
		$error_button = "<button dojoType='dijit.form.Button'
				id='pref_feeds_errors_btn' style='display : none'
				onclick='CommonDialogs.showFeedsWithErrors()'>".
			__("Feeds with errors")."</button>";

		$inactive_button = "<button dojoType='dijit.form.Button'
				id='pref_feeds_inactive_btn'
				style='display : none'
				onclick=\"dijit.byId('feedTree').showInactiveFeeds()\">" .
				__("Inactive feeds") . "</button>";

		$feed_search = clean($_REQUEST["search"] ?? "");

		if (array_key_exists("search", $_REQUEST)) {
			$_SESSION["prefs_feed_search"] = $feed_search;
		} else {
			$feed_search = $_SESSION["prefs_feed_search"] ?? "";
		}

		?>

		<div dojoType="dijit.layout.BorderContainer" gutters="false">
			<div region='top' dojoType="fox.Toolbar">
				<div style='float : right'>
					<input dojoType="dijit.form.TextBox" id="feed_search" size="20" type="search"
						value="<?= htmlspecialchars($feed_search) ?>">
					<button dojoType="dijit.form.Button" onclick="dijit.byId('feedTree').reload()">
						<?= __('Search') ?></button>
				</div>

				<div dojoType="fox.form.DropDownButton">
					<span><?= __('Select') ?></span>
					<div dojoType="dijit.Menu" style="display: none;">
						<div onclick="dijit.byId('feedTree').model.setAllChecked(true)"
							dojoType="dijit.MenuItem"><?= __('All') ?></div>
						<div onclick="dijit.byId('feedTree').model.setAllChecked(false)"
							dojoType="dijit.MenuItem"><?= __('None') ?></div>
					</div>
				</div>

				<div dojoType="fox.form.DropDownButton">
					<span><?= __('Feeds') ?></span>
					<div dojoType="dijit.Menu" style="display: none">
						<div onclick="CommonDialogs.subscribeToFeed()"
							dojoType="dijit.MenuItem"><?= __('Subscribe to feed') ?></div>
						<div onclick="dijit.byId('feedTree').editSelectedFeed()"
							dojoType="dijit.MenuItem"><?= __('Edit selected feeds') ?></div>
						<div onclick="dijit.byId('feedTree').resetFeedOrder()"
							dojoType="dijit.MenuItem"><?= __('Reset sort order') ?></div>
						<div onclick="dijit.byId('feedTree').batchSubscribe()"
							dojoType="dijit.MenuItem"><?= __('Batch subscribe') ?></div>
						<div dojoType="dijit.MenuItem" onclick="dijit.byId('feedTree').removeSelectedFeeds()">
							<?= __('Unsubscribe') ?></div>
					</div>
				</div>

				<?php if (get_pref(Prefs::ENABLE_FEED_CATS)) { ?>
					<div dojoType="fox.form.DropDownButton">
						<span><?= __('Categories') ?></span>
						<div dojoType="dijit.Menu" style="display: none">
							<div onclick="dijit.byId('feedTree').createCategory()"
								dojoType="dijit.MenuItem"><?= __('Add category') ?></div>
							<div onclick="dijit.byId('feedTree').resetCatOrder()"
								dojoType="dijit.MenuItem"><?= __('Reset sort order') ?></div>
							<div onclick="dijit.byId('feedTree').removeSelectedCategories()"
								dojoType="dijit.MenuItem"><?= __('Remove selected') ?></div>
						</div>
					</div>
				<?php } ?>
				<?= $error_button ?>
				<?= $inactive_button ?>
			</div>
			<div style="padding : 0px" dojoType="dijit.layout.ContentPane" region="center">
				<div dojoType="fox.PrefFeedStore" jsId="feedStore"
					url="backend.php?op=pref-feeds&method=getfeedtree">
				</div>

				<div dojoType="lib.CheckBoxStoreModel" jsId="feedModel" store="feedStore"
					query="{id:'root'}" rootId="root" rootLabel="Feeds" childrenAttrs="items"
					checkboxStrict="false" checkboxAll="false">
				</div>

				<div dojoType="fox.PrefFeedTree" id="feedTree"
					dndController="dijit.tree.dndSource"
					betweenThreshold="5"
					autoExpand="<?= (!empty($feed_search) ? "true" : "false") ?>"
					persist="true"
					model="feedModel"
					openOnClick="false">
					<script type="dojo/method" event="onClick" args="item">
						var id = String(item.id);
						var bare_id = id.substr(id.indexOf(':')+1);

						if (id.match('FEED:')) {
							CommonDialogs.editFeed(bare_id);
						} else if (id.match('CAT:')) {
							dijit.byId('feedTree').editCategory(bare_id, item);
						}
					</script>
					<script type="dojo/method" event="onLoad" args="item">
						dijit.byId('feedTree').checkInactiveFeeds();
						dijit.byId('feedTree').checkErrorFeeds();
					</script>
				</div>
			</div>
		</div>
	<?php

	}

	private function index_opml() {
		?>

		<form id='opml_import_form' method='post' enctype='multipart/form-data'>
			<label class='dijitButton'><?= __("Choose file...") ?>
				<input style='display : none' id='opml_file' name='opml_file' type='file'>
			</label>
			<input type='hidden' name='op' value='pref-feeds'>
			<input type='hidden' name='csrf_token' value="<?= $_SESSION['csrf_token'] ?>">
			<input type='hidden' name='method' value='importOpml'>
			<button dojoType='dijit.form.Button' class='alt-primary' onclick="return Helpers.OPML.import()" type="submit">
			<?= \Controls\icon("file_upload") ?>
				<?= __('Import OPML') ?>
			</button>
		</form>

		<hr/>

		<?php print_notice("Only main settings profile can be migrated using OPML.") ?>

		<form dojoType='dijit.form.Form' id='opmlExportForm' style='display : inline-block'>
			<button dojoType='dijit.form.Button' onclick='Helpers.OPML.export()'>
				<?= \Controls\icon("file_download") ?>
				<?= __('Export OPML') ?>
			</button>

			<label class='checkbox'>
				<?= \Controls\checkbox_tag("include_settings", true, "1") ?>
				<?= __("Include tt-rss settings") ?>
			</label>
		</form>

		<hr/>

		<h2><?= __("Published OPML") ?></h2>

		<?= format_notice("Your OPML can be published and then subscribed by anyone who knows the URL below. This won't include your settings nor authenticated feeds.") ?>

		<button dojoType='dijit.form.Button' class='alt-primary' onclick="return Helpers.OPML.publish()">
			<?= \Controls\icon("share") ?>
			<?= __('Display published OPML URL') ?>
		</button>

		<?php
		PluginHost::getInstance()->run_hooks(PluginHost::HOOK_PREFS_TAB_SECTION, "prefFeedsOPML");
	}

	private function index_shared() {
		?>

		<?= format_notice('Published articles can be subscribed by anyone who knows the following URL:') ?></h3>

		<button dojoType='dijit.form.Button' class='alt-primary'
			onclick="CommonDialogs.generatedFeed(-2, false)">
			<?= \Controls\icon('share') ?>
			<?= __('Display URL') ?>
		</button>

		<button class='alt-danger' dojoType='dijit.form.Button' onclick='return Helpers.Feeds.clearFeedAccessKeys()'>
			<?= \Controls\icon('delete') ?>
			<?= __('Clear all generated URLs') ?>
		</button>

		<?php
		PluginHost::getInstance()->run_hooks(PluginHost::HOOK_PREFS_TAB_SECTION, "prefFeedsPublishedGenerated");
	}

	function index() {
		?>

		<div dojoType='dijit.layout.TabContainer' tabPosition='left-h'>
			<div style='padding : 0px' dojoType='dijit.layout.ContentPane'
				title="<i class='material-icons'>rss_feed</i> <?= __('My feeds') ?>">
				<?php $this->index_feeds() ?>
			</div>

			<div dojoType='dijit.layout.ContentPane'
						title="<i class='material-icons'>import_export</i> <?= __('OPML') ?>">
						<?php $this->index_opml() ?>
					</div>

			<div dojoType="dijit.layout.ContentPane"
				title="<i class='material-icons'>share</i> <?= __('Sharing') ?>">
				<?php $this->index_shared() ?>
			</div>

			<?php
				ob_start();
				PluginHost::getInstance()->run_hooks(PluginHost::HOOK_PREFS_TAB, "prefFeeds");
				$plugin_data = trim((string)ob_get_contents());
				ob_end_clean();
			?>

			<?php if ($plugin_data) { ?>
				<div dojoType='dijit.layout.ContentPane'
					title="<i class='material-icons'>extension</i> <?= __('Plugins') ?>">

					<div dojoType='dijit.layout.AccordionContainer' region='center'>
						<?= $plugin_data ?>
					</div>
				</div>
			<?php } ?>
		</div>
		<?php
	}

	private function feedlist_init_cat($cat_id) {
		$obj = array();
		$cat_id = (int) $cat_id;

		$obj['id'] = 'CAT:' . $cat_id;
		$obj['items'] = array();
		$obj['name'] = Feeds::_get_cat_title($cat_id);
		$obj['type'] = 'category';
		$obj['unread'] = -1; //(int) Feeds::_get_cat_unread($cat_id);
		$obj['bare_id'] = $cat_id;

		return $obj;
	}

	private function feedlist_init_feed($feed_id, $title = false, $unread = false, $error = '', $updated = '') {
		$obj = array();
		$feed_id = (int) $feed_id;

		if (!$title)
			$title = Feeds::_get_title($feed_id, false);

		if ($unread === false)
			$unread = getFeedUnread($feed_id, false);

		$obj['id'] = 'FEED:' . $feed_id;
		$obj['name'] = $title;
		$obj['unread'] = (int) $unread;
		$obj['type'] = 'feed';
		$obj['error'] = $error;
		$obj['updated'] = $updated;
		$obj['icon'] = Feeds::_get_icon($feed_id);
		$obj['bare_id'] = $feed_id;
		$obj['auxcounter'] = 0;

		return $obj;
	}

	function inactiveFeeds() {

		if (Config::get(Config::DB_TYPE) == "pgsql") {
			$interval_qpart = "NOW() - INTERVAL '3 months'";
		} else {
			$interval_qpart = "DATE_SUB(NOW(), INTERVAL 3 MONTH)";
		}

		$sth = $this->pdo->prepare("SELECT ttrss_feeds.title, ttrss_feeds.site_url,
		  		ttrss_feeds.feed_url, ttrss_feeds.id, MAX(updated) AS last_article
			FROM ttrss_feeds, ttrss_entries, ttrss_user_entries WHERE
				(SELECT MAX(updated) FROM ttrss_entries, ttrss_user_entries WHERE
					ttrss_entries.id = ref_id AND
						ttrss_user_entries.feed_id = ttrss_feeds.id) < $interval_qpart
			AND ttrss_feeds.owner_uid = ? AND
				ttrss_user_entries.feed_id = ttrss_feeds.id AND
				ttrss_entries.id = ref_id
			GROUP BY ttrss_feeds.title, ttrss_feeds.id, ttrss_feeds.site_url, ttrss_feeds.feed_url
			ORDER BY last_article");
		$sth->execute([$_SESSION['uid']]);

		$rv = [];

		while ($row = $sth->fetch(PDO::FETCH_ASSOC)) {
			$row['last_article'] = TimeHelper::make_local_datetime($row['last_article'], false);
			array_push($rv, $row);
		}

		print json_encode($rv);
	}

	function feedsWithErrors() {
		$sth = $this->pdo->prepare("SELECT id,title,feed_url,last_error,site_url
			FROM ttrss_feeds WHERE last_error != '' AND owner_uid = ?");
		$sth->execute([$_SESSION['uid']]);

		$rv = [];

		while ($row = $sth->fetch()) {
			array_push($rv, $row);
		}

		print json_encode($rv);
	}

	static function remove_feed($id, $owner_uid) {

		if (PluginHost::getInstance()->run_hooks_until(PluginHost::HOOK_UNSUBSCRIBE_FEED, true, $id, $owner_uid))
			return;

		$pdo = Db::pdo();

		if ($id > 0) {
			$pdo->beginTransaction();

			/* save starred articles in Archived feed */

			$sth = $pdo->prepare("UPDATE ttrss_user_entries SET
					feed_id = NULL, orig_feed_id = NULL
				WHERE feed_id = ? AND marked = true AND owner_uid = ?");

			$sth->execute([$id, $owner_uid]);

			/* Remove access key for the feed */

			$sth = $pdo->prepare("DELETE FROM ttrss_access_keys WHERE
				feed_id = ? AND owner_uid = ?");
			$sth->execute([$id, $owner_uid]);

			/* remove the feed */

			$sth = $pdo->prepare("DELETE FROM ttrss_feeds
				WHERE id = ? AND owner_uid = ?");
			$sth->execute([$id, $owner_uid]);

			$pdo->commit();

			if (file_exists(Config::get(Config::ICONS_DIR) . "/$id.ico")) {
				unlink(Config::get(Config::ICONS_DIR) . "/$id.ico");
			}

		} else {
			Labels::remove(Labels::feed_to_label_id($id), $owner_uid);
		}
	}

	function batchSubscribe() {
		print json_encode([
			"enable_cats" => (int)get_pref(Prefs::ENABLE_FEED_CATS),
			"cat_select" => \Controls\select_feeds_cats("cat")
		]);
	}

	function batchAddFeeds() {
		$cat_id = clean($_REQUEST['cat']);
		$feeds = explode("\n", clean($_REQUEST['feeds']));
		$login = clean($_REQUEST['login']);
		$pass = clean($_REQUEST['pass']);

		$csth = $this->pdo->prepare("SELECT id FROM ttrss_feeds
						WHERE feed_url = ? AND owner_uid = ?");

		$isth = $this->pdo->prepare("INSERT INTO ttrss_feeds
							(owner_uid,feed_url,title,cat_id,auth_login,auth_pass,update_method,auth_pass_encrypted)
						VALUES (?, ?, '[Unknown]', ?, ?, ?, 0, false)");

		foreach ($feeds as $feed) {
			$feed = trim($feed);

			if (UrlHelper::validate($feed)) {

				$this->pdo->beginTransaction();

				$csth->execute([$feed, $_SESSION['uid']]);

				if (!$csth->fetch()) {
					$isth->execute([$_SESSION['uid'], $feed, $cat_id ? $cat_id : null, $login, $pass]);
				}

				$this->pdo->commit();
			}
		}
	}

	function clearKeys() {
		return Feeds::_clear_access_keys($_SESSION['uid']);
	}

	function getOPMLKey() {
		print json_encode(["link" => OPML::get_publish_url()]);
	}

	function regenOPMLKey() {
		Feeds::_update_access_key('OPML:Publish',
			false, $_SESSION["uid"]);

		print json_encode(["link" => OPML::get_publish_url()]);
	}

	function regenFeedKey() {
		$feed_id = clean($_REQUEST['id']);
		$is_cat = clean($_REQUEST['is_cat']);

		$new_key = Feeds::_update_access_key($feed_id, $is_cat, $_SESSION["uid"]);

		print json_encode(["link" => $new_key]);
	}

	function getSharedURL() {
		$feed_id = clean($_REQUEST['id']);
		$is_cat = clean($_REQUEST['is_cat']) == "true";
		$search = clean($_REQUEST['search']);

		$link = Config::get_self_url() . "/public.php?" . http_build_query([
			'op' => 'rss',
			'id' => $feed_id,
			'is_cat' => (int)$is_cat,
			'q' => $search,
			'key' => Feeds::_get_access_key($feed_id, $is_cat, $_SESSION["uid"])
		]);

		print json_encode([
			"title" => Feeds::_get_title($feed_id, $is_cat),
			"link" => $link
		]);
	}

	private function calculate_children_count($cat) {
		$c = 0;

		foreach ($cat['items'] ?? [] as $child) {
			if ($child['type'] ?? '' == 'category') {
				$c += $this->calculate_children_count($child);
			} else {
				$c += 1;
			}
		}

		return $c;
	}

}

<?php
class API extends Handler {

	const API_LEVEL  = 16;

	const STATUS_OK  = 0;
	const STATUS_ERR = 1;

	const E_API_DISABLED = "API_DISABLED";
	const E_NOT_LOGGED_IN = "NOT_LOGGED_IN";
	const E_LOGIN_ERROR = "LOGIN_ERROR";
	const E_INCORRECT_USAGE = "INCORRECT_USAGE";
	const E_UNKNOWN_METHOD = "UNKNOWN_METHOD";
	const E_OPERATION_FAILED = "E_OPERATION_FAILED";

	private $seq;

	private static function _param_to_bool($p) {
		return $p && ($p !== "f" && $p !== "false");
	}

	private function _wrap($status, $reply) {
		print json_encode([
					"seq" => $this->seq,
					"status" => $status,
					"content" => $reply
				]);
	}

	function before($method) {
		if (parent::before($method)) {
			header("Content-Type: text/json");

			if (empty($_SESSION["uid"]) && $method != "login" && $method != "isloggedin") {
				$this->_wrap(self::STATUS_ERR, array("error" => self::E_NOT_LOGGED_IN));
				return false;
			}

			if (!empty($_SESSION["uid"]) && $method != "logout" && !get_pref(Prefs::ENABLE_API_ACCESS)) {
				$this->_wrap(self::STATUS_ERR, array("error" => self::E_API_DISABLED));
				return false;
			}

			$this->seq = (int) clean($_REQUEST['seq'] ?? 0);

			return true;
		}
		return false;
	}

	function getVersion() {
		$rv = array("version" => Config::get_version());
		$this->_wrap(self::STATUS_OK, $rv);
	}

	function getApiLevel() {
		$rv = array("level" => self::API_LEVEL);
		$this->_wrap(self::STATUS_OK, $rv);
	}

	function login() {

		if (session_status() == PHP_SESSION_ACTIVE) {
			session_destroy();
		}

		session_start();

		$login = clean($_REQUEST["user"]);
		$password = clean($_REQUEST["password"]);

		if (Config::get(Config::SINGLE_USER_MODE)) $login = "admin";

		if ($uid = UserHelper::find_user_by_login($login)) {
			if (get_pref(Prefs::ENABLE_API_ACCESS, $uid)) {
				if (UserHelper::authenticate($login, $password, false,  Auth_Base::AUTH_SERVICE_API)) {
					$this->_wrap(self::STATUS_OK, array("session_id" => session_id(),
						"api_level" => self::API_LEVEL));
				} else {
					$this->_wrap(self::STATUS_ERR, array("error" => self::E_LOGIN_ERROR));
				}
			} else {
				$this->_wrap(self::STATUS_ERR, array("error" => self::E_API_DISABLED));
			}
		} else {
			$this->_wrap(self::STATUS_ERR, array("error" => self::E_LOGIN_ERROR));
			return;
		}
	}

	function logout() {
		UserHelper::logout();
		$this->_wrap(self::STATUS_OK, array("status" => "OK"));
	}

	function isLoggedIn() {
		$this->_wrap(self::STATUS_OK, array("status" => $_SESSION["uid"] != ''));
	}

	function getUnread() {
		$feed_id = clean($_REQUEST["feed_id"] ?? "");
		$is_cat = clean($_REQUEST["is_cat"] ?? "");

		if ($feed_id) {
			$this->_wrap(self::STATUS_OK, array("unread" => getFeedUnread($feed_id, $is_cat)));
		} else {
			$this->_wrap(self::STATUS_OK, array("unread" => Feeds::_get_global_unread()));
		}
	}

	/* Method added for ttrss-reader for Android */
	function getCounters() {
		$this->_wrap(self::STATUS_OK, Counters::get_all());
	}

	function getFeeds() {
		$cat_id = clean($_REQUEST["cat_id"]);
		$unread_only = self::_param_to_bool(clean($_REQUEST["unread_only"] ?? 0));
		$limit = (int) clean($_REQUEST["limit"] ?? 0);
		$offset = (int) clean($_REQUEST["offset"] ?? 0);
		$include_nested = self::_param_to_bool(clean($_REQUEST["include_nested"] ?? false));

		$feeds = $this->_api_get_feeds($cat_id, $unread_only, $limit, $offset, $include_nested);

		$this->_wrap(self::STATUS_OK, $feeds);
	}

	function getCategories() {
		$unread_only = self::_param_to_bool(clean($_REQUEST["unread_only"] ?? false));
		$enable_nested = self::_param_to_bool(clean($_REQUEST["enable_nested"] ?? false));
		$include_empty = self::_param_to_bool(clean($_REQUEST['include_empty'] ?? false));

		// TODO do not return empty categories, return Uncategorized and standard virtual cats

		if ($enable_nested)
			$nested_qpart = "parent_cat IS NULL";
		else
			$nested_qpart = "true";

		$sth = $this->pdo->prepare("SELECT
				id, title, order_id, (SELECT COUNT(id) FROM
				ttrss_feeds WHERE
				ttrss_feed_categories.id IS NOT NULL AND cat_id = ttrss_feed_categories.id) AS num_feeds,
			(SELECT COUNT(id) FROM
				ttrss_feed_categories AS c2 WHERE
				c2.parent_cat = ttrss_feed_categories.id) AS num_cats
			FROM ttrss_feed_categories
			WHERE $nested_qpart AND owner_uid = ?");
		$sth->execute([$_SESSION['uid']]);

		$cats = array();

		while ($line = $sth->fetch()) {
			if ($include_empty || $line["num_feeds"] > 0 || $line["num_cats"] > 0) {
				$unread = getFeedUnread($line["id"], true);

				if ($enable_nested)
					$unread += Feeds::_get_cat_children_unread($line["id"]);

				if ($unread || !$unread_only) {
					array_push($cats, array("id" => (int) $line["id"],
						"title" => $line["title"],
						"unread" => (int) $unread,
						"order_id" => (int) $line["order_id"],
					));
				}
			}
		}

		foreach (array(-2,-1,0) as $cat_id) {
			if ($include_empty || !$this->_is_cat_empty($cat_id)) {
				$unread = getFeedUnread($cat_id, true);

				if ($unread || !$unread_only) {
					array_push($cats, array("id" => $cat_id,
						"title" => Feeds::_get_cat_title($cat_id),
						"unread" => (int) $unread));
				}
			}
		}

		$this->_wrap(self::STATUS_OK, $cats);
	}

	function getHeadlines() {
		$feed_id = clean($_REQUEST["feed_id"]);
		if ($feed_id !== "") {

			if (is_numeric($feed_id)) $feed_id = (int) $feed_id;

			$limit = (int)clean($_REQUEST["limit"] ?? 0 );

			if (!$limit || $limit >= 200) $limit = 200;

			$offset = (int)clean($_REQUEST["skip"] ?? 0);
			$filter = clean($_REQUEST["filter"] ?? "");
			$is_cat = self::_param_to_bool(clean($_REQUEST["is_cat"] ?? false));
			$show_excerpt = self::_param_to_bool(clean($_REQUEST["show_excerpt"] ?? false));
			$show_content = self::_param_to_bool(clean($_REQUEST["show_content"] ?? false));
			/* all_articles, unread, adaptive, marked, updated */
			$view_mode = clean($_REQUEST["view_mode"] ?? null);
			$include_attachments = self::_param_to_bool(clean($_REQUEST["include_attachments"] ?? false));
			$since_id = (int)clean($_REQUEST["since_id"] ?? 0);
			$include_nested = self::_param_to_bool(clean($_REQUEST["include_nested"] ?? false));
			$sanitize_content = !isset($_REQUEST["sanitize"]) ||
				self::_param_to_bool($_REQUEST["sanitize"]);
			$force_update = self::_param_to_bool(clean($_REQUEST["force_update"] ?? false));
			$has_sandbox = self::_param_to_bool(clean($_REQUEST["has_sandbox"] ?? false));
			$excerpt_length = (int)clean($_REQUEST["excerpt_length"] ?? 0);
			$check_first_id = (int)clean($_REQUEST["check_first_id"] ?? 0);
			$include_header = self::_param_to_bool(clean($_REQUEST["include_header"] ?? false));

			$_SESSION['hasSandbox'] = $has_sandbox;

			list($override_order, $skip_first_id_check) = Feeds::_order_to_override_query(clean($_REQUEST["order_by"] ?? null));

			/* do not rely on params below */

			$search = clean($_REQUEST["search"] ?? "");

			list($headlines, $headlines_header) = $this->_api_get_headlines($feed_id, $limit, $offset,
				$filter, $is_cat, $show_excerpt, $show_content, $view_mode, $override_order,
				$include_attachments, $since_id, $search,
				$include_nested, $sanitize_content, $force_update, $excerpt_length, $check_first_id, $skip_first_id_check);

			if ($include_header) {
				$this->_wrap(self::STATUS_OK, array($headlines_header, $headlines));
			} else {
				$this->_wrap(self::STATUS_OK, $headlines);
			}
		} else {
			$this->_wrap(self::STATUS_ERR, array("error" => self::E_INCORRECT_USAGE));
		}
	}

	function updateArticle() {
		$article_ids = explode(",", clean($_REQUEST["article_ids"]));
		$mode = (int) clean($_REQUEST["mode"]);
		$data = clean($_REQUEST["data"] ?? "");
		$field_raw = (int)clean($_REQUEST["field"]);

		$field = "";
		$set_to = "";
		$additional_fields = "";

		switch ($field_raw) {
			case 0:
				$field = "marked";
				$additional_fields = ",last_marked = NOW()";
				break;
			case 1:
				$field = "published";
				$additional_fields = ",last_published = NOW()";
				break;
			case 2:
				$field = "unread";
				$additional_fields = ",last_read = NOW()";
				break;
			case 3:
				$field = "note";
				break;
			case 4:
				$field = "score";
				break;
		};

		switch ($mode) {
			case 1:
				$set_to = "true";
				break;
			case 0:
				$set_to = "false";
				break;
			case 2:
				$set_to = "NOT $field";
				break;
		}

		if ($field == "note") $set_to = $this->pdo->quote($data);
		if ($field == "score") $set_to = (int) $data;

		if ($field && $set_to && count($article_ids) > 0) {

			$article_qmarks = arr_qmarks($article_ids);

			$sth = $this->pdo->prepare("UPDATE ttrss_user_entries SET
				$field = $set_to $additional_fields
				WHERE ref_id IN ($article_qmarks) AND owner_uid = ?");
			$sth->execute(array_merge($article_ids, [$_SESSION['uid']]));

			$num_updated = $sth->rowCount();

			$this->_wrap(self::STATUS_OK, array("status" => "OK",
				"updated" => $num_updated));

		} else {
			$this->_wrap(self::STATUS_ERR, array("error" => self::E_INCORRECT_USAGE));
		}

	}

	function getArticle() {

		$article_ids = explode(",", clean($_REQUEST["article_id"]));
		$sanitize_content = !isset($_REQUEST["sanitize"]) ||
			self::_param_to_bool($_REQUEST["sanitize"]);

		if (count($article_ids) > 0) {

			$article_qmarks = arr_qmarks($article_ids);

			$sth = $this->pdo->prepare("SELECT id,guid,title,link,content,feed_id,comments,int_id,
				marked,unread,published,score,note,lang,
				".SUBSTRING_FOR_DATE."(updated,1,16) as updated,
				author,(SELECT title FROM ttrss_feeds WHERE id = feed_id) AS feed_title,
				(SELECT site_url FROM ttrss_feeds WHERE id = feed_id) AS site_url,
				(SELECT hide_images FROM ttrss_feeds WHERE id = feed_id) AS hide_images
				FROM ttrss_entries,ttrss_user_entries
				WHERE id IN ($article_qmarks) AND ref_id = id AND owner_uid = ?");

			$sth->execute(array_merge($article_ids, [$_SESSION['uid']]));

			$articles = array();

			while ($line = $sth->fetch()) {

				$article = array(
					"id" => $line["id"],
					"guid" => $line["guid"],
					"title" => $line["title"],
					"link" => $line["link"],
					"labels" => Article::_get_labels($line['id']),
					"unread" => self::_param_to_bool($line["unread"]),
					"marked" => self::_param_to_bool($line["marked"]),
					"published" => self::_param_to_bool($line["published"]),
					"comments" => $line["comments"],
					"author" => $line["author"],
					"updated" => (int) strtotime($line["updated"]),
					"feed_id" => $line["feed_id"],
					"attachments" => Article::_get_enclosures($line['id']),
					"score" => (int)$line["score"],
					"feed_title" => $line["feed_title"],
					"note" => $line["note"],
					"lang" => $line["lang"]
				);

				if ($sanitize_content) {
					$article["content"] = Sanitizer::sanitize(
						$line["content"],
						self::_param_to_bool($line['hide_images']),
						false, $line["site_url"], false, $line["id"]);
				} else {
					$article["content"] = $line["content"];
				}

				$hook_object = ["article" => &$article];

				PluginHost::getInstance()->chain_hooks_callback(PluginHost::HOOK_RENDER_ARTICLE_API,
					function ($result) use (&$article) {
						$article = $result;
					},
					$hook_object);

				$article['content'] = DiskCache::rewrite_urls($article['content']);

				array_push($articles, $article);

			}

			$this->_wrap(self::STATUS_OK, $articles);
		// @phpstan-ignore-next-line
		} else {
			$this->_wrap(self::STATUS_ERR, array("error" => self::E_INCORRECT_USAGE));
		}
	}

	function getConfig() {
		$config = [
			"icons_dir" => Config::get(Config::ICONS_DIR),
			"icons_url" => Config::get(Config::ICONS_URL)
		];

		$config["daemon_is_running"] = file_is_locked("update_daemon.lock");

		$sth = $this->pdo->prepare("SELECT COUNT(*) AS cf FROM
			ttrss_feeds WHERE owner_uid = ?");
		$sth->execute([$_SESSION['uid']]);
		$row = $sth->fetch();

		$config["num_feeds"] = $row["cf"];

		$this->_wrap(self::STATUS_OK, $config);
	}

	function updateFeed() {
		$feed_id = (int) clean($_REQUEST["feed_id"]);

		if (!ini_get("open_basedir")) {
			RSSUtils::update_rss_feed($feed_id);
		}

		$this->_wrap(self::STATUS_OK, array("status" => "OK"));
	}

	function catchupFeed() {
		$feed_id = clean($_REQUEST["feed_id"]);
		$is_cat = clean($_REQUEST["is_cat"]);
		@$mode = clean($_REQUEST["mode"]);

		if (!in_array($mode, ["all", "1day", "1week", "2week"]))
			$mode = "all";

		Feeds::_catchup($feed_id, $is_cat, $_SESSION["uid"], $mode);

		$this->_wrap(self::STATUS_OK, array("status" => "OK"));
	}

	function getPref() {
		$pref_name = clean($_REQUEST["pref_name"]);

		$this->_wrap(self::STATUS_OK, array("value" => get_pref($pref_name)));
	}

	function getLabels() {
		$article_id = (int)clean($_REQUEST['article_id']);

		$rv = array();

		$sth = $this->pdo->prepare("SELECT id, caption, fg_color, bg_color
			FROM ttrss_labels2
			WHERE owner_uid = ? ORDER BY caption");
		$sth->execute([$_SESSION['uid']]);

		if ($article_id)
			$article_labels = Article::_get_labels($article_id);
		else
			$article_labels = array();

		while ($line = $sth->fetch()) {

			$checked = false;
			foreach ($article_labels as $al) {
				if (Labels::feed_to_label_id($al[0]) == $line['id']) {
					$checked = true;
					break;
				}
			}

			array_push($rv, array(
				"id" => (int)Labels::label_to_feed_id($line['id']),
				"caption" => $line['caption'],
				"fg_color" => $line['fg_color'],
				"bg_color" => $line['bg_color'],
				"checked" => $checked));
		}

		$this->_wrap(self::STATUS_OK, $rv);
	}

	function setArticleLabel() {

		$article_ids = explode(",", clean($_REQUEST["article_ids"]));
		$label_id = (int) clean($_REQUEST['label_id']);
		$assign = self::_param_to_bool(clean($_REQUEST['assign']));

		$label = Labels::find_caption(Labels::feed_to_label_id($label_id), $_SESSION["uid"]);

		$num_updated = 0;

		if ($label) {

			foreach ($article_ids as $id) {

				if ($assign)
					Labels::add_article($id, $label, $_SESSION["uid"]);
				else
					Labels::remove_article($id, $label, $_SESSION["uid"]);

				++$num_updated;

			}
		}

		$this->_wrap(self::STATUS_OK, array("status" => "OK",
			"updated" => $num_updated));

	}

	function index($method) {
		$plugin = PluginHost::getInstance()->get_api_method(strtolower($method));

		if ($plugin && method_exists($plugin, $method)) {
			$reply = $plugin->$method();

			$this->_wrap($reply[0], $reply[1]);

		} else {
			$this->_wrap(self::STATUS_ERR, array("error" => self::E_UNKNOWN_METHOD, "method" => $method));
		}
	}

	function shareToPublished() {
		$title = strip_tags(clean($_REQUEST["title"]));
		$url = strip_tags(clean($_REQUEST["url"]));
		$content = strip_tags(clean($_REQUEST["content"]));

		if (Article::_create_published_article($title, $url, $content, "", $_SESSION["uid"])) {
			$this->_wrap(self::STATUS_OK, array("status" => 'OK'));
		} else {
			$this->_wrap(self::STATUS_ERR, array("error" => self::E_OPERATION_FAILED));
		}
	}

	private static function _api_get_feeds($cat_id, $unread_only, $limit, $offset, $include_nested = false) {

			$feeds = array();

			$pdo = Db::pdo();

			$limit = (int) $limit;
			$offset = (int) $offset;
			$cat_id = (int) $cat_id;

			/* Labels */

			/* API only: -4 All feeds, including virtual feeds */
			if ($cat_id == -4 || $cat_id == -2) {
				$counters = Counters::get_labels();

				foreach (array_values($counters) as $cv) {

					$unread = $cv["counter"];

					if ($unread || !$unread_only) {

						$row = array(
								"id" => (int) $cv["id"],
								"title" => $cv["description"],
								"unread" => $cv["counter"],
								"cat_id" => -2,
							);

						array_push($feeds, $row);
					}
				}
			}

			/* Virtual feeds */

			if ($cat_id == -4 || $cat_id == -1) {
				foreach (array(-1, -2, -3, -4, -6, 0) as $i) {
					$unread = getFeedUnread($i);

					if ($unread || !$unread_only) {
						$title = Feeds::_get_title($i);

						$row = array(
								"id" => $i,
								"title" => $title,
								"unread" => $unread,
								"cat_id" => -1,
							);
						array_push($feeds, $row);
					}

				}
			}

			/* Child cats */

			if ($include_nested && $cat_id) {
				$sth = $pdo->prepare("SELECT
					id, title, order_id FROM ttrss_feed_categories
					WHERE parent_cat = ? AND owner_uid = ? ORDER BY order_id, title");

				$sth->execute([$cat_id, $_SESSION['uid']]);

				while ($line = $sth->fetch()) {
					$unread = getFeedUnread($line["id"], true) +
						Feeds::_get_cat_children_unread($line["id"]);

					if ($unread || !$unread_only) {
						$row = array(
								"id" => (int) $line["id"],
								"title" => $line["title"],
								"unread" => $unread,
								"is_cat" => true,
                                "order_id" => (int) $line["order_id"]
							);
						array_push($feeds, $row);
					}
				}
			}

			/* Real feeds */

			if ($limit) {
				$limit_qpart = "LIMIT $limit OFFSET $offset";
			} else {
				$limit_qpart = "";
			}

			/* API only: -3 All feeds, excluding virtual feeds (e.g. Labels and such) */
			if ($cat_id == -4 || $cat_id == -3) {
				$sth = $pdo->prepare("SELECT
					id, feed_url, cat_id, title, order_id, ".
						SUBSTRING_FOR_DATE."(last_updated,1,19) AS last_updated
						FROM ttrss_feeds WHERE owner_uid = ?
						ORDER BY order_id, title " . $limit_qpart);
				$sth->execute([$_SESSION['uid']]);

			} else {

				$sth = $pdo->prepare("SELECT
					id, feed_url, cat_id, title, order_id, ".
						SUBSTRING_FOR_DATE."(last_updated,1,19) AS last_updated
						FROM ttrss_feeds WHERE
						(cat_id = :cat OR (:cat = 0 AND cat_id IS NULL))
						AND owner_uid = :uid
						ORDER BY order_id, title " . $limit_qpart);
				$sth->execute([":uid" => $_SESSION['uid'], ":cat" => $cat_id]);
			}

			while ($line = $sth->fetch()) {

				$unread = getFeedUnread($line["id"]);

				$has_icon = Feeds::_has_icon($line['id']);

				if ($unread || !$unread_only) {

					$row = array(
							"feed_url" => $line["feed_url"],
							"title" => $line["title"],
							"id" => (int)$line["id"],
							"unread" => (int)$unread,
							"has_icon" => $has_icon,
							"cat_id" => (int)$line["cat_id"],
							"last_updated" => (int) strtotime($line["last_updated"]),
							"order_id" => (int) $line["order_id"],
						);

					array_push($feeds, $row);
				}
			}

		return $feeds;
	}

	private static function _api_get_headlines($feed_id, $limit, $offset,
				$filter, $is_cat, $show_excerpt, $show_content, $view_mode, $order,
				$include_attachments, $since_id,
				$search = "", $include_nested = false, $sanitize_content = true,
				$force_update = false, $excerpt_length = 100, $check_first_id = false, $skip_first_id_check = false) {

			$pdo = Db::pdo();

			if ($force_update && $feed_id > 0 && is_numeric($feed_id)) {
				// Update the feed if required with some basic flood control

				$sth = $pdo->prepare(
					"SELECT cache_images,".SUBSTRING_FOR_DATE."(last_updated,1,19) AS last_updated
						FROM ttrss_feeds WHERE id = ?");
				$sth->execute([$feed_id]);

				if ($row = $sth->fetch()) {
					$last_updated = strtotime($row["last_updated"]);
					$cache_images = self::_param_to_bool($row["cache_images"]);

					if (!$cache_images && time() - $last_updated > 120) {
						RSSUtils::update_rss_feed($feed_id, true);
					} else {
						$sth = $pdo->prepare("UPDATE ttrss_feeds SET last_updated = '1970-01-01', last_update_started = '1970-01-01'
							WHERE id = ?");
						$sth->execute([$feed_id]);
					}
				}
			}

			$params = array(
				"feed" => $feed_id,
				"limit" => $limit,
				"view_mode" => $view_mode,
				"cat_view" => $is_cat,
				"search" => $search,
				"override_order" => $order,
				"offset" => $offset,
				"since_id" => $since_id,
				"include_children" => $include_nested,
				"check_first_id" => $check_first_id,
				"skip_first_id_check" => $skip_first_id_check
			);

			$qfh_ret = Feeds::_get_headlines($params);

			$result = $qfh_ret[0];
			$feed_title = $qfh_ret[1];
			$first_id = $qfh_ret[6];

			$headlines = array();

			$headlines_header = array(
				'id' => $feed_id,
				'first_id' => $first_id,
				'is_cat' => $is_cat);

			if (!is_numeric($result)) {
				while ($line = $result->fetch()) {
					$line["content_preview"] = truncate_string(strip_tags($line["content"]), $excerpt_length);

					PluginHost::getInstance()->chain_hooks_callback(PluginHost::HOOK_QUERY_HEADLINES,
						function ($result) use (&$line) {
							$line = $result;
						},
						$line, $excerpt_length);

					$is_updated = ($line["last_read"] == "" &&
						($line["unread"] != "t" && $line["unread"] != "1"));

					$tags = explode(",", $line["tag_cache"]);

					$label_cache = $line["label_cache"];
					$labels = false;

					if ($label_cache) {
						$label_cache = json_decode($label_cache, true);

						if ($label_cache) {
							if (($label_cache["no-labels"] ?? 0) == 1)
								$labels = [];
							else
								$labels = $label_cache;
						}
					}

					if (!is_array($labels)) $labels = Article::_get_labels($line["id"]);

					$headline_row = array(
						"id" => (int)$line["id"],
						"guid" => $line["guid"],
						"unread" => self::_param_to_bool($line["unread"]),
						"marked" => self::_param_to_bool($line["marked"]),
						"published" => self::_param_to_bool($line["published"]),
						"updated" => (int)strtotime($line["updated"]),
						"is_updated" => $is_updated,
						"title" => $line["title"],
						"link" => $line["link"],
						"feed_id" => $line["feed_id"] ? $line['feed_id'] : 0,
						"tags" => $tags,
					);

					$enclosures = Article::_get_enclosures($line['id']);

					if ($include_attachments)
						$headline_row['attachments'] = $enclosures;

					if ($show_excerpt)
						$headline_row["excerpt"] = $line["content_preview"];

					if ($show_content) {

						if ($sanitize_content) {
							$headline_row["content"] = Sanitizer::sanitize(
								$line["content"],
								self::_param_to_bool($line['hide_images']),
								false, $line["site_url"], false, $line["id"]);
						} else {
							$headline_row["content"] = $line["content"];
						}
					}

					// unify label output to ease parsing
					if (($labels["no-labels"] ?? 0) == 1) $labels = [];

					$headline_row["labels"] = $labels;

					$headline_row["feed_title"] = isset($line["feed_title"]) ? $line["feed_title"] : $feed_title;

					$headline_row["comments_count"] = (int)$line["num_comments"];
					$headline_row["comments_link"] = $line["comments"];

					$headline_row["always_display_attachments"] = self::_param_to_bool($line["always_display_enclosures"]);

					$headline_row["author"] = $line["author"];

					$headline_row["score"] = (int)$line["score"];
					$headline_row["note"] = $line["note"];
					$headline_row["lang"] = $line["lang"];

					if ($show_content) {
						$hook_object = ["headline" => &$headline_row];

						list ($flavor_image, $flavor_stream, $flavor_kind) = Article::_get_image($enclosures,
																												$line["content"], // unsanitized
																												$line["site_url"] ?? "", // could be null if archived article
																												$headline_row);

						$headline_row["flavor_image"] = $flavor_image;
						$headline_row["flavor_stream"] = $flavor_stream;

						/* optional */
						if ($flavor_kind)
							$headline_row["flavor_kind"] = $flavor_kind;

						PluginHost::getInstance()->chain_hooks_callback(PluginHost::HOOK_RENDER_ARTICLE_API,
							function ($result) use (&$headline_row) {
								$headline_row = $result;
							},
							$hook_object);

						$headline_row["content"] = DiskCache::rewrite_urls($headline_row['content']);
					}

					array_push($headlines, $headline_row);
				}
			} else if (is_numeric($result) && $result == -1) {
				$headlines_header['first_id_changed'] = true;
			}

			return array($headlines, $headlines_header);
	}

	function unsubscribeFeed() {
		$feed_id = (int) clean($_REQUEST["feed_id"]);

		$sth = $this->pdo->prepare("SELECT id FROM ttrss_feeds WHERE
			id = ? AND owner_uid = ?");
		$sth->execute([$feed_id, $_SESSION['uid']]);

		if ($row = $sth->fetch()) {
			Pref_Feeds::remove_feed($feed_id, $_SESSION["uid"]);
			$this->_wrap(self::STATUS_OK, array("status" => "OK"));
		} else {
			$this->_wrap(self::STATUS_ERR, array("error" => self::E_OPERATION_FAILED));
		}
	}

	function subscribeToFeed() {
		$feed_url = clean($_REQUEST["feed_url"]);
		$category_id = (int) clean($_REQUEST["category_id"]);
		$login = clean($_REQUEST["login"]);
		$password = clean($_REQUEST["password"]);

		if ($feed_url) {
			$rc = Feeds::_subscribe($feed_url, $category_id, $login, $password);

			$this->_wrap(self::STATUS_OK, array("status" => $rc));
		} else {
			$this->_wrap(self::STATUS_ERR, array("error" => self::E_INCORRECT_USAGE));
		}
	}

	function getFeedTree() {
		$include_empty = self::_param_to_bool(clean($_REQUEST['include_empty']));

		$pf = new Pref_Feeds($_REQUEST);

		$_REQUEST['mode'] = 2;
		$_REQUEST['force_show_empty'] = $include_empty;

		$this->_wrap(self::STATUS_OK,
			array("categories" => $pf->_makefeedtree()));
	}

	// only works for labels or uncategorized for the time being
	private function _is_cat_empty($id) {

		if ($id == -2) {
			$sth = $this->pdo->prepare("SELECT COUNT(id) AS count FROM ttrss_labels2
				WHERE owner_uid = ?");
			$sth->execute([$_SESSION['uid']]);
			$row = $sth->fetch();

			return $row["count"] == 0;

		} else if ($id == 0) {
			$sth = $this->pdo->prepare("SELECT COUNT(id) AS count FROM ttrss_feeds
				WHERE cat_id IS NULL AND owner_uid = ?");
			$sth->execute([$_SESSION['uid']]);
			$row = $sth->fetch();

			return $row["count"] == 0;

		}

		return false;
	}


}

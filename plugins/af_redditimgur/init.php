<?php
class Af_RedditImgur extends Plugin {

	/** @var PluginHost $host */
	private $host;
	private $domain_blacklist = [ "github.com" ];
	private $dump_json_data = false;
	private $fallback_preview_urls = [];
	private $default_max_score = 100;

	function about() {
		return array(null,
			"Inline images (and other content) in Reddit RSS feeds",
			"fox");
	}

	function flags() {
		return array("needs_curl" => true);
	}

	function init($host) {
		$this->host = $host;

		$host->add_hook($host::HOOK_ARTICLE_FILTER, $this);
		$host->add_hook($host::HOOK_PREFS_TAB, $this);

		$host->add_hook($host::HOOK_RENDER_ARTICLE, $this);
		$host->add_hook($host::HOOK_RENDER_ARTICLE_CDM, $this);
		$host->add_hook($host::HOOK_RENDER_ARTICLE_API, $this);
	}

	function hook_prefs_tab($args) {
		if ($args != "prefFeeds") return;

			$enable_readability = $this->host->get($this, "enable_readability");
			$enable_content_dupcheck = $this->host->get($this, "enable_content_dupcheck");
			$reddit_to_teddit = $this->host->get($this, "reddit_to_teddit");
			$apply_nsfw_tags = $this->host->get_array($this, "apply_nsfw_tags");
			$max_score = $this->host->get($this, "max_score", $this->default_max_score);
			$import_score = $this->host->get($this, "import_score");
		?>

		<div dojoType="dijit.layout.AccordionPane"
			title="<i class='material-icons'>extension</i> <?= __('Reddit content settings (af_redditimgur)') ?>">

			<form dojoType='dijit.form.Form'>

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

				<fieldset class='narrow'>
					<label>
						<?= __("Apply tags to NSFW posts (comma-separated list):") ?>
					</label>
					<input dojoType="dijit.form.TextBox" name="apply_nsfw_tags" size="20"
						value="<?= htmlspecialchars(implode(", ", $apply_nsfw_tags)) ?>">
				</fieldset>

				<fieldset class='narrow'>
					<label class='checkbox'>
						<?= \Controls\checkbox_tag("enable_readability", $enable_readability) ?>
						<?= __("Extract missing content using Readability (requires af_readability)") ?>
					</label>
				</fieldset>

				<fieldset class='narrow'>
					<label class='checkbox'>
						<?= \Controls\checkbox_tag("enable_content_dupcheck", $enable_content_dupcheck) ?>
						<?= __("Enable additional duplicate checking") ?>
					</label>
				</fieldset>

				<fieldset class='narrow'>
					<label class='checkbox'>
						<?= \Controls\checkbox_tag("reddit_to_teddit", $reddit_to_teddit) ?>
						<?= T_sprintf("Rewrite Reddit URLs to %s",
									"<a target=\"_blank\" href=\"https://teddit.net/about\">Teddit</a>") ?>
					</label>
				</fieldset>

				<fieldset class='narrow'>
					<label class='checkbox'>
						<?= \Controls\checkbox_tag("import_score", $import_score) ?>
						<?= __("Import score, limit maximum to:") ?>
						<input dojoType="dijit.form.TextBox" name="max_score" size="20"
							placeholder="<?= $this->default_max_score ?>" value="<?= $max_score ?>">
					</label>
				</fieldset>

				<hr/>
				<?= \Controls\submit_tag(__("Save")) ?>
			</form>
		</div>

		<?php
	}

	function save() {
		$enable_readability = checkbox_to_sql_bool($_POST["enable_readability"] ?? "");
		$enable_content_dupcheck = checkbox_to_sql_bool($_POST["enable_content_dupcheck"] ?? "");
		$reddit_to_teddit = checkbox_to_sql_bool($_POST["reddit_to_teddit"] ?? "");
		$apply_nsfw_tags = FeedItem_Common::normalize_categories(explode(",", $_POST["apply_nsfw_tags"] ?? ""));
		$import_score = checkbox_to_sql_bool($_POST["import_score"] ?? "");
		$max_score = (int) $_POST['max_score'];

		$this->host->set_array($this, [
			"enable_readability" => $enable_readability,
			"reddit_to_teddit" => $reddit_to_teddit,
			"enable_content_dupcheck" => $enable_content_dupcheck,
			"apply_nsfw_tags" => $apply_nsfw_tags,
			"import_score" => $import_score,
			"max_score" => $max_score
			]);

		echo __("Configuration saved");
	}

	private function process_post_media($data, $doc, $xpath, $anchor) {
		$found = 0;

		if (isset($data["media_metadata"])) {
			foreach ($data["media_metadata"] as $media) {
				if (!empty($media["s"]["u"])) {
					$media_url = htmlspecialchars_decode($media["s"]["u"]);

					Debug::log("found media_metadata (gallery): $media_url", Debug::LOG_VERBOSE);

					if ($media_url) {
						$this->handle_as_image($doc, $anchor, $media_url);
						$found = 1;
					}
				}
			}
		}

		// v.redd.it - see below
		/* if (is_array($data["media"])) {
			foreach ($data["media"] as $media) {
				if (isset($media["fallback_url"])) {
					$stream_url = $media["fallback_url"];

					if (isset($data["preview"]["images"][0]["source"]))
						$poster_url = $data["preview"]["images"][0]["source"]["url"];
					else
						$poster_url = "";

					Debug::log("found stream fallback_url: $stream_url / poster $poster_url", Debug::LOG_VERBOSE);

					$this->handle_as_video($doc, $anchor, $stream_url, $poster_url);
				}

				$found = 1;
			}
		} */

		$post_hint = $data["post_hint"] ?? false;

		if (!$found && $post_hint == "hosted:video") {
			$media_url = $data["url"];

			if (isset($data["preview"]["images"][0]["source"]))
				$poster_url = htmlspecialchars_decode($data["preview"]["images"][0]["source"]["url"]);
			else
				$poster_url = "";

			Debug::log("found hosted video url: $media_url / poster $poster_url, looking up fallback url...", Debug::LOG_VERBOSE);

			$fallback_url = $data["media"]["reddit_video"]["fallback_url"];

			if ($fallback_url) {
				Debug::log("found video fallback_url: $fallback_url", Debug::LOG_VERBOSE);
				$this->handle_as_video($doc, $anchor, $fallback_url, $poster_url);

				$found = 1;
			}
		}

		if (!$found && $post_hint == "video") {
			$media_url = $data["url"];

			if (isset($data["preview"]["images"][0]["source"]))
				$poster_url = htmlspecialchars_decode($data["preview"]["images"][0]["source"]["url"]);
			else
				$poster_url = "";

			Debug::log("found video url: $media_url / poster $poster_url", Debug::LOG_VERBOSE);
			$this->handle_as_video($doc, $anchor, $media_url, $poster_url);

			$found = 1;
		}

		if (!$found && $post_hint == "image") {
			$media_url = $data["url"];

			Debug::log("found image url: $media_url", Debug::LOG_VERBOSE);
			$this->handle_as_image($doc, $anchor, $media_url);

			$found = 1;
		}

		if (!$found && isset($data["preview"]["images"])) {
			foreach ($data["preview"]["images"] as $img) {
				if (isset($img["source"]["url"])) {
					$media_url = htmlspecialchars_decode($img["source"]["url"]);
					$target_url = $data["url"];

					if ($media_url) {
						if ($post_hint == "self") {
							Debug::log("found preview image url: $media_url (link: $target_url)", Debug::LOG_VERBOSE);
							$this->handle_as_image($doc, $anchor, $media_url, $target_url);

							$found = 1;
						} else { // gonna use this later if nothing is found using generic link processing
							Debug::log("found fallback preview image url: $media_url (link: $target_url);", Debug::LOG_VERBOSE);
							array_push($this->fallback_preview_urls, $media_url);
						}
					}
				}
			}
		}

		return $found;
	}

	/* function score_convert(int $value, int $from1, int $from2, int $to1, int $to2) {
		return ($value - $from1) / ($from2 - $from1) * ($to2 - $to1) + $to1;
	} */

	private function inline_stuff(&$article, &$doc, $xpath) {

		$max_score = (int) $this->host->get($this, "max_score", $this->default_max_score);
		$import_score = (bool) $this->host->get($this, "import_score", $this->default_max_score);

		$found = false;
		$post_is_nsfw = false;
		$num_comments = 0;
		$score = 0;
		$link_flairs = [];
		$apply_nsfw_tags = FeedItem_Common::normalize_categories($this->host->get_array($this, "apply_nsfw_tags", []));

		// embed anchor element, before reddit <table> post layout
		$anchor = $xpath->query('//body/*')->item(0);

		// deal with json-provided media content first
		if ($article["link"] && $anchor) {
			Debug::log("JSON: requesting from URL: " . $article["link"] . "/.json", Debug::LOG_VERBOSE);

			$tmp = UrlHelper::fetch($article["link"] . "/.json");

			$this->fallback_preview_urls = [];

			// @phpstan-ignore-next-line
			if ($tmp && $anchor) {
				$json = json_decode($tmp, true);

				if ($json) {
					Debug::log("JSON: processing media elements...", Debug::LOG_EXTENDED);

					if ($this->dump_json_data) print_r($json);

					foreach ($json as $listing) {
						foreach ($listing["data"]["children"] as $child) {

							$data = $child["data"];
							$over_18 = $data["over_18"] ?? 0 == 1;

							$score += $data['score'] ?? 0;
							$num_comments += $data["num_comments"] ?? 0;

							if (!empty($data["link_flair_text"])) {
								array_push($link_flairs, $data["link_flair_text"]);
							}

							if ($over_18) {
								Debug::log("JSON: post is NSFW", Debug::LOG_EXTENDED);
								$post_is_nsfw = true;
							}

							if (isset($data["crosspost_parent_list"])) {
								Debug::log("JSON: processing child crosspost_parent_list", Debug::LOG_EXTENDED);

								foreach ($data["crosspost_parent_list"] as $parent) {
									if ($this->process_post_media($parent, $doc, $xpath, $anchor)) {
										$found = 1;

										break 2;
									}
								}
							}

							Debug::log("JSON: processing child data element...", Debug::LOG_EXTENDED);

							if (!$found && $this->process_post_media($data, $doc, $xpath, $anchor)) {
								$found = 1;

								break 2;
							}
						}
					}
				} else {
					Debug::log("JSON: failed to parse received data.", Debug::LOG_EXTENDED);
				}
			} else {
				if (!$tmp) {
					Debug::log("JSON: failed to fetch post:" . UrlHelper::$fetch_last_error, Debug::LOG_EXTENDED);
				}
			}
		} else if (!$anchor) {
			Debug::log("JSON: anchor element not found, unable to embed", Debug::LOG_EXTENDED);
		}

		if ($post_is_nsfw && count($apply_nsfw_tags) > 0) {
			$article["tags"] = array_merge($article["tags"], $apply_nsfw_tags);
		}

		if (count($link_flairs) > 0) {
			$article["tags"] = array_merge($article["tags"], FeedItem_Common::normalize_categories($link_flairs));
		}

		$article["num_comments"] = $num_comments;

		if ($import_score && $score > 0)
			$article["score_modifier"] = ($article["score_modifier"] ?? 0) + ($score > $max_score ? $max_score : $score);

		if ($found) {
			Debug::log("JSON: found media data, skipping further processing of content", Debug::LOG_VERBOSE);
			$this->remove_post_thumbnail($doc, $xpath);
			return true;
		}

		$entries = $xpath->query('//a[@href]');

		foreach ($entries as $entry) {
			$entry_href = $entry->getAttribute("href");

			$matches = [];

			/* skip links going back to reddit (and any other blacklisted stuff) */
			if (!$found && $this->is_blacklisted($entry_href, ["reddit.com"])) {
				Debug::log("BODY: domain of $entry_href is blacklisted, skipping", Debug::LOG_EXTENDED);
				continue;
			}

			Debug::log("BODY: processing URL: " . $entry_href, Debug::LOG_VERBOSE);

			if (!$found && preg_match("/^https?:\/\/twitter.com\/(.*?)\/status\/(.*)/", $entry_href, $matches)) {
				Debug::log("handling as twitter: " . $matches[1] . " " . $matches[2], Debug::LOG_VERBOSE);

				$oembed_result = UrlHelper::fetch("https://publish.twitter.com/oembed?url=" . urlencode($entry_href));

				if ($oembed_result) {
					$oembed_result = json_decode($oembed_result, true);

					if ($oembed_result && isset($oembed_result["html"])) {

						$tmp = new DOMDocument();
						if (@$tmp->loadHTML('<?xml encoding="utf-8" ?>' . $oembed_result["html"])) {
							$p = $doc->createElement("p");

							$p->appendChild($doc->importNode(
								$tmp->getElementsByTagName("blockquote")->item(0), TRUE));

							$br = $doc->createElement('br');
							$entry->parentNode->insertBefore($p, $entry);
							$entry->parentNode->insertBefore($br, $entry);

							$found = 1;
						}
					}
				}
			}

			if (!$found && preg_match("/\.gfycat.com\/([a-z]+)?(\.[a-z]+)$/i", $entry_href, $matches)) {
				$entry->setAttribute("href", "http://www.gfycat.com/".$matches[1]);
			}

			if (!$found && preg_match("/https?:\/\/(www\.)?gfycat.com\/([a-z]+)$/i", $entry_href, $matches)) {

				Debug::log("Handling as Gfycat", Debug::LOG_VERBOSE);

				$source_stream = 'https://giant.gfycat.com/' . $matches[2] . '.mp4';
				$poster_url = 'https://thumbs.gfycat.com/' . $matches[2] . '-mobile.jpg';

				$content_type = $this->get_content_type($source_stream);

				if (strpos($content_type, "video/") !== false) {
					$this->handle_as_video($doc, $entry, $source_stream, $poster_url);
					$found = 1;
				}
			}

			// imgur .gif -> .gifv
			if (!$found && preg_match("/i\.imgur\.com\/(.*?)\.gif$/i", $entry_href)) {
				Debug::log("Handling as imgur gif (->gifv)", Debug::LOG_VERBOSE);

				$entry->setAttribute("href",
					str_replace(".gif", ".gifv", $entry_href));
			}

			if (!$found && preg_match("/\.(gifv|mp4)$/i", $entry_href)) {
				Debug::log("Handling as imgur gifv", Debug::LOG_VERBOSE);

				$source_stream = str_replace(".gifv", ".mp4", $entry_href);

				if (strpos($source_stream, "imgur.com") !== false)
					$poster_url = str_replace(".mp4", "h.jpg", $source_stream);
				else
					$poster_url = false;

				$this->handle_as_video($doc, $entry, $source_stream, $poster_url);

				$found = true;
			}

			$matches = array();
			if (!$found && (preg_match("/youtube\.com\/v\/([\w-]+)/", $entry_href, $matches) ||
				preg_match("/youtube\.com\/.*?[\&\?]v=([\w-]+)/", $entry_href, $matches) ||
				preg_match("/youtube\.com\/embed\/([\w-]+)/", $entry_href, $matches) ||
				preg_match("/youtube\.com\/watch\?v=([\w-]+)/", $entry_href, $matches) ||
				preg_match("/\/\/youtu.be\/([\w-]+)/", $entry_href, $matches))) {

				$vid_id = $matches[1];

				Debug::log("Handling as youtube: $vid_id", Debug::LOG_VERBOSE);

				$iframe = $doc->createElement("iframe");
				$iframe->setAttribute("class", "youtube-player");
				$iframe->setAttribute("type", "text/html");
				$iframe->setAttribute("width", "640");
				$iframe->setAttribute("height", "385");
				$iframe->setAttribute("src", "https://www.youtube.com/embed/$vid_id");
				$iframe->setAttribute("allowfullscreen", "1");
				$iframe->setAttribute("frameborder", "0");

				//$br = $doc->createElement('br');
				//$entry->parentNode->insertBefore($iframe, $entry);
				//$entry->parentNode->insertBefore($br, $entry);

				// reparent generated iframe because it doesn't scale well inside <td>
				if ($anchor)
					$anchor->parentNode->insertBefore($iframe, $anchor);
				else
					$entry->parentNode->insertBefore($iframe, $entry);

				$found = true;
			}

			if (!$found && (preg_match("/\.(jpg|jpeg|gif|png)(\?[0-9][0-9]*)?[$\?]/i", $entry_href) ||
				/* mb_strpos($entry_href, "i.reddituploads.com") !== false || */
				mb_strpos($this->get_content_type($entry_href), "image/") !== false)) {

				Debug::log("Handling as a picture", Debug::LOG_VERBOSE);

				$img = $doc->createElement('img');
				$img->setAttribute("src", $entry_href);

				$br = $doc->createElement('br');
				$entry->parentNode->insertBefore($img, $entry);
				$entry->parentNode->insertBefore($br, $entry);

				$found = true;
			}

			// imgur via link rel="image_src" href="..."
			if (!$found && preg_match("/imgur/", $entry_href)) {

				Debug::log("handling as imgur page/whatever", Debug::LOG_VERBOSE);

				$content = UrlHelper::fetch(["url" => $entry_href,
					"http_accept" => "text/*"]);

				if ($content) {
					$cdoc = new DOMDocument();

					if (@$cdoc->loadHTML($content)) {
						$cxpath = new DOMXPath($cdoc);

						$rel_image = $cxpath->query("//link[@rel='image_src']")->item(0);

						if ($rel_image) {

							$img = $doc->createElement('img');
							$img->setAttribute("src", $rel_image->getAttribute("href"));

							$br = $doc->createElement('br');
							$entry->parentNode->insertBefore($img, $entry);
							$entry->parentNode->insertBefore($br, $entry);

							$found = true;
						}
					}
				}
			}

			// wtf is this even
			if (!$found && preg_match("/^https?:\/\/gyazo\.com\/([^\.\/]+$)/", $entry_href, $matches)) {
				$img_id = $matches[1];

				Debug::log("handling as gyazo: $img_id", Debug::LOG_VERBOSE);

				$img = $doc->createElement('img');
				$img->setAttribute("src", "https://i.gyazo.com/$img_id.jpg");

				$br = $doc->createElement('br');
				$entry->parentNode->insertBefore($img, $entry);
				$entry->parentNode->insertBefore($br, $entry);

				$found = true;
			}

			// let's try meta properties
			if (!$found) {
				Debug::log("looking for meta og:image", Debug::LOG_VERBOSE);

				$content = UrlHelper::fetch(["url" => $entry_href,
					"http_accept" => "text/*"]);

				if ($content) {
					$cdoc = new DOMDocument();

					if (@$cdoc->loadHTML($content)) {
						$cxpath = new DOMXPath($cdoc);

						$og_image = $cxpath->query("//meta[@property='og:image']")->item(0);
						$og_video = $cxpath->query("//meta[@property='og:video']")->item(0);

						if ($og_video) {

							$source_stream = $og_video->getAttribute("content");

							if ($source_stream) {

								if ($og_image) {
									$poster_url = $og_image->getAttribute("content");
								} else {
									$poster_url = false;
								}

								$this->handle_as_video($doc, $entry, $source_stream, $poster_url);
								$found = true;
							}

						} else if ($og_image) {

							$og_src = $og_image->getAttribute("content");

							if ($og_src) {
								$img = $doc->createElement('img');
								$img->setAttribute("src", $og_src);

								$br = $doc->createElement('br');
								$entry->parentNode->insertBefore($img, $entry);
								$entry->parentNode->insertBefore($br, $entry);

								$found = true;
							}
						}
					}
				}
			}
		}

		if (!$found && $anchor && count($this->fallback_preview_urls) > 0) {
			Debug::log("JSON: processing fallback preview urls...", Debug::LOG_VERBOSE);

			foreach ($this->fallback_preview_urls as $media_url) {
				$this->handle_as_image($doc, $anchor, $media_url);

				$found = 1;
			}
		}

		if ($found)
			$this->remove_post_thumbnail($doc, $xpath);

		return $found;
	}

	function hook_article_filter($article) {

		if (strpos($article["link"], "reddit.com/r/") !== false && !empty($article["content"])) {
			$doc = new DOMDocument();

			if (@$doc->loadHTML($article["content"])) {
				$xpath = new DOMXPath($doc);

				$content_link = $xpath->query("(//a[contains(., '[link]')])")->item(0);

				if ($this->host->get($this, "enable_content_dupcheck")) {

					if ($content_link) {
						$content_href = $content_link->getAttribute("href");
						$entry_guid = $article["guid_hashed"];
						$owner_uid = $article["owner_uid"];

						if (Config::get(Config::DB_TYPE) == "pgsql") {
							$interval_qpart = "date_entered < NOW() - INTERVAL '1 day'";
						} else {
							$interval_qpart = "date_entered < DATE_SUB(NOW(), INTERVAL 1 DAY)";
						}

						$sth = $this->pdo->prepare("SELECT COUNT(id) AS cid
							FROM ttrss_entries, ttrss_user_entries WHERE
								ref_id = id AND
								$interval_qpart AND
								guid != ? AND
								owner_uid = ? AND
								content LIKE ?");

						$sth->execute([$entry_guid, $owner_uid, "%href=\"$content_href\">[link]%"]);

						if ($row = $sth->fetch()) {
							$num_found = $row['cid'];

							if ($num_found > 0) $article["force_catchup"] = true;
						}
					}
				}

				if ($content_link && $this->is_blacklisted($content_link->getAttribute("href")))
					return $article;

				$found = $this->inline_stuff($article, $doc, $xpath);

				$node = $doc->getElementsByTagName('body')->item(0);

				if ($node && $found) {
					$article["content"] = $doc->saveHTML($node);
					$article["enclosures"] = [];
				} else if ($content_link) {
					$article = $this->readability($article, $content_link->getAttribute("href"), $doc, $xpath);
				}
			}
		}

		return $article;
	}

	function api_version() {
		return 2;
	}

	private function remove_post_thumbnail($doc, $xpath) {
		$thumb = $xpath->query("//td/a/img[@src]")->item(0);

		if ($thumb)
			$thumb->parentNode->parentNode->removeChild($thumb->parentNode);
	}

	private function handle_as_image($doc, $entry, $image_url, $link_url = false) {
		$img = $doc->createElement("img");
		$img->setAttribute("src", $image_url);

		$p = $doc->createElement("p");

		if ($link_url) {
			$a = $doc->createElement("a");
			$a->setAttribute("href", $link_url);

			$a->appendChild($img);
			$p->appendChild($a);
		} else {
			$p->appendChild($img);
		}

		$entry->parentNode->insertBefore($p, $entry);
	}

	private function handle_as_video($doc, $entry, $source_stream, $poster_url = false) {

		Debug::log("handle_as_video: $source_stream", Debug::LOG_VERBOSE);

		$video = $doc->createElement('video');
		$video->setAttribute("autoplay", "1");
		$video->setAttribute("controls", "1");
		$video->setAttribute("loop", "1");

		if ($poster_url) $video->setAttribute("poster", $poster_url);

		$source = $doc->createElement('source');
		$source->setAttribute("src", $source_stream);
		$source->setAttribute("type", "video/mp4");

		$video->appendChild($source);

		$br = $doc->createElement('br');
		$entry->parentNode->insertBefore($video, $entry);
		$entry->parentNode->insertBefore($br, $entry);

		/*$img = $doc->createElement('img');
		$img->setAttribute("src",
			"data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs%3D");

		$entry->parentNode->insertBefore($img, $entry);*/
	}

	function csrf_ignore($method) {
		return $method === "testurl";
	}

	function testurl() {

		$url = clean($_POST["url"] ?? "");
		$article_url = clean($_POST["article_url"] ?? "");
		$article_id = clean($_POST["article_id"] ?? "");

		$this->dump_json_data = true;

		if (!$url && !$article_url && !$article_id) {
			header("Content-type: text/html");
			?>
			<style type="text/css">
				fieldset { border : 0; }
				label { display : inline-block; min-width : 120px; }
			</style>
			<form action="backend.php" method="post">
				<input type="hidden" name="op" value="pluginhandler">
				<input type="hidden" name="method" value="testurl">
				<input type="hidden" name="plugin" value="af_redditimgur">
				<fieldset>
					<label>Test URL:</label>
					<input name="url" size="100" value="<?= htmlspecialchars($url) ?>"></input>
				</fieldset>
				<hr/>
				<fieldset>
					<label>Article ID:</label>
					<input name="article_id" size="10" value="<?= htmlspecialchars($article_id) ?>"></input>
				</fieldset>
				<fieldset>
					<label>or Article URL:</label>
					<input name="article_url" size="100" value="<?= htmlspecialchars($article_url) ?>"></input>
				</fieldset>
				<fieldset>
					<button type="submit">Test</button>
				</fieldset>
			</form>
			<?php
			return;
		}

		header("Content-type: text/plain");

		Debug::set_enabled(true);
		Debug::set_loglevel(Debug::LOG_EXTENDED);

		if ($article_id) {
			$stored_article = ORM::for_table('ttrss_entries')
				->table_alias('e')
				->join('ttrss_user_entries', [ 'ref_id', '=', 'e.id'], 'ue')
					->where('ue.owner_uid', $_SESSION['uid'])
					->find_one($article_id);

			if (!$stored_article) {
				Debug::log("Article not found: $article_id", Debug::LOG_VERBOSE);
				return;
			}

			$article = [
				"link" => $stored_article->link,
				"content" => $stored_article->content,
				"tags" => explode(",", $stored_article->tag_cache)
			];

		} else {
			$article = [
				"link" => $article_url,
				"content" => "<html><body><table><tr><td><a href=\"$url\">[link]</a></td></tr></table></body>",
				"tags" => []];
		}

		$doc = new DOMDocument();
		@$doc->loadHTML($article["content"]);
		$xpath = new DOMXPath($doc);

		$found = $this->inline_stuff($article, $doc, $xpath);

		Debug::log("Inline result: $found", Debug::LOG_VERBOSE);

		print_r($article);

		if (!$found) {
			Debug::log("Readability result:", Debug::LOG_VERBOSE);

			$article = $this->readability([], $url, $doc, $xpath);

			print_r($article);
		} else {
			Debug::log("Resulting HTML:", Debug::LOG_VERBOSE);

			print $doc->saveHTML();
		}

	}

	private function get_header($url, $header, $useragent = SELF_USER_AGENT) {
		$ret = false;

		if (function_exists("curl_init")) {
			$ch = curl_init($url);
			curl_setopt($ch, CURLOPT_TIMEOUT, 5);
			curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
			curl_setopt($ch, CURLOPT_HEADER, true);
			curl_setopt($ch, CURLOPT_NOBODY, true);
			curl_setopt($ch, CURLOPT_FOLLOWLOCATION, !ini_get("open_basedir"));
			curl_setopt($ch, CURLOPT_USERAGENT, $useragent);

			@curl_exec($ch);
			$ret = curl_getinfo($ch, $header);
		}

		return $ret;
	}

	private function get_content_type($url, $useragent = SELF_USER_AGENT) {
		return $this->get_header($url, CURLINFO_CONTENT_TYPE, $useragent);
	}

	private function get_location($url, $useragent = SELF_USER_AGENT) {
		return $this->get_header($url, CURLINFO_EFFECTIVE_URL, $useragent);
	}

	private function readability($article, $url, $doc, $xpath, $debug = false) {

		if (function_exists("curl_init") && $this->host->get($this, "enable_readability") &&
			mb_strlen(strip_tags($article["content"])) <= 150) {

			// do not try to embed posts linking back to other reddit posts
			// readability.php requires PHP 5.6
			if ($url &&	strpos($url, "reddit.com") === false && version_compare(PHP_VERSION, '5.6.0', '>=')) {

				/* link may lead to a huge video file or whatever, we need to check content type before trying to
				parse it which p much requires curl */

				$useragent_compat = "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)";
				$content_type = $this->get_content_type($url, $useragent_compat);

				if ($content_type && strpos($content_type, "text/html") !== false) {

					$this->host->run_hooks_callback(PluginHost::HOOK_GET_FULL_TEXT,
						function ($result) use (&$article) {
							if ($result) {
								$article["content"]  = $result;
								return true;
							}
						},
						$url);
				}
			}
		}

		return $article;
	}

	private function is_blacklisted($src, $also_blacklist = []) {
		$src_domain = parse_url($src, PHP_URL_HOST);

		foreach (array_merge($this->domain_blacklist, $also_blacklist) as $domain) {
			if (strstr($src_domain, $domain) !== false) {
				return true;
			}
		}

		return false;
	}

	function hook_render_article($article) {
		return $this->hook_render_article_cdm($article);
	}

	private function rewrite_to_teddit($str) {
		if (strpos($str, "reddit.com") !== false) {
			return preg_replace("/https?:\/\/([a-z]+\.)?reddit\.com/", "https://teddit.net", $str);
		}

		return $str;
	}

	function hook_render_article_cdm($article) {
		if ($this->host->get($this, "reddit_to_teddit")) {
			$need_saving = false;

			$article["link"] = $this->rewrite_to_teddit($article["link"]);

			$doc = new DOMDocument();
			if (@$doc->loadHTML('<?xml encoding="UTF-8">' . $article["content"])) {
				$xpath = new DOMXPath($doc);
				$elems = $xpath->query("//a[@href]");

				foreach ($elems as $elem) {
					$href = $elem->getAttribute("href");
					$rewritten_href = $this->rewrite_to_teddit($href);

					if ($href != $rewritten_href) {
						$elem->setAttribute("href", $rewritten_href);
						$need_saving = true;
					}
				}
			}

			if ($need_saving) $article["content"] = $doc->saveHTML();
		}

		return $article;
	}

	function hook_render_article_api($params) {
		$article = isset($params["article"]) ? $params["article"] : $params["headline"];

		return $this->hook_render_article_cdm($article);
	}

}

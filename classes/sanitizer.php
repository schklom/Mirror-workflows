<?php
class Sanitizer {
	private static function strip_harmful_tags($doc, $allowed_elements, $disallowed_attributes) {
		$xpath = new DOMXPath($doc);
		$entries = $xpath->query('//*');

		foreach ($entries as $entry) {
			if (!in_array($entry->nodeName, $allowed_elements)) {
				$entry->parentNode->removeChild($entry);
			}

			if ($entry->hasAttributes()) {
				$attrs_to_remove = array();

				foreach ($entry->attributes as $attr) {

					if (strpos($attr->nodeName, 'on') === 0) {
						array_push($attrs_to_remove, $attr);
					}

					if (strpos($attr->nodeName, "data-") === 0) {
						array_push($attrs_to_remove, $attr);
					}

					if ($attr->nodeName == 'href' && stripos($attr->value, 'javascript:') === 0) {
						array_push($attrs_to_remove, $attr);
					}

					if (in_array($attr->nodeName, $disallowed_attributes)) {
						array_push($attrs_to_remove, $attr);
					}
				}

				foreach ($attrs_to_remove as $attr) {
					$entry->removeAttributeNode($attr);
				}
			}
		}

		return $doc;
	}

	public static function iframe_whitelisted($entry) {
		@$src = parse_url($entry->getAttribute("src"), PHP_URL_HOST);

		if ($src) {
			foreach (PluginHost::getInstance()->get_hooks(PluginHost::HOOK_IFRAME_WHITELISTED) as $plugin) {
				if ($plugin->hook_iframe_whitelisted($src))
					return true;
			}
		}

		return false;
	}

	public static function sanitize($str, $force_remove_images = false, $owner = false, $site_url = false, $highlight_words = false, $article_id = false) {
		if (!$owner) $owner = $_SESSION["uid"];

		$res = trim($str); if (!$res) return '';

		$doc = new DOMDocument();
		$doc->loadHTML('<?xml encoding="UTF-8">' . $res);
		$xpath = new DOMXPath($doc);

		$rewrite_base_url = $site_url ? $site_url : get_self_url_prefix();

		$entries = $xpath->query('(//a[@href]|//img[@src]|//source[@srcset|@src])');

		foreach ($entries as $entry) {

			if ($entry->hasAttribute('href')) {
				$entry->setAttribute('href',
					rewrite_relative_url($rewrite_base_url, $entry->getAttribute('href')));

				$entry->setAttribute('rel', 'noopener noreferrer');
				$entry->setAttribute("target", "_blank");
			}

			if ($entry->hasAttribute('src')) {
				$entry->setAttribute('src',
					rewrite_relative_url($rewrite_base_url, $entry->getAttribute('src')));
			}

			if ($entry->nodeName == 'img') {
				$entry->setAttribute('referrerpolicy', 'no-referrer');
				$entry->setAttribute('loading', 'lazy');
			}

			if ($entry->hasAttribute('srcset')) {
				$matches = RSSUtils::decode_srcset($entry->getAttribute('srcset'));

				for ($i = 0; $i < count($matches); $i++) {
					$matches[$i]["url"] = rewrite_relative_url($rewrite_base_url, $matches[$i]["url"]);
				}

				$entry->setAttribute("srcset", RSSUtils::encode_srcset($matches));
			}

			if ($entry->hasAttribute('src') &&
					($owner && get_pref("STRIP_IMAGES", $owner)) || $force_remove_images || $_SESSION["bw_limit"]) {

				$p = $doc->createElement('p');

				$a = $doc->createElement('a');
				$a->setAttribute('href', $entry->getAttribute('src'));

				$a->appendChild(new DOMText($entry->getAttribute('src')));
				$a->setAttribute('target', '_blank');
				$a->setAttribute('rel', 'noopener noreferrer');

				$p->appendChild($a);

				if ($entry->nodeName == 'source') {

					if ($entry->parentNode && $entry->parentNode->parentNode)
						$entry->parentNode->parentNode->replaceChild($p, $entry->parentNode);

				} else if ($entry->nodeName == 'img') {
					if ($entry->parentNode)
						$entry->parentNode->replaceChild($p, $entry);
				}
			}
		}

		$entries = $xpath->query('//iframe');
		foreach ($entries as $entry) {
			if (!self::iframe_whitelisted($entry)) {
				$entry->setAttribute('sandbox', 'allow-scripts');
			} else {
				if (is_prefix_https()) {
					$entry->setAttribute("src",
						str_replace("http://", "https://",
							$entry->getAttribute("src")));
				}
			}
		}

		$allowed_elements = array('a', 'abbr', 'address', 'acronym', 'audio', 'article', 'aside',
			'b', 'bdi', 'bdo', 'big', 'blockquote', 'body', 'br',
			'caption', 'cite', 'center', 'code', 'col', 'colgroup',
			'data', 'dd', 'del', 'details', 'description', 'dfn', 'div', 'dl', 'font',
			'dt', 'em', 'footer', 'figure', 'figcaption',
			'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'html', 'i',
			'img', 'ins', 'kbd', 'li', 'main', 'mark', 'nav', 'noscript',
			'ol', 'p', 'picture', 'pre', 'q', 'ruby', 'rp', 'rt', 's', 'samp', 'section',
			'small', 'source', 'span', 'strike', 'strong', 'sub', 'summary',
			'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'time',
			'tr', 'track', 'tt', 'u', 'ul', 'var', 'wbr', 'video', 'xml:namespace' );

		if ($_SESSION['hasSandbox']) $allowed_elements[] = 'iframe';

		$disallowed_attributes = array('id', 'style', 'class', 'width', 'height', 'allow');

		foreach (PluginHost::getInstance()->get_hooks(PluginHost::HOOK_SANITIZE) as $plugin) {
			$retval = $plugin->hook_sanitize($doc, $site_url, $allowed_elements, $disallowed_attributes, $article_id);
			if (is_array($retval)) {
				$doc = $retval[0];
				$allowed_elements = $retval[1];
				$disallowed_attributes = $retval[2];
			} else {
				$doc = $retval;
			}
		}

		$doc->removeChild($doc->firstChild); //remove doctype
		$doc = self::strip_harmful_tags($doc, $allowed_elements, $disallowed_attributes);

		$entries = $xpath->query('//iframe');
		foreach ($entries as $entry) {
			$div = $doc->createElement('div');
			$div->setAttribute('class', 'embed-responsive');
			$entry->parentNode->replaceChild($div, $entry);
			$div->appendChild($entry);
		}

		if ($highlight_words && is_array($highlight_words)) {
			foreach ($highlight_words as $word) {

				// http://stackoverflow.com/questions/4081372/highlight-keywords-in-a-paragraph

				$elements = $xpath->query("//*/text()");

				foreach ($elements as $child) {

					$fragment = $doc->createDocumentFragment();
					$text = $child->textContent;

					while (($pos = mb_stripos($text, $word)) !== false) {
						$fragment->appendChild(new DomText(mb_substr($text, 0, $pos)));
						$word = mb_substr($text, $pos, mb_strlen($word));
						$highlight = $doc->createElement('span');
						$highlight->appendChild(new DomText($word));
						$highlight->setAttribute('class', 'highlight');
						$fragment->appendChild($highlight);
						$text = mb_substr($text, $pos + mb_strlen($word));
					}

					if (!empty($text)) $fragment->appendChild(new DomText($text));

					$child->parentNode->replaceChild($fragment, $child);
				}
			}
		}

		$res = $doc->saveHTML();

		/* strip everything outside of <body>...</body> */

		$res_frag = array();
		if (preg_match('/<body>(.*)<\/body>/is', $res, $res_frag)) {
			return $res_frag[1];
		} else {
			return $res;
		}
	}

}

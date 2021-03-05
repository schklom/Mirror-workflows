<?php
class Af_Comics_DarkLegacy extends Af_ComicFilter {

	function supported() {
		return array("Dark Legacy Comics");
	}

	function process(&$article) {

		if (strpos($article["guid"], "darklegacycomics.com") !== false) {

				$res = UrlHelper::fetch($article["link"], false, false, false,
					 false, false, 0,
					 "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)");

				if (!$res && UrlHelper::$fetch_last_error_content)
					$res = UrlHelper::$fetch_last_error_content;

				$doc = new DOMDocument();

				if ($res && $doc->loadHTML($res)) {
					$xpath = new DOMXPath($doc);
					$basenode = $xpath->query('//div[@class="comic"]')->item(0);

					if ($basenode) {

						$article["content"] = $doc->saveHTML($basenode);
					}
				}

			 return true;
		}

		return false;
	}
}

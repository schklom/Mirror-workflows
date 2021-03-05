<?php
class Af_Comics_Tfd extends Af_ComicFilter {

	function supported() {
		return array("Toothpaste For Dinner", "Married to the Sea");
	}

	function process(&$article) {
		if (strpos($article["link"], "toothpastefordinner.com") !== false ||
		    strpos($article["link"], "marriedtothesea.com") !== false) {
			$res = UrlHelper::fetch($article["link"], false, false, false,
				false, false, 0,
				"Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)");

			if (!$res) return $article;

			$doc = new DOMDocument();

			$res = UrlHelper::fetch($article["link"]);

			if ($res && $doc->loadHTML($res)) {
				$xpath = new DOMXPath($doc);
				$basenode = $xpath->query('//img[contains(@src, ".gif")]')->item(0);

				if ($basenode) {
					$article["content"] = $doc->saveHTML($basenode);
					return true;
				}
			}
		}

		return false;
	}
}

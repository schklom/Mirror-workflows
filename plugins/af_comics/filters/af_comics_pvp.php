<?php
class Af_Comics_Pvp extends Af_ComicFilter {

	function supported() {
		return array("PvP Online");
	}

	function process(&$article) {
		if (str_contains($article["guid"], "pvponline.com")) {
				$res = UrlHelper::fetch([
					'url' => $article['link'],
					'useragent' => 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)',
				]);

				$doc = new DOMDocument();

				if ($res && $doc->loadHTML($res)) {
					$xpath = new DOMXPath($doc);
					$basenode = $xpath->query('//section[@class="comic-art"]')->item(0);

					if ($basenode) {
						$article["content"] = $doc->saveHTML($basenode);
					}
				}

			 return true;
		}

		return false;
	}
}

<?php
class Af_Comics_Pa extends Af_ComicFilter {

	function supported() {
		return array("Penny Arcade");
	}

	function process(&$article) {
		if (str_contains($article["link"], "penny-arcade.com/comic")) {

				$doc = new DOMDocument();

				$body = UrlHelper::fetch(['url' => $article['link']]);

				if ($body && $doc->loadHTML($body)) {
					$xpath = new DOMXPath($doc);
					$basenode = $xpath->query('(//div[@class="comic-area"])')->item(0);

					if ($basenode) {
						$article["content"] = $doc->saveHTML($basenode);
					}
				}

			return true;
		}

		return false;
	}
}

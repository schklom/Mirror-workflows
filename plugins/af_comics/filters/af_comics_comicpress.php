<?php
class Af_Comics_ComicPress extends Af_ComicFilter {

	function supported() {
		return array("Buni", "Buttersafe", "Happy Jar", "CSection",
			"Extra Fabulous Comics", "Nedroid", "Stonetoss",
			"Danby Draws", "Powerup Comics");
	}

	function process(&$article) {
		if (str_contains($article["guid"], "bunicomic.com") ||
				str_contains($article["guid"], "buttersafe.com") ||
				str_contains($article["guid"], "extrafabulouscomics.com") ||
				str_contains($article["guid"], "danbydraws.com") ||
				str_contains($article["guid"], "theduckwebcomics.com/Powerup_Comics") ||
				str_contains($article["guid"], "happyjar.com") ||
				str_contains($article["guid"], "nedroid.com") ||
				str_contains($article["guid"], "stonetoss.com") ||
				str_contains($article["guid"], "csectioncomics.com")) {

				// lol at people who block clients by user agent
				// oh noes my ad revenue Q_Q

				$res = UrlHelper::fetch(["url" => $article["link"],
					"useragent" => "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)"]);

				$doc = new DOMDocument();

				if ($res && $doc->loadHTML($res)) {
					$xpath = new DOMXPath($doc);
					$basenode = $xpath->query('//div[@id="comic"]|//img[contains(@class, "wp-post-image")]/..')->item(0);

					if ($basenode) {
						$article["content"] = $doc->saveHTML($basenode);
						return true;
					}

					/** @var DOMElement|null $webtoon_link (buni specific) */
					$webtoon_link = $xpath->query("//a[contains(@href,'www.webtoons.com')]")->item(0);

					if ($webtoon_link) {

						$res = UrlHelper::fetch(["url" => $webtoon_link->getAttribute("href"),
							"useragent" => "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)"]);

						if (@$doc->loadHTML($res)) {
							$xpath = new DOMXPath($doc);
							$basenode = $xpath->query('//div[@id="_viewerBox"]')->item(0);

							if ($basenode) {
								$imgs = $xpath->query("//img[@data-url]", $basenode);

								foreach ($imgs as $img) {
									$img->setAttribute("src", $img->getAttribute("data-url"));
								}

								$article["content"] = $doc->saveHTML($basenode);
								return true;
							}
						}
					}
				}
		}

		return false;
	}
}

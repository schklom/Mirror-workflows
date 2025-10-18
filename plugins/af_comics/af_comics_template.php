<?php
class Af_Comics_Template extends Af_ComicFilter {

	function supported() {
		return ["Example"];
	}

	function process(&$article) {
		//$owner_uid = $article["owner_uid"];

		return false;
	}
}
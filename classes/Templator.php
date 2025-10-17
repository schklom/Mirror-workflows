<?php
require_once __DIR__ . '/../lib/MiniTemplator.class.php';

class Templator extends MiniTemplator {

	/* this reads tt-rss template from templates.local/ or templates/ if only base filename is given */
	function readTemplateFromFile ($fileName) {
		if (!str_contains($fileName, "/")) {

			$fileName = basename($fileName);

			if (file_exists("templates.local/$fileName"))
				return parent::readTemplateFromFile("templates.local/$fileName");
			else
				return parent::readTemplateFromFile("templates/$fileName");

		} else {
			return parent::readTemplateFromFile($fileName);
		}
	}
}

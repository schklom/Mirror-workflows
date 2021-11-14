<?php
abstract class Af_ComicFilter {
	/** @return array<string> */
	public abstract function supported();

	/**
	 * @param array<string,mixed> $article
	 * @return bool
	 */
	public abstract function process(&$article);

	public function __construct(/*PluginHost $host*/) {

	}

	/**
	 * @param string $url
	 * @return string|false
	 */
	public function on_subscribe($url) {
		return false;
	}

	/**
	 * @param string $url
	 * @return array{"title": string, "site_url": string}|false
	 */
	public function on_basic_info($url) {
		return false;
	}

	/**
	 * @param string $url
	 * @return string|false
	 */
	public function on_fetch($url) {
		return false;
	}
}

<?php
use PHPUnit\Framework\TestCase;

final class SelfUrlPathTest extends TestCase {
	public function test_self_url_a(): void {
		$_SERVER = [];

		$_SERVER["HTTP_X_FORWARDED_PROTO"] = "http";
		$_SERVER["HTTP_HOST"] = "example.com";
		$_SERVER["REQUEST_URI"] = "/tt-rss/api/index.php";

		$this->assertEquals(
			'http://example.com/tt-rss',
			Config::get_self_url(true)
		);

	}

	public function test_self_url_b(): void {
		$_SERVER = [];

		$_SERVER["HTTP_X_FORWARDED_PROTO"] = "https";
		$_SERVER["HTTP_HOST"] = "example.com";
		$_SERVER["REQUEST_URI"] = "/api/";

		$this->assertEquals(
			'https://example.com',
			Config::get_self_url(true)
		);
	}

	public function test_self_url_c(): void {
		$_SERVER = [];

		$_SERVER["HTTP_X_FORWARDED_PROTO"] = "https";
		$_SERVER["HTTP_HOST"] = "example.com";
		$_SERVER["REQUEST_URI"] = "/api/index.php";

		$this->assertEquals(
			'https://example.com',
			Config::get_self_url(true)
		);
	}

	public function test_self_url_d(): void {
		$_SERVER = [];

		$_SERVER["HTTP_X_FORWARDED_PROTO"] = "https";
		$_SERVER["HTTP_HOST"] = "example.com";
		$_SERVER["REQUEST_URI"] = "/api//";

		$this->assertEquals(
			'https://example.com',
			Config::get_self_url(true)
		);
	}

	public function test_self_url_e(): void {
		$_SERVER = [];

		$_SERVER["HTTP_X_FORWARDED_PROTO"] = "https";
		$_SERVER["HTTP_HOST"] = "example.com";
		$_SERVER["REQUEST_URI"] = "/";

		$this->assertEquals(
			'https://example.com',
			Config::get_self_url(true)
		);
	}

	public function test_self_url_f(): void {
		$_SERVER = [];

		$_SERVER["HTTP_HOST"] = "example.com";
		$_SERVER["REQUEST_URI"] = "/tt-rss/index.php";

		$this->assertEquals(
			'http://example.com/tt-rss',
			Config::get_self_url(true)
		);
	}

	public function test_self_url_g(): void {
		$_SERVER = [];

		$_SERVER["HTTP_HOST"] = "example.com";
		$_SERVER["REQUEST_URI"] = "/tt-rss/";

		$this->assertEquals(
			'http://example.com/tt-rss',
			Config::get_self_url(true)
		);
	}

	public function test_self_url_h(): void {
		$_SERVER = [];

		$_SERVER["HTTP_HOST"] = "example.com";
		$_SERVER["REQUEST_URI"] = "/tt-rss";

		$this->assertEquals(
			'http://example.com/tt-rss',
			Config::get_self_url(true)
		);
	}

	public function test_get_self_dir(): void {
		$this->assertEquals(
			dirname(__DIR__), # we're in (app)/tests/
			Config::get_self_dir()
		);
	}
}

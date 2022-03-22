<?php
set_include_path(dirname(__DIR__) ."/include" . PATH_SEPARATOR .
		get_include_path());

require_once "autoload.php";
require_once "functions.php";

use PHPUnit\Framework\TestCase;

final class UrlHelperTest extends TestCase {
	public function testCanBeUsedAsString(): void {
		/*$this->assertEquals(
			'http://example.com/example.html',
			UrlHelper::rewrite_relative('http://example.com/example/', '/example.html')
		);

		$this->assertEquals(
			'http://example.com/example/example.html',
			UrlHelper::rewrite_relative('http://example.com/example/', 'example.html')
		);*/

		// protocol-neutral URL
		$this->assertEquals(
			'https://example.com/example.html',
			UrlHelper::rewrite_relative('http://example.com/example/', '//example.com/example.html')
		);

		// magnet allowed because it's a href attribute
		$this->assertEquals(
			'magnet:?xt=urn:btih:...',
			UrlHelper::rewrite_relative('http://example.com/example/',
				'magnet:?xt=urn:btih:...',
				"a", "href", "")
		);

		// disallowed magnet
		$this->assertEquals(
			'http://example.com?xt=urn:btih:...',
			UrlHelper::rewrite_relative('http://example.com/example/',
				'magnet:?xt=urn:btih:...')
		);

		$this->assertEquals(
			'https://apod.nasa.gov/apod/image/2203/Road2Stars_EsoHoralek_1080.jpg',
			UrlHelper::rewrite_relative('https://apod.nasa.gov/apod/ap220315.html', 'image/2203/Road2Stars_EsoHoralek_1080.jpg')
		);

		$this->assertEquals(
			'https://apod.nasa.gov/apod/image/2203/Road2Stars_EsoHoralek_1080.jpg',
			UrlHelper::rewrite_relative('https://apod.nasa.gov/apod/ap220315.html', './image/2203/Road2Stars_EsoHoralek_1080.jpg')
		);

	}
}

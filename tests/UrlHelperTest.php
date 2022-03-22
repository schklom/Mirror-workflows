<?php

use PHPUnit\Framework\TestCase;

final class UrlHelperTest extends TestCase {
	public function test_rewrite_relative(): void {
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

		$this->assertEquals(
			'http://example.com/test/url',
			UrlHelper::rewrite_relative('http://example.com/test/url', '')
		);

		$this->assertEquals(
			'http://www.example.com/test',
			UrlHelper::rewrite_relative('http://www.example2.com ', 'http://www.example.com/test')
		);

		$this->assertEquals(
			'http://www.example.com/test',
			UrlHelper::rewrite_relative('http://www.example.com/test2 ', 'http://www.example.com/test')
		);

	}
}

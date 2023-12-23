<?php

use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Response;
use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Exception\RequestException;
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
			UrlHelper::rewrite_relative(
				'http://example.com/example/',
				'magnet:?xt=urn:btih:...',
				"a",
				"href",
				""
			)
		);

		// disallowed magnet
		$this->assertEquals(
			'http://example.com?xt=urn:btih:...',
			UrlHelper::rewrite_relative(
				'http://example.com/example/',
				'magnet:?xt=urn:btih:...'
			)
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

	public function test_fetch(): void {
		$mock = new MockHandler();

		UrlHelper::$client = new Client([
			'handler' => HandlerStack::create($mock),
		]);

		$mock->append(new Response(200, [], 'Hello, World'));
		$result = UrlHelper::fetch('https://www.example.com');
		$this->assertEquals(200, UrlHelper::$fetch_last_error_code);
		$this->assertEquals('Hello, World', $result);

		foreach (['ftp://ftp.example.com', 'http://127.0.0.1', 'blah', '', 42, null] as $url) {
			$result = UrlHelper::fetch($url);
			$this->assertFalse($result);
		}

		$mock->append(new Response(200, ['Content-Length' => (string) PHP_INT_MAX]));
		$result = UrlHelper::fetch('https://www.example.com/very-large-content-length');
		$this->assertFalse($result);

		$mock->append(new Response(301, ['Location' => 'https://www.example.com']));
		$result = UrlHelper::fetch(['url' => 'https://example.com', 'followlocation' => false]);
		$this->assertFalse($result);

		$mock->append(
			new Response(301, ['Location' => 'http://127.0.0.1']),
			new Response(200, [], 'Hello, World'),
		);
		$result = UrlHelper::fetch(['url' => 'https://example.com', 'followlocation' => true]);
		$this->assertFalse($result);
		$this->assertEquals('URL received after redirection failed extended validation.', UrlHelper::$fetch_last_error);
		$this->assertEquals('http://127.0.0.1', UrlHelper::$fetch_effective_url);

		$mock->append(new Response(200, [], ''));
		$result = UrlHelper::fetch('https://www.example.com');
		$this->assertFalse($result);
		$this->assertEquals('Successful response, but no content was received.', UrlHelper::$fetch_last_error);

		// Currently failing with `Error: Undefined constant "CURLOPT_HTTPAUTH"`.
		// $mock->append(
		// 	new Response(403, []),
		// 	new Response(200, [], 'Hello, World'),
		// );
		// $result = UrlHelper::fetch(['url' => 'https://example.com/requires-credentials', 'login' => 'some_username', 'pass' => 'some_password']);
		// $this->assertEquals(200, UrlHelper::$fetch_last_error_code);
		// $this->assertEquals('Hello, World', $result);
	}
}

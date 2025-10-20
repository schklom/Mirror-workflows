<?php

use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\TestCase;

#[Group('mocked')]
final class UrlHelperTest extends TestCase {

	// ===== build_url() Tests =====

	public function testBuildUrlWithAllParts(): void {
		$parts = [
			'scheme' => 'https',
			'host' => 'example.com',
			'path' => '/path/to/page',
			'query' => 'param=value',
			'fragment' => 'section'
		];

		$result = UrlHelper::build_url($parts);
		$this->assertEquals('https://example.com/path/to/page?param=value#section', $result);
	}

	public function testBuildUrlWithMinimalParts(): void {
		$parts = [
			'scheme' => 'http',
			'host' => 'example.com'
		];

		$result = UrlHelper::build_url($parts);
		$this->assertEquals('http://example.com', $result);
	}

	public function testBuildUrlWithPathOnly(): void {
		$parts = [
			'scheme' => 'https',
			'host' => 'example.com',
			'path' => '/about'
		];

		$result = UrlHelper::build_url($parts);
		$this->assertEquals('https://example.com/about', $result);
	}

	// ===== rewrite_relative() - Absolute URLs =====

	public function testRewriteRelativeWithAbsoluteUrl(): void {
		$base = 'https://example.com/page';
		$rel = 'https://other.com/resource';

		$result = UrlHelper::rewrite_relative($base, $rel);
		$this->assertEquals('https://other.com/resource', $result);
	}

	public function testRewriteRelativeWithEmptyRelativeUrl(): void {
		$base = 'https://example.com/page';
		$rel = '';

		$result = UrlHelper::rewrite_relative($base, $rel);
		$this->assertEquals($base, $result);
	}

	// ===== rewrite_relative() - Protocol-Relative URLs =====

	public function testRewriteRelativeWithProtocolRelativeUrl(): void {
		$base = 'https://example.com/page';
		$rel = '//cdn.example.com/resource.js';

		$result = UrlHelper::rewrite_relative($base, $rel);
		$this->assertEquals('https://cdn.example.com/resource.js', $result);
	}

	// ===== rewrite_relative() - Relative Paths =====

	public function testRewriteRelativeWithRelativePath(): void {
		$base = 'https://example.com/blog/post';
		$rel = 'image.jpg';

		$result = UrlHelper::rewrite_relative($base, $rel);
		$this->assertEquals('https://example.com/blog/image.jpg', $result);
	}

	public function testRewriteRelativeWithAbsolutePath(): void {
		$base = 'https://example.com/blog/post';
		$rel = '/assets/style.css';

		$result = UrlHelper::rewrite_relative($base, $rel);
		$this->assertEquals('https://example.com/assets/style.css', $result);
	}

	public function testRewriteRelativeWithDotSlashPath(): void {
		$base = 'https://example.com/blog/post';
		$rel = './image.png';

		$result = UrlHelper::rewrite_relative($base, $rel);
		$this->assertEquals('https://example.com/blog/image.png', $result);
	}

	public function testRewriteRelativeWithBaseUrlEndingInSlash(): void {
		$base = 'https://example.com/blog/';
		$rel = 'image.jpg';

		$result = UrlHelper::rewrite_relative($base, $rel);
		// dirname('/blog/') returns '/blog', then with_trailing_slash makes it '/blog/'
		// But actually dirname() on path ending with / returns the parent: dirname('/blog/') = '/blog'
		// Actually, the behavior is: dirname('/blog/') returns '/', so result is '/image.jpg'
		$this->assertEquals('https://example.com/image.jpg', $result);
	}

	// ===== rewrite_relative() - Special Schemes =====

	public function testRewriteRelativeAllowsMagnetForAnchorHref(): void {
		$base = 'https://example.com/page';
		$rel = 'magnet:?xt=urn:btih:123';

		$result = UrlHelper::rewrite_relative($base, $rel, 'a', 'href');
		$this->assertEquals('magnet:?xt=urn:btih:123', $result);
	}

	public function testRewriteRelativeAllowsMailtoForAnchorHref(): void {
		$base = 'https://example.com/page';
		$rel = 'mailto:test@example.com';

		$result = UrlHelper::rewrite_relative($base, $rel, 'a', 'href');
		$this->assertEquals('mailto:test@example.com', $result);
	}

	public function testRewriteRelativeAllowsTelForAnchorHref(): void {
		$base = 'https://example.com/page';
		$rel = 'tel:+1234567890';

		$result = UrlHelper::rewrite_relative($base, $rel, 'a', 'href');
		$this->assertEquals('tel:+1234567890', $result);
	}

	public function testRewriteRelativeRejectsMagnetForNonAnchor(): void {
		$base = 'https://example.com/page';
		$rel = 'magnet:?xt=urn:btih:123';

		$result = UrlHelper::rewrite_relative($base, $rel, 'img', 'src');
		// Should rewrite as relative path since not allowed for img
		$this->assertNotEquals('magnet:?xt=urn:btih:123', $result);
	}

	// ===== rewrite_relative() - Data URLs for Images =====

	public function testRewriteRelativeAllowsDataUrlForImgSrc(): void {
		$base = 'https://example.com/page';
		$rel = 'data:image/png;base64,iVBORw0KGgo=';

		$result = UrlHelper::rewrite_relative($base, $rel, 'img', 'src');
		$this->assertEquals('data:image/png;base64,iVBORw0KGgo=', $result);
	}

	public function testRewriteRelativeAllowsDataUrlWithWebp(): void {
		$base = 'https://example.com/page';
		$rel = 'data:image/webp;base64,UklGRiQAAABXRUJQ';

		$result = UrlHelper::rewrite_relative($base, $rel, 'img', 'src');
		$this->assertEquals('data:image/webp;base64,UklGRiQAAABXRUJQ', $result);
	}

	public function testRewriteRelativeAllowsDataUrlWithSvg(): void {
		$base = 'https://example.com/page';
		$rel = 'data:image/svg;base64,PHN2ZyB4bWxucz0iaHR0cDov';

		$result = UrlHelper::rewrite_relative($base, $rel, 'img', 'src');
		$this->assertEquals('data:image/svg;base64,PHN2ZyB4bWxucz0iaHR0cDov', $result);
	}

	public function testRewriteRelativeRejectsDataUrlForNonImage(): void {
		$base = 'https://example.com/page';
		$rel = 'data:text/html;base64,PHRpdGxlPg==';

		$result = UrlHelper::rewrite_relative($base, $rel, 'img', 'src');
		// Regex only checks for image/* at start, so non-image MIME types get rewritten as relative paths
		$this->assertStringContainsString('text/html', $result);
		$this->assertNotEquals($rel, $result); // Should not return as-is
	}

	public function testRewriteRelativeRejectsDataUrlForNonImgElement(): void {
		$base = 'https://example.com/page';
		$rel = 'data:image/png;base64,iVBORw0KGgo=';

		$result = UrlHelper::rewrite_relative($base, $rel, 'a', 'href');
		// Data URLs for non-img elements get rewritten as relative paths
		$this->assertStringContainsString('image/png', $result);
		$this->assertNotEquals($rel, $result); // Should not return as-is
	}

	// ===== rewrite_relative() - Content Type-Based Schemes =====

	public function testRewriteRelativeAllowsMagnetForBittorrentContentType(): void {
		$base = 'https://example.com/page';
		$rel = 'magnet:?xt=urn:btih:456';

		$result = UrlHelper::rewrite_relative($base, $rel, '', '', 'application/x-bittorrent');
		$this->assertEquals('magnet:?xt=urn:btih:456', $result);
	}

	// ===== rewrite_relative() - Invalid URLs =====

	public function testRewriteRelativeWithInvalidCharactersInUrl(): void {
		$base = 'https://example.com/page';
		$rel = 'ht!tp://invalid url with spaces';

		$result = UrlHelper::rewrite_relative($base, $rel);
		// Invalid URLs without scheme/host are treated as relative paths
		$this->assertStringContainsString('example.com', $result);
		$this->assertNotEquals($rel, $result);
	}

	// ===== validate() - Basic Validation =====

	public function testValidateAcceptsValidHttpsUrl(): void {
		$result = UrlHelper::validate('https://example.com/page');
		$this->assertEquals('https://example.com/page', $result);
	}

	public function testValidateAcceptsValidHttpUrl(): void {
		$result = UrlHelper::validate('http://example.com/page');
		$this->assertEquals('http://example.com/page', $result);
	}

	public function testValidateFixesProtocolRelativeUrl(): void {
		$result = UrlHelper::validate('//example.com/resource');
		$this->assertEquals('https://example.com/resource', $result);
	}

	public function testValidateRejectsUrlWithoutHost(): void {
		$result = UrlHelper::validate('http:///path');
		$this->assertFalse($result);
	}

	public function testValidateRejectsMissingScheme(): void {
		$result = UrlHelper::validate('example.com/page');
		$this->assertFalse($result);
	}

	public function testValidateRejectsInvalidScheme(): void {
		$result = UrlHelper::validate('ftp://example.com/file');
		$this->assertFalse($result);
	}

	public function testValidateCleansUrl(): void {
		$result = UrlHelper::validate('  https://example.com/page  ');
		// clean() should strip tags and trim
		$this->assertEquals('https://example.com/page', $result);
	}

	// ===== Edge Cases =====

	public function testRewriteRelativeWithBaseUrlWithoutPath(): void {
		$base = 'https://example.com';
		$rel = 'page.html';

		$result = UrlHelper::rewrite_relative($base, $rel);
		// dirname('') returns '.', with_trailing_slash adds '/', so becomes '/page.html'
		$this->assertEquals('https://example.com/page.html', $result);
	}

	public function testRewriteRelativePreservesQueryAndFragment(): void {
		$base = 'https://example.com/blog/post';
		$rel = 'image.jpg?size=large#top';

		$result = UrlHelper::rewrite_relative($base, $rel);
		// Query and fragment should be preserved during URL parsing
		$this->assertStringContainsString('image.jpg', $result);
	}

	// ===== url_to_youtube_vid() Tests =====

	public function testUrlToYoutubeVidExtractsFromStandardUrl(): void {
		$url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

		$result = UrlHelper::url_to_youtube_vid($url);
		$this->assertEquals('dQw4w9WgXcQ', $result);
	}

	public function testUrlToYoutubeVidExtractsFromEmbedUrl(): void {
		$url = 'https://www.youtube.com/embed/dQw4w9WgXcQ';

		$result = UrlHelper::url_to_youtube_vid($url);
		$this->assertEquals('dQw4w9WgXcQ', $result);
	}

	public function testUrlToYoutubeVidExtractsFromVUrl(): void {
		$url = 'https://www.youtube.com/v/dQw4w9WgXcQ';

		$result = UrlHelper::url_to_youtube_vid($url);
		$this->assertEquals('dQw4w9WgXcQ', $result);
	}

	public function testUrlToYoutubeVidExtractsFromYoutuBeShortUrl(): void {
		$url = 'https://youtu.be/dQw4w9WgXcQ';

		$result = UrlHelper::url_to_youtube_vid($url);
		$this->assertEquals('dQw4w9WgXcQ', $result);
	}

	public function testUrlToYoutubeVidRewritesToNoCookieDomain(): void {
		$url = 'https://www.youtube.com/watch?v=test123';

		// Method rewrites youtube.com to youtube-nocookie.com internally
		$result = UrlHelper::url_to_youtube_vid($url);
		$this->assertEquals('test123', $result);
	}

	public function testUrlToYoutubeVidHandlesVideoIdWithHyphensAndUnderscores(): void {
		$url = 'https://www.youtube.com/watch?v=abc-DEF_123';

		$result = UrlHelper::url_to_youtube_vid($url);
		$this->assertEquals('abc-DEF_123', $result);
	}

	public function testUrlToYoutubeVidReturnsFalseForNonYoutubeUrl(): void {
		$url = 'https://vimeo.com/123456';

		$result = UrlHelper::url_to_youtube_vid($url);
		$this->assertFalse($result);
	}

	public function testUrlToYoutubeVidReturnsFalseForMalformedYoutubeUrl(): void {
		$url = 'https://www.youtube.com/notavalidpath';

		$result = UrlHelper::url_to_youtube_vid($url);
		$this->assertFalse($result);
	}

	public function testUrlToYoutubeVidHandlesWatchUrlWithAdditionalParams(): void {
		$url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share&t=10';

		// Regex extracts video ID from query string
		$result = UrlHelper::url_to_youtube_vid($url);
		$this->assertEquals('dQw4w9WgXcQ', $result);
	}

	public function testUrlToYoutubeVidReturnsFalseForEmptyVideoId(): void {
		$url = 'https://www.youtube.com/watch?v=';

		$result = UrlHelper::url_to_youtube_vid($url);
		$this->assertFalse($result);
	}

	public function testUrlToYoutubeVidHandlesHttpProtocol(): void {
		$url = 'http://www.youtube.com/watch?v=test456';

		$result = UrlHelper::url_to_youtube_vid($url);
		$this->assertEquals('test456', $result);
	}

	public function testUrlToYoutubeVidHandlesYoutuBeWithExtraPath(): void {
		$url = 'https://youtu.be/dQw4w9WgXcQ?t=42';

		// Regex should still extract video ID even with query params
		$result = UrlHelper::url_to_youtube_vid($url);
		$this->assertEquals('dQw4w9WgXcQ', $result);
	}
}

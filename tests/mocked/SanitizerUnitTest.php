<?php

use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\TestCase;

#[Group('mocked')]
final class SanitizerUnitTest extends TestCase {

	protected function setUp(): void {
		// Initialize session variables that Sanitizer may check
		if (!isset($_SESSION)) {
			$_SESSION = [];
		}
	}

	protected function tearDown(): void {
		// Clean up session after each test
		$_SESSION = [];
	}

	public function test_sanitize_basic_html(): void {
		$input = '<p>This is a <strong>test</strong> paragraph.</p>';
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		$this->assertStringContainsString('<p>This is a <strong>test</strong> paragraph.</p>', $result);
	}

	public function test_sanitize_removes_script_tags(): void {
		$input = '<p>Safe content</p><script>alert("xss")</script>';
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		$this->assertStringNotContainsString('<script>', $result);
		$this->assertStringNotContainsString('alert', $result);
		$this->assertStringContainsString('Safe content', $result);
	}

	public function test_sanitize_removes_onclick_attributes(): void {
		$input = '<a href="#" onclick="alert(\'xss\')">Click me</a>';
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		$this->assertStringNotContainsString('onclick', $result);
		$this->assertStringContainsString('Click me', $result);
	}

	public function test_sanitize_removes_javascript_href(): void {
		$input = '<a href="javascript:alert(\'xss\')">Click me</a>';
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		$this->assertStringNotContainsString('javascript:', $result);
	}

	public function test_sanitize_removes_data_attributes(): void {
		$input = '<div data-custom="value">Content</div>';
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		$this->assertStringNotContainsString('data-custom', $result);
		$this->assertStringContainsString('Content', $result);
	}

	public function test_sanitize_removes_style_attribute(): void {
		$input = '<p style="color: red;">Styled text</p>';
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		$this->assertStringNotContainsString('style=', $result);
		$this->assertStringContainsString('Styled text', $result);
	}

	public function test_sanitize_removes_id_attribute(): void {
		$input = '<div id="myid">Content</div>';
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		$this->assertStringNotContainsString('id=', $result);
		$this->assertStringContainsString('Content', $result);
	}

	public function test_sanitize_removes_class_attribute(): void {
		$input = '<div class="myclass">Content</div>';
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		$this->assertStringNotContainsString('class="myclass"', $result);
		$this->assertStringContainsString('Content', $result);
	}

	public function test_sanitize_adds_noopener_noreferrer_to_links(): void {
		$input = '<a href="https://example.com">Link</a>';
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		$this->assertStringContainsString('rel="noopener noreferrer"', $result);
	}

	public function test_sanitize_adds_target_blank_to_links(): void {
		$input = '<a href="https://example.com">Link</a>';
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		$this->assertStringContainsString('target="_blank"', $result);
	}

	public function test_sanitize_adds_referrerpolicy_to_images(): void {
		$input = '<img src="https://example.com/image.jpg" alt="Test">';
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		$this->assertStringContainsString('referrerpolicy="no-referrer"', $result);
	}

	public function test_sanitize_adds_lazy_loading_to_images(): void {
		$input = '<img src="https://example.com/image.jpg" alt="Test">';
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		$this->assertStringContainsString('loading="lazy"', $result);
	}

	public function test_sanitize_rewrites_relative_urls(): void {
		$input = '<a href="/page.html">Link</a>';
		$site_url = 'https://example.com';
		$result = Sanitizer::sanitize($input, false, null, $site_url);
		
		$this->assertNotFalse($result);
		$this->assertStringContainsString('https://example.com/page.html', $result);
	}

	public function test_sanitize_rewrites_relative_image_src(): void {
		$input = '<img src="/image.jpg" alt="Test">';
		$site_url = 'https://example.com';
		$result = Sanitizer::sanitize($input, false, null, $site_url);
		
		$this->assertNotFalse($result);
		$this->assertStringContainsString('https://example.com/image.jpg', $result);
	}

	public function test_sanitize_empty_string(): void {
		$result = Sanitizer::sanitize('');
		$this->assertSame('', $result);
	}

	public function test_sanitize_whitespace_only(): void {
		$result = Sanitizer::sanitize('   ');
		$this->assertSame('', $result);
	}

	public function test_sanitize_allows_safe_html_elements(): void {
		$safe_elements = [
			'<p>Paragraph</p>',
			'<strong>Bold</strong>',
			'<em>Italic</em>',
			'<ul><li>List item</li></ul>',
			'<h1>Heading</h1>',
			'<blockquote>Quote</blockquote>',
			'<code>Code</code>',
			'<pre>Preformatted</pre>',
		];

		foreach ($safe_elements as $element) {
			$result = Sanitizer::sanitize($element);
			$this->assertNotFalse($result);
			$this->assertNotEmpty($result);
		}
	}

	public function test_sanitize_table_elements(): void {
		$input = '<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Data</td></tr></tbody></table>';
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		$this->assertStringContainsString('<table>', $result);
		$this->assertStringContainsString('<thead>', $result);
		$this->assertStringContainsString('<tbody>', $result);
		$this->assertStringContainsString('<tr>', $result);
		$this->assertStringContainsString('<th>Header</th>', $result);
		$this->assertStringContainsString('<td>Data</td>', $result);
	}

	public function test_sanitize_removes_embed_tag(): void {
		$input = '<p>Safe</p><embed src="file.swf">';
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		$this->assertStringNotContainsString('<embed', $result);
		$this->assertStringContainsString('Safe', $result);
	}

	public function test_sanitize_removes_object_tag(): void {
		$input = '<p>Safe</p><object data="file.pdf"></object>';
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		$this->assertStringNotContainsString('<object', $result);
		$this->assertStringContainsString('Safe', $result);
	}

	public function test_sanitize_wraps_iframes_in_div(): void {
		$input = '<iframe src="https://example.com"></iframe>';
		$_SESSION['hasSandbox'] = true;
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		$this->assertStringContainsString('<div class="embed-responsive">', $result);
		$this->assertStringContainsString('<iframe', $result);
	}

	public function test_sanitize_iframe_without_sandbox_session(): void {
		$input = '<iframe src="https://example.com"></iframe>';
		unset($_SESSION['hasSandbox']);
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		// Without hasSandbox, iframe should be removed
		$this->assertStringNotContainsString('<iframe', $result);
	}

	public function test_sanitize_video_element(): void {
		$input = '<video poster="/poster.jpg"><source src="/video.mp4"></video>';
		$site_url = 'https://example.com';
		$result = Sanitizer::sanitize($input, false, null, $site_url);
		
		$this->assertNotFalse($result);
		$this->assertStringContainsString('<video', $result);
		$this->assertStringContainsString('https://example.com/poster.jpg', $result);
		$this->assertStringContainsString('<source', $result);
	}

	public function test_sanitize_audio_element(): void {
		$input = '<audio><source src="/audio.mp3"></audio>';
		$site_url = 'https://example.com';
		$result = Sanitizer::sanitize($input, false, null, $site_url);
		
		$this->assertNotFalse($result);
		$this->assertStringContainsString('<audio', $result);
		$this->assertStringContainsString('<source', $result);
	}

	public function test_sanitize_html5_semantic_elements(): void {
		$input = '<article><header><h1>Title</h1></header><section><p>Content</p></section><footer>Footer</footer></article>';
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		$this->assertStringContainsString('<article>', $result);
		$this->assertStringContainsString('<header>', $result);
		$this->assertStringContainsString('<section>', $result);
		$this->assertStringContainsString('<footer>', $result);
	}

	public function test_sanitize_preserves_nested_structure(): void {
		$input = '<div><p>Level 1<span>Level 2<strong>Level 3</strong></span></p></div>';
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		$this->assertStringContainsString('Level 1', $result);
		$this->assertStringContainsString('Level 2', $result);
		$this->assertStringContainsString('Level 3', $result);
	}

	public function test_highlight_words_str_single_word(): void {
		$str = 'This is a test string';
		$words = ['test'];
		$result = Sanitizer::highlight_words_str($str, $words);
		
		$this->assertStringContainsString('<span class="highlight">test</span>', $result);
		$this->assertStringContainsString('This is a', $result);
	}

	public function test_highlight_words_str_multiple_words(): void {
		$str = 'This is a test string';
		$words = ['test', 'string'];
		$result = Sanitizer::highlight_words_str($str, $words);
		
		$this->assertStringContainsString('<span class="highlight">test</span>', $result);
		$this->assertStringContainsString('<span class="highlight">string</span>', $result);
	}

	public function test_highlight_words_str_case_insensitive(): void {
		$str = 'This is a TEST string';
		$words = ['test'];
		$result = Sanitizer::highlight_words_str($str, $words);
		
		$this->assertStringContainsString('<span class="highlight">TEST</span>', $result);
	}

	public function test_highlight_words_str_empty_words(): void {
		$str = 'This is a test string';
		$words = [];
		$result = Sanitizer::highlight_words_str($str, $words);
		
		$this->assertSame($str, $result);
	}

	public function test_highlight_words_str_word_not_found(): void {
		$str = 'This is a test string';
		$words = ['notfound'];
		$result = Sanitizer::highlight_words_str($str, $words);
		
		// Even when no words match, the string is wrapped in a span tag
		$this->assertStringContainsString($str, $result);
		$this->assertStringNotContainsString('highlight', $result);
	}

	public function test_highlight_words_str_multibyte_characters(): void {
		$str = 'This is a tëst string';
		$words = ['tëst'];
		$result = Sanitizer::highlight_words_str($str, $words);
		
		// HTML entities are used for multibyte characters
		$this->assertStringContainsString('class="highlight"', $result);
		$this->assertStringContainsString('t&euml;st', $result);
	}

	public function test_highlight_words_str_multiple_occurrences(): void {
		$str = 'test and test again';
		$words = ['test'];
		$result = Sanitizer::highlight_words_str($str, $words);
		
		$this->assertSame(2, substr_count($result, '<span class="highlight">test</span>'));
	}

	public function test_sanitize_with_highlight_words(): void {
		$input = '<p>This is a test paragraph.</p>';
		$highlight_words = ['test'];
		$result = Sanitizer::sanitize($input, false, null, null, $highlight_words);
		
		$this->assertNotFalse($result);
		$this->assertStringContainsString('<span class="highlight">test</span>', $result);
	}

	public function test_sanitize_removes_form_elements(): void {
		$input = '<form><input type="text" name="test"><button>Submit</button></form>';
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		$this->assertStringNotContainsString('<form', $result);
		$this->assertStringNotContainsString('<input', $result);
		$this->assertStringNotContainsString('<button', $result);
	}

	public function test_sanitize_removes_meta_tags(): void {
		$input = '<p>Content</p><meta http-equiv="refresh" content="0;url=https://evil.com">';
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		$this->assertStringNotContainsString('<meta', $result);
		$this->assertStringContainsString('Content', $result);
	}

	public function test_sanitize_removes_link_tags(): void {
		$input = '<p>Content</p><link rel="stylesheet" href="evil.css">';
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		$this->assertStringNotContainsString('<link', $result);
		$this->assertStringContainsString('Content', $result);
	}

	public function test_sanitize_removes_base_tag(): void {
		$input = '<p>Content</p><base href="https://evil.com">';
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		$this->assertStringNotContainsString('<base', $result);
		$this->assertStringContainsString('Content', $result);
	}

	public function test_sanitize_complex_xss_attempt(): void {
		$input = '<img src=x onerror="alert(\'XSS\')" onload="alert(\'XSS2\')">';
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		$this->assertStringNotContainsString('onerror', $result);
		$this->assertStringNotContainsString('onload', $result);
		$this->assertStringNotContainsString('alert', $result);
	}

	public function test_sanitize_svg_with_script(): void {
		$input = '<svg><script>alert("xss")</script></svg>';
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		// SVG is not in allowed elements, so it should be removed
		$this->assertStringNotContainsString('<svg', $result);
		$this->assertStringNotContainsString('alert', $result);
	}

	public function test_sanitize_preserves_entities(): void {
		$input = '<p>&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;</p>';
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		$this->assertStringContainsString('&lt;', $result);
		$this->assertStringContainsString('&gt;', $result);
		// &quot; gets converted to regular quotes by DOMDocument
		$this->assertStringContainsString('alert', $result);
	}

	public function test_sanitize_unicode_characters(): void {
		$input = '<p>Hello 世界 🌍</p>';
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		// Unicode characters are converted to HTML entities by DOMDocument
		$this->assertStringContainsString('Hello', $result);
		// Check that the content is preserved (either as unicode or entities)
		$this->assertMatchesRegularExpression('/世界|&#\d+;/', $result);
	}

	public function test_sanitize_long_content(): void {
		$input = '<p>' . str_repeat('Lorem ipsum dolor sit amet. ', 1000) . '</p>';
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		$this->assertGreaterThan(1000, strlen($result));
	}

	public function test_sanitize_deeply_nested_structure(): void {
		$input = '<div><div><div><div><div><p>Deep content</p></div></div></div></div></div>';
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		$this->assertStringContainsString('Deep content', $result);
	}

	public function test_sanitize_malformed_html(): void {
		$input = '<p>Unclosed paragraph<div>Mixed tags</p></div>';
		$result = Sanitizer::sanitize($input);
		
		// Should not return false, even with malformed HTML
		$this->assertNotFalse($result);
		$this->assertStringContainsString('Unclosed paragraph', $result);
		$this->assertStringContainsString('Mixed tags', $result);
	}

	public function test_sanitize_picture_element_with_srcset(): void {
		$input = '<picture><source srcset="/image-large.jpg 1000w, /image-small.jpg 500w"><img src="/image.jpg"></picture>';
		$site_url = 'https://example.com';
		$result = Sanitizer::sanitize($input, false, null, $site_url);
		
		$this->assertNotFalse($result);
		$this->assertStringContainsString('<picture>', $result);
		$this->assertStringContainsString('https://example.com/image-large.jpg', $result);
		$this->assertStringContainsString('https://example.com/image-small.jpg', $result);
	}

	public function test_sanitize_with_protocol_relative_url(): void {
		$input = '<a href="//example.com/page">Link</a>';
		$site_url = 'https://example.com';
		$result = Sanitizer::sanitize($input, false, null, $site_url);
		
		$this->assertNotFalse($result);
		$this->assertStringContainsString('href=', $result);
	}

	public function test_sanitize_abbreviation_and_acronym(): void {
		$input = '<p><abbr title="Hypertext Markup Language">HTML</abbr> and <acronym title="Cascading Style Sheets">CSS</acronym></p>';
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		$this->assertStringContainsString('<abbr', $result);
		$this->assertStringContainsString('<acronym', $result);
		// title attribute should be preserved (not in disallowed_attributes)
		$this->assertStringContainsString('title=', $result);
	}

	public function test_sanitize_details_and_summary(): void {
		$input = '<details><summary>Click to expand</summary><p>Hidden content</p></details>';
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		$this->assertStringContainsString('<details>', $result);
		$this->assertStringContainsString('<summary>', $result);
		$this->assertStringContainsString('Click to expand', $result);
		$this->assertStringContainsString('Hidden content', $result);
	}

	public function test_sanitize_kbd_and_samp(): void {
		$input = '<p>Press <kbd>Ctrl+C</kbd> to see <samp>output</samp></p>';
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		$this->assertStringContainsString('<kbd>', $result);
		$this->assertStringContainsString('<samp>', $result);
	}

	public function test_sanitize_ruby_annotation(): void {
		$input = '<ruby>漢<rp>(</rp><rt>kan</rt><rp>)</rp></ruby>';
		$result = Sanitizer::sanitize($input);
		
		$this->assertNotFalse($result);
		$this->assertStringContainsString('<ruby>', $result);
		$this->assertStringContainsString('<rt>', $result);
		$this->assertStringContainsString('<rp>', $result);
	}
}

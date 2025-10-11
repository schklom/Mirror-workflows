<?php
use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\TestCase;

#[Group('integration')]
final class SanitizerTest extends TestCase {
	public function test_sanitize_non_ascii(): void {
		$this->assertEquals(
			'<p>&#20013;&#25991;</p>',
			Sanitizer::sanitize('<p>中文</p>')
		);
	}

	public function test_sanitize_keep_figure(): void {
		$this->assertEquals(
			'<figure>Content</figure>',
			Sanitizer::sanitize('<figure>Content</figure>')
		);
	}
}


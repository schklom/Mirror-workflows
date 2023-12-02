<?php
use PHPUnit\Framework\TestCase;

/** @group integration */
final class SanitizerTest extends TestCase {
	public function test_sanitize_non_ascii(): void {
		$this->assertEquals(
			'<p>&#20013;&#25991;</p>',
			Sanitizer::sanitize('<p>中文</p>')
		);
	}
}


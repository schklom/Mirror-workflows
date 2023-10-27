<?php

use PHPUnit\Framework\TestCase;

final class ConfigTest extends TestCase {
	public function test_get_self_dir(): void {
		$this->assertEquals(
			dirname(__DIR__), # we're in (app)/tests/
			Config::get_self_dir()
		);
	}
}

<?php

use PHPUnit\Framework\TestCase;

final class ErrorsTest extends TestCase {

	public function test_to_json_success_code(): void {
		$result = Errors::to_json(Errors::E_SUCCESS);
		$decoded = json_decode($result, true);
		
		$this->assertIsArray($decoded);
		$this->assertArrayHasKey('error', $decoded);
		$this->assertArrayHasKey('code', $decoded['error']);
		$this->assertSame(Errors::E_SUCCESS, $decoded['error']['code']);
	}

	public function test_to_json_unauthorized(): void {
		$result = Errors::to_json(Errors::E_UNAUTHORIZED);
		$decoded = json_decode($result, true);
		
		$this->assertArrayHasKey('error', $decoded);
		$this->assertSame(Errors::E_UNAUTHORIZED, $decoded['error']['code']);
	}

	public function test_to_json_unknown_method(): void {
		$result = Errors::to_json(Errors::E_UNKNOWN_METHOD);
		$decoded = json_decode($result, true);
		
		$this->assertSame(Errors::E_UNKNOWN_METHOD, $decoded['error']['code']);
	}

	public function test_to_json_with_empty_params(): void {
		$result = Errors::to_json(Errors::E_SUCCESS, []);
		$decoded = json_decode($result, true);
		
		$this->assertArrayHasKey('params', $decoded['error']);
		$this->assertEmpty($decoded['error']['params']);
	}

	public function test_to_json_with_params(): void {
		$params = ['method' => 'test_method', 'detail' => 'Additional info'];
		$result = Errors::to_json(Errors::E_UNKNOWN_METHOD, $params);
		$decoded = json_decode($result, true);
		
		$this->assertArrayHasKey('params', $decoded['error']);
		$this->assertSame('test_method', $decoded['error']['params']['method']);
		$this->assertSame('Additional info', $decoded['error']['params']['detail']);
	}

	public function test_to_json_schema_mismatch(): void {
		$result = Errors::to_json(Errors::E_SCHEMA_MISMATCH);
		$decoded = json_decode($result, true);
		
		$this->assertSame(Errors::E_SCHEMA_MISMATCH, $decoded['error']['code']);
	}

	public function test_to_json_url_scheme_mismatch(): void {
		$result = Errors::to_json(Errors::E_URL_SCHEME_MISMATCH);
		$decoded = json_decode($result, true);
		
		$this->assertSame(Errors::E_URL_SCHEME_MISMATCH, $decoded['error']['code']);
	}

	public function test_to_json_unknown_plugin(): void {
		$result = Errors::to_json(Errors::E_UNKNOWN_PLUGIN);
		$decoded = json_decode($result, true);
		
		$this->assertSame(Errors::E_UNKNOWN_PLUGIN, $decoded['error']['code']);
	}

	public function test_to_json_returns_valid_json(): void {
		$result = Errors::to_json(Errors::E_SUCCESS);
		
		$this->assertNotFalse(json_decode($result));
		$this->assertSame(JSON_ERROR_NONE, json_last_error());
	}

	public function test_to_json_structure(): void {
		$result = Errors::to_json(Errors::E_SUCCESS);
		$decoded = json_decode($result, true);
		
		// Verify structure: { "error": { "code": "...", "params": {} } }
		$this->assertIsArray($decoded);
		$this->assertCount(1, $decoded);
		$this->assertArrayHasKey('error', $decoded);
		$this->assertIsArray($decoded['error']);
		$this->assertArrayHasKey('code', $decoded['error']);
		$this->assertArrayHasKey('params', $decoded['error']);
	}

	public function test_to_json_params_with_special_characters(): void {
		$params = [
			'message' => 'Error: "Special" <characters> & symbols',
			'path' => '/path/to/file.php'
		];
		$result = Errors::to_json(Errors::E_SUCCESS, $params);
		$decoded = json_decode($result, true);
		
		$this->assertSame($params['message'], $decoded['error']['params']['message']);
		$this->assertSame($params['path'], $decoded['error']['params']['path']);
	}

	public function test_to_json_params_with_unicode(): void {
		$params = ['message' => 'Unicode: 你好世界 🌍'];
		$result = Errors::to_json(Errors::E_SUCCESS, $params);
		$decoded = json_decode($result, true);
		
		$this->assertSame($params['message'], $decoded['error']['params']['message']);
	}

	public function test_format_libxml_error_fatal(): void {
		$error = new LibXMLError();
		$error->level = LIBXML_ERR_FATAL;
		$error->code = 1234;
		$error->line = 42;
		$error->column = 15;
		$error->message = 'Test error message';
		
		$result = Errors::format_libxml_error($error);
		
		$this->assertStringContainsString('1234', $result);
		$this->assertStringContainsString('42', $result);
		$this->assertStringContainsString('15', $result);
		$this->assertStringContainsString('Test error message', $result);
		$this->assertStringContainsString('LibXML error', $result);
	}

	public function test_format_libxml_error_warning(): void {
		$error = new LibXMLError();
		$error->level = LIBXML_ERR_WARNING;
		$error->code = 5678;
		$error->line = 100;
		$error->column = 25;
		$error->message = 'Warning message';
		
		$result = Errors::format_libxml_error($error);
		
		$this->assertStringContainsString('5678', $result);
		$this->assertStringContainsString('100', $result);
		$this->assertStringContainsString('25', $result);
	}

	public function test_libxml_last_error_no_errors(): void {
		// Clear any previous errors
		libxml_clear_errors();
		
		$result = Errors::libxml_last_error();
		
		$this->assertSame('', $result);
	}

	public function test_libxml_last_error_with_fatal_error(): void {
		// Trigger an XML parsing error
		libxml_use_internal_errors(true);
		$xml = simplexml_load_string('<invalid><unclosed>');
		
		if ($xml === false) {
			$result = Errors::libxml_last_error();
			$this->assertNotEmpty($result);
			$this->assertStringContainsString('LibXML error', $result);
		}
		
		libxml_clear_errors();
		libxml_use_internal_errors(false);
	}

	public function test_libxml_last_error_returns_utf8(): void {
		// Trigger an error with non-ASCII content
		libxml_use_internal_errors(true);
		$xml = simplexml_load_string('<invalid>测试</unclosed>');
		
		if ($xml === false) {
			$result = Errors::libxml_last_error();
			// Should be valid UTF-8
			$this->assertTrue(mb_check_encoding($result, 'UTF-8'));
		}
		
		libxml_clear_errors();
		libxml_use_internal_errors(false);
	}
}

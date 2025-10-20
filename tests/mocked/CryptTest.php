<?php

use PHPUnit\Framework\TestCase;

final class CryptTest extends TestCase {

	private string $testKey;

	protected function setUp(): void {
		// Generate a test encryption key
		$this->testKey = bin2hex(sodium_crypto_aead_chacha20poly1305_keygen());

		// Mock Config::get to return our test key
		// Note: MockedDepsBootstrap already mocks Config, but we need to ensure
		// it returns a valid key for encryption tests
	}

	public function test_generate_key_returns_string(): void {
		$key = Crypt::generate_key();

		$this->assertIsString($key);
	}

	public function test_generate_key_correct_length(): void {
		$key = Crypt::generate_key();

		// ChaCha20-Poly1305 keys are 256 bits (32 bytes)
		$this->assertSame(SODIUM_CRYPTO_AEAD_CHACHA20POLY1305_KEYBYTES, strlen($key));
	}

	public function test_generate_key_produces_unique_keys(): void {
		$key1 = Crypt::generate_key();
		$key2 = Crypt::generate_key();

		$this->assertNotSame($key1, $key2);
	}

	public function test_encrypt_string_throws_without_key(): void {
		$this->expectException(Exception::class);
		$this->expectExceptionMessage('key is not available');

		// Config mock returns null for ENCRYPTION_KEY by default
		Crypt::encrypt_string('test data');
	}

	public function test_decrypt_string_throws_without_key(): void {
		$this->expectException(Exception::class);
		$this->expectExceptionMessage('key is not available');

		$encrypted_data = [
			'algo' => 'xchacha20poly1305_ietf',
			'nonce' => random_bytes(24),
			'payload' => 'encrypted',
		];

		Crypt::decrypt_string($encrypted_data);
	}
}

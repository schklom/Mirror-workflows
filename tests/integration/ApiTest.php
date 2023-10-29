<?php
use PHPUnit\Framework\TestCase;

/** @group integration */
final class ApiTest extends TestCase {

	/** @var string */
	private $api_url;

	/** @var string */
	private $sid;

	function __construct() {
		$this->api_url = getenv('API_URL');

		parent::__construct();
	}

	/** @param array<mixed> $payload
	 * @return array<mixed>
	 */
	function api(array $payload) : ?array {
		$ch = curl_init($this->api_url);

		curl_setopt($ch, CURLOPT_HEADER, false);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-type: application/json"]);
		curl_setopt($ch, CURLOPT_POST, true);
		curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

		$resp = curl_exec($ch);

		$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);

		if ($status != 200) {
			print("error: failed with HTTP status: $status");
			return null;
		}

		curl_close($ch);

		return json_decode($resp, true);
	}

	/** @param array<mixed> $resp */
	public function common_assertions(array $resp) : void {
		$this->assertArrayHasKey("content", $resp);
		$this->assertArrayNotHasKey("error", $resp['content'], $resp['content']['error'] ?? '');
	}

	public function test_login() : void {
		$resp = $this->api(["op" => "login", "user" => "test", "password" => "test"]);
		$this->common_assertions($resp);

		$this->assertArrayHasKey("session_id", $resp['content']);
		$this->sid = $resp['content']['session_id'];
	}

	public function test_getVersion() : void {

		$this->test_login();

		$resp = $this->api(["op" => "getVersion", "sid" => $this->sid]);
		$this->common_assertions($resp);
		$this->assertArrayHasKey("version", $resp['content']);
	}
}
